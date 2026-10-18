// Tutorial challenges and how a submitted Lab automaton is checked. Pure TypeScript.
//
// Checking is *testing*: the engine runs the user's automaton on hand-picked strings (including
// ones that must be rejected) and on every string up to a length bound, and compares the answers
// with a reference automaton. Passing is strong evidence, not a proof that the languages are equal.
import { type Automaton, type DFA, type InputSymbol, type NFA, type Transition } from "../../automata";
import { accepts, checkEquivalence } from "../lab/labConversion";
import { emptyLab, type LabAutomaton } from "../lab/labModel";
import { labToAutomaton, validateLab } from "../lab/labValidation";

export interface ChallengeTest {
  readonly input: readonly InputSymbol[];
  readonly accept: boolean;
}

export interface Challenge {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly difficulty: "Easy" | "Medium" | "Hard";
  /** What to build (tutorial markup). */
  readonly prompt: string;
  readonly hints: readonly string[];
  /** "any": a DFA or an NFA is fine. */
  readonly requiredKind: "DFA" | "NFA" | "any";
  readonly alphabet: readonly InputSymbol[];
  readonly maxStates?: number;
  /** A correct automaton, used for the exhaustive comparison. */
  readonly reference: Automaton;
  /** Hand-picked examples, including strings that must be rejected. */
  readonly tests: readonly ChallengeTest[];
  /** Compare with the reference on every string up to this length. */
  readonly exhaustiveLength: number;
}

const t = (from: string, symbol: string, to: string): Transition => ({ from, symbol, to });
const w = (text: string): InputSymbol[] => [...text];

const ENDS_01: DFA = {
  kind: "DFA",
  states: ["start", "saw0", "saw01"],
  alphabet: ["0", "1"],
  transitions: [
    t("start", "0", "saw0"),
    t("start", "1", "start"),
    t("saw0", "0", "saw0"),
    t("saw0", "1", "saw01"),
    t("saw01", "0", "saw0"),
    t("saw01", "1", "start"),
  ],
  start: "start",
  accepting: ["saw01"],
};

const S = "PLAYER_SPOTTED";
const L = "PLAYER_LOST";
const ALARM: DFA = {
  kind: "DFA",
  states: ["calm", "seenOnce", "alarm"],
  alphabet: [S, L],
  transitions: [t("calm", S, "seenOnce"), t("calm", L, "calm"), t("seenOnce", S, "alarm"), t("seenOnce", L, "calm"), t("alarm", S, "alarm"), t("alarm", L, "alarm")],
  start: "calm",
  accepting: ["alarm"],
};

const CONTAINS_ABA: DFA = {
  kind: "DFA",
  states: ["none", "a", "ab", "aba"],
  alphabet: ["a", "b"],
  transitions: [
    t("none", "a", "a"),
    t("none", "b", "none"),
    t("a", "a", "a"),
    t("a", "b", "ab"),
    t("ab", "a", "aba"),
    t("ab", "b", "none"),
    t("aba", "a", "aba"),
    t("aba", "b", "aba"),
  ],
  start: "none",
  accepting: ["aba"],
};

const SECOND_LAST_1: NFA = {
  kind: "NFA",
  states: ["p", "q", "r"],
  alphabet: ["0", "1"],
  transitions: [t("p", "0", "p"), t("p", "1", "p"), t("p", "1", "q"), t("q", "0", "r"), t("q", "1", "r")],
  start: "p",
  accepting: ["r"],
};

export const CHALLENGES: readonly Challenge[] = [
  {
    id: "ends-01",
    number: 1,
    title: "Ends in 01",
    difficulty: "Easy",
    prompt: "Build a **DFA** over $Σ = {0, 1}$ that accepts exactly the binary strings that **end in 01**.",
    hints: [
      "Remember only what matters: have you just read a 0? Have you just read 01?",
      "Three states are enough. Every state needs a transition on both 0 and 1.",
    ],
    requiredKind: "DFA",
    alphabet: ["0", "1"],
    reference: ENDS_01,
    tests: [
      { input: w("01"), accept: true },
      { input: w("001"), accept: true },
      { input: w("1101"), accept: true },
      { input: w("0101"), accept: true },
      { input: [], accept: false },
      { input: w("0"), accept: false },
      { input: w("1"), accept: false },
      { input: w("10"), accept: false },
      { input: w("011"), accept: false },
      { input: w("010"), accept: false },
    ],
    exhaustiveLength: 8,
  },
  {
    id: "guard-alarm",
    number: 2,
    title: "Raise the alarm",
    difficulty: "Easy",
    prompt:
      "A guard should raise the alarm when it **spots the player twice in a row** — two `PLAYER_SPOTTED` events with no `PLAYER_LOST` in between. Build a **DFA** over $Σ = {$`PLAYER_SPOTTED`, `PLAYER_LOST`$}$ that accepts exactly those event histories. Once raised, the alarm stays raised.",
    hints: [
      "Track: nothing yet, spotted once, alarm.",
      "Which event sends 'spotted once' back to the start? What do events do after the alarm?",
    ],
    requiredKind: "DFA",
    alphabet: [S, L],
    reference: ALARM,
    tests: [
      { input: [S, S], accept: true },
      { input: [S, L, S, S], accept: true },
      { input: [S, S, L], accept: true },
      { input: [], accept: false },
      { input: [S], accept: false },
      { input: [S, L, S], accept: false },
      { input: [L, L], accept: false },
    ],
    exhaustiveLength: 8,
  },
  {
    id: "contains-aba",
    number: 3,
    title: "Find the pattern",
    difficulty: "Medium",
    prompt: "Build a **DFA** over $Σ = {a, b}$ that accepts exactly the strings that **contain aba** somewhere.",
    hints: [
      "Keep track of the longest end of the input that could still become aba: nothing, a, ab.",
      "Careful after ab: reading b means starting over, but reading a after a… still counts as a.",
    ],
    requiredKind: "DFA",
    alphabet: ["a", "b"],
    reference: CONTAINS_ABA,
    tests: [
      { input: w("aba"), accept: true },
      { input: w("bbaba"), accept: true },
      { input: w("abab"), accept: true },
      { input: w("aaba"), accept: true },
      { input: [], accept: false },
      { input: w("ab"), accept: false },
      { input: w("abba"), accept: false },
      { input: w("baab"), accept: false },
      { input: w("bbbb"), accept: false },
    ],
    exhaustiveLength: 8,
  },
  {
    id: "second-last-1",
    number: 4,
    title: "Guess the end",
    difficulty: "Hard",
    prompt:
      "Accept the strings over $Σ = {0, 1}$ whose **second-to-last symbol is 1** — using **at most 3 states**. A DFA needs 4 states for this language, so you will need an **NFA**: let it *guess* when the end is near.",
    hints: [
      "Stay in a start state on any symbol, but on a 1 also allow a jump to a second state (that is the guess).",
      "From the second state, any one symbol leads to an accepting state with no outgoing transitions.",
    ],
    requiredKind: "any",
    alphabet: ["0", "1"],
    maxStates: 3,
    reference: SECOND_LAST_1,
    tests: [
      { input: w("10"), accept: true },
      { input: w("11"), accept: true },
      { input: w("0110"), accept: true },
      { input: w("110"), accept: true },
      { input: [], accept: false },
      { input: w("1"), accept: false },
      { input: w("01"), accept: false },
      { input: w("100"), accept: false },
      { input: w("0101"), accept: false },
    ],
    exhaustiveLength: 8,
  },
];

/** The empty document a challenge starts from in the Lab (its Σ is already filled in). */
export function challengeStarter(challenge: Challenge): LabAutomaton {
  const lab = emptyLab(challenge.requiredKind === "DFA" ? "DFA" : "NFA", `Challenge ${challenge.number}: ${challenge.title}`);
  return { ...lab, alphabet: [...challenge.alphabet] };
}

export interface TestResult {
  readonly input: readonly InputSymbol[];
  readonly expected: boolean;
  readonly actual: boolean;
  readonly pass: boolean;
}

export interface ChallengeReport {
  /** invalid: not a usable answer yet; wrong: a test failed; passed: every check agreed. */
  readonly status: "invalid" | "wrong" | "passed";
  /** Why the automaton could not be tested (empty unless invalid). */
  readonly problems: readonly string[];
  readonly tests: readonly TestResult[];
  /** Comparison with the reference on all short strings (null if not run). */
  readonly exhaustive: {
    readonly tested: number;
    readonly maxLength: number;
    readonly counterexample: readonly InputSymbol[] | null;
    /** Whether the counterexample should be accepted. */
    readonly shouldAccept: boolean | null;
  } | null;
}

/** Checks a Lab document against a challenge, using only the engine for every run. */
export function checkChallenge(challenge: Challenge, lab: LabAutomaton): ChallengeReport {
  const problems: string[] = [];
  const issues = validateLab(lab);
  if (issues.length > 0) {
    problems.push(`The automaton is not a valid ${lab.kind} yet: fix the ${issues.length} problem${issues.length === 1 ? "" : "s"} listed in the Lab.`);
  }
  if (challenge.requiredKind !== "any" && lab.kind !== challenge.requiredKind) {
    problems.push(`This challenge asks for a ${challenge.requiredKind}; yours is an ${lab.kind}.`);
  }
  const missing = challenge.alphabet.filter((s) => !lab.alphabet.includes(s));
  const extra = lab.alphabet.filter((s) => !challenge.alphabet.includes(s));
  if (missing.length > 0 || extra.length > 0) {
    problems.push(`Σ must be exactly {${challenge.alphabet.join(", ")}}` + (missing.length ? `; missing ${missing.join(", ")}` : "") + (extra.length ? `; remove ${extra.join(", ")}` : "") + ".");
  }
  if (challenge.maxStates !== undefined && lab.states.length > challenge.maxStates) {
    problems.push(`Use at most ${challenge.maxStates} states (yours has ${lab.states.length}).`);
  }
  if (problems.length > 0) return { status: "invalid", problems, tests: [], exhaustive: null };

  const automaton = labToAutomaton(lab);
  const tests = challenge.tests.map((test): TestResult => {
    const actual = accepts(automaton, test.input);
    return { input: test.input, expected: test.accept, actual, pass: actual === test.accept };
  });
  const budget = Array.from({ length: challenge.exhaustiveLength + 1 }, (_, n) => challenge.alphabet.length ** n).reduce((a, b) => a + b, 0);
  const report = checkEquivalence(challenge.reference, automaton, budget);
  const exhaustive = {
    tested: report.tested,
    maxLength: report.maxLength,
    counterexample: report.counterexample,
    shouldAccept: report.counterexample ? accepts(challenge.reference, report.counterexample) : null,
  };
  const passed = tests.every((r) => r.pass) && report.equivalent;
  return { status: passed ? "passed" : "wrong", problems: [], tests, exhaustive };
}
