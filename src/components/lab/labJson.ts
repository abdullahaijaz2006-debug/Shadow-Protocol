// Saving and loading Lab documents as JSON. Pure TypeScript.
//
// Loading checks only the *shape* of the file. A well-formed file that describes a broken
// automaton (unknown symbols, references to missing states, …) loads normally, and the Lab's
// validation then shows exactly what is wrong — that is part of what the Lab teaches.
import { clampToCanvas, type LabAutomaton, type LabState, type LabTransition } from "./labModel";
import { autoPositions } from "./labPresets";

export const LAB_FILE_FORMAT = "shadow-protocol/automaton";
export const LAB_FILE_VERSION = 1;

/**
 * File layout (version 1). ε-transitions use the symbol "ε". Positions are optional when loading
 * (missing ones are laid out automatically) and always written when saving.
 */
export interface LabFile {
  readonly format: typeof LAB_FILE_FORMAT;
  readonly version: number;
  readonly kind: "DFA" | "NFA";
  readonly name: string;
  readonly alphabet: readonly string[];
  readonly states: readonly { readonly id: string; readonly name: string; readonly x?: number; readonly y?: number }[];
  readonly transitions: readonly { readonly id?: string; readonly from: string; readonly symbol: string; readonly to: string }[];
  readonly start: string | null;
  readonly accepting: readonly string[];
}

export function serializeLab(lab: LabAutomaton): string {
  const file: LabFile = {
    format: LAB_FILE_FORMAT,
    version: LAB_FILE_VERSION,
    kind: lab.kind,
    name: lab.name,
    alphabet: lab.alphabet,
    states: lab.states.map(({ id, name, x, y }) => ({ id, name, x, y })),
    transitions: lab.transitions.map(({ id, from, symbol, to }) => ({ id, from, symbol, to })),
    start: lab.startId,
    accepting: lab.acceptingIds,
  };
  return JSON.stringify(file, null, 2);
}

/** A suggested file name for saving, e.g. "guard-behaviour-dfa.json". */
export function labFileName(lab: LabAutomaton): string {
  const slug = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "automaton"}.json`;
}

export type ParseResult = { readonly ok: true; readonly lab: LabAutomaton } | { readonly ok: false; readonly error: string };

/** Reads a Lab JSON file. Fails (with a reason) only if the file is not a well-formed Lab document. */
export function parseLab(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return fail(`This is not valid JSON (${(error as Error).message}).`);
  }
  if (!isObject(data)) return fail("The file must contain a JSON object.");
  if (data.format !== LAB_FILE_FORMAT) return fail(`Not a Shadow Protocol automaton file (expected "format": "${LAB_FILE_FORMAT}").`);
  if (typeof data.version !== "number" || data.version > LAB_FILE_VERSION) {
    return fail(`Unsupported file version ${String(data.version)} (this app reads version ${LAB_FILE_VERSION}).`);
  }
  if (data.kind !== "DFA" && data.kind !== "NFA") return fail(`"kind" must be "DFA" or "NFA".`);
  if (typeof data.name !== "string") return fail(`"name" must be a string.`);
  if (!isStringArray(data.alphabet)) return fail(`"alphabet" must be an array of strings.`);
  if (!Array.isArray(data.states)) return fail(`"states" must be an array.`);
  if (!Array.isArray(data.transitions)) return fail(`"transitions" must be an array.`);
  if (data.start !== null && typeof data.start !== "string") return fail(`"start" must be a state id or null.`);
  if (!isStringArray(data.accepting)) return fail(`"accepting" must be an array of state ids.`);

  const seen = new Set<string>();
  for (const [index, s] of data.states.entries()) {
    if (!isObject(s) || typeof s.id !== "string" || typeof s.name !== "string") {
      return fail(`State #${index + 1} needs a string "id" and "name".`);
    }
    if ((s.x !== undefined && typeof s.x !== "number") || (s.y !== undefined && typeof s.y !== "number")) {
      return fail(`State "${s.id}" has a non-numeric position.`);
    }
    if (seen.has(s.id)) return fail(`State id "${s.id}" is used twice.`);
    seen.add(s.id);
  }
  for (const [index, t] of data.transitions.entries()) {
    if (!isObject(t) || typeof t.from !== "string" || typeof t.to !== "string" || typeof t.symbol !== "string") {
      return fail(`Transition #${index + 1} needs string "from", "symbol" and "to".`);
    }
    if (t.id !== undefined && typeof t.id !== "string") return fail(`Transition #${index + 1} has a non-string "id".`);
  }

  const rawStates = data.states as LabFile["states"];
  const auto = autoPositions(
    rawStates.map((s) => s.id),
    data.start ?? undefined,
  );
  const states: LabState[] = rawStates.map((s) => ({
    id: s.id,
    name: s.name,
    ...clampToCanvas(s.x ?? auto[s.id].x, s.y ?? auto[s.id].y),
  }));

  // New ids must never collide with ids from the file.
  let nextId = 1 + Math.max(0, ...[...seen].map(idNumber));
  const transitionIds = new Set<string>();
  const transitions: LabTransition[] = (data.transitions as LabFile["transitions"]).map((t) => {
    let id = t.id;
    if (id === undefined || transitionIds.has(id) || seen.has(id)) id = `t${nextId++}`;
    transitionIds.add(id);
    return { id, from: t.from, symbol: t.symbol, to: t.to };
  });
  nextId = Math.max(nextId, 1 + Math.max(0, ...[...transitionIds].map(idNumber)));

  return {
    ok: true,
    lab: {
      kind: data.kind,
      name: data.name.trim() || "Untitled",
      states,
      alphabet: [...data.alphabet],
      transitions,
      startId: data.start,
      // F is a set: a file listing a state twice means the same thing as listing it once.
      acceptingIds: [...new Set(data.accepting)],
      nextId,
    },
  };
}

function fail(error: string): ParseResult {
  return { ok: false, error };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** The number in an id like "s12" or "t7" (0 if there is none). */
function idNumber(id: string): number {
  const match = /^[a-z](\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}
