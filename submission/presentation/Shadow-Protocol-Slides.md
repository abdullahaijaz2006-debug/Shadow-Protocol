# Shadow Protocol: Presentation Outline (12 slides)

Slide-by-slide content with suggested visuals and speaker notes. Figures refer to `../diagrams/rendered/` and
screenshots to `../screenshots/`. Speaking time is about 10–12 minutes without the live demonstration
(see `../demo/Demo-Script.md` for the demonstration). Every number below matches the report.

---

## Slide 1: Title

**Shadow Protocol: A Finite Automata-Based Stealth Game and Interactive Learning Environment**

- [STUDENT INPUT: team member names and registration numbers]
- [STUDENT INPUT: course name and code · faculty name]
- [STUDENT INPUT: institution, semester, date]

**Visual:** `screenshots/01-main-menu.png` (the title screen), or the application icon.

**Speaker notes:**
"Good [morning/afternoon]. Our project is Shadow Protocol, a Windows desktop application that is two things at once: a stealth game whose guards are controlled by finite automata, and a learning environment for DFAs and NFAs. In the next few minutes we will show the theory, how we turned it into the actual control logic of a game, and how we verified that the mathematics is correct."

---

## Slide 2: Problem Statement

- Automata are taught on paper, disconnected from real systems
- Static diagrams don't show computation step by step
- Nondeterminism is often misread as randomness
- Game AI hides its state machine in ad-hoc `if` statements: not stated, not validated, not visible

**Visual:** a textbook state diagram next to `screenshots/02-gameplay-guard-dfa.png`, contrasting a static drawing with a live one.

**Speaker notes:**
"Students learn finite automata as abstract objects, but rarely see one actually running a system. When they do see state machines, for example in game AI, the machine is usually implicit, buried in conditional code. Our question was: can we build an application where a finite automaton is the real, inspectable control mechanism, and give learners tools to observe, build and convert automata, while guaranteeing that every operation is mathematically correct?"

---

## Slide 3: Project Objectives

- Reusable, framework-independent automata engine: validation, DFA/NFA simulation, ε-closure, subset construction
- Stealth game whose guards are controlled **only** by a validated DFA
- Live visualiser with pause, step and reset
- NFA ⇄ DFA comparison on the same input
- Automata Lab: build, validate, simulate, convert, save
- Interactive tutorial with challenges
- Automated verification; offline Windows installer

**Visual:** a checklist with all items ticked.

**Speaker notes:**
"These were our objectives. The key design decision is the first one: a single engine that everything else uses, so the game, the visualiser, the Lab and the tutorial can never disagree about the mathematics. All objectives were met in version 1.0.0."

---

## Slide 4: Technologies Used

- **Tauri 2** (Rust): native Windows window and installers; UI rendered by WebView2
- **React 19 + TypeScript**: menus, visualiser, Lab, tutorial
- **Phaser 3.90**: tilemap, Arcade physics, sprites, input
- **Vite 8**: build · **Vitest 5**: 527 unit tests
- No image or sound files: pixel art and sound effects are generated in code; works offline

**Visual:** a row of layer boxes (Tauri → React → Phaser → engine).

**Speaker notes:**
"Tauri gives us a small native Windows application: the installer is about 3.3 MB. React draws the user interface, Phaser runs the game, and Vitest runs our unit tests. Everything, including the pixel art and the sound effects, is generated in code, so the installed application needs no network connection."

---

## Slide 5: System Architecture

- Three layers, one direction: `components → game → automata`
- Engine is pure TypeScript; a test fails if it imports anything outside itself
- React ↔ Phaser only through **GameBridge**: immutable snapshots out, commands in
- Fixed 1/60 s simulation ticks: pause = 0 ticks, step = 1 tick, so runs are reproducible

**Visual:** `diagrams/rendered/01-system-architecture.png`.

**Speaker notes:**
"The engine at the bottom knows nothing about games or user interfaces, which is what allows it to be tested thoroughly and shared. The game and the UI never touch each other's objects. They exchange immutable snapshots and commands through a bridge. All game logic runs in fixed sixtieth-of-a-second ticks, which is what makes single-stepping meaningful: one step is exactly one tick of simulated time."

---

## Slide 6: DFA Fundamentals

- $M = (Q, \Sigma, \delta, q_0, F)$ with $\delta : Q \times \Sigma \to Q$ (**total and deterministic**)
- $\hat\delta(q, \varepsilon) = q$, $\hat\delta(q, wa) = \delta(\hat\delta(q, w), a)$; $L(M) = \{ w \mid \hat\delta(q_0, w) \in F \}$
- In the engine: δ is an edge list; missing or duplicate (q, a) pairs are **errors**, never silently filled
- Inputs are arrays of symbols, so `PLAYER_SPOTTED` is one symbol

**Visual:** the δ table from `screenshots/03-formal-definition.png`.

**Speaker notes:**
"A DFA is a 5-tuple. Its transition function is total and deterministic: exactly one next state for every state and symbol. Our engine enforces this strictly. If a pair is missing or appears twice, the automaton is rejected with an explanation, never silently patched. Because our symbols are names like PLAYER_SPOTTED, an input string is an array of symbols rather than a text string."

---

## Slide 7: DFA-Controlled Guard Behaviour

- $Q$ = {PATROL, ALERT, CHASE, SEARCH, CAPTURE}; $q_0$ = PATROL; $F$ = {CAPTURE}
- $\Sigma$ = {PLAYER_SPOTTED, PLAYER_LOST, SOUND_HEARD, PLAYER_CAUGHT, TIMER_EXPIRED}
- Perception and timers → **edge-triggered** symbols (one per change, never per frame)
- The DFA decides the state; movement, pathfinding and animation only carry it out
- Three guards, three independent runners, one frozen definition
- **Acceptance ≠ behaviour**: $L(M)$ = event histories ending in capture

**Visual:** `diagrams/rendered/03-guard-dfa.png` and `diagrams/rendered/02-event-to-behaviour-workflow.png`.

**Speaker notes:**
"Here is the guard's actual automaton: five states and five event symbols, with all 25 transitions defined. Continuous perception is turned into discrete events. Seeing the player produces PLAYER_SPOTTED once; losing sight for one and a half seconds produces PLAYER_LOST once. A typical capture is the string spotted, timer, caught: PATROL, ALERT, CHASE, CAPTURE.

An important subtlety: CAPTURE is the formal accepting state, so the language of this DFA is the set of event histories that end in a capture. A guard that is chasing is not 'rejecting' anything. The history just doesn't end in a capture yet."

---

## Slide 8: NFA Fundamentals and Comparison

- $\delta : Q \times (\Sigma \cup \{\varepsilon\}) \to \mathcal{P}(Q)$: zero, one or many next states
- Simulate the **active set**: $\mathrm{ECLOSE}\big(\bigcup_{p \in S} \delta(p, a)\big)$; accept iff the set meets $F$
- **Not randomness**: all paths are followed at once, deterministically
- Same power as DFAs (Rabin–Scott), but up to exponentially smaller
- Demonstration guard NFA: SOUND_HEARD → {ALERT, SEARCH}; ALERT →ε CHASE; SEARCH →ε PATROL

**Visual:** `screenshots/05-nfa-dfa-comparison-step2.png` (NFA and DFA side by side, both accepting).

**Speaker notes:**
"An NFA may have several next states, or none, and may move on epsilon without reading input. We simulate it by tracking the set of all states some path could be in. This is the key point: nondeterminism is not randomness. Nothing is chosen by chance; every path is followed at once. In this screenshot, after 'sound', the NFA is in four states at once, because the epsilon-closure adds CHASE and PATROL. After 'caught', one path reaches CAPTURE, so the string is accepted, and the DFA on the right agrees."

---

## Slide 9: NFA-to-DFA Conversion

- Subset construction: $S_0 = \mathrm{ECLOSE}(q_0)$, $\delta_D(S, a) = \mathrm{ECLOSE}(\bigcup_{q \in S} \delta_N(q, a))$, $F_D = \{S \mid S \cap F_N \neq \emptyset\}$
- Only **reachable** subsets, breadth-first worklist; ∅ becomes a trap state
- "Ends in 01": 3 of 8 subsets · guard NFA: 7 of 32 · "3rd from end is 1": 4 → 8 (proven minimal)
- Invariant checked live: DFA state = the NFA's active set

**Visual:** `diagrams/rendered/05b-subset-dfa-ends-with-01.png`, and `screenshots/07-lab-subset-conversion.png`.

**Speaker notes:**
"To convert an NFA into an equivalent DFA, each DFA state is a set of NFA states. We start from the epsilon-closure of the start state, and for each set and symbol we take all moves followed by the epsilon-closure. A set is accepting if it contains an accepting NFA state. We only build reachable subsets. For the guard NFA that is 7 of a possible 32. The classic 'third symbol from the end' example really does need all 8, and our tests prove that 8 is the minimum."

---

## Slide 10: Interactive Automata Lab

- Editor: states, Σ, transitions, q₀, F, DFA/NFA, ε-edges; drag and connect on the graph
- Validation by the engine, with problems highlighted on the graph
- Simulator: Step / Run, active state or set, trace, verdict
- NFA → DFA conversion with an equivalence check
- Nine presets · JSON save/load · undo
- Tutorial: 7 modules, 18 pages; 4 challenges solved in the Lab

**Visual:** `screenshots/08-lab-simulation-accept.png` and `screenshots/11-lab-challenge-passed.png`.

**Speaker notes:**
"The Lab is where students build their own automata. Every check is done by the same engine, and problems are highlighted on the graph. You can step through an input, convert an NFA into a DFA, and save your work as a file. The tutorial's challenges are solved here. They are checked by hand-picked tests and by comparing with a reference on every string up to length 8. We are careful to say that this is testing, not a proof."

---

## Slide 11: Testing and Results

- **527 unit tests**, all passing: engine 132 · game logic 175 · UI logic 220
- Randomised differential tests: 250 random ε-NFAs vs. an independent brute-force path search; subset DFA = active set on every string ≤ length 6
- Tutorial claims re-checked by the engine; minimality proved by Myhill–Nerode
- Scripted end-to-end checks of the running app; installed-app checks (16/16)
- Type check clean · Rust clippy clean · NSIS and MSI installers built

**Visual:** the test results table from report Section 17.

**Speaker notes:**
"We tested at several levels. 527 unit tests run in Node. The most important are differential tests: 250 randomly generated NFAs with epsilon-cycles and dead ends, checked against a brute-force search we wrote independently of the engine, and against their own subset DFAs. We also re-check every example in the tutorial with the engine, so the teaching material can't drift from the implementation. Finally we scripted end-to-end checks of the running and the installed application. Testing also found real bugs, for example a crash specific to the Windows web view, which we fixed."

---

## Slide 12: Conclusion and Future Scope

- Automata are the **real** control mechanism, not an illustration
- One engine for game, visualiser, comparison, Lab and tutorial
- Clear distinction between acceptance and behaviour, and between testing and proof
- **Future:** proof-producing equivalence (product construction), DFA minimisation, regular expressions ↔ NFAs, NFA-controlled guards, more levels
- Thank you. Questions?

**Visual:** `screenshots/02-gameplay-guard-dfa.png`.

**Speaker notes:**
"To conclude: Shadow Protocol shows that the formal model and the working system can be the same thing. Every guard decision you saw is a transition of a validated DFA, and every operation in the Lab is computed by the same engine. For the future, the most interesting step is to replace our tested equivalence check with a proof. DFA equivalence is decidable, using the product construction. Thank you, and we're happy to take questions."

---

### Anticipated questions (preparation)

| Question | Short answer |
|---|---|
| Why is CAPTURE the only accepting state? | $F$ defines the *language*: event histories ending in a capture. The other states are operational behaviour, not rejection. |
| Is the NFA more powerful than the DFA? | No. They recognise the same class (regular languages); the NFA can be exponentially smaller. |
| Does the guard choose randomly in the NFA? | No. The NFA is simulated deterministically by tracking all paths at once. And the gameplay guards use the DFA. |
| How do you know the subset construction is correct? | The standard induction proof, plus tests: on every string up to length 6 for 250 random ε-NFAs, the DFA state equals the NFA's active set. |
| Do the challenges prove that an answer is correct? | No. They test up to length 8 plus hand-picked cases. A proof would use the product construction (future work). |
| What happens with ε-cycles? | ε-closure uses a visited set, so it terminates; this is tested. |
