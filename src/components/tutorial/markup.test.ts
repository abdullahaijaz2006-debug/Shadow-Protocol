import { describe, expect, it } from "vitest";
import { paragraphs, parseInline } from "./markup";

describe("parseInline", () => {
  it("splits bold, italic, code and math runs", () => {
    expect(parseInline("A **DFA** is $M = (Q, Σ, δ, q₀, F)$ with `δ` *total*.")).toEqual([
      { kind: "text", text: "A " },
      { kind: "bold", text: "DFA" },
      { kind: "text", text: " is " },
      { kind: "math", text: "M = (Q, Σ, δ, q₀, F)" },
      { kind: "text", text: " with " },
      { kind: "code", text: "δ" },
      { kind: "text", text: " " },
      { kind: "italic", text: "total" },
      { kind: "text", text: "." },
    ]);
  });

  it("keeps plain text (and stray markers) as text", () => {
    expect(parseInline("no markup")).toEqual([{ kind: "text", text: "no markup" }]);
    expect(parseInline("a * b")).toEqual([{ kind: "text", text: "a * b" }]);
  });
});

describe("paragraphs", () => {
  it("splits on blank lines and joins wrapped lines", () => {
    expect(paragraphs("one\n  two\n\n  three  \n\n\n")).toEqual(["one two", "three"]);
  });
});
