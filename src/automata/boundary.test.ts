import { describe, expect, it } from "vitest";

// Raw source of every file in src/automata (Vite feature, so no Node `fs` types are needed).
const sources = import.meta.glob("./**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

/** Every module specifier in `import … from "x"`, `import "x"`, `export … from "x"` and `import("x")`. */
function importsOf(source: string): string[] {
  const pattern = /(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g;
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

describe("automata engine boundary", () => {
  it("finds the engine's source files", () => {
    expect(Object.keys(sources)).toEqual(expect.arrayContaining(["./types.ts", "./dfa.ts", "./nfa.ts", "./runner.ts"]));
  });

  it.each(Object.entries(sources))("%s only imports files inside src/automata", (path, source) => {
    // No Phaser, React, Tauri or game code; tests may also import vitest.
    const allowed = (specifier: string) => specifier.startsWith("./") || (path.endsWith(".test.ts") && specifier === "vitest");
    expect(importsOf(source).filter((specifier) => !allowed(specifier))).toEqual([]);
  });
});
