/**
 * Example 11: NetworkApi
 *
 * Shows how to create and delete networks using the App API.
 *
 * Key patterns demonstrated:
 *   - `networkApi.createNetworkFromEdgeList()` creates a network from pairs
 *     of node labels — the simplest way to build a test network.
 *   - `networkApi.deleteCurrentNetwork()` removes the active network.
 *   - Network creation fires `network:created` and optionally `network:switched`
 *     events, which other components can listen to via the Event Bus.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

export const NetworkSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const networkApi = useNetworkApi()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleCreate = (): void => {
    setErrorMessage(null)
    setInfo(null)
    const result = networkApi.createNetworkFromEdgeList({
      name: `Hello-Net-${Date.now().toString(36)}`,
      description: 'Created by Hello World app',
      edgeList: [
        ['Alice', 'Bob'],
        ['Bob', 'Carol'],
        ['Carol', 'Dave'],
        ['Dave', 'Alice'],
        ['Alice', 'Carol'],
      ],
      addToWorkspace: true,
    })
    if (result.success) {
      setInfo(`Network created: ${result.data.networkId}`)
    } else {
      setErrorMessage(result.error.message)
    }
  }

  const handleDelete = (): void => {
    setErrorMessage(null)
    setInfo(null)
    const result = networkApi.deleteCurrentNetwork()
    if (result.success) {
      setInfo('Current network deleted.')
    } else {
      setErrorMessage(result.error.message)
    }
  }

  const handleGetInfo = (): void => {
    setErrorMessage(null)
    setInfo(null)
    const result = workspaceApi.getWorkspaceInfo()
    if (result.success) {
      const { name, networkCount, currentNetworkId } = result.data
      setInfo(
        `Workspace: "${name}", ${networkCount} network(s), ` +
          `current: ${currentNetworkId || '(none)'}`,
      )
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
        <Grid item xs={5}>
          <Typography variant="h6">Example 11: Networks</Typography>
          <Typography variant="body2" color="text.secondary">
            Create/delete networks, workspace info
          </Typography>
        </Grid>
        <Grid item xs={7} textAlign="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="contained" onClick={handleCreate}>
              + Network
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button size="small" variant="outlined" onClick={handleGetInfo}>
              Info
            </Button>
          </Stack>
        </Grid>
      </Grid>
      {info !== null && (
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
          {info}
        </Box>
      )}
    </Box>
  )
}
