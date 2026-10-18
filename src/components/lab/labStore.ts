// The Automata Lab's document, held outside React so other screens (the tutorial's challenges) can
// load a starting automaton into the Lab and read back what the user built. Pure TypeScript.
import { exampleLab, labReducer, type LabAction, type LabAutomaton } from "./labModel";

export interface LabStoreSnapshot {
  readonly lab: LabAutomaton;
  /** The last document loaded from outside the Lab (e.g. a tutorial challenge). Version 0 = none yet. */
  readonly load: { readonly version: number; readonly previous: LabAutomaton | null; readonly label: string };
}

/** A tiny external store (useSyncExternalStore contract), like GameBridge. */
export class LabStore {
  private snapshot: LabStoreSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(initial: LabAutomaton = exampleLab()) {
    this.snapshot = { lab: initial, load: { version: 0, previous: null, label: "" } };
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): LabStoreSnapshot => this.snapshot;

  /** Applies a Lab edit; refused edits (the reducer returns the same object) notify no one. */
  readonly dispatch = (action: LabAction): void => {
    const lab = labReducer(this.snapshot.lab, action);
    if (lab !== this.snapshot.lab) this.set({ ...this.snapshot, lab });
  };

  /** Replaces the document from outside the Lab; the Lab offers to undo it. */
  readonly load = (lab: LabAutomaton, label: string): void => {
    this.set({ lab, load: { version: this.snapshot.load.version + 1, previous: this.snapshot.lab, label } });
  };

  private set(snapshot: LabStoreSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
