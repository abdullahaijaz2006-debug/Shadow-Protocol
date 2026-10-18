import { useEffect, useRef } from "react";
import type { GameBridge } from "../game/bridge";
import { createGame } from "../game/createGame";

/**
 * Hosts the Phaser game. React owns the container <div>; Phaser owns everything inside it.
 * All communication goes through `bridge` (React never touches Phaser objects).
 */
export function GameCanvas({ bridge }: { bridge: GameBridge }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = createGame(container, bridge);
    // Destroy on unmount (and on StrictMode's dev-only remount) so only one game ever runs.
    return () => game.destroy(true);
  }, [bridge]);

  return <div ref={containerRef} className="game-canvas" />;
}
