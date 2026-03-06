import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useCallback, useState } from 'react'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { IdType } from 'cyweb/ApiTypes'

export const SelectionSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const selectionApi = useSelectionApi()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentNetworkId, setCurrentNetworkId] = useState<IdType>('')
  const [selection, setSelection] = useState({ nodes: 0, edges: 0 })

  const handleNetworkSwitched = useCallback(
    ({ networkId }: { networkId: IdType; previousId: IdType }) => {
      setCurrentNetworkId(networkId)
      setSelection({ nodes: 0, edges: 0 })
    },
    [],
  )
  useCyWebEvent('network:switched', handleNetworkSwitched)

  const handleSelectionChanged = useCallback(
    ({
      selectedNodes,
      selectedEdges,
    }: {
      networkId: IdType
      selectedNodes: IdType[]
      selectedEdges: IdType[]
    }) => {
      setSelection({ nodes: selectedNodes.length, edges: selectedEdges.length })
    },
    [],
  )
  useCyWebEvent('selection:changed', handleSelectionChanged)

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
        <Chip size="small" label={`Nodes: ${selection.nodes}`} />
        <Chip size="small" label={`Edges: ${selection.edges}`} />
      </Box>
      <Button
        size="small"
        variant="outlined"
        onClick={handleClearSelection}
        disabled={selection.nodes === 0 && selection.edges === 0}
      >
        Clear Selection
      </Button>
    </Box>
  )
}
