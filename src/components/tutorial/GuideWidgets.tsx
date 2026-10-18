import { useState } from "react";
import { AutomatonRunner } from "../../automata";
import { GUARD_DFA, GUARD_SYMBOLS, type GuardState, type GuardSymbol } from "../../game/guard/guardDfa";
import type { LabStore } from "../lab/labStore";
import { AutomatonGraph } from "../visualizer/AutomatonGraph";
import { pressHandler } from "../visualizer/pressHandler";
import { CHALLENGES, checkChallenge, type ChallengeReport } from "./challenges";
import { ChallengeReportView } from "./ChallengeReportView";
import { GUARD_BEHAVIOUR } from "./content/pipeline";
import { MACHINES } from "./machines";
import { Inline } from "./TutorialText";

/** Module 6: send events to a guard DFA (the engine's AutomatonRunner) and see what each subsystem does. */
export function PipelineWidget() {
  const [runner] = useState(() => new AutomatonRunner(GUARD_DFA));
  const [, rerender] = useState(0);
  const state = runner.current[0] as GuardState;
  const last = runner.history[runner.history.length - 1];
  const behaviour = GUARD_BEHAVIOUR[state];
  const m = MACHINES.guardDfa;
  const send = (symbol: GuardSymbol) => {
    runner.feed(symbol);
    rerender((n) => n + 1);
  };

  return (
    <div className="tut-widget">
      <div className="tut-pipeline">
        <div className="tut-stage">
          <h4>1 · Perception</h4>
          <p>Continuous checks become one symbol per change:</p>
          <div className="tut-events">
            {GUARD_SYMBOLS.map((symbol) => (
              <button key={symbol} type="button" onClick={pressHandler(() => send(symbol))}>
                {symbol}
              </button>
            ))}
          </div>
          <button type="button" className="link-button" onClick={pressHandler(() => (runner.reset(), rerender((n) => n + 1)))}>
            reset to PATROL
          </button>
        </div>
        <div className="tut-stage tut-stage-dfa">
          <h4>2 · DFA (decides the state)</h4>
          <AutomatonGraph
            automaton={GUARD_DFA}
            layout={m.layout}
            viewBox={m.viewBox}
            current={[state]}
            live={last ? [...last.edges] : []}
            symbolLabel={m.symbolLabel}
            className="tut-graph"
          />
          <p className="tut-status" data-testid="pipeline-state">
            {last ? `δ(${last.from[0]}, ${last.symbol}) = ${state}` : `start state: ${state}`}
          </p>
        </div>
        <div className="tut-stage">
          <h4>3 · Game code (reads the state)</h4>
          <dl className="formal-list tut-behaviour" data-testid="pipeline-behaviour">
            <dt>move</dt>
            <dd>{behaviour.movement}</dd>
            <dt>sense</dt>
            <dd>{behaviour.perception}</dd>
            <dt>show</dt>
            <dd>{behaviour.presentation}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

interface ChallengeWidgetProps {
  readonly challengeId: string;
  readonly labStore: LabStore;
  readonly solved: boolean;
  readonly onStart: (challengeId: string) => void;
  readonly onSolved: (challengeId: string) => void;
}

/** A challenge card: the task, hints, and checking the automaton currently in the Lab. */
export function ChallengeWidget({ challengeId, labStore, solved, onStart, onSolved }: ChallengeWidgetProps) {
  const challenge = CHALLENGES.find((c) => c.id === challengeId)!;
  const [report, setReport] = useState<ChallengeReport | null>(null);
  const check = () => {
    const next = checkChallenge(challenge, labStore.getSnapshot().lab);
    setReport(next);
    if (next.status === "passed") onSolved(challenge.id);
  };
  return (
    <div className="tut-widget tut-challenge" data-challenge={challenge.id}>
      <p className="tut-challenge-meta">
        <span className={`tut-difficulty tut-difficulty-${challenge.difficulty.toLowerCase()}`}>{challenge.difficulty}</span>
        {challenge.requiredKind === "any" ? " · DFA or NFA" : ` · ${challenge.requiredKind}`}
        {challenge.maxStates !== undefined && ` · at most ${challenge.maxStates} states`}
        {solved && <span className="tut-solved"> · ★ solved</span>}
      </p>
      <p>
        <Inline text={challenge.prompt} />
      </p>
      <details className="tut-hints">
        <summary>Hints</summary>
        <ul>
          {challenge.hints.map((hint) => (
            <li key={hint}>
              <Inline text={hint} />
            </li>
          ))}
        </ul>
      </details>
      <div className="lab-row">
        <button type="button" className="menu-primary" onClick={pressHandler(() => onStart(challenge.id))}>
          Start in the Automata Lab ▸
        </button>
        <button type="button" onClick={pressHandler(check)}>
          Check the automaton in the Lab
        </button>
      </div>
      {report && <ChallengeReportView report={report} />}
    </div>
  );
}

interface ChallengeBannerProps {
  readonly challengeId: string;
  readonly labStore: LabStore;
  readonly onSolved: (challengeId: string) => void;
  readonly onBack: () => void;
  readonly onClose: () => void;
}

/** Shown above the Lab while a challenge is active. */
export function ChallengeBanner({ challengeId, labStore, onSolved, onBack, onClose }: ChallengeBannerProps) {
  const challenge = CHALLENGES.find((c) => c.id === challengeId)!;
  const [report, setReport] = useState<ChallengeReport | null>(null);
  return (
    <div className="challenge-banner" data-testid="challenge-banner">
      <div className="lab-row">
        <strong>
          Challenge {challenge.number}: {challenge.title}
        </strong>
        <span className="lab-sep" />
        <button
          type="button"
          onClick={pressHandler(() => {
            const next = checkChallenge(challenge, labStore.getSnapshot().lab);
            setReport(next);
            if (next.status === "passed") onSolved(challenge.id);
          })}
        >
          Check
        </button>
        <button type="button" onClick={pressHandler(onBack)}>
          ← Back to the tutorial
        </button>
        <button type="button" className="link-button" onClick={pressHandler(onClose)}>
          hide
        </button>
      </div>
      <p className="formal-dim">
        <Inline text={challenge.prompt} />
      </p>
      {report && <ChallengeReportView report={report} />}
    </div>
  );
}
