# Shadow Protocol: Project Submission

Academic documentation for **Shadow Protocol 1.0.0**, a Windows desktop stealth game whose guards are
controlled by finite automata, with a live automaton visualiser, an NFA ⇄ DFA comparison, an Automata Lab
and an interactive tutorial.

> **Status: draft for review.** Content is complete except for the items marked `[STUDENT INPUT: …]`
> (listed below). No PDF or PowerPoint files have been generated yet.

## Contents

```
submission/
  README.md                         this file
  report/
    Shadow-Protocol-Report.md       academic report: 22 sections + 2 appendices
  diagrams/
    README.md                       what each diagram shows and how it was verified
    *.mmd                           9 Mermaid diagram sources
    rendered/*.png                  the same diagrams as images (embedded in the report)
  presentation/
    Shadow-Protocol-Slides.md       12 slides: bullets, suggested visuals, speaker notes, Q&A prep
  demo/
    Demo-Script.md                  7-minute live demonstration with timings and a fallback plan
  screenshots/
    README.md                       how they were captured; placeholders for missing ones
    01-…11-*.png                    11 real screenshots of the installed application
```

The application itself (installers, installation README and SHA-256 checksums) is in
`../release/Shadow-Protocol-1.0.0/`, and the source code is in `../src/` and `../src-tauri/`.

## How to read and present

- **Report:** open `report/Shadow-Protocol-Report.md` in VS Code (Markdown preview, Ctrl + Shift + V) or on
  GitHub. Mathematics uses LaTeX notation (`$…$`), which GitHub, VS Code and pandoc render. Images are
  linked relative to the report, so keep the folder structure.
- **Diagrams:** see `diagrams/README.md`. Edit the `.mmd` sources and re-render them at https://mermaid.live.
- **Presentation:** build the slides from `presentation/Shadow-Protocol-Slides.md`. Each slide lists its
  visual (a file in `diagrams/rendered/` or `screenshots/`) and its speaker notes.
- **Demonstration:** follow `demo/Demo-Script.md`; do the preparation checklist 10 minutes before.

## Information that needs your input

| Where | What to fill in |
|---|---|
| Report, title page | course name and code; school or department and institution (the folder name suggests Vellore Institute of Technology, so confirm); names and registration numbers of every team member; faculty name and designation; semester or slot; submission date |
| Report, after the title page | any declaration, certificate or acknowledgement page your institution requires |
| Report §17.3 | whether the development-time end-to-end check scripts must be included (they are not part of the repository) |
| Report §17.3 | any additional manual testing you perform (e.g. installing the MSI, testing on a second PC) |
| Report §18 | three optional screenshots that need a person at the computer (installer, Start menu, normal gameplay, tutorial pipeline); see `screenshots/README.md` |
| Report §22 | access dates for the four online references; the reference style required by your institution; your course textbook if it is not [1] or [2] |
| Slides, slide 1 | team names and registration numbers; course and faculty; institution, semester, date |
| Formatting | your institution's formatting rules (font, margins, page numbers, page limit, cover-page template) are not known and have not been applied |

## How the content was verified

- Every technical claim was taken from the source code, and the worked examples (ε-closures, traces,
  subset-construction tables, execution examples) were printed by the project's own engine rather than
  computed by hand.
- The five state diagrams were compared edge by edge with the engine's automata (exact match), and all
  nine diagrams render without Mermaid errors.
- Test counts (527 unit tests in 41 files, all passing) come from a fresh `npm test` run. The end-to-end
  check counts are the final results recorded during Milestones 7B–7C.2.
- The screenshots are unedited captures of the installed application (see `screenshots/README.md`).
- Nothing in the application (gameplay, automata engine or features) was changed for this milestone.
