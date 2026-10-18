import { useEffect, useRef, type Dispatch } from "react";
import type { LabStore } from "../lab/labStore";
import { pressHandler } from "../visualizer/pressHandler";
import { TUTORIAL, TUTORIAL_PAGES } from "./content/modules";
import type { Widget } from "./content/types";
import { ChallengeWidget, PipelineWidget } from "./GuideWidgets";
import { ClosureWidget, CompareWidget, DefinitionWidget, GraphWidget, StepperWidget, SubsetWidget } from "./MachineWidgets";
import { completion, type ProgressAction, type TutorialProgress } from "./progress";
import { TextBlock } from "./TutorialText";

export const TUTORIAL_PAGE_IDS = TUTORIAL_PAGES.map(({ page }) => page.id);

interface TutorialScreenProps {
  readonly progress: TutorialProgress;
  readonly dispatch: Dispatch<ProgressAction>;
  readonly labStore: LabStore;
  /** Leave the tutorial (to the main menu). */
  readonly onBack: () => void;
  readonly onPlay: () => void;
  readonly onLab: () => void;
  /** Load a challenge's starting automaton into the Lab and open it. */
  readonly onStartChallenge: (challengeId: string) => void;
}

/** The interactive Theory of Computation tutorial. Content is data (content/); this only presents it. */
export function TutorialScreen({ progress, dispatch, labStore, onBack, onPlay, onLab, onStartChallenge }: TutorialScreenProps) {
  const { module, page } = TUTORIAL_PAGES[progress.current];
  const body = useRef<HTMLDivElement>(null);
  const isFirst = progress.current === 0;
  const isLast = progress.current === TUTORIAL_PAGES.length - 1;
  const done = Math.round(completion(progress, TUTORIAL_PAGE_IDS) * 100);

  // A new page starts at its top. (A block body: newer Chromium returns a Promise from scrollTo,
  // and React treats anything an effect returns as its clean-up function.)
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [progress.current]);

  const widget = (w: Widget, key: number) => {
    switch (w.type) {
      case "graph":
        return <GraphWidget key={key} machine={w.machine} />;
      case "definition":
        return <DefinitionWidget key={key} machine={w.machine} />;
      case "stepper":
        return <StepperWidget key={`${page.id}-${key}`} machine={w.machine} examples={w.examples} />;
      case "closure":
        return <ClosureWidget key={`${page.id}-${key}`} machine={w.machine} />;
      case "compare":
        return <CompareWidget key={key} />;
      case "subset":
        return <SubsetWidget key={`${page.id}-${key}`} machine={w.machine} />;
      case "pipeline":
        return <PipelineWidget key={key} />;
      case "challenge":
        return (
          <ChallengeWidget
            key={w.challengeId}
            challengeId={w.challengeId}
            labStore={labStore}
            solved={progress.solved.includes(w.challengeId)}
            onStart={onStartChallenge}
            onSolved={(id) => dispatch({ type: "solved", challengeId: id })}
          />
        );
    }
  };

  return (
    <section className="tutorial" aria-label="Tutorial">
      <nav className="tut-toc" aria-label="Tutorial contents">
        <h2 className="panel-title">TUTORIAL</h2>
        <p className="tut-progress-text" data-testid="tutorial-completion">
          {done}% read · {progress.solved.length} challenge{progress.solved.length === 1 ? "" : "s"} solved
        </p>
        <ol className="tut-modules">
          {TUTORIAL.map((m) => (
            <li key={m.id} className={m.id === module.id ? "tut-module-current" : undefined}>
              <span className="tut-module-title">
                {m.number}. {m.title}
              </span>
              <ol className="tut-pages">
                {m.pages.map((p) => {
                  const index = TUTORIAL_PAGE_IDS.indexOf(p.id);
                  const challenge = p.blocks.find((b) => b.kind === "widget" && b.widget.type === "challenge");
                  const solved = challenge?.kind === "widget" && challenge.widget.type === "challenge" && progress.solved.includes(challenge.widget.challengeId);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`link-button tut-page-link${index === progress.current ? " tut-page-current" : ""}`}
                        aria-current={index === progress.current ? "page" : undefined}
                        onClick={pressHandler(() => dispatch({ type: "goto", index }))}
                      >
                        <span className="tut-check">{solved ? "★" : progress.visited.includes(p.id) ? "✓" : "·"}</span>
                        {p.title}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
        <div className="tut-exits">
          <button type="button" onClick={pressHandler(onPlay)}>
            ▶ Play the game
          </button>
          <button type="button" onClick={pressHandler(onLab)}>
            Open the Automata Lab
          </button>
        </div>
      </nav>

      <article className="tut-main">
        <header className="tut-header">
          <p className="tut-kicker">
            Module {module.number} of {TUTORIAL.length} · {module.title}
          </p>
          <h2 className="tut-title" data-testid="tutorial-title">
            {page.title}
          </h2>
        </header>
        <div className="tut-body" ref={body}>
          {page.blocks.map((block, i) => (block.kind === "widget" ? widget(block.widget, i) : <TextBlock key={i} block={block} />))}
        </div>
        <footer className="tut-footer">
          <button type="button" onClick={pressHandler(onBack)}>
            ← Back
          </button>
          <button type="button" disabled={isFirst} onClick={pressHandler(() => dispatch({ type: "previous" }))}>
            ◂ Previous
          </button>
          <div className="tut-progress" aria-label={`Page ${progress.current + 1} of ${TUTORIAL_PAGES.length}`}>
            <div className="tut-progress-bar" style={{ width: `${((progress.current + 1) / TUTORIAL_PAGES.length) * 100}%` }} />
            <span data-testid="tutorial-position">
              page {progress.current + 1} of {TUTORIAL_PAGES.length}
            </span>
          </div>
          <button type="button" className="menu-primary" disabled={isLast} onClick={pressHandler(() => dispatch({ type: "next" }))}>
            Next ▸
          </button>
        </footer>
      </article>
    </section>
  );
}
