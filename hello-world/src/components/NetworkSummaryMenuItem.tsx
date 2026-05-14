/**
 * Example 5: Menu Component — NetworkSummaryMenuItem
 *
 * Shows how to add a menu item under the host's "Apps" menu bar. This is the
 * second extension point alongside panels (ComponentType.Panel).
 *
 * Key patterns demonstrated:
 *   - Menu components receive `handleClose` — call it to dismiss the dropdown
 *     after clicking or when no further interaction is needed.
 *   - Use a MUI Dialog to present information that requires user acknowledgement.
 *   - Fetch the current network summary via `useWorkspaceApi().getNetworkSummary()`
 *     and display it in a formatted layout.
 *   - Handle the "no network open" case gracefully with an error message.
 */
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

interface NetworkSummary {
  name: string
  description: string
  networkId: string
  nodeCount: number
  edgeCount: number
  isModified: boolean
}

interface NetworkSummaryMenuItemProps {
  handleClose?: () => void
}

const NetworkSummaryMenuItem = ({
  handleClose,
}: NetworkSummaryMenuItemProps): JSX.Element => {
  const workspaceApi = useWorkspaceApi()

  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<NetworkSummary | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleClick = (): void => {
    // Do NOT call handleClose here.  handleClose hides the PrimeReact
    // OverlayPanel, which unmounts this component and its Dialog.
    // Instead, keep the menu mounted while the dialog is open and close
    // it when the dialog is dismissed.  The MUI Dialog renders at a
    // higher z-index, so the menu behind it is invisible to the user.

    setErrorMessage(null)
    setSummary(null)

    const currentNetwork = workspaceApi.getCurrentNetworkId()
    if (!currentNetwork.success) {
      setErrorMessage(currentNetwork.error.message)
      setOpen(true)
      return
    }

    const networkId = currentNetwork.data.networkId
    const result = workspaceApi.getNetworkSummary(networkId)
    if (!result.success) {
      setErrorMessage(result.error.message)
      setOpen(true)
      return
    }

    setSummary({ ...result.data })
    setOpen(true)
  }

  const handleDialogClose = (): void => {
    setOpen(false)
    // Now that the dialog is dismissed, close the dropdown menu.
    handleClose?.()
  }

  return (
    <>
      <MenuItem onClick={handleClick}>Show network summary…</MenuItem>

      <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Network Summary</DialogTitle>
        <DialogContent dividers>
          {errorMessage !== null ? (
            <Typography color="error">{errorMessage}</Typography>
          ) : summary !== null ? (
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell>{summary.name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Network ID</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {summary.networkId}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell>{summary.description || '—'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nodes</TableCell>
                  <TableCell>{summary.nodeCount.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Edges</TableCell>
                  <TableCell>{summary.edgeCount.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Modified</TableCell>
                  <TableCell>{summary.isModified ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default NetworkSummaryMenuItem
