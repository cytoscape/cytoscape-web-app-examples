// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'
import { Box, Typography, Button, Divider, Grid } from '@mui/material'
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
      <Box sx={{ marginBottom: '1em' }}>
        <Typography variant="h3">Hello, from App!</Typography>
        <Typography variant="subtitle1">Sample panel style App</Typography>
      </Box>
      <Divider />
      <Box sx={{ padding: '1em', width: '100%' }}>
        <Grid container spacing={1} alignItems="center" justifyContent="center">
          <Grid item xs={9}>
            <Typography variant="h5">Example 1: Update Visual Style</Typography>
            <Typography variant="body1">
              Click the button to randomly change the default color of nodes and
              edges
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Button
              size="medium"
              color="primary"
              variant="contained"
              onClick={handleButtonClick}
            >
              Update Style
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default HelloPanel
