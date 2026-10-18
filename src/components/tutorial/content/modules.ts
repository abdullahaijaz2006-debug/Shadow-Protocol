// The tutorial's text and examples. Pure data: no logic here. Example results are claims that
// content.test.ts checks against the automata engine.
import type { TutorialModule } from "./types";

const S = "PLAYER_SPOTTED";
const L = "PLAYER_LOST";
const N = "SOUND_HEARD";
const C = "PLAYER_CAUGHT";
const T = "TIMER_EXPIRED";

export const TUTORIAL: readonly TutorialModule[] = [
  {
    id: "intro",
    number: 1,
    title: "Finite automata",
    summary: "The 5-tuple, and the difference between behaviour states and accepting states.",
    pages: [
      {
        id: "intro-what",
        title: "What is a finite automaton?",
        blocks: [
          {
            kind: "text",
            text: `A **finite automaton** is a machine with a fixed, finite set of states. It reads an input string one symbol at a time, and each symbol moves it from its current state to a next state. It has no other memory: everything it "knows" about the input so far is which state it is in.

Every guard in Shadow Protocol is such a machine. Its input symbols are game events — the guard spots you, loses you, hears a noise, a timer runs out — and its states are its high-level behaviours.`,
          },
          { kind: "text", text: "Formally, a **deterministic finite automaton (DFA)** is a 5-tuple:" },
          { kind: "math", text: "M = (Q, Σ, δ, q₀, F)" },
          {
            kind: "list",
            items: [
              "$Q$ — a finite set of **states** (for a guard: PATROL, ALERT, CHASE, SEARCH, CAPTURE).",
              "$Σ$ — the **input alphabet**, a finite set of symbols (the five guard events).",
              "$δ : Q × Σ → Q$ — the **transition function**: from state $q$, symbol $a$ leads to exactly one state $δ(q, a)$.",
              "$q₀ ∈ Q$ — the **start state** (PATROL).",
              "$F ⊆ Q$ — the set of **accepting states** ({CAPTURE}).",
            ],
          },
          { kind: "widget", widget: { type: "graph", machine: "guardDfa" } },
          {
            kind: "text",
            text: "In the drawing, circles are states, arrows are transitions labelled with their symbols, the arrow marked *start* points at $q₀$, and the double circle is the accepting state.",
          },
        ],
      },
      {
        id: "intro-accepting",
        title: "Behaviour states vs. accepting states",
        blocks: [
          {
            kind: "text",
            text: `Two different ideas meet in a guard, and it is important not to mix them up.

The **behaviour** comes from the *current* state: in PATROL the guard walks its route, in CHASE it runs after you, and so on. That is how the game uses the automaton.

**Accepting** is a statement about the *whole input string*. The automaton accepts a string $w$ if, after reading all of $w$ from $q₀$, it ends in a state of $F$. The set of accepted strings is the **language** $L(M)$.`,
          },
          {
            kind: "note",
            title: "Common mistake",
            text: "Accepting states are not \"good\" or \"successful\" states. For the guard, $F = {CAPTURE}$, so $L(M)$ is the set of event histories that end with the player caught. PATROL, ALERT, CHASE and SEARCH are ordinary behaviour states — reaching them does not make the input accepted.",
          },
          { kind: "widget", widget: { type: "definition", machine: "guardDfa" } },
          {
            kind: "text",
            text: "The table is $δ$ in full: one row per state, one column per symbol, one entry per cell. Dimmed cells are **self-loops** — the event does not change the state (for example, `PLAYER_LOST` while patrolling).",
          },
        ],
      },
    ],
  },
  {
    id: "dfa",
    number: 2,
    title: "Deterministic finite automata",
    summary: "How guard events produce exactly one next state, step by step.",
    pages: [
      {
        id: "dfa-guard",
        title: "Guard events drive deterministic transitions",
        blocks: [
          {
            kind: "text",
            text: `**Deterministic** means: for every state and every symbol there is *exactly one* next state. Given the same start and the same input, a DFA always follows the same single path — there is never a choice to make.

Pick an example event sequence and press **Step** to feed it to the guard's DFA one event at a time. Watch the current state, the arrow that fires, and the highlighted cell of the δ table.`,
          },
          {
            kind: "widget",
            widget: {
              type: "stepper",
              machine: "guardDfa",
              examples: [
                { label: "spotted → timer → caught", input: [S, T, C], expect: { accepted: true, final: ["CAPTURE"] } },
                { label: "a noise, then the search times out", input: [N, T], expect: { accepted: false, final: ["PATROL"] } },
                { label: "spotted, escaped, spotted again", input: [S, T, L, S], expect: { accepted: false, final: ["CHASE"] } },
                { label: "ignored events (self-loops)", input: [L, C], expect: { accepted: false, final: ["PATROL"] } },
                { label: "the empty string ε", input: [], expect: { accepted: false, final: ["PATROL"] } },
              ],
            },
          },
          {
            kind: "note",
            title: "Same symbol, different meaning",
            text: "`TIMER_EXPIRED` ends ALERT's reaction delay (→ CHASE) but ends SEARCH's look-around (→ PATROL). In a DFA the next state depends on the pair (state, symbol), not on the symbol alone.",
          },
        ],
      },
      {
        id: "dfa-textbook",
        title: "A textbook DFA",
        blocks: [
          {
            kind: "text",
            text: `The same machinery works for any alphabet. This DFA over $Σ = {a, b}$ accepts the strings that **end in ab**. Its states remember only the useful part of what was read: nothing useful ($q0$), "just read a" ($q1$), "just read ab" ($q2$).

Notice that the DFA is **complete**: every state has a transition on *both* a and b.`,
          },
          {
            kind: "widget",
            widget: {
              type: "stepper",
              machine: "endsWithAb",
              examples: [
                { label: "aab (accepted)", input: ["a", "a", "b"], expect: { accepted: true, final: ["q2"] } },
                { label: "aba (rejected)", input: ["a", "b", "a"], expect: { accepted: false, final: ["q1"] } },
                { label: "babab (accepted)", input: ["b", "a", "b", "a", "b"], expect: { accepted: true, final: ["q2"] } },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: "nfa",
    number: 3,
    title: "Nondeterministic finite automata",
    summary: "Several possible next states, ε-transitions, ε-closure and active-state sets.",
    pages: [
      {
        id: "nfa-choices",
        title: "Several possible next states",
        blocks: [
          {
            kind: "text",
            text: `A **nondeterministic finite automaton (NFA)** relaxes one rule: from a state, a symbol may lead to **several** states, or to **none**. Its transition function returns a *set* of states:`,
          },
          { kind: "math", text: "δ : Q × (Σ ∪ {ε}) → 𝒫(Q)" },
          {
            kind: "text",
            text: `Instead of following one path, we track the **set of all states the NFA could be in** — the *active set*. Reading a symbol moves every active state at once. A state with no transition for the symbol simply drops out: that computation path dies.

This NFA accepts strings over $Σ = {0, 1}$ ending in **01**. On a 0, state $q0$ can stay in $q0$ *or* move to $q1$ — the NFA "guesses" that the final 01 might start here, and keeps both possibilities.`,
          },
          {
            kind: "widget",
            widget: {
              type: "stepper",
              machine: "endsWith01",
              examples: [
                { label: "0 → two active states", input: ["0"], expect: { accepted: false, final: ["q0", "q1"] } },
                { label: "01 (accepted)", input: ["0", "1"], expect: { accepted: true, final: ["q0", "q2"] } },
                { label: "011 (a path dies)", input: ["0", "1", "1"], expect: { accepted: false, final: ["q0"] } },
              ],
            },
          },
          { kind: "text", text: "An NFA **accepts** $w$ if *at least one* computation path ends in an accepting state — that is, if the final active set contains a state of $F$." },
        ],
      },
      {
        id: "nfa-epsilon",
        title: "ε-transitions and ε-closure",
        blocks: [
          {
            kind: "text",
            text: `An **ε-transition** (drawn dashed) lets the NFA change state **without reading any input**. So whenever the NFA is in a state, it is also, for free, in every state reachable from it by ε-transitions. That set is the **ε-closure**:`,
          },
          { kind: "math", text: "ECLOSE(S) = the states reachable from S using only ε-transitions (zero or more)" },
          { kind: "text", text: "Click a state below to see its ε-closure. Every state is in its own closure (zero ε-steps)." },
          { kind: "widget", widget: { type: "closure", machine: "aStarOrBStar" } },
          {
            kind: "text",
            text: `The closure is applied **at the start** — the initial active set is $ECLOSE({q₀})$ — and **after every symbol**: the next set is $ECLOSE(⋃ δ(q, a))$ over the active states $q$.

This ε-NFA accepts $a^* ∪ b^*$. Its start state $s$ is not accepting, yet it accepts the empty string, because $ECLOSE({s}) = {s, pa, pb}$ already contains accepting states.`,
          },
          {
            kind: "widget",
            widget: {
              type: "stepper",
              machine: "aStarOrBStar",
              examples: [
                { label: "ε (accepted through the closure)", input: [], expect: { accepted: true, final: ["s", "pa", "pb"] } },
                { label: "aa (accepted)", input: ["a", "a"], expect: { accepted: true, final: ["pa"] } },
                { label: "ab (every path dies)", input: ["a", "b"], expect: { accepted: false, final: [] } },
              ],
            },
          },
        ],
      },
      {
        id: "nfa-guard",
        title: "A nondeterministic guard",
        blocks: [
          {
            kind: "text",
            text: `This "suspicious guard" NFA uses the guard alphabet. A sound has two possible meanings, so $δ(PATROL, SOUND_HEARD) = {ALERT, SEARCH}$. Two ε-transitions add more possibilities: an alert guard may already be chasing ($ALERT ⇢ε CHASE$), and a search may be silently given up ($SEARCH ⇢ε PATROL$).

It is a *demonstration* machine: the guards in the level always run the DFA from module 2.`,
          },
          { kind: "widget", widget: { type: "closure", machine: "guardNfa" } },
          {
            kind: "widget",
            widget: {
              type: "stepper",
              machine: "guardNfa",
              examples: [
                { label: "sound → four active states", input: [N], expect: { accepted: false, final: ["PATROL", "ALERT", "SEARCH", "CHASE"] } },
                { label: "sound → caught (accepted)", input: [N, C], expect: { accepted: true, final: ["CAPTURE"] } },
                { label: "spotted (ε adds CHASE)", input: [S], expect: { accepted: false, final: ["ALERT", "CHASE"] } },
                { label: "caught while unaware (∅)", input: [C], expect: { accepted: false, final: [] } },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: "versus",
    number: 4,
    title: "DFA vs. NFA",
    summary: "The same input on equivalent machines; equal power; no randomness.",
    pages: [
      {
        id: "versus-same-input",
        title: "Same input, two machines",
        blocks: [
          {
            kind: "text",
            text: "Here the suspicious-guard NFA and an **equivalent DFA** read the same input, one symbol at a time. The NFA keeps a set of active states; the DFA is always in exactly one state — and that one state *stands for* the NFA's whole set.",
          },
          { kind: "widget", widget: { type: "compare" } },
          { kind: "text", text: "Step through any example: after every symbol the DFA's state names exactly the NFA's active set, and both machines always give the same verdict." },
        ],
      },
      {
        id: "versus-power",
        title: "Equal power, no randomness",
        blocks: [
          {
            kind: "note",
            title: "NFAs are not more powerful",
            text: "For every NFA there is a DFA that accepts exactly the same language (module 5 shows how to build it). So NFAs and DFAs recognize exactly the same class of languages — the **regular languages**. An NFA can be much smaller, but it never recognizes a language that no DFA can.",
          },
          {
            kind: "note",
            title: "Nondeterminism is not randomness",
            text: "An NFA does not choose a path at random, and there are no probabilities. Think of it as exploring **every** computation path at once: the active set is all states some path could be in, and the string is accepted if **at least one** path ends in F. Running the same NFA on the same input always gives the same active sets and the same answer.",
          },
          {
            kind: "text",
            text: "The price of determinism can be size: a DFA may need up to $2^n$ states for an $n$-state NFA. The classic example is \"the 3rd symbol from the end is 1\": 4 NFA states, but its smallest DFA needs $2^3 = 8$. You can see that blow-up yourself in the Automata Lab by converting that preset.",
          },
        ],
      },
    ],
  },
  {
    id: "conversion",
    number: 5,
    title: "NFA → DFA conversion",
    summary: "The subset construction, one row at a time, and checking the result.",
    pages: [
      {
        id: "conversion-steps",
        title: "Subset construction, step by step",
        blocks: [
          {
            kind: "text",
            text: `The **subset construction** builds a DFA whose states are *sets* of NFA states:`,
          },
          {
            kind: "list",
            items: [
              "The DFA's start state is $ECLOSE({q₀})$.",
              "From a set $S$ on symbol $a$: take every transition on $a$ out of $S$ (the **move**), then the ε-closure. That set is $δ_D(S, a)$.",
              "A set seen for the first time becomes a new DFA state and is processed later (a worklist).",
              "A set is accepting if it contains at least one accepting NFA state. The empty set ∅ is a trap state.",
            ],
          },
          { kind: "text", text: "Press **Next row** to compute one DFA transition at a time for the \"ends in 01\" NFA." },
          { kind: "widget", widget: { type: "subset", machine: "endsWith01" } },
        ],
      },
      {
        id: "conversion-guard",
        title: "Converting the guard NFA",
        blocks: [
          {
            kind: "text",
            text: "The same procedure on the suspicious-guard NFA, which has ε-transitions, discovers 7 reachable subsets (including the trap ∅). Each DFA state is literally the set of NFA states it stands for — compare its rows with the active sets from module 3.",
          },
          { kind: "widget", widget: { type: "subset", machine: "guardNfa" } },
          {
            kind: "text",
            text: "At the end, the widget checks **acceptance equivalence**: both machines are run on every string up to a fixed length and must agree on each one. (The construction itself is correct for *all* strings — that is a theorem; the check is a demonstration on a finite sample.)",
          },
        ],
      },
    ],
  },
  {
    id: "game-ai",
    number: 6,
    title: "Automata in game AI",
    summary: "Perception makes symbols; the DFA decides behaviour; the rest of the game carries it out.",
    pages: [
      {
        id: "game-ai-pipeline",
        title: "From perception to symbols to behaviour",
        blocks: [
          {
            kind: "text",
            text: `A game runs continuously, 60 times a second, but a DFA reads discrete symbols. The guard's **perception** turns continuous checks into events:`,
          },
          {
            kind: "list",
            items: [
              "Vision: every tick the guard casts rays to test whether you are inside its field of view and not behind a wall. Only the *moment this changes* produces a symbol: `PLAYER_SPOTTED` when sight is gained, `PLAYER_LOST` after sight has been lost for 1.5 s.",
              "Hearing: your noise (Space) within range produces one `SOUND_HEARD`.",
              "Timers: the ALERT reaction delay and the SEARCH look-around produce one `TIMER_EXPIRED` when they run out.",
              "Catching: during CHASE, reaching you produces `PLAYER_CAUGHT`.",
            ],
          },
          { kind: "text", text: "Try it: send events to a guard's DFA and see what each part of the game then does." },
          { kind: "widget", widget: { type: "pipeline" } },
        ],
      },
      {
        id: "game-ai-separation",
        title: "What the automaton does — and doesn't",
        blocks: [
          {
            kind: "text",
            text: `The DFA decides **only the high-level state**. Everything else is ordinary game code that *reads* that state:`,
          },
          {
            kind: "list",
            items: [
              "**Movement and pathfinding** — a grid search (BFS) finds a route to the patrol waypoint or the last known position; physics moves the body.",
              "**Collision detection** — the physics engine stops bodies at walls; the automaton never knows about walls.",
              "**Animation and sound** — sprites, icons, the vision cone and sound effects show the current state.",
            ],
          },
          {
            kind: "note",
            title: "Why keep them apart?",
            text: "Because the automaton stays small and exact. You can draw it, test every transition, and reason about its language, while the messy continuous parts (geometry, timing, rendering) stay outside. The live visualizer in the game shows each guard's DFA updating as you play.",
          },
        ],
      },
    ],
  },
  {
    id: "challenges",
    number: 7,
    title: "Interactive challenges",
    summary: "Build automata in the Lab; they are checked with tests, including negative cases.",
    pages: [
      {
        id: "challenges-intro",
        title: "How the challenges work",
        blocks: [
          {
            kind: "text",
            text: `Each challenge opens the **Automata Lab** with an empty automaton whose alphabet is already set. Build your machine there, then press **Check** (in the Lab, or here).

Your automaton is checked by running it — with the same engine the game uses — on hand-picked strings, including strings that must be **rejected**, and on **every string up to a certain length**, comparing with a correct reference machine.`,
          },
          {
            kind: "note",
            title: "Testing is not a proof",
            text: "Passing all tests is strong evidence that your automaton recognizes the right language, but it is not a proof: two automata could in principle agree on every short string and differ on a longer one. Proving language equivalence needs an argument about all strings (for DFAs, for example, by minimizing both and comparing).",
          },
        ],
      },
      { id: "challenge-1", title: "Challenge 1 — Ends in 01", blocks: [{ kind: "widget", widget: { type: "challenge", challengeId: "ends-01" } }] },
      { id: "challenge-2", title: "Challenge 2 — Raise the alarm", blocks: [{ kind: "widget", widget: { type: "challenge", challengeId: "guard-alarm" } }] },
      { id: "challenge-3", title: "Challenge 3 — Find the pattern", blocks: [{ kind: "widget", widget: { type: "challenge", challengeId: "contains-aba" } }] },
      { id: "challenge-4", title: "Challenge 4 — Guess the end", blocks: [{ kind: "widget", widget: { type: "challenge", challengeId: "second-last-1" } }] },
    ],
  },
];

/** Every page in reading order. */
export const TUTORIAL_PAGES = TUTORIAL.flatMap((module) => module.pages.map((page) => ({ module, page })));
