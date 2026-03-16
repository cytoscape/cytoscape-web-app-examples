/**
 * Example 9: ViewportApi
 *
 * Shows how to control the network viewport and read node positions.
 *
 * Key patterns demonstrated:
 *   - `viewportApi.fit()` is async because it delegates to the renderer.
 *   - `viewportApi.getNodePositions()` reads current [x,y] for specific nodes.
 *   - `viewportApi.updateNodePositions()` bulk-moves nodes.
 *   - Position values are plain `[x, y, z?]` tuples.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useViewportApi } from 'cyweb/ViewportApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

export const ViewportSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const viewportApi = useViewportApi()
  const selectionApi = useSelectionApi()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [positionInfo, setPositionInfo] = useState<string | null>(null)

  const handleFit = async (): Promise<void> => {
    setErrorMessage(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    const result = await viewportApi.fit(current.data.networkId)
    if (!result.success) {
      setErrorMessage(result.error.message)
    }
  }

  const handleGetPositions = (): void => {
    setErrorMessage(null)
    setPositionInfo(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    const sel = selectionApi.getSelection(current.data.networkId)
    if (!sel.success || sel.data.selectedNodes.length === 0) {
      setErrorMessage('Select one or more nodes first.')
      return
    }
    const result = viewportApi.getNodePositions(
      current.data.networkId,
      sel.data.selectedNodes,
    )
    if (result.success) {
      const entries = Object.entries(result.data.positions)
        .slice(0, 5) // show up to 5
        .map(([id, pos]) => `${id}: [${pos.join(', ')}]`)
        .join('\n')
      setPositionInfo(entries)
    } else {
      setErrorMessage(result.error.message)
    }
  }

  return (
    <Box>
      {errorMessage !== null && (
        <Alert
          severity="error"
          onClose={() => setErrorMessage(null)}
          sx={{ mb: 1 }}
        >
          {errorMessage}
        </Alert>
      )}
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={6}>
          <Typography variant="h6">Example 9: Viewport</Typography>
          <Typography variant="body2" color="text.secondary">
            Fit viewport, read node positions
          </Typography>
        </Grid>
        <Grid item xs={6} textAlign="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="contained" onClick={handleFit}>
              Fit
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleGetPositions}
            >
              Positions
            </Button>
          </Stack>
        </Grid>
      </Grid>
      {positionInfo !== null && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          {positionInfo}
        </Box>
      )}
    </Box>
  )
}
