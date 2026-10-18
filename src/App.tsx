import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { memo, useEffect, useReducer, useRef, useState } from "react";
import { ComparisonPanel } from "./components/comparison/ComparisonPanel";
import { GameCanvas } from "./components/GameCanvas";
import { GuardHud } from "./components/GuardHud";
import { LabScreen } from "./components/lab/LabScreen";
import { LabStore } from "./components/lab/labStore";
import { MainMenu } from "./components/MainMenu";
import { RenderCounter } from "./components/RenderCounter";
import { loadSettings, saveSettings, type AppSettings } from "./components/settings";
import { SettingsDialog } from "./components/SettingsDialog";
import { CHALLENGES, challengeStarter } from "./components/tutorial/challenges";
import { ChallengeBanner } from "./components/tutorial/GuideWidgets";
import { parseProgress, PROGRESS_STORAGE_KEY, progressReducer, type ProgressAction, type TutorialProgress } from "./components/tutorial/progress";
import { TUTORIAL_PAGE_IDS, TutorialScreen } from "./components/tutorial/TutorialScreen";
import { useGameSelector } from "./components/useGameSelector";
import { AutomatonPanel } from "./components/visualizer/AutomatonPanel";
import { pressHandler } from "./components/visualizer/pressHandler";
import { configureSound } from "./game/audio/sfx";
import { GameBridge } from "./game/bridge";
import "./App.css";

// The game canvas never needs to re-render after mounting.
const StableGameCanvas = memo(GameCanvas);

/**
 * "menu": the start screen; "game": play with the guard visualizer; "compare": the NFA ⇄ DFA
 * demonstration beside a smaller game; "lab": the Automata Lab. The game stays mounted in every
 * mode, and is paused (with its keys off) while it is out of sight (menu, lab).
 */
type Mode = "menu" | "game" | "tutorial" | "compare" | "lab";

const MODES: readonly [Exclude<Mode, "menu">, string][] = [
  ["game", "Game · guard DFAs"],
  ["tutorial", "Tutorial"],
  ["compare", "NFA ⇄ DFA"],
  ["lab", "Automata Lab"],
];

/** `?start=game|compare|lab` opens a screen directly (handy for development and automated checks). */
function initialMode(): Mode {
  const start = new URLSearchParams(window.location.search).get("start");
  return start === "game" || start === "tutorial" || start === "compare" || start === "lab" ? start : "menu";
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * App does not subscribe to the game's state (only to `ready` / `runId`): each component below
 * subscribes to the slice of the snapshot it shows (see useGameSelector), so gameplay re-renders
 * as little as possible.
 */
function App() {
  // One bridge for the app's lifetime: the game publishes snapshots into it, the UI sends commands.
  const [bridge] = useState(() => new GameBridge());
  // The Automata Lab's document (shared, so the upcoming tutorial challenges can use the Lab).
  const [labStore] = useState(() => new LabStore());
  const [panelOpen, setPanelOpen] = useState(true);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(browserStorage()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ready = useGameSelector(bridge, (s) => s.ready);
  const runId = useGameSelector(bridge, (s) => s.runId);
  // Whether the UI paused a running game because it went out of sight (so coming back resumes it).
  const pausedByUi = useRef(false);
  const gameVisible = mode === "game" || mode === "compare";

  // Tutorial progress (current page, pages read, challenges solved), saved locally.
  const [progress, progressDispatch] = useReducer(
    (state: TutorialProgress, action: ProgressAction) => progressReducer(state, action, TUTORIAL_PAGE_IDS),
    undefined,
    () => {
      try {
        return parseProgress(browserStorage()?.getItem(PROGRESS_STORAGE_KEY) ?? null, TUTORIAL_PAGE_IDS);
      } catch {
        return parseProgress(null, TUTORIAL_PAGE_IDS);
      }
    },
  );
  useEffect(() => {
    try {
      browserStorage()?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Progress that cannot be saved is not worth interrupting the user.
    }
  }, [progress]);

  // A tutorial challenge being worked on in the Lab (shows a banner there).
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);
  const startChallenge = (id: string) => {
    const challenge = CHALLENGES.find((c) => c.id === id);
    if (!challenge) return;
    labStore.load(challengeStarter(challenge), `Started Challenge ${challenge.number}: ${challenge.title}`);
    setActiveChallenge(id);
    setMode("lab");
  };

  // Settings: sound, motion, and the game's purely visual options.
  useEffect(() => {
    configureSound({ enabled: settings.sound, volume: settings.volume });
    document.documentElement.classList.toggle("reduce-motion", !settings.animations);
    saveSettings(settings, browserStorage());
  }, [settings]);
  useEffect(() => {
    if (ready) bridge.send({ type: "setDisplayOptions", visionCones: settings.visionCones, effects: settings.animations });
  }, [bridge, ready, runId, settings.visionCones, settings.animations]);

  // Pause the game (and switch its keys off) whenever it is out of sight; undo that when it is back.
  // Re-applied on every new level run, because a starting level discards commands sent before it
  // existed (e.g. React's development double mount creates the game twice).
  useEffect(() => {
    if (!ready) return;
    if (!gameVisible) {
      if (!bridge.getSnapshot().paused) {
        bridge.send({ type: "pause" });
        pausedByUi.current = true;
      }
      bridge.send({ type: "setKeyboardEnabled", enabled: false });
    } else {
      bridge.send({ type: "setKeyboardEnabled", enabled: true });
      if (pausedByUi.current) bridge.send({ type: "resume" });
      pausedByUi.current = false;
    }
  }, [bridge, ready, runId, gameVisible]);

  const exit = isTauri() ? () => void getCurrentWindow().close() : undefined;

  return (
    <main className={`app app-${mode}`}>
      <header className="app-header">
        <div className="mode-switch" role="tablist" aria-label="Mode">
          <button type="button" className="tab" title="Back to the main menu" onClick={pressHandler(() => setMode("menu"))}>
            ☰ Menu
          </button>
          {MODES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={`tab${mode === value ? " tab-selected" : ""}`}
              onClick={pressHandler(() => setMode(value))}
            >
              {label}
            </button>
          ))}
        </div>
        <h1 className="title">SHADOW PROTOCOL</h1>
        <div className="header-actions">
          {mode === "game" && (
            <button type="button" className="panel-toggle" aria-expanded={panelOpen} onClick={pressHandler(() => setPanelOpen((open) => !open))}>
              {panelOpen ? "Hide automaton ▸" : "◂ Show automaton"}
            </button>
          )}
          <button type="button" title="Settings" aria-label="Settings" onClick={pressHandler(() => setSettingsOpen(true))}>
            ⚙
          </button>
        </div>
      </header>

      <div className={`workspace workspace-${mode}`}>
        <div className="play-area" aria-hidden={!gameVisible}>
          <RenderCounter id="hud">
            <GuardHud bridge={bridge} />
          </RenderCounter>
          <section className="game-frame">
            <RenderCounter id="canvas">
              <StableGameCanvas bridge={bridge} />
            </RenderCounter>
          </section>
          <footer className="controls-hint">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> / <kbd>↑</kbd>
              <kbd>←</kbd>
              <kbd>↓</kbd>
              <kbd>→</kbd> move
            </span>
            <span>
              <kbd>Space</kbd> make noise
            </span>
            <span>
              <kbd>R</kbd> restart
            </span>
          </footer>
        </div>
        {mode === "game" && panelOpen && (
          <RenderCounter id="panel">
            <AutomatonPanel bridge={bridge} />
          </RenderCounter>
        )}
        {mode === "compare" && (
          <RenderCounter id="compare">
            <ComparisonPanel />
          </RenderCounter>
        )}
        {/* Always mounted, so the Lab keeps its work when you switch modes. */}
        <LabScreen
          active={mode === "lab"}
          store={labStore}
          banner={
            activeChallenge && (
              <ChallengeBanner
                key={activeChallenge}
                challengeId={activeChallenge}
                labStore={labStore}
                onSolved={(id) => progressDispatch({ type: "solved", challengeId: id })}
                onBack={() => setMode("tutorial")}
                onClose={() => setActiveChallenge(null)}
              />
            )
          }
        />
        {mode === "tutorial" && (
          <TutorialScreen
            progress={progress}
            dispatch={progressDispatch}
            labStore={labStore}
            onBack={() => setMode("menu")}
            onPlay={() => setMode("game")}
            onLab={() => setMode("lab")}
            onStartChallenge={startChallenge}
          />
        )}
      </div>

      {mode === "menu" && (
        <MainMenu
          onPlay={() => setMode("game")}
          onCompare={() => setMode("compare")}
          onTutorial={() => setMode("tutorial")}
          onLab={() => setMode("lab")}
          onSettings={() => setSettingsOpen(true)}
          onExit={exit}
        />
      )}
      {settingsOpen && <SettingsDialog settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}

export default App;
