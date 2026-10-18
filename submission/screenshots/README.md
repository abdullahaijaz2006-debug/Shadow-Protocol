# Screenshots

All images here are **real screenshots of the installed Shadow Protocol 1.0.0 application** (Windows,
1600 × 900 view). They were captured through the WebView2 DevTools protocol. To set up some scenes, a script
performed the steps a user would: clicking buttons, typing input and pasting JSON into the Lab. For
`02-gameplay-guard-dfa.png` it placed the player directly in front of Guard 1. Every state shown was then
produced by the application's own logic. Nothing was edited or drawn by hand.

| File | Shows |
|---|---|
| `01-main-menu.png` | Main menu |
| `02-gameplay-guard-dfa.png` | Guard 1 captured the player; live DFA with history spotted → timer → caught |
| `03-formal-definition.png` | The same run: 5-tuple, input w (∈ L(M)) and the δ table |
| `04-nfa-dfa-comparison-step1.png` | NFA ⇄ DFA on "sound · caught" after one symbol: active set of 4 states = D2 |
| `05-nfa-dfa-comparison-step2.png` | After "sound · caught": both accept; traces with move sets and ε-closures |
| `06-lab-guard-nfa.png` | Lab with the "Suspicious guard NFA" preset (dashed ε-edges) |
| `07-lab-subset-conversion.png` | Converted to a 7-state DFA; equivalence check; subset table |
| `08-lab-simulation-accept.png` | Simulating SOUND_HEARD PLAYER_CAUGHT on the converted DFA: accepted |
| `09-tutorial-nfa-active-set.png` | Tutorial module 3: active set {q0, q1} after reading 0 |
| `10-tutorial-subset-construction.png` | Tutorial module 5: subset construction, two rows computed |
| `11-lab-challenge-passed.png` | Challenge 1 solved in the Lab (all tests passed) |

## Not yet captured (placeholders for the student)

These screenshots need a person at the computer. Capture them with **Win + PrtScn** (saved to
Pictures\Screenshots) and copy them here if your report or presentation needs them:

- [ ] `12-installer.png`: run `release/Shadow-Protocol-1.0.0/Shadow Protocol_1.0.0_x64-setup.exe` and capture the installer window.
- [ ] `13-start-menu.png`: the "Shadow Protocol" entry in the Start menu, with the pixel-art icon.
- [ ] `14-stealth-gameplay.png`: during normal play, the player sneaking behind a guard's vision cone, all guards in PATROL.
- [ ] `15-tutorial-pipeline.png`: Tutorial → "From perception to symbols to behaviour", after pressing PLAYER_SPOTTED.
