# Final Submission Checklist

Everything automatable has been done and verified. The documents are complete, consistent and open
without errors. The tasks below need you.

## 1. Fill in the placeholders (highlighted yellow)

**Report** (`final/Shadow_Protocol_Project_Report.docx`): 17 placeholders.

- [ ] Title page:
  - [ ] course name and code
  - [ ] team names and registration numbers
  - [ ] faculty guide and designation
  - [ ] department and institution (Vellore Institute of Technology was inferred from the folder name; confirm it)
  - [ ] semester / slot
  - [ ] submission date
- [ ] Page 2: add the declaration / certificate / acknowledgement your institution requires, or delete the page.
- [ ] §17.3: decide whether the end-to-end check scripts must be submitted. They are not in the project folder; ask if you want them added. Then delete the placeholder.
- [ ] §17.3: add any manual testing you do (see section 4 below), or delete the placeholder.
- [ ] §18: three optional screenshots (installer + Start menu, normal stealth gameplay, tutorial module 6). Add them, or delete the placeholder lines.
- [ ] §22: access dates for references [8]–[11]; adjust the reference style if your institution requires one.

**Presentation** (`final/Shadow_Protocol_Presentation.pptx`): 3 placeholders, all on slide 1.

- [ ] team names and registration numbers
- [ ] course and faculty
- [ ] institution, semester and date

> **Edit directly in Word or PowerPoint** (simplest), or edit the Markdown in `report/` and `presentation/`
> and ask for a rebuild. If you edit the Word file directly, the Markdown version will no longer match.

## 2. Formatting required by your institution

- [ ] Apply any required cover-page template, fonts, line spacing, margins or page limit. The current settings are A4, 2.5 cm margins, Cambria 11 pt, IEEE references.
- [ ] Set the document author: Word → File → Info → Author (currently blank on purpose).

## 3. After editing the report

- [ ] Word → References → **Update Table** → Update entire table, so the contents list shows the right page numbers.
- [ ] File → Save As → PDF to replace `final/Shadow_Protocol_Project_Report.pdf`.
- [ ] Check the PDF:
  - [ ] pages 23 and 28 are landscape (architecture and guard DFA figures);
  - [ ] every page except the title page shows "Page X of Y".

## 4. Manual checks of the application

- [ ] Install the **MSI** (needs administrator approval), launch it, then uninstall it.
- [ ] **Listen** to the sound effects. Automated tests only confirmed that audio runs.
- [ ] Confirm the SmartScreen warning ("More info → Run anyway") matches `release/…/README.txt`.
- [ ] Optional: install on a second Windows PC; nothing has been tested on a clean machine.
- [ ] Confirm "Abdullah Aijaz" is correct as the installer's publisher name.

## 5. Presentation and demonstration

- [ ] Rehearse with `final/Shadow_Protocol_Demo_Guide.pdf`: 7 minutes, preparation list on page 1.
- [ ] Before the session, prepare `ends-with-01.json` in Downloads (demo step 7).
- [ ] Keep `final/screenshots/` open as the fallback.

## 6. Hand-in package

- [ ] `submission/final/`: report (DOCX + PDF), presentation, demo guide, diagrams, screenshots.
- [ ] `release/Shadow-Protocol-1.0.0/`: installers, README.txt, SHA256SUMS.txt.
- [ ] Source code if required: zip the project **without** `node_modules/`, `src-tauri/target/` and `dist/`.
