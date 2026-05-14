/**
 * Example 7: ElementApi
 *
 * Shows how to create and delete nodes and edges using the App API.
 *
 * Key patterns demonstrated:
 *   - `elementApi.createNode()` with position and optional attributes/bypasses.
 *   - `elementApi.createEdge()` between existing nodes.
 *   - `elementApi.deleteNodes()` removes nodes and their incident edges.
 *   - All operations require a networkId from `workspaceApi.getCurrentNetworkId()`.
 *   - Undo integration is automatic — each create/delete adds an undo entry.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useElementApi } from 'cyweb/ElementApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

export const ElementSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const elementApi = useElementApi()
  const [lastNodeId, setLastNodeId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCreateNode = (): void => {
    setErrorMessage(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    // Random position within a visible range
    const x = Math.round(Math.random() * 800 - 400)
    const y = Math.round(Math.random() * 600 - 300)
    const result = elementApi.createNode(current.data.networkId, [x, y], {
      attributes: { name: `Node-${Date.now().toString(36)}` },
    })
    if (result.success) {
      setLastNodeId(result.data.nodeId)
    } else {
      setErrorMessage(result.error.message)
    }
  }

  const handleCreateEdge = (): void => {
    setErrorMessage(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    if (!lastNodeId) {
      setErrorMessage('Create a node first to use as the edge target.')
      return
    }
    // Create an edge from the first node in the network to the last created node
    const result = elementApi.createEdge(
      current.data.networkId,
      '0', // assume node 0 exists
      lastNodeId,
    )
    if (!result.success) {
      setErrorMessage(result.error.message)
    }
  }

  const handleDeleteLastNode = (): void => {
    setErrorMessage(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    if (!lastNodeId) {
      setErrorMessage('No node to delete.')
      return
    }
    const result = elementApi.deleteNodes(current.data.networkId, [lastNodeId])
    if (result.success) {
      setLastNodeId(null)
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
          <Typography variant="h6">Example 7: Elements</Typography>
          <Typography variant="body2" color="text.secondary">
            Create/delete nodes and edges
          </Typography>
          {lastNodeId && (
            <Typography variant="caption">Last node: {lastNodeId}</Typography>
          )}
        </Grid>
        <Grid item xs={6} textAlign="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" variant="contained" onClick={handleCreateNode}>
              + Node
            </Button>
            <Button size="small" variant="outlined" onClick={handleCreateEdge}>
              + Edge
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDeleteLastNode}
              disabled={!lastNodeId}
            >
              Delete
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
