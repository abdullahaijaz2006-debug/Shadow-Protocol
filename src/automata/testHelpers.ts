// Helpers for the automata tests. Not exported from index.ts.
import type { InputSymbol } from "./types";

/** Every string over `alphabet` of length 0..maxLength (Σ^0 ∪ … ∪ Σ^maxLength), shortest first. */
export function allStrings(alphabet: readonly InputSymbol[], maxLength: number): InputSymbol[][] {
  const result: InputSymbol[][] = [[]];
  let previous: InputSymbol[][] = [[]];
  for (let length = 1; length <= maxLength; length++) {
    previous = previous.flatMap((prefix) => alphabet.map((symbol) => [...prefix, symbol]));
    result.push(...previous);
  }
  return result;
}

/** Splits a string of single-character symbols, e.g. "0110" → ["0","1","1","0"]. */
export function chars(text: string): InputSymbol[] {
  return [...text];
}
