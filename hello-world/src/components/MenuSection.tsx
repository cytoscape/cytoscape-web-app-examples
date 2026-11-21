/**
 * Example 5: Apps-menu entry (showNetworkSummary)
 *
 * Shows how to contribute a menu item to the host's "Apps" dropdown menu —
 * the second extension point alongside right-panel resources.
 *
 * Key patterns demonstrated:
 *
 *   Registration (HelloApp.tsx):
 *   - Add a `ResourceDeclaration` entry with `slot: 'apps-menu'` in the
 *     `resources` array, giving it `label` and `onClick`. Optional `tooltip`,
 *     `icon` (an image URI), `isEnabled(apis)`, `order` and `group`.
 *   - There is no component. The host renders every entry itself as a
 *     standard menu row, so no app can change the dropdown's look — and it
 *     closes the dropdown after the click, so there is no `handleClose` and
 *     no `closeOnAction` either.
 *
 *   The action (menuActions.tsx):
 *   - `onClick(apis)` receives the app's API object directly; nothing to
 *     mount, no hook to call.
 *   - `apis.workspace.getCurrentNetworkId()` → the active network.
 *   - `apis.workspace.getNetworkSummary(id)` → summary metadata.
 *   - Both return `ApiResult<T>` — check `.success` before `.data`.
 *
 *   UI behind a menu item (components/NetworkSummaryDialog.tsx):
 *   - Open it with `apis.dialog.open({ title, render })`. The host owns the
 *     dialog frame — title bar, Close "X", dismissal rules, error and Suspense
 *     boundaries — and the app renders only the body.
 *   - `render` receives `{ close }`; pass it to the body so its own Close
 *     button can dismiss the dialog.
 *   - This replaces the old pattern of a menu component rendering its own MUI
 *     <Dialog> and deferring `handleClose` so the dropdown stayed mounted
 *     underneath. None of that bookkeeping exists any more.
 */
import { Box, Typography } from '@mui/material'

export const MenuSection = (): JSX.Element => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Example 5 — Apps-menu entry
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      This app registers a <strong>Network Summary</strong> entry under the
      host&apos;s &quot;Apps&quot; dropdown menu. Click{' '}
      <em>Apps → Network Summary</em> to open a dialog displaying the current
      network&apos;s name, ID, node/edge counts, and modification status.
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      The entry is declared in <code>HelloApp.tsx</code> with{' '}
      <code>slot: &apos;apps-menu&apos;</code>, a <code>label</code> and an{' '}
      <code>onClick(apis)</code>. The host renders the row and closes the
      dropdown itself. The action reads the summary through{' '}
      <code>apis.workspace</code> and shows it with{' '}
      <code>apis.dialog.open(&#123; title, render &#125;)</code>, whose frame
      the host owns and whose body is <code>NetworkSummaryDialog.tsx</code>.
    </Typography>
  </Box>
)
