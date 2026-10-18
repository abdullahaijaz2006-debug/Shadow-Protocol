// The shape of tutorial content. Content files are pure data; components decide how to show it.
import type { InputSymbol, State } from "../../../automata";
import type { MachineId } from "../machines";

/** A worked example for a stepper, with the result the content claims (checked by tests). */
export interface StepperExample {
  readonly label: string;
  readonly input: readonly InputSymbol[];
  readonly expect: {
    readonly accepted: boolean;
    /** The DFA's final state, or the NFA's final set of active states (canonical order). */
    readonly final: readonly State[];
  };
}

export type Widget =
  /** A static state graph. */
  | { readonly type: "graph"; readonly machine: MachineId }
  /** The 5-tuple and δ table. */
  | { readonly type: "definition"; readonly machine: MachineId }
  /** Step through example inputs on a DFA or an NFA (graph, tape, δ table, trace). */
  | { readonly type: "stepper"; readonly machine: MachineId; readonly examples: readonly StepperExample[] }
  /** Click a state to see its ε-closure. */
  | { readonly type: "closure"; readonly machine: MachineId }
  /** The same input on the guard NFA and its subset DFA (the comparison model). */
  | { readonly type: "compare" }
  /** Subset construction, one row at a time. */
  | { readonly type: "subset"; readonly machine: MachineId }
  /** How perception, the DFA and movement/animation fit together in a guard. */
  | { readonly type: "pipeline" }
  /** One of the Lab challenges. */
  | { readonly type: "challenge"; readonly challengeId: string };

export type Block =
  | { readonly kind: "text"; readonly text: string }
  /** A displayed formula or definition. */
  | { readonly kind: "math"; readonly text: string }
  | { readonly kind: "list"; readonly items: readonly string[] }
  /** A highlighted remark (e.g. a common misconception). */
  | { readonly kind: "note"; readonly title: string; readonly text: string }
  | { readonly kind: "widget"; readonly widget: Widget };

export interface TutorialPage {
  /** Unique across the whole tutorial (used for progress). */
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly Block[];
}

export interface TutorialModule {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly summary: string;
  readonly pages: readonly TutorialPage[];
}
