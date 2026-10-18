import { useState, type Dispatch, type KeyboardEvent } from "react";
import { EPSILON } from "../../automata";
import { pressHandler } from "../visualizer/pressHandler";
import { transitionEdgeKey } from "./labGeometry";
import {
  checkStateName,
  checkSymbol,
  checkTransition,
  stateById,
  type LabAction,
  type LabAutomaton,
  type StateId,
} from "./labModel";

export type LabSelection = { readonly kind: "state"; readonly id: StateId } | { readonly kind: "edge"; readonly key: string } | null;

interface SidebarProps {
  readonly lab: LabAutomaton;
  readonly dispatch: Dispatch<LabAction>;
  readonly selection: LabSelection;
  readonly onSelect: (selection: LabSelection) => void;
  /** Transitions involved in a validation problem. */
  readonly errorTransitions: ReadonlySet<string>;
  /** Shows feedback for a refused edit. */
  readonly onMessage: (message: string | null) => void;
}

const symbolText = (symbol: string) => (symbol === EPSILON ? "ε" : symbol);

/** Commit on Enter or blur, revert on Escape. */
function onFieldKeys(commit: () => void, revert: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commit();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      revert();
      event.currentTarget.blur();
    }
  };
}

/** Rename / start / accepting / delete for the selected state. */
function StateInspector({ lab, dispatch, id, onMessage }: { lab: LabAutomaton; dispatch: Dispatch<LabAction>; id: StateId; onMessage: SidebarProps["onMessage"] }) {
  const state = stateById(lab, id)!;
  const [draft, setDraft] = useState(state.name);
  const error = checkStateName(lab, draft, id);
  const commit = () => {
    if (draft.trim() === state.name) return;
    if (error) {
      onMessage(error);
      setDraft(state.name);
      return;
    }
    dispatch({ type: "renameState", id, name: draft });
    onMessage(null);
  };
  const outgoing = lab.transitions.filter((t) => t.from === id);
  return (
    <div className="lab-inspector">
      <label className="lab-field">
        <span>name</span>
        <input
          value={draft}
          aria-invalid={error !== null}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onFieldKeys(commit, () => setDraft(state.name))}
        />
      </label>
      {error && draft.trim() !== state.name && <p className="lab-error-text">{error}</p>}
      <div className="lab-row">
        <button type="button" disabled={lab.startId === id} onClick={pressHandler(() => dispatch({ type: "setStart", id }))}>
          {lab.startId === id ? "→ start state" : "make start state"}
        </button>
        <button type="button" aria-pressed={lab.acceptingIds.includes(id)} onClick={pressHandler(() => dispatch({ type: "toggleAccepting", id }))}>
          {lab.acceptingIds.includes(id) ? "✓ accepting (in F)" : "mark accepting"}
        </button>
        <button type="button" className="lab-danger" onClick={pressHandler(() => dispatch({ type: "deleteState", id }))}>
          delete state
        </button>
      </div>
      <p className="formal-dim lab-hint">
        {outgoing.length} outgoing transition{outgoing.length === 1 ? "" : "s"}. Deleting the state also deletes its transitions.
      </p>
    </div>
  );
}

/** The transitions drawn as the selected arrow, each removable. */
function EdgeInspector({ lab, dispatch, edgeKey, errorTransitions }: { lab: LabAutomaton; dispatch: Dispatch<LabAction>; edgeKey: string; errorTransitions: ReadonlySet<string> }) {
  const transitions = lab.transitions.filter((t) => transitionEdgeKey(t) === edgeKey);
  const name = (id: StateId) => stateById(lab, id)?.name ?? "?";
  if (transitions.length === 0) return <p className="formal-dim">This arrow no longer exists.</p>;
  return (
    <ul className="lab-list">
      {transitions.map((t) => (
        <li key={t.id} className={errorTransitions.has(t.id) ? "lab-item-error" : undefined}>
          <span>
            δ({name(t.from)}, {symbolText(t.symbol)}) ∋ {name(t.to)}
          </span>
          <button type="button" className="lab-danger" onClick={pressHandler(() => dispatch({ type: "removeTransition", id: t.id }))}>
            remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function AlphabetEditor({ lab, dispatch, onMessage }: Pick<SidebarProps, "lab" | "dispatch" | "onMessage">) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (draft.trim() === "") return;
    const error = checkSymbol(lab, draft);
    if (error) {
      onMessage(error);
      return;
    }
    dispatch({ type: "addSymbol", symbol: draft });
    setDraft("");
    onMessage(null);
  };
  return (
    <div>
      <div className="lab-chips">
        {lab.alphabet.length === 0 && <span className="formal-dim">Σ is empty — add at least one symbol.</span>}
        {lab.alphabet.map((symbol) => (
          <span key={symbol} className="lab-chip">
            {symbol}
            <button
              type="button"
              aria-label={`Remove symbol ${symbol}`}
              title="Remove from Σ (transitions using it are kept and flagged)"
              onClick={pressHandler(() => dispatch({ type: "removeSymbol", symbol }))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="lab-row">
        <input
          placeholder="new symbol, e.g. a or PLAYER_SPOTTED"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button type="button" onClick={pressHandler(add)}>
          add to Σ
        </button>
      </div>
    </div>
  );
}

function StatesList({ lab, selection, onSelect, dispatch }: Pick<SidebarProps, "lab" | "selection" | "onSelect" | "dispatch">) {
  if (lab.states.length === 0) return <p className="formal-dim">No states yet — use “+ State” and click the canvas.</p>;
  return (
    <ul className="lab-list">
      {lab.states.map((s) => (
        <li key={s.id} className={selection?.kind === "state" && selection.id === s.id ? "lab-item-selected" : undefined}>
          <button type="button" className="link-button" onClick={pressHandler(() => onSelect({ kind: "state", id: s.id }))}>
            {lab.startId === s.id && "→ "}
            {s.name}
            {lab.acceptingIds.includes(s.id) && " *"}
          </button>
          <span className="lab-item-actions">
            <label title="start state q₀">
              <input type="radio" name="lab-start" checked={lab.startId === s.id} onChange={() => dispatch({ type: "setStart", id: s.id })} /> q₀
            </label>
            <label title="accepting state (in F)">
              <input type="checkbox" checked={lab.acceptingIds.includes(s.id)} onChange={() => dispatch({ type: "toggleAccepting", id: s.id })} /> F
            </label>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TransitionsEditor({ lab, dispatch, errorTransitions, onMessage, onSelect }: Omit<SidebarProps, "selection">) {
  const symbols = [...lab.alphabet, ...(lab.kind === "NFA" ? [EPSILON] : [])];
  const [from, setFrom] = useState<StateId>("");
  const [to, setTo] = useState<StateId>("");
  const [symbol, setSymbol] = useState("");
  // Fall back to the first option when a chosen state or symbol has gone away.
  const fromId = stateById(lab, from) ? from : (lab.states[0]?.id ?? "");
  const toId = stateById(lab, to) ? to : (lab.states[0]?.id ?? "");
  const sym = symbols.includes(symbol) ? symbol : (symbols[0] ?? "");
  const name = (id: StateId) => stateById(lab, id)?.name ?? `⟨missing ${id}⟩`;

  const add = () => {
    const error = checkTransition(lab, fromId, toId, sym);
    if (error) {
      onMessage(error);
      return;
    }
    dispatch({ type: "addTransition", from: fromId, to: toId, symbol: sym });
    onMessage(null);
  };

  return (
    <div>
      <div className="lab-row lab-transition-form">
        δ(
        <select value={fromId} onChange={(e) => setFrom(e.target.value)} aria-label="from state">
          {lab.states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        ,
        <select value={sym} onChange={(e) => setSymbol(e.target.value)} aria-label="symbol">
          {symbols.map((s) => (
            <option key={s} value={s}>
              {symbolText(s)}
            </option>
          ))}
        </select>
        ) {lab.kind === "NFA" ? "∋" : "="}
        <select value={toId} onChange={(e) => setTo(e.target.value)} aria-label="to state">
          {lab.states.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="button" disabled={lab.states.length === 0 || symbols.length === 0} onClick={pressHandler(add)}>
          add
        </button>
      </div>
      <ul className="lab-list">
        {lab.transitions.length === 0 && <li className="formal-dim">No transitions yet.</li>}
        {lab.transitions.map((t) => (
          <li key={t.id} className={errorTransitions.has(t.id) ? "lab-item-error" : undefined} data-transition={t.id}>
            <button type="button" className="link-button" onClick={pressHandler(() => onSelect({ kind: "edge", key: transitionEdgeKey(t) }))}>
              {name(t.from)} ─{symbolText(t.symbol)}→ {name(t.to)}
            </button>
            <button type="button" className="lab-danger" onClick={pressHandler(() => dispatch({ type: "removeTransition", id: t.id }))}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The editing side panel: selection inspector, Σ, states and δ. */
export function LabSidebar(props: SidebarProps) {
  const { lab, selection } = props;
  return (
    <>
      <section className="lab-section">
        <h3>Selection</h3>
        {selection === null && <p className="formal-dim">Click a state or an arrow on the canvas.</p>}
        {selection?.kind === "state" && stateById(lab, selection.id) && (
          <StateInspector key={selection.id} lab={lab} dispatch={props.dispatch} id={selection.id} onMessage={props.onMessage} />
        )}
        {selection?.kind === "edge" && (
          <EdgeInspector lab={lab} dispatch={props.dispatch} edgeKey={selection.key} errorTransitions={props.errorTransitions} />
        )}
      </section>
      <section className="lab-section">
        <h3>Σ — input alphabet</h3>
        <AlphabetEditor lab={lab} dispatch={props.dispatch} onMessage={props.onMessage} />
      </section>
      <section className="lab-section">
        <h3>Q — states ({lab.states.length})</h3>
        <StatesList lab={lab} selection={selection} onSelect={props.onSelect} dispatch={props.dispatch} />
      </section>
      <section className="lab-section">
        <h3>δ — transitions ({lab.transitions.length})</h3>
        <TransitionsEditor {...props} />
      </section>
    </>
  );
}
