/**
 * Example 5: Dialog body — NetworkSummaryDialog
 *
 * The BODY of a dialog opened through the Dialog API. The host owns the frame:
 * title bar, the Close "X", the dismissal rules, error and Suspense boundaries.
 * This component renders only what goes inside, and receives `close` to
 * dismiss it from its own button.
 *
 * Compare with what this used to be: a menu-row component that rendered its
 * own MUI <Dialog> and had to juggle `handleClose` so the dropdown stayed
 * mounted underneath. Since api-types 1.0.0-beta.4 an 'apps-menu' entry is
 * plain data, the host closes the menu itself, and the dialog is opened from
 * `onClick` via `apis.dialog.open({ title, render })` — see menuActions.ts.
 */
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material'

export interface NetworkSummary {
  name: string
  description: string
  networkId: string
  nodeCount: number
  edgeCount: number
  isModified: boolean
}

interface NetworkSummaryDialogProps {
  summary: NetworkSummary | null
  errorMessage: string | null
  /** Provided by the host through DialogRenderProps. */
  close: () => void
}

const NetworkSummaryDialog = ({
  summary,
  errorMessage,
  close,
}: NetworkSummaryDialogProps): JSX.Element => (
  <Box sx={{ p: 2 }}>
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
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
      <Button onClick={close}>Close</Button>
    </Box>
  </Box>
)

export default NetworkSummaryDialog
