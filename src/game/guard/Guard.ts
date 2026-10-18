import type Phaser from "phaser";
import type { TransitionRecord } from "../../automata";
import { DEPTH, PLAYER_HITBOX } from "../constants";
import { angleBetween, distance, turnToward, type Vector } from "../geometry";
import type { LevelGrid } from "../level/grid";
import { characterFrame } from "../art/characters";
import type { DisplayOptions } from "../displayOptions";
import { generateGuardTexture } from "../textures";
import { GuardBrain } from "./GuardBrain";
import { GUARD_CONFIG, type GuardDefinition } from "./guardConfig";
import type { GuardState, GuardSymbol } from "./guardDfa";
import { GuardMover } from "./GuardMover";
import { GuardView } from "./GuardView";
import { OneShotTimer } from "./OneShotTimer";
import { canSee, visionPolygon, type VisionConfig } from "./perception";
import { PerceptionTracker } from "./PerceptionTracker";

const DEGREES = Math.PI / 180;
const VISION: VisionConfig = { radius: GUARD_CONFIG.visionRadius, fovRadians: GUARD_CONFIG.fovDegrees * DEGREES };

/** Where the player is this frame: `center` for being seen, `feet` for navigation and catching. */
export interface PlayerSnapshot {
  readonly center: Vector;
  readonly feet: Vector;
}

/**
 * One guard NPC. Every instance owns all of its mutable state (runner, perception tracker, timer,
 * mover, facing, last known position); guards share only the immutable GUARD_DFA and GUARD_CONFIG.
 *
 * Wires the separate parts together:
 *   perception (PerceptionTracker, canSee) and timers  →  DFA events
 *   GuardBrain (the Milestone 2 DFA runner)            →  the high-level state
 *   GuardMover                                         →  movement for that state
 *   GuardView                                          →  rendering
 * `process` is the only place events reach the DFA, and every behaviour decision reads `this.state`.
 */
export class Guard {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private readonly brain = new GuardBrain();
  private readonly tracker = new PerceptionTracker(GUARD_CONFIG.lostDelayMs);
  private readonly timer = new OneShotTimer();
  private readonly mover: GuardMover;
  private readonly view: GuardView;

  private facing = 0;
  private routeIndex = 1;
  /** Where the player was last seen or heard (feet position). */
  private lastKnown: Vector | null = null;
  /** Set while standing at the search spot, sweeping the view left and right. */
  private lookAround: { baseFacing: number; elapsedMs: number } | null = null;
  private repathInMs = 0;

  /** Shown in the visualizer when true (drawn as a ring at the guard's feet). */
  selected = false;

  constructor(
    scene: Phaser.Scene,
    private readonly grid: LevelGrid,
    readonly definition: GuardDefinition,
  ) {
    const route = definition.patrolRoute;
    const spawn = grid.tileCenter(route[0]);
    const sheet = generateGuardTexture(scene, definition.id, definition.color, definition.label);
    // Always a 16×16 frame (never the whole sheet), so the hitbox offset below is unchanged.
    this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, sheet, characterFrame("down")).setDepth(DEPTH.actors);
    this.sprite.body
      .setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height, false)
      .setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);
    // Apply the new hitbox now, not at the first physics step (matters when a level starts paused).
    this.sprite.body.updateFromGameObject();
    this.mover = new GuardMover(this.sprite.body, grid);
    this.view = new GuardView(scene, this.sprite, definition.color, sheet);
    this.facing = angleBetween(spawn, grid.tileCenter(route[1]));
    this.enter("PATROL");
  }

  get id(): string {
    return this.definition.id;
  }

  /** The current DFA state. */
  get state(): GuardState {
    return this.brain.state;
  }

  /** Is the DFA's input so far in L(M)? */
  get isAccepting(): boolean {
    return this.brain.isAccepting;
  }

  /** The DFA's transition history (every processed event). */
  get history(): readonly TransitionRecord[] {
    return this.brain.history;
  }

  /** The player made a noise at `source`; heard if within the hearing radius. */
  hearNoise(source: Vector): void {
    if (this.state === "CAPTURE" || distance(this.mover.position, source) > GUARD_CONFIG.hearingRadius) return;
    this.lastKnown = { ...source };
    this.process("SOUND_HEARD");
  }

  /**
   * One simulation tick, in a fixed order: perception → state behaviour (incl. the capture check)
   * → timer → steering. Any events produced are fed to the DFA immediately, in that order.
   * Called only from the scene's simulation loop, so nothing here runs while paused.
   */
  tick(deltaMs: number, player: PlayerSnapshot): void {
    if (this.state !== "CAPTURE") {
      this.perceive(deltaMs, player);
      this.act(deltaMs, player);
      if (this.timer.update(deltaMs)) this.process("TIMER_EXPIRED");
    }
    this.mover.update();
    this.updateFacing(deltaMs);
  }

  /** Draws the guard (sprite, vision cone, state icon). Called every frame, even while paused; reads only. */
  render(display: DisplayOptions): void {
    const eye = this.eye;
    this.view.update(
      {
        state: this.state,
        eye,
        visible: display.visionCones ? visionPolygon(eye, this.facing, VISION, this.grid.isSolid) : [],
        facing: this.facing,
        moving: this.mover.heading !== null,
        selected: this.selected,
      },
      display,
    );
  }

  private get eye(): Vector {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /** Perception → at most one PLAYER_SPOTTED / PLAYER_LOST event per change (never per frame). */
  private perceive(deltaMs: number, player: PlayerSnapshot): void {
    const visible = canSee(this.eye, this.facing, player.center, VISION, this.grid.isSolid);
    if (visible) this.lastKnown = { ...player.feet };
    const symbol = this.tracker.update(visible, deltaMs);
    if (symbol) this.process(symbol);
  }

  /** Per-frame behaviour for the current DFA state. */
  private act(deltaMs: number, player: PlayerSnapshot): void {
    switch (this.state) {
      case "PATROL":
        if (this.mover.arrived) {
          this.routeIndex = (this.routeIndex + 1) % this.definition.patrolRoute.length;
          this.goToWaypoint();
        }
        break;
      case "CHASE":
        this.repathInMs -= deltaMs;
        if (this.lastKnown && (this.repathInMs <= 0 || this.mover.arrived)) {
          this.mover.goTo(this.lastKnown, GUARD_CONFIG.speeds.CHASE);
          this.repathInMs = GUARD_CONFIG.chaseRepathMs;
        }
        if (distance(this.mover.position, player.feet) <= GUARD_CONFIG.catchDistance) {
          this.lastKnown = { ...player.feet };
          this.process("PLAYER_CAUGHT");
        }
        break;
      case "SEARCH":
        if (this.mover.arrived && !this.lookAround) {
          this.lookAround = { baseFacing: this.facing, elapsedMs: 0 };
          this.timer.arm(GUARD_CONFIG.searchLookAroundMs);
        }
        break;
      case "ALERT":
      case "CAPTURE":
        break;
    }
  }

  /** The only way events reach the DFA. Runs the entry behaviour when the state changes. */
  private process(symbol: GuardSymbol): void {
    const record = this.brain.process(symbol);
    const from = record.from[0] as GuardState;
    const to = record.to[0] as GuardState;
    if (from !== to) this.enter(to);
    else if (to === "SEARCH" && symbol === "SOUND_HEARD") this.enter("SEARCH"); // investigate the new sound
  }

  /** Entry behaviour for a DFA state. Any pending timer belongs to the old state, so cancel it. */
  private enter(state: GuardState): void {
    this.timer.cancel();
    this.lookAround = null;
    switch (state) {
      case "PATROL":
        this.goToWaypoint();
        break;
      case "ALERT":
        this.mover.stop();
        this.timer.arm(GUARD_CONFIG.alertReactionMs);
        break;
      case "CHASE":
        this.repathInMs = 0;
        break;
      case "SEARCH":
        if (!this.lastKnown || !this.mover.goTo(this.lastKnown, GUARD_CONFIG.speeds.SEARCH)) this.mover.stop();
        break;
      case "CAPTURE":
        this.mover.stop();
        break;
    }
  }

  private goToWaypoint(): void {
    this.mover.goTo(this.grid.tileCenter(this.definition.patrolRoute[this.routeIndex]), GUARD_CONFIG.speeds.PATROL);
  }

  private updateFacing(deltaMs: number): void {
    let desired = this.facing;
    const state = this.state;
    if ((state === "ALERT" || state === "CHASE" || state === "CAPTURE") && this.lastKnown) {
      // Keep looking at the player (or where they were last seen).
      if (distance(this.mover.position, this.lastKnown) > 2) desired = angleBetween(this.mover.position, this.lastKnown);
    } else if (this.lookAround) {
      this.lookAround.elapsedMs += deltaMs;
      desired = this.lookAround.baseFacing + Math.sin(this.lookAround.elapsedMs / 600) * 70 * DEGREES;
    } else if (this.mover.heading !== null) {
      desired = this.mover.heading;
    }
    this.facing = turnToward(this.facing, desired, (GUARD_CONFIG.turnRateDegrees * DEGREES * deltaMs) / 1000);
  }
}
