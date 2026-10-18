import type { InputSymbol } from "../../automata";

interface InputTapeProps {
  readonly input: readonly InputSymbol[];
  /** Number of symbols already read by both machines. */
  readonly position: number;
  readonly symbolLabel: (symbol: InputSymbol) => string;
}

/** The input string as a tape: read symbols, the head (next symbol), and unread symbols. */
export function InputTape({ input, position, symbolLabel }: InputTapeProps) {
  return (
    <div className="tape" aria-label={`Input: ${input.length === 0 ? "empty" : input.join(" ")}; ${position} read`}>
      <span className="tape-label">w =</span>
      {input.length === 0 && <span className="tape-cell tape-empty">ε</span>}
      {input.map((symbol, index) => (
        <span
          key={index}
          className={`tape-cell ${index < position ? "tape-read" : index === position ? "tape-head" : "tape-unread"}`}
          title={symbol}
        >
          {symbolLabel(symbol)}
        </span>
      ))}
      {input.length > 0 && position === input.length && <span className="tape-cell tape-end">▮ end</span>}
      <span className="tape-count">
        read {position}/{input.length}
      </span>
    </div>
  );
}
