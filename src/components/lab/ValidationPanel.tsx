import { pressHandler } from "../visualizer/pressHandler";
import { ISSUE_TITLES, type LabIssue } from "./labValidation";

interface ValidationPanelProps {
  readonly kind: "DFA" | "NFA";
  readonly issues: readonly LabIssue[];
  /** Selects the element(s) a problem refers to. */
  readonly onShow: (issue: LabIssue) => void;
}

/** The engine's verdict on the current definition, as a clickable list of problems. */
export function ValidationPanel({ kind, issues, onShow }: ValidationPanelProps) {
  return (
    <div className="lab-issues" aria-live="polite">
      <p className={`lab-verdict ${issues.length === 0 ? "lab-verdict-ok" : "lab-verdict-bad"}`} data-testid="lab-verdict">
        {issues.length === 0
          ? `✓ Valid ${kind}${kind === "DFA" ? ": complete and deterministic" : ""}.`
          : `✗ Not a valid ${kind} yet — ${issues.length} problem${issues.length === 1 ? "" : "s"}:`}
        {kind === "NFA" && <span className="formal-dim"> (In an NFA, missing transitions mean δ = ∅ and several targets are allowed.)</span>}
      </p>
      {issues.length > 0 && (
        <ul className="lab-issue-list">
          {issues.map((issue, index) => (
            <li key={index} data-code={issue.code}>
              <button
                type="button"
                className="link-button"
                disabled={issue.stateIds.length === 0 && issue.transitionIds.length === 0}
                onClick={pressHandler(() => onShow(issue))}
              >
                {ISSUE_TITLES[issue.code]}
              </button>{" "}
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
