import { Profiler, type ReactNode } from "react";

declare global {
  interface Window {
    /** Development only: how many times each counted part of the UI has rendered. */
    __renderCounts?: Record<string, number>;
  }
}

/**
 * Development-only render counter, used to check that gameplay does not re-render parts of the UI
 * whose data did not change. In production builds it renders its children unchanged.
 */
export function RenderCounter({ id, children }: { id: string; children: ReactNode }) {
  if (!import.meta.env.DEV) return children;
  return (
    <Profiler
      id={id}
      onRender={() => {
        const counts = (window.__renderCounts ??= {});
        counts[id] = (counts[id] ?? 0) + 1;
      }}
    >
      {children}
    </Profiler>
  );
}
