import { useRef, useState } from "react";
import { pressHandler } from "../visualizer/pressHandler";
import { downloadTextFile, readChosenFile } from "./labFiles";
import { labFileName, parseLab, serializeLab } from "./labJson";
import type { LabAutomaton } from "./labModel";

interface LabFilePanelProps {
  readonly lab: LabAutomaton;
  /** Replace the document with a loaded one. */
  readonly onLoad: (lab: LabAutomaton, source: string) => void;
}

/** Save / load the automaton as JSON: a file, or text to copy and paste. */
export function LabFilePanel({ lab, onLoad }: LabFilePanelProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const json = serializeLab(lab);

  const load = (text: string, source: string) => {
    const result = parseLab(text);
    if (!result.ok) {
      setStatus({ ok: false, text: `Could not load ${source}: ${result.error}` });
      return;
    }
    onLoad(result.lab, source);
    setDraft(null);
    setStatus({ ok: true, text: `Loaded “${result.lab.name}” from ${source}.` });
  };

  return (
    <div className="lab-file">
      <div className="lab-row">
        <button
          type="button"
          onClick={pressHandler(() => {
            downloadTextFile(labFileName(lab), json);
            setStatus({ ok: true, text: `Saved as ${labFileName(lab)} (see your Downloads folder).` });
          })}
        >
          Save as .json file
        </button>
        <button type="button" onClick={pressHandler(() => fileInput.current?.click())}>
          Load .json file…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          data-testid="lab-file-input"
          onChange={(e) =>
            void readChosenFile(e.currentTarget).then((file) => {
              if (file) load(file.text, file.name);
            })
          }
        />
        <button
          type="button"
          onClick={pressHandler(() => {
            void navigator.clipboard
              .writeText(json)
              .then(() => setStatus({ ok: true, text: "JSON copied to the clipboard." }))
              .catch(() => setStatus({ ok: false, text: "Could not use the clipboard; select the text below and copy it." }));
          })}
        >
          Copy JSON
        </button>
      </div>
      {status && (
        <p className={status.ok ? "cmp-agree-ok" : "lab-error-text"} data-testid="file-status">
          {status.text}
        </p>
      )}
      <textarea
        className="lab-json"
        spellCheck={false}
        aria-label="Automaton as JSON"
        value={draft ?? json}
        onChange={(e) => setDraft(e.target.value)}
      />
      <div className="lab-row">
        <button type="button" disabled={draft === null} onClick={pressHandler(() => load(draft ?? "", "the text above"))}>
          Load the text above
        </button>
        <button type="button" disabled={draft === null} onClick={pressHandler(() => setDraft(null))}>
          Discard text changes
        </button>
        <span className="formal-dim">Positions, ids, start and accepting states are all included. ε-transitions use the symbol "ε".</span>
      </div>
    </div>
  );
}
