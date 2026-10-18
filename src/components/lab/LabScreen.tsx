import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { EPSILON } from "../../automata";
import { EMPTY_TAPE, tapeReducer } from "../simulation/tapeModel";
import { AutomatonGraph, type GraphInteraction, type GraphPoint } from "../visualizer/AutomatonGraph";
import { FormalDefinition } from "../visualizer/FormalDefinition";
import { pressHandler } from "../visualizer/pressHandler";
import { checkEquivalence, convertLabToDfa } from "./labConversion";
import { LabConvertPanel, type ConversionRecord } from "./LabConvertPanel";
import { LabFilePanel } from "./LabFilePanel";
import { labLayout, transitionEdgeKey } from "./labGeometry";
import { checkTransition, emptyLab, LAB_CANVAS, stateById, type LabAutomaton, type StateId } from "./labModel";
import type { LabStore } from "./labStore";
import { LAB_PRESETS } from "./labPresets";
import { LabSidebar, type LabSelection } from "./LabSidebar";
import { LabSimulatePanel } from "./LabSimulatePanel";
import { simulateLab } from "./labSimulation";
import { labToAutomaton, labToGraphAutomaton, validateLab, type LabIssue } from "./labValidation";
import { ValidationPanel } from "./ValidationPanel";

type Tool = "select" | "addState" | "addTransition";
type BottomTab = "problems" | "simulate" | "convert" | "file";

const TOOLS: readonly [Tool, string, string][] = [
  ["select", "Select / move", "Click to select; drag a state to move it"],
  ["addState", "+ State", "Click empty space to add a state"],
  ["addTransition", "+ Transition", "Drag from one state to another (or back to itself) to add a transition"],
];

/** The automaton's name: edited as a draft, applied on Enter or when the field loses focus. */
function NameField({ name, onCommit }: { name: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  const commit = () => (draft.trim() === "" ? setDraft(name) : onCommit(draft));
  return (
    <input
      className="lab-name"
      aria-label="Automaton name"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(name);
      }}
    />
  );
}

/**
 * The Automata Lab: editor (6A) plus simulator, NFA → DFA conversion, presets and save/load (6B).
 * Its document is plain React state, completely separate from the game: nothing here can change
 * the guards. Validation, simulation and conversion are all done by the automata engine.
 */
export function LabScreen({ active, store, banner }: { active: boolean; store: LabStore; banner?: ReactNode }) {
  // The document lives in a LabStore (shared with the tutorial's challenges); edits go through its reducer.
  const { lab, load } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const dispatch = store.dispatch;
  const [tape, tapeDispatch] = useReducer(tapeReducer, EMPTY_TAPE);
  const [tool, setTool] = useState<Tool>("select");
  const [drawSymbol, setDrawSymbol] = useState("");
  const [selection, setSelection] = useState<LabSelection>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ from: StateId; to: GraphPoint } | null>(null);
  const [confirmNew, setConfirmNew] = useState<"DFA" | "NFA" | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("problems");
  /** The document before the last load / preset / conversion, for a one-step undo. */
  const [undo, setUndo] = useState<{ lab: LabAutomaton; label: string } | null>(null);
  const [conversion, setConversion] = useState<ConversionRecord | null>(null);
  /** Increases whenever the whole document is replaced, so the simulator's input field starts fresh. */
  const [documentVersion, setDocumentVersion] = useState(0);
  // A document loaded from outside (e.g. a tutorial challenge) is treated like a preset: undoable, fresh simulator.
  useEffect(() => {
    if (load.version === 0) return;
    setUndo(load.previous ? { lab: load.previous, label: load.label } : null);
    setConversion(null);
    setSelection(null);
    tapeDispatch({ type: "clear" });
    setDocumentVersion((v) => v + 1);
    setMessage(`${load.label}. Use “undo” to get the previous automaton back.`);
  }, [load]);
  const drag = useRef<{ id: StateId; dx: number; dy: number } | null>(null);

  const issues = useMemo(() => validateLab(lab), [lab]);
  const graph = useMemo(() => labToGraphAutomaton(lab), [lab]);
  const layout = useMemo(() => labLayout(lab), [lab]);
  const formal = useMemo(() => labToAutomaton(lab), [lab]);
  const sim = useMemo(() => simulateLab(lab, tape.input, tape.position), [lab, tape.input, tape.position]);
  const errorStates = useMemo(() => new Set(issues.flatMap((i) => i.stateIds)), [issues]);
  const errorTransitions = useMemo(() => new Set(issues.flatMap((i) => i.transitionIds)), [issues]);
  const errorEdges = useMemo(
    () => new Set(lab.transitions.filter((t) => errorTransitions.has(t.id)).map(transitionEdgeKey)),
    [lab.transitions, errorTransitions],
  );
  // The simulation is shown on the graph while its tab is open.
  const simulating = bottomTab === "simulate" && sim.runnable;

  const symbols = [...lab.alphabet, ...(lab.kind === "NFA" ? [EPSILON] : [])];
  const symbol = symbols.includes(drawSymbol) ? drawSymbol : (symbols[0] ?? "");

  // Drop a selection whose element was deleted.
  const liveSelection: LabSelection =
    selection?.kind === "state" && !stateById(lab, selection.id)
      ? null
      : selection?.kind === "edge" && !lab.transitions.some((t) => transitionEdgeKey(t) === selection.key)
        ? null
        : selection;

  // Delete key removes the selection (but never while typing in a field).
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select") || (event.key !== "Delete" && event.key !== "Backspace")) return;
      if (liveSelection?.kind === "state") dispatch({ type: "deleteState", id: liveSelection.id });
      if (liveSelection?.kind === "edge") {
        for (const t of lab.transitions) if (transitionEdgeKey(t) === liveSelection.key) dispatch({ type: "removeTransition", id: t.id });
      }
      setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, liveSelection, lab.transitions]);

  /** Replaces the whole document (preset, file, conversion), remembering the old one for Undo. */
  const replaceDocument = (next: LabAutomaton, label: string, record: ConversionRecord | null = null) => {
    setUndo({ lab, label });
    dispatch({ type: "replace", lab: next });
    setConversion(record);
    setSelection(null);
    tapeDispatch({ type: "clear" });
    setDocumentVersion((v) => v + 1);
    setMessage(`${label}. Use “undo” to get the previous automaton back.`);
  };

  const interaction: GraphInteraction = {
    selectedState: liveSelection?.kind === "state" ? liveSelection.id : null,
    selectedEdge: liveSelection?.kind === "edge" ? liveSelection.key : null,
    errorStates,
    errorEdges,
    preview,
    onBackgroundPointerDown: (point) => {
      if (tool === "addState") {
        const id = `s${lab.nextId}`;
        dispatch({ type: "addState", x: point.x, y: point.y });
        setSelection({ kind: "state", id });
      } else {
        setSelection(null);
      }
      setMessage(null);
    },
    onNodePointerDown: (id, point) => {
      setSelection({ kind: "state", id });
      const state = stateById(lab, id);
      if (!state) return;
      if (tool === "addTransition") setPreview({ from: id, to: point });
      else drag.current = { id, dx: point.x - state.x, dy: point.y - state.y };
    },
    onEdgePointerDown: (key) => setSelection({ kind: "edge", key }),
    onPointerMove: (point) => {
      if (drag.current) dispatch({ type: "moveState", id: drag.current.id, x: point.x - drag.current.dx, y: point.y - drag.current.dy });
      else if (preview) setPreview({ ...preview, to: point });
    },
    onPointerUp: (_point, over) => {
      if (preview && over) {
        const error = symbol === "" ? "Add a symbol to Σ before drawing transitions." : checkTransition(lab, preview.from, over, symbol);
        if (error) setMessage(error);
        else {
          const added = { from: preview.from, to: over, symbol };
          dispatch({ type: "addTransition", ...added });
          setSelection({ kind: "edge", key: transitionEdgeKey({ id: "", ...added }) });
          setMessage(null);
        }
      }
      drag.current = null;
      setPreview(null);
    },
  };

  const showIssue = (issue: LabIssue) => {
    if (issue.stateIds.length > 0) setSelection({ kind: "state", id: issue.stateIds[0] });
    else {
      const t = lab.transitions.find((x) => issue.transitionIds.includes(x.id));
      if (t && stateById(lab, t.from) && stateById(lab, t.to)) setSelection({ kind: "edge", key: transitionEdgeKey(t) });
    }
  };

  const startOver = (kind: "DFA" | "NFA") => {
    if (confirmNew !== kind) {
      setConfirmNew(kind);
      return;
    }
    replaceDocument(emptyLab(kind), `Started a new empty ${kind}`);
    setConfirmNew(null);
  };

  const convert = () => {
    const result = convertLabToDfa(lab);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    const report = checkEquivalence(labToAutomaton(lab), labToAutomaton(result.lab));
    replaceDocument(result.lab, `Converted “${lab.name}” to a DFA with ${result.lab.states.length} states`, {
      nfa: lab,
      subsets: result.subsets,
      report,
    });
  };
  const convertBlocked = lab.kind !== "NFA" ? "Only an NFA can be converted." : issues.length > 0 ? `Fix the ${issues.length} problem${issues.length === 1 ? "" : "s"} first.` : null;

  const bottomTabs: readonly [BottomTab, string][] = [
    ["problems", issues.length === 0 ? "✓ Problems (0)" : `✗ Problems (${issues.length})`],
    ["simulate", "Simulate"],
    ["convert", "NFA → DFA"],
    ["file", "Save / Load"],
  ];

  return (
    <section className="lab" hidden={!active} aria-label="Automata Lab">
      <div className="lab-main">
        {banner}
        <div className="lab-toolbar">
          <NameField key={lab.name} name={lab.name} onCommit={(name) => dispatch({ type: "setName", name })} />
          <span className="mode-switch-inline" role="radiogroup" aria-label="Automaton type">
            {(["DFA", "NFA"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={lab.kind === kind}
                className={lab.kind === kind ? "tab-selected" : undefined}
                onClick={pressHandler(() => dispatch({ type: "setKind", kind }))}
              >
                {kind}
              </button>
            ))}
          </span>
          <span className="lab-sep" />
          {TOOLS.map(([value, label, title]) => (
            <button
              key={value}
              type="button"
              title={title}
              aria-pressed={tool === value}
              className={tool === value ? "tab-selected" : undefined}
              onClick={pressHandler(() => setTool(value))}
            >
              {label}
            </button>
          ))}
          {tool === "addTransition" && (
            <label className="lab-field-inline">
              symbol
              <select value={symbol} onChange={(e) => setDrawSymbol(e.target.value)} aria-label="Symbol for new transitions">
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s === EPSILON ? "ε" : s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span className="lab-sep" />
          <select
            aria-label="Load a preset"
            value=""
            onChange={(e) => {
              const preset = LAB_PRESETS.find((p) => p.id === e.target.value);
              if (preset) replaceDocument(preset.build(), `Loaded the preset “${preset.label}”`);
              e.currentTarget.blur();
            }}
          >
            <option value="">Load preset…</option>
            {LAB_PRESETS.map((p) => (
              <option key={p.id} value={p.id} title={p.description}>
                {p.label} ({p.kind})
              </option>
            ))}
          </select>
          {(["DFA", "NFA"] as const).map((kind) => (
            <button key={kind} type="button" className={confirmNew === kind ? "lab-danger" : undefined} onClick={pressHandler(() => startOver(kind))}>
              {confirmNew === kind ? `click again: discard and start a new ${kind}` : `new ${kind}`}
            </button>
          ))}
          {undo && (
            <button
              type="button"
              title={`Undo: ${undo.label}`}
              onClick={pressHandler(() => {
                dispatch({ type: "replace", lab: undo.lab });
                setConversion(null);
                setUndo(null);
                setSelection(null);
                tapeDispatch({ type: "clear" });
                setDocumentVersion((v) => v + 1);
                setMessage(`Restored “${undo.lab.name}”.`);
              })}
            >
              ↶ undo
            </button>
          )}
        </div>
        <p className="lab-message" aria-live="polite">
          {message ?? TOOLS.find(([value]) => value === tool)![2]}
          {" · "}Delete removes the selection.
        </p>

        <div className={`lab-canvas lab-tool-${tool}`}>
          <AutomatonGraph
            automaton={graph}
            layout={layout}
            viewBox={LAB_CANVAS}
            current={simulating ? sim.current : []}
            live={simulating ? sim.live : []}
            stateLabel={(id) => stateById(lab, id)?.name ?? id}
            stateTitle={(id) => stateById(lab, id)?.name ?? id}
            interaction={interaction}
            className="lab-graph"
          />
        </div>

        <div className="lab-bottom">
          <div className="tabs" role="tablist">
            {bottomTabs.map(([name, label]) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={bottomTab === name}
                className={`tab${bottomTab === name ? " tab-selected" : ""}${name === "problems" && issues.length > 0 ? " tab-warning" : ""}`}
                onClick={pressHandler(() => setBottomTab(name))}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="lab-bottom-body">
            {bottomTab === "problems" && <ValidationPanel kind={lab.kind} issues={issues} onShow={showIssue} />}
            {bottomTab === "simulate" && (
              <LabSimulatePanel key={documentVersion} lab={lab} tape={tape} dispatch={tapeDispatch} sim={sim} />
            )}
            {bottomTab === "convert" && (
              <LabConvertPanel
                lab={lab}
                blockedReason={convertBlocked}
                conversion={conversion}
                onConvert={convert}
                onBackToNfa={() => conversion && replaceDocument(conversion.nfa, `Back to the NFA “${conversion.nfa.name}”`)}
              />
            )}
            {bottomTab === "file" && <LabFilePanel lab={lab} onLoad={(loaded, source) => replaceDocument(loaded, `Loaded “${loaded.name}” from ${source}`)} />}
          </div>
        </div>
      </div>

      <aside className="lab-side">
        <LabSidebar
          lab={lab}
          dispatch={dispatch}
          selection={liveSelection}
          onSelect={setSelection}
          errorTransitions={errorTransitions}
          onMessage={setMessage}
        />
        <section className="lab-section">
          <details>
            <summary>
              <h3>Formal definition (Q, Σ, δ, q₀, F)</h3>
            </summary>
            <FormalDefinition
              automaton={formal}
              name={lab.kind === "DFA" ? "M" : "N"}
              current={simulating && sim.runnable ? (sim.kind === "DFA" ? [sim.run.finalState] : sim.run.finalStates) : []}
              live={[]}
              input={tape.input.slice(0, tape.position)}
              inputLength={tape.position}
              accepting={sim.runnable && sim.accepted}
              showInput={simulating}
              acceptingNote="accepting states"
            />
          </details>
        </section>
      </aside>
    </section>
  );
}
