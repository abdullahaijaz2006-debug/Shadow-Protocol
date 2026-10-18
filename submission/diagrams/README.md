# Diagrams

The source of every diagram is a text file in [Mermaid](https://mermaid.js.org/) syntax (`*.mmd`), so diagrams
can be maintained like code. `rendered/` contains PNG images produced from these sources with Mermaid 11.4.1.
The report embeds the PNG images.

| Source | Diagram | Matches |
|---|---|---|
| `01-system-architecture.mmd` | Overall system architecture | `src/` layer structure, `GameBridge` |
| `02-event-to-behaviour-workflow.mmd` | Game event → DFA transition → guard behaviour | `src/game/guard/Guard.ts`, `PerceptionTracker.ts`, `guardConfig.ts` |
| `03-guard-dfa.mmd` | Guard DFA state-transition graph (all 25 transitions) | `GUARD_DFA` in `src/game/guard/guardDfa.ts` |
| `04a-example-nfa-ends-with-01.mmd` | Example NFA: strings ending in 01 | `ENDS_WITH_01` in `src/automata/examples.ts` |
| `04b-guard-nfa.mmd` | Demonstration guard NFA with ε-edges | `GUARD_NFA` in `src/game/guard/guardNfa.ts` |
| `05a-subset-construction-algorithm.mmd` | Subset construction algorithm | `nfaToDfa` in `src/automata/subsetConstruction.ts` |
| `05b-subset-dfa-ends-with-01.mmd` | Subset DFA of the example NFA (3 states) | `nfaToDfa(ENDS_WITH_01)` |
| `05c-subset-dfa-guard-nfa.mmd` | Subset DFA of the guard NFA (7 states) | `nfaToDfa(GUARD_NFA)` |
| `06-automata-lab-workflow.mmd` | Automata Lab workflow | `src/components/lab/` |

**Verification.** The five state diagrams (03, 04a, 04b, 05b, 05c) were parsed and compared with the engine's
automata. Every edge, the start state and the accepting set match exactly. All nine files were rendered
without syntax errors.

**Viewing or editing.**
- GitHub and GitLab render `.mmd` code inside Markdown fences.
- VS Code: install the "Markdown Preview Mermaid Support" extension, or paste a file into https://mermaid.live.
- To re-render a PNG after editing: paste the source into https://mermaid.live and export PNG or SVG.
