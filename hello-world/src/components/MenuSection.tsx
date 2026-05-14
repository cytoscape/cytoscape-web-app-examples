/**
 * Example 5: Dropdown Menu Component (NetworkSummaryMenuItem)
 *
 * Shows how to contribute a menu item to the host's "Apps" dropdown menu —
 * the second extension point alongside panels (ComponentType.Panel).
 *
 * Key patterns demonstrated:
 *
 *   Registration (HelloApp.tsx):
 *   - Add a ComponentMetadata entry with `type: ComponentType.Menu` in the
 *     `components` array. The host renders it inside the "Apps" menu bar.
 *   - Use `lazy(() => import('./components/NetworkSummaryMenuItem'))` to
 *     code-split so the component is loaded on demand.
 *
 *   Menu component contract:
 *   - The host passes `handleClose` as a prop. Calling it dismisses the
 *     OverlayPanel that wraps the dropdown.
 *   - IMPORTANT: because plugin menu components render *inside* the
 *     OverlayPanel, calling handleClose unmounts the component and all
 *     its children (including dialogs). If the menu item opens a dialog,
 *     defer handleClose until the dialog is dismissed — the MUI Dialog
 *     renders at a higher z-index, hiding the menu behind it.
 *
 *   API usage (NetworkSummaryMenuItem.tsx):
 *   - `useWorkspaceApi().getCurrentNetworkId()` → get the active network.
 *   - `useWorkspaceApi().getNetworkSummary(id)` → fetch summary metadata.
 *   - Both return `ApiResult<T>` — check `.success` before accessing `.data`.
 *
 *   Contrast with host-internal dialogs (e.g. "Manage Apps…"):
 *   - The host's AppSettingsDialog is a sibling of the OverlayPanel, so it
 *     survives `handleClose`. Plugin menu components live inside it, so
 *     they must keep the menu mounted while their own dialogs are open.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export const MenuSection = (): JSX.Element => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Example 5 — Menu Component
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      This app registers a <strong>NetworkSummaryMenuItem</strong> under the
      host&apos;s &quot;Apps&quot; dropdown menu. Click{' '}
      <em>Apps → Show network summary…</em> to open a dialog displaying the
      current network&apos;s name, ID, node/edge counts, and modification
      status.
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Menu components are declared in <code>HelloApp.tsx</code> with{' '}
      <code>ComponentType.Menu</code>. The host provides a{' '}
      <code>handleClose</code> prop to dismiss the dropdown. Because plugin
      menus render inside the host&apos;s OverlayPanel, opening a dialog
      requires deferring <code>handleClose</code> until the dialog is dismissed
      — otherwise the component unmounts and the dialog disappears.
    </Typography>
  </Box>
)
