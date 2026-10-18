import { useSyncExternalStore } from "react";
import type { GameBridge, GameSnapshot } from "../game/bridge";

/**
 * Subscribes a component to one slice of the game snapshot. The component re-renders only when
 * the selected value changes (compared with Object.is), so selectors must return either primitives
 * or objects taken as-is from the snapshot (whose unchanged parts keep their identity) — never
 * freshly built arrays or objects.
 */
export function useGameSelector<T>(bridge: GameBridge, selector: (snapshot: GameSnapshot) => T): T {
  return useSyncExternalStore(bridge.subscribe, () => selector(bridge.getSnapshot()));
}
