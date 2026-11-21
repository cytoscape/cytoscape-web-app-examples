/**
 * Example 5: Apps-menu action — showNetworkSummary
 *
 * Shows how to add a menu item under the host's "Apps" menu bar, and how to
 * put UI behind it. Since api-types 1.0.0-beta.4 an 'apps-menu' entry is plain
 * data — `label` plus `onClick(apis)` — and the host renders the row and closes
 * the dropdown itself. Anything visual the action needs goes in a dialog opened
 * through `apis.dialog.open({ title, render })`, whose frame the host owns and
 * whose body the app renders.
 *
 * Key patterns demonstrated:
 *   - `onClick` receives the app's API object; there is no hook to call and no
 *     component to mount.
 *   - Read the current network summary via `apis.workspace.getNetworkSummary()`
 *     BEFORE opening the dialog, so `render` is a pure function of data.
 *   - `render` gets `{ close }` from the host; hand it to the body so it can
 *     dismiss itself from its own Close button.
 *   - Handle the "no network open" case by showing the error in the same
 *     dialog rather than failing silently.
 *
 * This file is .tsx because `render` returns JSX.
 */
import type { AppContextApis } from 'cyweb/ApiTypes'

import NetworkSummaryDialog, {
  type NetworkSummary,
} from './components/NetworkSummaryDialog'

export const showNetworkSummary = (apis: AppContextApis): void => {
  let summary: NetworkSummary | null = null
  let errorMessage: string | null = null

  const currentNetwork = apis.workspace.getCurrentNetworkId()
  if (!currentNetwork.success) {
    errorMessage = currentNetwork.error.message
  } else {
    const result = apis.workspace.getNetworkSummary(
      currentNetwork.data.networkId,
    )
    if (!result.success) {
      errorMessage = result.error.message
    } else {
      summary = { ...result.data }
    }
  }

  const opened = apis.dialog.open({
    title: 'Network Summary',
    maxWidth: 'sm',
    fullWidth: true,
    render: ({ close }) => (
      <NetworkSummaryDialog
        summary={summary}
        errorMessage={errorMessage}
        close={close}
      />
    ),
  })
  if (!opened.success) {
    console.error(opened.error.message)
  }
}
