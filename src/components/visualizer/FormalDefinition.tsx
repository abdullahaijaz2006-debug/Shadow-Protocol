import { EPSILON, type Automaton, type InputSymbol, type State } from "../../automata";
import type { HighlightedTransition } from "./AutomatonGraph";

interface FormalDefinitionProps {
  /** A DFA or an NFA. */
  readonly automaton: Automaton;
  /** The name used in "M = (Q, Σ, δ, q₀, F)". */
  readonly name?: string;
  /** The current state (DFA) or the set of active states (NFA). */
  readonly current: readonly State[];
  /** Transitions taken by the last step; their (from, symbol) cells are highlighted. */
  readonly live: readonly HighlightedTransition[];
  readonly inspected?: HighlightedTransition | null;
  /** The end of the input string read so far (may be capped). */
  readonly input: readonly InputSymbol[];
  /** |w|: the full length of the input string. */
  readonly inputLength: number;
  readonly accepting: boolean;
  readonly symbolLabel?: (symbol: InputSymbol) => string;
  /** Display name for a state (e.g. "D2" for a subset-construction state). */
  readonly stateLabel?: (state: State) => string;
  /** Explanation shown after F. */
  readonly acceptingNote?: string;
  /** Show the "w" (input read so far) line. Off when nothing is being simulated. */
  readonly showInput?: boolean;
}

/**
 * The 5-tuple (Q, Σ, δ, q₀, F) with δ as a table, read directly from the automaton.
 * For a DFA each cell is one state; for an NFA each cell is a set of states (∅ if none), and there
 * is an extra ε column.
 */
export function FormalDefinition({
  automaton,
  name = "M",
  current,
  live,
  inspected,
  input,
  inputLength,
  accepting,
  symbolLabel = (s) => s,
  stateLabel = (s) => s,
  acceptingNote = "formal accepting states; the others are operational",
  showInput = true,
}: FormalDefinitionProps) {
  const isNfa = automaton.kind === "NFA";
  const delta = new Map<string, State[]>();
  for (const t of automaton.transitions) {
    const key = `${t.from}\u0000${t.symbol}`;
    delta.set(key, [...(delta.get(key) ?? []), t.to]);
  }
  const columns = [
    ...automaton.alphabet,
    ...(isNfa && automaton.transitions.some((t) => t.symbol === EPSILON) ? [EPSILON] : []),
  ];
  const label = (symbol: InputSymbol) => (symbol === EPSILON ? EPSILON : symbolLabel(symbol));
  const set = (states: readonly State[]) => (states.length === 0 ? "∅" : `{${states.map(stateLabel).join(", ")}}`);
  const active = new Set(current);

  return (
    <div className="formal">
      <p className="formal-intro">{name} = (Q, Σ, δ, q₀, F)</p>
      <dl className="formal-list">
        <dt>Q</dt>
        <dd>{set(automaton.states)}</dd>
        <dt>Σ</dt>
        <dd>
          {"{"}
          {automaton.alphabet.map((symbol, index) => (
            <span key={symbol}>
              {index > 0 && ", "}
              {symbol}
              {symbolLabel(symbol) !== symbol && <span className="formal-dim"> ({symbolLabel(symbol)})</span>}
            </span>
          ))}
          {"}"}
        </dd>
        <dt>q₀</dt>
        <dd>{stateLabel(automaton.start)}</dd>
        <dt>F</dt>
        <dd>
          {set(automaton.accepting)} <span className="formal-dim">— {acceptingNote}</span>
        </dd>
        {showInput && (
          <>
            <dt>w</dt>
            <dd>
              {inputLength === 0 ? "ε" : `${inputLength > input.length ? "… · " : ""}${input.map(symbolLabel).join(" · ")}`}{" "}
              <span className="formal-dim">
                (|w| = {inputLength}; w {accepting ? "∈" : "∉"} L({name}))
              </span>
            </dd>
          </>
        )}
      </dl>

      <p className="formal-intro">{isNfa ? "δ : Q × (Σ ∪ {ε}) → 𝒫(Q)" : "δ : Q × Σ → Q"}</p>
      <table className="delta-table">
        <thead>
          <tr>
            <th scope="col">δ</th>
            {columns.map((symbol) => (
              <th key={symbol} scope="col" title={symbol} className={symbol === EPSILON ? "delta-epsilon" : undefined}>
                {label(symbol)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {automaton.states.map((state) => (
            <tr key={state} className={active.has(state) ? "delta-row-current" : undefined}>
              <th scope="row">
                {state === automaton.start && "→"}
                {automaton.accepting.includes(state) && "*"}
                {stateLabel(state)}
              </th>
              {columns.map((symbol) => {
                const targets = delta.get(`${state}\u0000${symbol}`) ?? [];
                // A DFA cell with several targets is shown as a set (and flagged), so conflicts are visible.
                const text =
                  isNfa || targets.length > 1 ? set(targets) : targets[0] !== undefined ? stateLabel(targets[0]) : "—";
                const classes = [
                  (targets.length === 0 || (targets.length === 1 && targets[0] === state)) && "delta-self",
                  symbol === EPSILON && "delta-epsilon",
                  !isNfa && targets.length !== 1 && "delta-conflict",
                  live.some((t) => t.from === state && t.symbol === symbol) && "delta-live",
                  inspected?.from === state && inspected.symbol === symbol && "delta-inspect",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <td key={symbol} className={classes || undefined}>
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="formal-dim formal-note">
        → start state, * accepting state. Dimmed cells are self-loops{isNfa ? " or ∅ (that path dies)" : ""}.
      </p>
    </div>
  );
}
