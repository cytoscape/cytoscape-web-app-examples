/**
 * The verification app's tabs. They show what they are; the cases read the
 * `data-testid`s to see which tab the host selected.
 */
export const VerificationPanel = () => (
  <div data-testid="cookbook-verification-panel">
    Cookbook verification app. Its cases are run by cookbook/runner/run.mjs.
  </div>
)

export const ResultsPanel = () => (
  <div data-testid="cookbook-results-panel">The verification app&apos;s results tab</div>
)
