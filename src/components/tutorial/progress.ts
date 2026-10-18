// Tutorial navigation and progress (which pages were read, which challenges solved). Pure TypeScript.

export interface TutorialProgress {
  /** Index of the current page among all pages of all modules. */
  readonly current: number;
  /** Ids of pages the user has opened. */
  readonly visited: readonly string[];
  /** Ids of challenges whose check passed. */
  readonly solved: readonly string[];
}

export type ProgressAction =
  | { readonly type: "next" }
  | { readonly type: "previous" }
  | { readonly type: "goto"; readonly index: number }
  | { readonly type: "solved"; readonly challengeId: string };

export const INITIAL_PROGRESS: TutorialProgress = { current: 0, visited: [], solved: [] };

/** Applies a navigation action. `pageIds` lists every page in order (it defines the bounds). */
export function progressReducer(state: TutorialProgress, action: ProgressAction, pageIds: readonly string[]): TutorialProgress {
  const last = pageIds.length - 1;
  const visit = (current: number): TutorialProgress => {
    const clamped = Math.min(Math.max(current, 0), Math.max(last, 0));
    const id = pageIds[clamped];
    return { ...state, current: clamped, visited: id === undefined || state.visited.includes(id) ? state.visited : [...state.visited, id] };
  };
  switch (action.type) {
    case "next":
      return visit(state.current + 1);
    case "previous":
      return visit(state.current - 1);
    case "goto":
      return visit(action.index);
    case "solved":
      return state.solved.includes(action.challengeId) ? state : { ...state, solved: [...state.solved, action.challengeId] };
  }
}

/** Fraction of pages visited (0..1). */
export function completion(progress: TutorialProgress, pageIds: readonly string[]): number {
  if (pageIds.length === 0) return 0;
  return pageIds.filter((id) => progress.visited.includes(id)).length / pageIds.length;
}

export const PROGRESS_STORAGE_KEY = "shadow-protocol.tutorial";

/** Reads saved progress; anything malformed falls back to a fresh start. Never throws. */
export function parseProgress(raw: string | null, pageIds: readonly string[]): TutorialProgress {
  if (!raw) return { ...INITIAL_PROGRESS, visited: pageIds.slice(0, 1) };
  try {
    const data = JSON.parse(raw) as Partial<TutorialProgress>;
    const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    const current = typeof data.current === "number" && Number.isInteger(data.current) ? data.current : 0;
    return {
      current: Math.min(Math.max(current, 0), Math.max(pageIds.length - 1, 0)),
      visited: strings(data.visited).filter((id) => pageIds.includes(id)),
      solved: strings(data.solved),
    };
  } catch {
    return { ...INITIAL_PROGRESS, visited: pageIds.slice(0, 1) };
  }
}
