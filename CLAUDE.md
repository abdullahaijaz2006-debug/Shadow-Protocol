# Shadow Protocol

Top-down pixel-art stealth game for a Theory of Computation course. NPC guards are driven by
deterministic and nondeterministic finite automata (DFA/NFA). Ships as a **Windows desktop app**
(Tauri 2), not a hosted website.

The developer is a beginner: explain important steps, work incrementally, ask before major changes,
and stop at the end of each milestone with a summary.

## Stack

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 (Rust, `src-tauri/`) using the Windows WebView2 runtime |
| UI | React 19 + TypeScript + Vite |
| Game engine | Phaser **3** (pinned to 3.90.0 — do not upgrade to Phaser 4) |
| Tests | Vitest |

Don't add dependencies without asking.

## Commands

```bash
npm run tauri dev   # launch the desktop app with hot reload (first run compiles Rust, ~1 min+)
npm run typecheck   # TypeScript checks (tsc, no emit)
npm test            # Vitest, single run
npm run test:watch  # Vitest, watch mode
npm run build       # tsc + Vite production build of the frontend → dist/
npm run tauri build # release build + NSIS .exe and MSI installers (src-tauri/target/release/bundle/)
```

The Vite "chunk larger than 500 kB" warning is expected (Phaser is ~1.4 MB) and harmless for a desktop app.

## Architecture

```
src/
  main.tsx, App.tsx, App.css   React entry + page layout (title above the game frame)
  components/                  React UI only. GameCanvas.tsx mounts/destroys the Phaser game.
  game/                        Phaser code only — never imports React.
    constants.ts               Resolution, tile size, PLAYER_SPEED, PLAYER_HITBOX, PHYSICS_DEBUG
    palette.ts                 Color palette for generated pixel art
    createGame.ts              Phaser.Game config (pixelArt, Scale.FIT, Arcade Physics, no gravity)
    textures.ts                Placeholder pixel art drawn in code: one tileset texture + player
    scenes/MainScene.ts        Builds the tilemap layer, world bounds, player and wall collider
    level/                     Pure TS, unit-tested
      levels.ts, parseLevel.ts ASCII level data + parser
      tileLayer.ts             Level → tileset indices (TILE), SOLID_TILES
    geometry.ts                Pure: Vector, distance, angles, turnToward
    bridge.ts                  Pure: GameBridge (snapshots → React, commands → game), GameSnapshot
    snapshot.ts                Pure: per-guard snapshots with identity reuse; HISTORY_DISPLAY_LIMIT
    simulation/SimulationClock.ts  Pure: fixed 1/60 s ticks; pause / resume / step
    level/grid.ts              Pure: LevelGrid (isWalkable/isSolid, worldToTile, tileCenter)
    player/
      movement.ts              Pure: held keys → normalized velocity (unit-tested)
      PlayerControls.ts        WASD + arrow key bindings, Space = noise (Phaser keys, captured)
      Player.ts                Arcade sprite with feet hitbox; sets velocity each frame; freezable
    guard/                     DFA-controlled guards (3B: one; 5A: several)
      guardDfa.ts              Pure: Q, Σ, δ table (GUARD_TRANSITIONS), GUARD_DFA (deep-frozen; q₀ PATROL, F {CAPTURE})
      GuardBrain.ts            Pure: wraps AutomatonRunner; the only source of a guard's state
      guardConfig.ts           GUARD_CONFIG (shared tuning) + GUARDS (id, name, color, label, patrol route)
      guardNfa.ts              Pure: GUARD_NFA, a demonstration NFA (ε-edges, PATROL --sound--> {ALERT, SEARCH});
                               used only by the comparison mode, never by gameplay
      perception.ts            Pure: castRay (grid DDA), hasLineOfSight, canSee, visionPolygon
      PerceptionTracker.ts     Pure: per-frame visibility → one PLAYER_SPOTTED / PLAYER_LOST per change
      OneShotTimer.ts          Pure: fires TIMER_EXPIRED once
      pathfinding.ts           Pure: 8-dir BFS, no corner cutting
      GuardMover.ts            Phaser: follows grid paths with the physics body
      GuardView.ts             Phaser: vision cone + state icon (rendering only)
      Guard.ts                 Phaser: wires perception/timers → DFA → movement/view
    effects/noiseRing.ts       Expanding ring when the player makes a noise
  components/GuardHud.tsx      React HUD: one chip per guard (state); clicking selects the guard
  components/useGameSelector.ts  Subscribe to one slice of the snapshot (fewer re-renders)
  components/RenderCounter.tsx Dev-only React Profiler render counts (window.__renderCounts)
  components/visualizer/       Automaton visualizer (Milestone 4), generic over any DFA or NFA
    graphLayout.ts             Pure: δ edges grouped by (from,to,ε?), edge/loop geometry, ellipse layout
    guardLayout.ts             Node positions + short symbol labels for the guard DFA
    AutomatonGraph.tsx         SVG state graph: current state set, fired edges, inspected edge, dashed ε-edges
    FormalDefinition.tsx       Q, Σ, q₀, F, w and the δ table (sets + ε column for NFAs)
    HistoryPanel.tsx           Transition history; selecting a row is UI-only inspection
    SimulationControls.tsx     Pause / Resume / Step / Next event / Reset → bridge commands
    AutomatonPanel.tsx         Sidebar combining the above (hideable from the header)
  components/comparison/       NFA ⇄ DFA comparison mode (Milestone 5B); header switch "NFA ⇄ DFA"
    comparisonModel.ts         Pure: reducer (step/play/pause/reset/clear/load), compare() via runNFA/runDFA
                               on the same prefix, nfaToDfa result, D0…Dn aliases, presets
    comparisonLayouts.ts       NFA reuses the guard layout; subset DFA on an ellipse; TRAP_STATE "∅"
    ComparisonPanel.tsx        Tape + controls, both graphs + verdicts, traces / subsets / definitions
    ComparisonTraces.tsx, InputTape.tsx
  components/lab/              Automata Lab (Milestone 6; 6A = editor + validation + graph)
    labModel.ts                Pure: LabAutomaton document (stable ids s1/t1…), labReducer, check… functions
    labValidation.ts           Pure: labToAutomaton (names, for the engine), labToGraphAutomaton (ids, for
                               drawing), validateLab = engine validate() mapped to state/transition ids
    labGeometry.ts             Pure: labLayout (user positions, loop sides), transitionEdgeKey
    labPresets.ts              Pure: automatonToLab (deep copy, new ids), autoPositions, LAB_PRESETS (guard DFA/NFA,
                               textbook examples)
    labJson.ts                 Pure: serializeLab / parseLab (format "shadow-protocol/automaton", version 1)
    labSimulation.ts           Pure: parseInputString, simulateLab (runDFA/runNFA on the read prefix, ids for highlights)
    labConversion.ts           Pure: convertLabToDfa (nfaToDfa), checkEquivalence (all strings within a budget)
    labFiles.ts                DOM: download a .json, read a chosen file
    LabScreen.tsx              Toolbar (name, DFA/NFA, tools, presets, undo), editable graph, bottom tabs:
                               Problems / Simulate / NFA → DFA / Save · Load
    LabSidebar.tsx             Selection inspector, Σ, states (q₀/F), δ editor; ValidationPanel.tsx
    LabSimulatePanel.tsx, LabConvertPanel.tsx, LabFilePanel.tsx
    labStore.ts                External store for the Lab document (useSyncExternalStore), created in App and
                               shared with the tutorial challenges; load(lab, label) = undoable outside load
  components/tutorial/         Interactive ToC tutorial (Milestone 7B); header tab + menu button
    content/types.ts, modules.ts  Pure data: 7 modules → pages → blocks (text/math/list/note/widget);
                               stepper examples carry their expected results
    content/pipeline.ts        Per-state behaviour (from GUARD_CONFIG) for the game-AI pipeline page
    content/content.test.ts    Structure, markup, and every stated example re-checked with the engine
    markup.ts                  Pure: tiny inline markup (**bold**, `code`, $math$, *italic*) → tokens
    progress.ts                Pure: current page / visited / solved reducer, localStorage parse
    machines.ts                Automata shown in the tutorial (guard DFA/NFA, examples) + layouts
    subsetSteps.ts             Pure: subset construction as table rows (from nfaToDfa + compiled step)
    challenges.ts              Pure: challenges (reference automaton, tests incl. negatives), checkChallenge
    TutorialScreen.tsx         Contents sidebar, page, Previous / Next / Back, progress, exits
    MachineWidgets.tsx         Graph, definition, stepper, ε-closure, NFA⇄DFA compare, subset widgets
    GuideWidgets.tsx           Perception→DFA→behaviour pipeline, challenge card, Lab challenge banner
    TutorialText.tsx, ChallengeReportView.tsx
  components/simulation/       Shared by the comparison mode and the Lab
    tapeModel.ts               Pure: input tape reducer (append, step, run, play, pause, reset, clear, load)
    TraceTables.tsx            NfaTraceTable (move + ε-closure) and DfaTraceTable
  game/input/typingGuard.ts    Turns the game keyboard off while a text field has focus
  game/art/                    All pixel art, drawn in code (no image assets) — Milestone 7A
    draw.ts                    px(), shade(), makeTexture()
    facing.ts                  Pure: facingFromVelocity / facingFromAngle (visual only)
    characters.ts              4-facing × 3-frame sprite sheets + walk animations (player, guards)
    tiles.ts, decorArt.ts, icons.ts   Tileset, decorations, one icon per guard DFA state
  game/textures.ts             Texture names + generateTextures (hub for game/art)
  game/level/decor.ts          Pure: LEVEL_01_DECOR + placement rules (solid-looking only on walls)
  game/audio/sfx.ts            Generated Web Audio sound effects (no files); configureSound / playSound
  game/effects/feedback.ts     Sound + shake + flash for a transition that already happened
  game/displayOptions.ts       Visual options (vision cones, effects) kept in the Phaser registry
  components/MainMenu.tsx      Start screen: Play, Tutorial, NFA ⇄ DFA, Automata Lab, Settings, Exit (Tauri only)
  components/SettingsDialog.tsx, settings.ts   Settings modal; pure parse/load/save (localStorage)
  components/playerStatus.ts   Pure: HIDDEN / UNDER SEARCH / SPOTTED / CHASED / CAUGHT from guard states
  automata/                    DFA/NFA engine — pure TS, imports only its own files
    types.ts                   5-tuple types (DFA, NFA), EPSILON, StateSet, TransitionRecord
    validate.ts                validateDFA/validateNFA → ValidationIssue[]; assertValid, assertValidInput
    errors.ts                  InvalidAutomatonError (bad definition), InvalidInputError (symbol ∉ Σ)
    dfa.ts                     CompiledDFA, runDFA, completeWithSelfLoops, completeWithTrap
    nfa.ts                     CompiledNFA, epsilonClosure, runNFA
    subsetConstruction.ts      nfaToDfa (reachable subsets only, "∅" trap state). Subsets are keyed
                               internally by state indices; subsetName quotes ambiguous names
                               (`,{}"\∅` or empty) as JSON strings so DFA state names never collide
    runner.ts                  AutomatonRunner: feed/reset/history/replay for DFA or NFA
    examples.ts                Textbook automata (test fixtures, future lab presets)
    testHelpers.ts             allStrings(Σ, n), chars() — tests only
    randomized.test.ts         Seeded random ε-NFAs: runNFA vs a brute-force path search; nfaToDfa vs runNFA
    index.ts                   Public API; other layers import from "automata" only via this
src-tauri/                     Rust shell; no custom commands, no plugins
scripts/make-icon.py           Generates the pixel-art app icon (stdlib only); then `npx tauri icon`
release/Shadow-Protocol-1.0.0/ Distribution folder: installers, README.txt, SHA256SUMS.txt (not source)
```

Automata conventions:
- δ is stored as an **edge list** `{ from, symbol, to }[]` (canonical, editor-friendly). Classes compile it
  into lookup maps; never make the edge list itself a lookup table.
- DFAs must be **complete and deterministic**: missing or duplicate (q, a) pairs are validation errors,
  never silently defaulted. Use `completeWithSelfLoops` / `completeWithTrap` explicitly.
- Input strings are **arrays of symbols** (symbols like `PLAYER_SPOTTED` are multi-character).
  `EPSILON` (`"ε"`) is only a transition label in NFAs, never in Σ or in input.
- State sets are `StateSet` arrays in canonical order (declaration order in Q), so results are
  deterministic and comparable with `toEqual`.
- `boundary.test.ts` fails if any file in `automata/` imports something outside `automata/`.
- Target is ES2020: avoid newer APIs such as `Array.prototype.at`.

Rules:
- **Dependency direction:** `components → game → automata`. `automata/` must stay framework-free so it
  can be unit-tested and shared by the game, the visualizer and the automata lab.
- Keep pure logic (level parsing, automata) out of Phaser classes so it can be tested in Node.
  Files that import `phaser` can't run in plain Vitest (Phaser needs a browser).
- Tests live next to the code they test as `*.test.ts`.
- React owns the container `<div>`; Phaser owns everything inside it. `GameCanvas` must destroy the game
  on unmount (React StrictMode mounts twice in dev).
- Levels are 40×22 tiles (640×352); the camera centers the map in the 360px-tall view.
  Legend: `#` wall, `.` floor, `P` player spawn.
- Wall tiles use a "face" texture when floor is directly below, giving a 3/4 top-down look.
- The map is a Phaser **Tilemap** layer built from a generated tileset; wall collision uses
  `layer.setCollision(SOLID_TILES)`, which ignores interior tile edges (no snagging when sliding along
  walls). Don't replace it with one physics body per wall tile. TILE indices in `tileLayer.ts` must
  match the tileset drawing order in `textures.ts` (both are keyed by the same names).
- The player's hitbox covers only the feet (10×6) so the head can overlap wall faces above, and fits
  1-tile doorways. The camera is fixed (no follow); the physics world bounds equal the map.
- Movement keys are added with capture, so Phaser calls `preventDefault` on them (no page scroll).
  Captures are **global** (window-level): they would also block those keys in text inputs, so the
  automata lab (Milestone 7) must disable keyboard capture while an input has focus.
- Phaser's KeyboardPlugin resets keys on window blur and scene pause/sleep, so keys never stick;
  don't add duplicate blur handling.

Guard conventions:
- The guard's high-level state comes **only** from the DFA (`GuardBrain` → `AutomatonRunner`).
  Never add a parallel `if/switch` state machine; behaviour code reads `guard.state`.
- `Guard.process()` is the only place symbols are fed to the DFA. Every event is edge-triggered
  (PerceptionTracker, OneShotTimer, Space with `NOISE_COOLDOWN_MS`, capture check only in CHASE), so
  the runner never receives per-frame symbols. `enter()` runs entry behaviour and cancels timers.
- `GUARD_TRANSITIONS` is typed `Record<GuardState, Record<GuardSymbol, GuardState>>`, so a missing
  δ entry is a compile error; `guardDfa.test.ts` also validates it with `validateDFA`.
- F = {CAPTURE} is the *formal* accepting set (L(M) = event histories ending in capture); the other
  states are operational. Keep that distinction in UI wording.
- Vision uses sprite centers; navigation, noise and catching use feet (body centers). Sight is
  blocked by walls; hearing is not.

Simulation & UI bridge conventions:
- **All game logic runs in fixed ticks** (`MainScene.simulateTick`, 1/60 s): player input → noise →
  `guard.tick()` → `physics.world.singleStep()`. Arcade Physics uses `customUpdate: true`, so it
  never steps on its own. Anything time-based must use tick deltas (never `time`/`Date.now()`),
  or pausing will not freeze it. Rendering (`guard.render()`) runs every frame.
- Paused = 0 ticks; Step = exactly 1 tick (held/pressed input is applied in it); Next event = ticks
  until the guard history grows (cap 30 s); Reset = `scene.restart` with a fresh DFA run, keeping
  the paused/running mode. Tweens use `timeScale = 0` while paused.
- Timers compare with `TIME_EPSILON_MS` so N ticks of 1000/60 ms fire on exactly ceil(ms/tick).
- **React ↔ game only through `GameBridge`**: React reads `useSyncExternalStore(bridge.subscribe,
  bridge.getSnapshot)` and calls `bridge.send(command)`; the scene drains commands at frame start
  and publishes a new immutable snapshot only on change (events, pause/step/reset). React must
  never import Phaser or reach into game objects. The bridge reaches scenes via the registry
  (`BRIDGE_REGISTRY_KEY`, set in `preBoot`).
- UI buttons use `pressHandler` (blurs after click) so Space/Enter keep going to the game.
- History selection is keyed by `snapshot.runId` + guard id, so it never leaks into another run or guard.

Multiple guards (Milestone 5A):
- Each `Guard` owns all mutable state (runner, tracker, timer, mover, facing, last known position).
  Guards share only the deep-frozen `GUARD_DFA` and `GUARD_CONFIG`. Add guards in `GUARDS`.
- Every tick updates guards in `GUARDS` order (deterministic). Noise is offered to every guard;
  each decides by its own hearing radius. Any guard in CAPTURE freezes the player; others keep
  running their own DFAs.
- Selection (`selectGuard` command, canvas click or HUD chip) is display-only: it sets
  `guard.selected` (ring) and `snapshot.selectedGuardId`, nothing else. It survives Reset.
- **Re-render rules:** `App` doesn't subscribe; components use `useGameSelector` with selectors that
  return snapshot parts as-is. `guardSnapshot()` returns the previous object while a guard has no
  new events, so the panel (selected guard) doesn't re-render for other guards' events.
  `SimulationControls` ignores `tick` while running. Never build new arrays/objects in a selector.
- Snapshots carry at most `HISTORY_DISPLAY_LIMIT` (50) events per guard, with the runner's true step
  numbers; `eventCount` is |w|. The runner itself keeps the full history.
- Phaser `Scene.restart` reuses the scene object: reset every per-run field in `create()`.
NFA ⇄ DFA comparison (Milestone 5B):
- All simulation goes through the Milestone 2 engine (`runNFA`, `runDFA`, `nfaToDfa`, ε-closure);
  never re-implement automata logic in components. `compare()` re-runs both machines on the read
  prefix (inputs are short) and checks the subset invariant `subsets[D state] = N's active set`.
- The comparison is self-contained React state: it never sends bridge commands, so guards are
  unaffected. The game stays mounted and running beside it (narrow column).
- Edges into the trap state ∅ are hidden in the subset-DFA drawing by default (toggle; a live
  edge into ∅ is always drawn); the δ table always lists every transition.
- Wording: nondeterminism = all computation paths at once, never randomness/probability; F marks
  accepted strings, not guard behaviour.

Automata Lab (Milestone 6):
- Transitions, start and accepting refer to **stable state ids**, never names; names are display
  data (unique, non-empty, not ε). Ids come from `nextId` and are never reused.
- `labReducer` refuses edits its `check…` functions refuse (returns the same object); a second
  target for the same (q, a) in DFA mode is *allowed* so validation can show nondeterminism.
  Removing a symbol or switching NFA→DFA keeps transitions; validation flags them.
- Validation is always the engine's `validate()`; the Lab only maps issues to ids and adds its own
  editor rules that an imported file can break: NO_START, BAD_STATE_NAME (empty or ε) and BAD_SYMBOL
  (empty, or containing a space/comma, so it could never be typed as input). `parseLab` dedupes F. Missing-state references become `⟨missing id⟩` names so the engine reports them.
- The graph draws `labToGraphAutomaton` (ids as states, names via `stateLabel`); `AutomatonGraph`'s
  `interaction` prop provides selection/drag/connect pointer events in viewBox coordinates.
- The Lab is always mounted (hidden when not active) so work survives mode switches. Entering it
  pauses the game if it was running and sends `setKeyboardEnabled: false`; leaving undoes both.
  The game column is moved off-screen (not display:none) so Phaser keeps a real size.
- Simulation, conversion and equivalence all call the engine; the Lab simulates only when
  `validateLab` reports nothing. Presets are deep copies (`automatonToLab`), never the frozen
  originals. Loading checks only the file's shape: semantic problems load and are shown by validation.
- Replacing the whole document (preset, file, conversion, undo) goes through `replaceDocument`,
  which keeps a one-step undo, clears the tape and bumps `documentVersion` (resets the simulator UI).
- Saving uses a browser download (no Tauri dialog plugin, to avoid a new dependency).
- Phaser key captures are global; `typingGuard` disables `game.input.keyboard` while an
  input/textarea/select has focus. In-app scripts must scope selectors (e.g. `.automaton-panel`),
  because the hidden Lab's graph is also in the DOM.

Visual polish (Milestone 7A):
- Visuals and sound only *read* game state. `Player.render()` / `Guard.render(display)` run every
  frame; `transitionFeedback` runs on transitions after a tick. None of them feed DFA events, touch
  timers or move bodies. Keep it that way.
- Sprites are sheets: always create them with a 16×16 frame (`characterFrame("down")`), never the
  whole sheet, or the 10×6 hitbox offset breaks. Frames: "down-0".."right-2"; walk anims
  `${sheet}-walk-${facing}`. Pausing pauses tweens (timeScale 0) and animations (anims.pauseAll).
- Decorations are images, never physics bodies; `validateDecor` enforces: crates/terminals/racks/
  cameras on wall tiles only (faces where needed), vents/hazards on floor only.
- The app opens on the main menu. The UI pauses the game and disables its keys whenever it is out
  of sight (menu, tutorial, lab), re-applied on every new run (`runId`). `?start=game|tutorial|compare|lab`
  skips the menu (used by the in-app verification scripts).
- Exit uses `getCurrentWindow().close()`
  (capability `core:window:allow-close`) and is shown only when `isTauri()`.
- Settings (`shadow-protocol.settings` in localStorage): sound, volume, vision cones, animations.
  Animations off → `reduce-motion` class (CSS) and `effects: false` (no shake/flash/icon motion).
  Dev builds log played sounds to `window.__sfxLog`; set volume 0 for silent automated runs.

Tutorial (Milestone 7B):
- Content is data (`content/modules.ts`), rendered by TutorialScreen; never put logic in content.
  Every claim a widget demonstrates (stepper verdicts/final states, subset counts) is re-checked by
  `content.test.ts` with the engine, so changing a machine breaks a test instead of the lesson.
- Widgets only call the engine and reuse visualizer/comparison/simulation components; no automata
  logic in the tutorial. The pipeline widget uses its own `AutomatonRunner(GUARD_DFA)` and never
  touches the game's guards (the game is paused while the tutorial is shown).
- Challenges are solved in the real Lab: "Start" loads `challengeStarter` through `LabStore.load`
  (undoable) and shows `ChallengeBanner`. `checkChallenge` = validateLab + kind/Σ/state limits +
  hand-picked tests (with negatives) + agreement with a reference on all strings up to
  `exhaustiveLength`. UI wording must say this is **testing, not a proof**.
- Progress (`shadow-protocol.tutorial` in localStorage): current page, visited pages, solved ids.
- Effects must use block bodies: in WebView2 `element.scrollTo()` returns a Promise, which React
  would treat as a clean-up function (crashes the whole tree).

- After changing a body's size/offset, call `body.updateFromGameObject()` (not `body.reset()`,
  which ignores the offset) so positions are right before the first physics step.

## Milestones

1. ✅ **Project setup** — Tauri + React + TS + Phaser 3 + Vitest; folder structure; static scene with
   floor, walls and player placeholder; title above game; app launches with `npm run tauri dev`.
2. ✅ **Automata engine** — DFA and NFA types, validation, step/run simulation, NFA ε-closure,
   subset construction (NFA → DFA), completion helpers, runner with history and replay; Vitest coverage.
   No game integration yet.
3. **Player movement**
   - ✅ 3A: WASD/arrow movement, normalized diagonals, Arcade tilemap collision, world bounds, fixed
     camera, no key scrolling, focus-loss handling, controls hint.
   - ✅ 3B: one DFA-controlled guard (PATROL/ALERT/CHASE/SEARCH/CAPTURE), vision cone with
     line of sight, noise (Space), BFS pathfinding, HUD, R to restart.
4. ✅ **Live DFA visualizer** — state graph from δ with current state / last transition highlighted,
   transition history panel (with inspection), formal 5-tuple + δ table, pause / resume / step /
   next event / reset on a fixed-tick simulation.
5. **More guards and automata**
   - ✅ 5A: three independent DFA guards (G1–G3) with own routes, colors and numbers; select by
     clicking a guard or its HUD chip; visualizer follows the selection; capped history.
   - ✅ 5B: NFA ⇄ DFA comparison mode — a demonstration NFA with ε-edges vs. its subset DFA on the
     same input, step / play / pause / reset, active sets, traces, verdicts.
   - Not started: NFA-controlled gameplay.
6. **Automata Laboratory**
   - ✅ 6A: editor (states, Σ, δ, q₀, F, DFA/NFA, ε), interactive graph, engine validation.
   - ✅ 6B: string simulator (Step/Run/Reset, active state / set, trace), NFA→DFA conversion with an
     equivalence check, presets (incl. the guard DFA), JSON save/load with positions, undo.
7. **Polish and release**
   - ✅ 7A: animated characters, state icons + feedback, refined tiles, decorations, optional vision
     cones, player status HUD, main menu, settings, generated sound effects, consistent panels.
   - ✅ 7B: interactive tutorial (7 modules, 18 pages): 5-tuple, DFA/NFA steppers, ε-closure,
     DFA vs NFA, step-by-step subset construction, game-AI pipeline, 4 Lab challenges checked by tests.
   - ✅ 7C.1: audit, regression tests (random ε-NFAs, Lab import rules, minimality proofs of tutorial
     claims), stability checks (navigation, long runs, large graphs, min window), production smoke test.
   - ✅ 7C.2: version 1.0.0, pixel-art icon, NSIS (per-user, no admin) + MSI installers, embedded
     WebView2 bootstrapper, no updater, CSP; installed-app checks; distribution folder.

Packaging (Milestone 7C.2):
- Version lives in three places: package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json.
- The CSP (tauri.conf.json) allows only 'self', inline styles (React style props), data:/blob:
  images and media (Phaser textures, Lab downloads) and Tauri IPC. Re-test the installed app after
  changing it: CSP violations only appear in the release build.
- Lab saving is a browser download into Downloads; WebView2 user data lives in
  %LOCALAPPDATA%/com.shadow-protocol.game (kept on uninstall unless the user ticks the box).
