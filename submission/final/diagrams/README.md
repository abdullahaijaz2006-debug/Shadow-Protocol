# Exported diagrams

Generated from the Mermaid sources in `../../diagrams/*.mmd` (unchanged; edit those and re-export) with
Mermaid 11.4.1. Each diagram is provided as PNG (3× resolution, for Word/PowerPoint) and SVG (for browsers;
the SVGs use HTML text labels, so open them in a web browser rather than inserting them into Office).

| Folder | Theme | Layout | Used in |
|---|---|---|---|
| `report/` | light | A4-friendly (wide state diagrams drawn top-to-bottom) | Shadow_Protocol_Project_Report.docx / .pdf |
| `presentation/` | dark | 16:9-friendly (state diagrams left-to-right, larger font) | Shadow_Protocol_Presentation.pptx |

Layout changes are export settings only (direction, font size, spacing; the ELK layout for the architecture
diagram, which keeps subgraph titles visible). Every label of every source was checked to appear in each
export, and no subgraph title is clipped or covered. One rendering fix is applied at export time: Mermaid 11
replaces `http://…` in a label with "Unsupported markdown: link", so an invisible word joiner is inserted
after `http:` (the text looks identical).

The architecture diagram (01) was reorganised in the final audit for print legibility: layers left to right,
one arrow from the UI to the engine, and each engine box listing the parts of the app that use it (instead
of eleven separate arrows). On its landscape page in the report its labels are about 8 pt (previously 5.5 pt).
`../../diagrams/rendered/01-system-architecture.png` was re-rendered from the same source.
