import { Box, Typography, Button, Divider, Grid } from '@mui/material'
import { useVisualStyleApi } from 'cyweb/VisualStyleApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import {
  VisualPropertyName,
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
  const workspaceApi = useWorkspaceApi()
  const visualStyleApi = useVisualStyleApi()

  const handleButtonClick = () => {
    const currentNetwork = workspaceApi.getCurrentNetworkId()
    if (!currentNetwork.success) {
      console.error(currentNetwork.error.message)
      return
    }

    const newNodeColor = randomColor()
    const newEdgeColor = randomColor()
    const nodeColorResult = visualStyleApi.setDefault(
      currentNetwork.data.networkId,
      VisualPropertyName.NodeBackgroundColor,
      newNodeColor,
    )
    const edgeColorResult = visualStyleApi.setDefault(
      currentNetwork.data.networkId,
      VisualPropertyName.EdgeLineColor,
      newEdgeColor,
    )
    if (!nodeColorResult.success) {
      console.error(nodeColorResult.error.message)
    }
    if (!edgeColorResult.success) {
      console.error(edgeColorResult.error.message)
    }
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
