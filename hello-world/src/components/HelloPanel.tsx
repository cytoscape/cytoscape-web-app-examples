import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useCallback, useState } from 'react'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { IdType, VisualPropertyName } from 'cyweb/ApiTypes'

interface HelloPanelProps {
  message: string
}

// Generate a random color in RGB format
const randomColor = (): string => {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return `rgb(${r},${g},${b})`
}

const HelloPanel = ({ message }: HelloPanelProps): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const visualStyleApi = useVisualStyleApi()
  const selectionApi = useSelectionApi()
  const layoutApi = useLayoutApi()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentNetworkId, setCurrentNetworkId] = useState<IdType>('')
  const [selectedNodeCount, setSelectedNodeCount] = useState(0)
  const [selectedEdgeCount, setSelectedEdgeCount] = useState(0)
  const [layoutStatus, setLayoutStatus] = useState<'idle' | 'running' | 'done'>(
    'idle',
  )

  // Example 2: Event Bus — react to network switches
  const handleNetworkSwitched = useCallback(
    ({ networkId }: { networkId: IdType; previousId: IdType }) => {
      setCurrentNetworkId(networkId)
      setSelectedNodeCount(0)
      setSelectedEdgeCount(0)
    },
    [],
  )
  useCyWebEvent('network:switched', handleNetworkSwitched)

  // Example 2: Event Bus — react to selection changes
  const handleSelectionChanged = useCallback(
    ({
      selectedNodes,
      selectedEdges,
    }: {
      networkId: IdType
      selectedNodes: IdType[]
      selectedEdges: IdType[]
    }) => {
      setSelectedNodeCount(selectedNodes.length)
      setSelectedEdgeCount(selectedEdges.length)
    },
    [],
  )
  useCyWebEvent('selection:changed', handleSelectionChanged)

  // Example 3: Event Bus — react to layout completion
  const handleLayoutCompleted = useCallback(() => {
    setLayoutStatus('done')
  }, [])
  useCyWebEvent('layout:completed', handleLayoutCompleted)

  // Example 1: Visual Style API
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

  // Example 2: Selection API — clear all selection
  const handleClearSelection = (): void => {
    setErrorMessage(null)
    const currentNetwork = workspaceApi.getCurrentNetworkId()
    if (!currentNetwork.success) {
      setErrorMessage(currentNetwork.error.message)
      return
    }
    const result = selectionApi.exclusiveSelect(
      currentNetwork.data.networkId,
      [],
      [],
    )
    if (!result.success) setErrorMessage(result.error.message)
  }

  // Example 3: Layout API — apply layout
  const handleApplyLayout = (): void => {
    setErrorMessage(null)
    const currentNetwork = workspaceApi.getCurrentNetworkId()
    if (!currentNetwork.success) {
      setErrorMessage(currentNetwork.error.message)
      return
    }
    setLayoutStatus('running')
    layoutApi
      .applyLayout(currentNetwork.data.networkId)
      .then((result) => {
        if (!result.success) {
          setErrorMessage(result.error.message)
          setLayoutStatus('idle')
        }
      })
      .catch((e: unknown) => {
        setErrorMessage(String(e))
        setLayoutStatus('idle')
      })
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '1em',
        gap: 2,
        overflowY: 'auto',
      }}
    >
      <Box>
        <Typography variant="h5">Hello, from App!</Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {message}
        </Typography>
      </Box>

      {errorMessage !== null && (
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Divider />

      {/* Example 1: VisualStyleApi */}
      <Box>
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
            <Button
              size="small"
              variant="contained"
              onClick={handleUpdateStyle}
            >
              Update Style
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* Example 2: EventBus + SelectionApi */}
      <Box>
        <Typography variant="subtitle1" fontWeight="bold">
          Example 2: Event Bus + Selection
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Reacts to network switches and selection changes via EventBus
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip
            size="small"
            label={
              currentNetworkId !== ''
                ? `Network: ${currentNetworkId.slice(0, 8)}…`
                : 'No network'
            }
          />
          <Chip size="small" label={`Nodes: ${selectedNodeCount}`} />
          <Chip size="small" label={`Edges: ${selectedEdgeCount}`} />
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={handleClearSelection}
          disabled={selectedNodeCount === 0 && selectedEdgeCount === 0}
        >
          Clear Selection
        </Button>
      </Box>

      <Divider />

      {/* Example 3: LayoutApi + EventBus */}
      <Box>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={8}>
            <Typography variant="subtitle1" fontWeight="bold">
              Example 3: Layout
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Apply the preferred layout; status updates via{' '}
              <code>layout:completed</code> event
            </Typography>
            {layoutStatus === 'done' && (
              <Typography variant="body2" color="success.main">
                Layout completed ✓
              </Typography>
            )}
          </Grid>
          <Grid item xs={4} textAlign="right">
            <Button
              size="small"
              variant="contained"
              color="secondary"
              onClick={handleApplyLayout}
              disabled={layoutStatus === 'running'}
            >
              {layoutStatus === 'running' ? 'Running…' : 'Apply Layout'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default HelloPanel
