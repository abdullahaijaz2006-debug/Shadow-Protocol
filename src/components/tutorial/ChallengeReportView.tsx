import type { ChallengeReport } from "./challenges";

const word = (input: readonly string[]) => (input.length === 0 ? "ε" : input.join(input.every((s) => s.length === 1) ? "" : " "));

/** The result of checking a Lab automaton against a challenge. */
export function ChallengeReportView({ report }: { report: ChallengeReport }) {
  if (report.status === "invalid") {
    return (
      <div className="challenge-report challenge-invalid" data-testid="challenge-report" data-status="invalid">
        <p className="lab-error-text">Not checked yet:</p>
        <ul>
          {report.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    );
  }
  const failed = report.tests.filter((t) => !t.pass);
  return (
    <div className={`challenge-report challenge-${report.status}`} data-testid="challenge-report" data-status={report.status}>
      <p className={report.status === "passed" ? "cmp-agree-ok" : "cmp-agree-bad"}>
        {report.status === "passed"
          ? `✓ Passed: all ${report.tests.length} example tests, and agreement with the reference on all ${report.exhaustive?.tested} strings of length ≤ ${report.exhaustive?.maxLength}.`
          : `✗ Not yet: ${failed.length} of ${report.tests.length} example tests failed.`}
      </p>
      {report.exhaustive?.counterexample && (
        <p>
          Counterexample: <code>{word(report.exhaustive.counterexample)}</code> should be{" "}
          {report.exhaustive.shouldAccept ? "accepted" : "rejected"}, but your automaton {report.exhaustive.shouldAccept ? "rejects" : "accepts"} it.
        </p>
      )}
      <table className="trace-table challenge-tests">
        <thead>
          <tr>
            <th>input</th>
            <th>should</th>
            <th>yours</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {report.tests.map((t, i) => (
            <tr key={i} className={t.pass ? undefined : "challenge-fail"}>
              <td>
                <code>{word(t.input)}</code>
              </td>
              <td>{t.expected ? "accept" : "reject"}</td>
              <td>{t.actual ? "accept" : "reject"}</td>
              <td>{t.pass ? "✓" : "✗"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="formal-dim formal-note">
        This is testing, not a proof: agreeing on every short string is strong evidence that the languages are equal, but it
        does not prove it for all strings.
      </p>
    </div>
  );
}
