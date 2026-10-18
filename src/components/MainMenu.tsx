import { pressHandler } from "./visualizer/pressHandler";

interface MainMenuProps {
  readonly onPlay: () => void;
  readonly onTutorial: () => void;
  readonly onCompare: () => void;
  readonly onLab: () => void;
  readonly onSettings: () => void;
  /** Only offered inside the desktop app (a browser tab cannot close itself). */
  readonly onExit?: () => void;
}

/** The start screen. Every button leads somewhere that works. */
export function MainMenu({ onPlay, onTutorial, onCompare, onLab, onSettings, onExit }: MainMenuProps) {
  return (
    <section className="main-menu" aria-label="Main menu">
      <div className="menu-card">
        <h1 className="title menu-title">SHADOW PROTOCOL</h1>
        <p className="menu-tagline">A stealth game run by finite automata</p>
        <nav className="menu-buttons">
          <button type="button" className="menu-button menu-primary" onClick={pressHandler(onPlay)}>
            ▶ Play
            <span>Sneak past three DFA-controlled guards</span>
          </button>
          <button type="button" className="menu-button" onClick={pressHandler(onTutorial)}>
            Tutorial
            <span>Learn DFAs and NFAs from the game's own guards, then solve challenges</span>
          </button>
          <button type="button" className="menu-button" onClick={pressHandler(onCompare)}>
            NFA ⇄ DFA
            <span>Watch nondeterminism and the subset construction</span>
          </button>
          <button type="button" className="menu-button" onClick={pressHandler(onLab)}>
            Automata Lab
            <span>Build, test and convert your own DFAs and NFAs</span>
          </button>
          <button type="button" className="menu-button" onClick={pressHandler(onSettings)}>
            Settings
            <span>Sound, vision cones, animations</span>
          </button>
          {onExit && (
            <button type="button" className="menu-button menu-exit" onClick={pressHandler(onExit)}>
              Exit
            </button>
          )}
        </nav>
        <p className="menu-footer">Theory of Computation project · every guard is a DFA you can inspect</p>
      </div>
    </section>
  );
}
