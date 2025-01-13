// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'
import { Box, Typography, Button } from '@mui/material'
import {
  WorkspaceStore,
  Workspace,
  VisualStyleStore,
  IdType,
  VisualPropertyName,
  VisualPropertyValueType,
} from '@cytoscape-web/types'

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
  // Import the workspace data from the host app
  const workspace: Workspace = useWorkspaceStore(
    (state: WorkspaceStore) => state.workspace,
  )
  const setName = useWorkspaceStore((state: WorkspaceStore) => state.setName)

  // Import a function from the host
  const setDefault: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ) => void = useVisualStyleStore((state: VisualStyleStore) => state.setDefault)

  const handleButtonClick = () => {
    const newNodeColor = randomColor()
    const newEdgeColor = randomColor()
    setDefault(
      workspace.currentNetworkId,
      VisualPropertyName.NodeBackgroundColor,
      newNodeColor,
    )
    setDefault(
      workspace.currentNetworkId,
      VisualPropertyName.EdgeLineColor,
      newEdgeColor,
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1em',
      }}
    >
      <Typography variant="h4">Hello, Cytoscape Web!</Typography>
      <Typography variant="body1">from an external App: {message}</Typography>
      <Box sx={{ padding: '1em', width: '20em' }}>
        <Button
          size="large"
          fullWidth
          color="primary"
          onClick={handleButtonClick}
        >
          Click Me!
        </Button>
        <Button size="large" fullWidth color="primary">
          Click Me2!
        </Button>
      </Box>
    </Box>
  )
}

export default HelloPanel
