import Phaser from "phaser";
import { BRIDGE_REGISTRY_KEY, type GameBridge, type GameCommand, type GuardSnapshot } from "../bridge";
import { playSound } from "../audio/sfx";
import { DEPTH, TILE_SIZE } from "../constants";
import { DEFAULT_DISPLAY_OPTIONS, DISPLAY_REGISTRY_KEY, type DisplayOptions } from "../displayOptions";
import { transitionFeedback } from "../effects/feedback";
import { showNoiseRing } from "../effects/noiseRing";
import { Guard } from "../guard/Guard";
import { GUARD_CONFIG, GUARDS, NOISE_COOLDOWN_MS, guardCssColor } from "../guard/guardConfig";
import { LEVEL_01_DECOR, type Decor } from "../level/decor";
import { LevelGrid } from "../level/grid";
import { LEVEL_01 } from "../level/levels";
import { parseLevel, type Level } from "../level/parseLevel";
import { buildTileIndices, SOLID_TILES } from "../level/tileLayer";
import { Player } from "../player/Player";
import { SimulationClock, TICK_MS } from "../simulation/SimulationClock";
import { guardSnapshot, sameGuards } from "../snapshot";
import { decorTexture, generateTextures, TEXTURES } from "../textures";

/** "Next event" stops after this many ticks (30 s of simulation) even if no event happened. */
const MAX_TICKS_TO_NEXT_EVENT = 30 * 60;

/** A slightly larger click target than the 16×16 sprite. */
const GUARD_HIT_AREA = new Phaser.Geom.Rectangle(-4, -4, 24, 24);

interface SceneData {
  /** Start the level paused (used to keep the mode across a reset). */
  paused?: boolean;
  /** Keep the visualizer's guard across a reset. */
  selectedGuardId?: string;
}

/**
 * The level. Game logic runs only in fixed simulation ticks (`simulateTick`), driven by a
 * SimulationClock, so pausing freezes physics, movement, perception and every DFA timer of every
 * guard, and a single step advances all of them by exactly one tick. Rendering happens every frame.
 */
export class MainScene extends Phaser.Scene {
  private bridge!: GameBridge;
  private runId = 0;
  private clock!: SimulationClock;
  private player!: Player;
  /** In ID order; every tick updates them in this order, so runs are reproducible. */
  private guards: Guard[] = [];
  private selectedGuardId: string | null = null;
  private restartKey!: Phaser.Input.Keyboard.Key;
  /** Simulation ticks since the level started. */
  private tickCount = 0;
  private lastNoiseTick = -Infinity;
  /** Per guard: the tick at which each DFA event was processed (index = position in its history). */
  private eventTicks = new Map<string, number[]>();
  /** The last published snapshot of each guard, reused while that guard has no new events. */
  private guardSnapshots: readonly GuardSnapshot[] = [];

  constructor() {
    super("MainScene");
  }

  create(data: SceneData): void {
    this.bridge = this.registry.get(BRIDGE_REGISTRY_KEY) as GameBridge;
    this.runId = this.bridge.getSnapshot().runId + 1;
    this.clock = new SimulationClock(data.paused ?? false);
    this.syncEffectsWithClock();
    this.tickCount = 0;
    this.lastNoiseTick = -Infinity;
    this.eventTicks = new Map();
    this.guardSnapshots = [];
    // Phaser reuses this object on restart, so clear per-run fields explicitly.
    this.selectedGuardId = null;
    generateTextures(this);

    const level = parseLevel(LEVEL_01);
    const grid = new LevelGrid(level);
    const walls = this.createTileLayer(level);
    this.createDecor(LEVEL_01_DECOR);
    const mapWidth = level.width * TILE_SIZE;
    const mapHeight = level.height * TILE_SIZE;

    // The physics world is exactly the map, so nothing can leave the playable area.
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);

    const spawn = grid.tileCenter(level.playerSpawn);
    this.player = new Player(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player.sprite, walls);

    this.guards = GUARDS.map((definition) => {
      const guard = new Guard(this, grid, definition);
      this.physics.add.collider(guard.sprite, walls);
      this.eventTicks.set(guard.id, []);
      // Clicking a guard selects it in the visualizer (works while paused, too).
      guard.sprite
        .setInteractive({ hitArea: GUARD_HIT_AREA, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true })
        .on("pointerdown", () => this.selectGuard(guard.id));
      return guard;
    });
    const keep = this.guards.find((guard) => guard.id === data.selectedGuardId);
    this.selectGuard((keep ?? this.guards[0]).id, false);

    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R, true);

    // Fixed camera: the map (640×352) is slightly shorter than the view (640×360); center it.
    this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);

    // Discard commands sent before this level existed (e.g. a second click during a reset).
    this.bridge.takeCommands();
    this.renderActors();
    this.publish();
  }

  /** Visual options from the Settings (kept in the registry so a restart keeps them). */
  private get display(): DisplayOptions {
    return (this.registry.get(DISPLAY_REGISTRY_KEY) as DisplayOptions | undefined) ?? DEFAULT_DISPLAY_OPTIONS;
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.reset();
      return;
    }
    for (const command of this.bridge.takeCommands()) {
      if (this.apply(command)) return; // reset restarts the scene; stop this frame
    }

    const ticks = this.clock.advance(delta);
    let changed = false;
    for (let i = 0; i < ticks; i++) changed = this.simulateTick() || changed;
    // Publish only when something the UI shows has changed: a DFA event, or the tick count while paused.
    if (changed || (this.clock.paused && ticks > 0)) this.publish();

    this.renderActors();
  }

  /** Applies one UI command. Returns true if the scene is restarting. */
  private apply(command: GameCommand): boolean {
    switch (command.type) {
      case "pause":
        if (this.clock.paused) return false;
        this.clock.pause();
        this.syncEffectsWithClock();
        break;
      case "resume":
        if (!this.clock.paused) return false;
        this.clock.resume();
        this.syncEffectsWithClock();
        break;
      case "step":
        this.clock.step();
        return false; // the tick runs (and is published) in update()
      case "stepToEvent":
        if (!this.clock.paused) return false;
        this.runToNextEvent();
        break;
      case "reset":
        this.reset();
        return true;
      case "selectGuard":
        this.selectGuard(command.guardId, false);
        break;
      case "setKeyboardEnabled": {
        const keyboard = this.input.keyboard!;
        keyboard.enabled = command.enabled;
        if (!command.enabled) keyboard.resetKeys();
        return false; // nothing the UI shows has changed
      }
      case "setDisplayOptions":
        this.registry.set(DISPLAY_REGISTRY_KEY, { visionCones: command.visionCones, effects: command.effects } satisfies DisplayOptions);
        return false;
    }
    this.publish();
    return false;
  }

  /** Changes which guard the visualizer shows. Touches nothing that affects behaviour. */
  private selectGuard(id: string, publish = true): void {
    if (!this.guards.some((guard) => guard.id === id) || id === this.selectedGuardId) return;
    this.selectedGuardId = id;
    for (const guard of this.guards) guard.selected = guard.id === id;
    if (publish) this.publish();
  }

  /** Runs ticks until any guard's DFA processes an event (finishing that tick), or the cap. */
  private runToNextEvent(): void {
    for (let i = 0; i < MAX_TICKS_TO_NEXT_EVENT; i++) {
      if (this.simulateTick()) return;
    }
  }

  /**
   * Visual effects freeze while paused: tweens (noise ring, icons, blinking lights), including ones
   * started by a step, and sprite animations (walk cycles).
   */
  private syncEffectsWithClock(): void {
    this.tweens.timeScale = this.clock.paused ? 0 : 1;
    if (this.clock.paused) this.anims.pauseAll();
    else this.anims.resumeAll();
  }

  private reset(): void {
    this.scene.restart({ paused: this.clock.paused, selectedGuardId: this.selectedGuardId ?? undefined } satisfies SceneData);
  }

  /**
   * One simulation tick (1/60 s): player input → player noise (heard by every guard in range) →
   * each guard's tick, in ID order (which may feed events to that guard's DFA) → one physics step.
   * Input held or pressed while paused is applied at the next tick.
   * Returns true if any guard processed a DFA event.
   */
  private simulateTick(): boolean {
    this.tickCount++;
    const before = this.guards.map((guard) => guard.history.length);

    this.player.update();
    if (this.player.noisePressed() && (this.tickCount - this.lastNoiseTick) * TICK_MS >= NOISE_COOLDOWN_MS) {
      this.lastNoiseTick = this.tickCount;
      showNoiseRing(this, this.player.feet, GUARD_CONFIG.hearingRadius);
      playSound("noise");
      for (const guard of this.guards) guard.hearNoise(this.player.feet);
    }

    const player = { center: this.player.center, feet: this.player.feet };
    for (const guard of this.guards) guard.tick(TICK_MS, player);
    if (this.guards.some((guard) => guard.state === "CAPTURE")) this.player.setFrozen(true);

    this.physics.world.singleStep();

    let changed = false;
    this.guards.forEach((guard, index) => {
      const ticks = this.eventTicks.get(guard.id)!;
      for (let i = before[index]; i < guard.history.length; i++) {
        ticks[i] = this.tickCount;
        // Sound / screen feedback reads the transition after the fact; it cannot change it.
        transitionFeedback(this, guard.history[i], this.display);
      }
      if (guard.history.length !== before[index]) changed = true;
    });
    return changed;
  }

  /** Draws the player and guards for this frame (reads state only). */
  private renderActors(): void {
    this.player.render();
    const display = this.display;
    for (const guard of this.guards) guard.render(display);
  }

  /** Sends the current state to the UI. Called on change only, never every frame. */
  private publish(): void {
    const next = this.guards.map((guard, index) =>
      guardSnapshot(this.guardSnapshots[index], {
        id: guard.id,
        name: guard.definition.name,
        color: guardCssColor(guard.definition.color),
        state: guard.state,
        accepting: guard.isAccepting,
        history: guard.history,
        eventTicks: this.eventTicks.get(guard.id)!,
      }),
    );
    // Keep the same array (and therefore the same React props) when no guard changed.
    if (!sameGuards(this.guardSnapshots, next)) this.guardSnapshots = next;

    this.bridge.publish({
      ready: true,
      runId: this.runId,
      paused: this.clock.paused,
      tick: this.tickCount,
      guards: this.guardSnapshots,
      selectedGuardId: this.selectedGuardId,
      capturedBy: this.guards.find((guard) => guard.state === "CAPTURE")?.id ?? null,
    });
  }

  /**
   * Decorations: images over their tiles, never physics objects, so collision is unchanged
   * (see level/decor.ts for the placement rules). Cameras get a slowly blinking light.
   */
  private createDecor(decor: readonly Decor[]): void {
    for (const d of decor) {
      const x = d.col * TILE_SIZE;
      const y = d.row * TILE_SIZE;
      this.add.image(x, y, decorTexture(d.kind)).setOrigin(0).setDepth(DEPTH.decor);
      if (d.kind === "camera") {
        const led = this.add.image(x + 11, y + 8, TEXTURES.led).setOrigin(0).setDepth(DEPTH.decor);
        this.tweens.add({ targets: led, alpha: 0.15, duration: 700, yoyo: true, repeat: -1, delay: (d.col * 97) % 700 });
      }
    }
  }

  /** Draws the level as a tilemap layer whose wall tiles are solid for Arcade Physics. */
  private createTileLayer(level: Level): Phaser.Tilemaps.TilemapLayer {
    const map = this.make.tilemap({ data: buildTileIndices(level), tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TEXTURES.tileset, TEXTURES.tileset, TILE_SIZE, TILE_SIZE, 0, 0);
    const layer = tileset && map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error("Could not create the level's tilemap layer");
    layer.setCollision([...SOLID_TILES]);
    return layer;
  }
}
