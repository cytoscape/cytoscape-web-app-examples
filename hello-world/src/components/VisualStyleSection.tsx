/**
 * Example 1: VisualStyleApi
 *
 * Shows how to call a Cytoscape Web App API to mutate the visual style of
 * the currently active network.
 *
 * Key patterns demonstrated:
 *   - Import an API hook from the host via the `cyweb/` Module Federation prefix.
 *   - Use `useWorkspaceApi().getCurrentNetworkId()` to resolve the active network
 *     before performing any operation — all API calls require a network ID.
 *   - Check `result.success` before using `result.data`; on failure, display
 *     `result.error.message`. All App API functions return ApiResult<T> and
 *     never throw across the API boundary.
 *   - Manage component-local error state independently (no shared error bus).
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { VisualPropertyName } from 'cyweb/ApiTypes'

const randomColor = (): string => {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return `rgb(${r},${g},${b})`
}

export const VisualStyleSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const visualStyleApi = useVisualStyleApi()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUpdateStyle = (): void => {
    setErrorMessage(null)
    const currentNetwork = workspaceApi.getCurrentNetworkId()
    if (!currentNetwork.success) {
      setErrorMessage(currentNetwork.error.message)
      return
    }
    const networkId = currentNetwork.data.networkId
    const nodeResult = visualStyleApi.setDefault(
      networkId,
      VisualPropertyName.NodeBackgroundColor,
      randomColor(),
    )
    const edgeResult = visualStyleApi.setDefault(
      networkId,
      VisualPropertyName.EdgeLineColor,
      randomColor(),
    )
    if (!nodeResult.success) setErrorMessage(nodeResult.error.message)
    else if (!edgeResult.success) setErrorMessage(edgeResult.error.message)
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
        <Grid item xs={8}>
          <Typography variant="subtitle1" fontWeight="bold">
            Example 1: Visual Style
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Randomly change default node and edge colors
          </Typography>
        </Grid>
        <Grid item xs={4} textAlign="right">
          <Button size="small" variant="contained" onClick={handleUpdateStyle}>
            Update Style
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}
