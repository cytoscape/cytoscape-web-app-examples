// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'
import {
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  Grid,
} from '@mui/material'
import {
  WorkspaceStore,
  Workspace,
  VisualStyleStore,
  IdType,
  VisualPropertyName,
  VisualPropertyValueType,
} from '@cytoscape-web/types'
import { useEffect, useRef, useState } from 'react'
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'

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
  const initRef = useRef<boolean>(false)
  const createNetworkFromCx2 = useCreateNetworkFromCx2()

  // Import the workspace data from the host app
  const workspace: Workspace = useWorkspaceStore(
    (state: WorkspaceStore) => state.workspace,
  )

  const initializeListener = () => {
    window.addEventListener('message', (event) => {
      console.log('* Received message from external web app', event)
      const { data } = event
      if (!data || !data.payload) {
        return
      }

      // Check data type and create network
      const { type, payload } = data
      if (!type || !payload || type !== 'jupyter_cx2') {
        return
      }

      console.log('Received CX2 data from Jupyter Lab', payload)

      const networkWithView = createNetworkFromCx2({ cxData: payload })
      window.focus()
    })
  }

  useEffect(() => {
    // Check if the message listener is already added
    if (initRef.current) {
      return
    }
    initializeListener()
    initRef.current = true
  }, [])

  // Import a function from the host
  const setDefault: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ) => void = useVisualStyleStore((state: VisualStyleStore) => state.setDefault)

  const [url, setUrl] = useState('http://localhost:8888/lab')

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

  const handleOpen = () => {
    const newTab = window.open(url + '?parentName=' + window.name, '_blank')
    console.log('New tab instance', newTab)
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
        <Grid
          sx={{ paddingTop: '2em' }}
          container
          spacing={4}
          alignItems="center"
          justifyContent="center"
        >
          <Grid item xs={12}>
            <Typography variant="h5">
              Example 2: Connect to an external web app
            </Typography>
            <Typography variant="body1">
              Enter a URL in the input field and click the button to open the
              external app in a new tab
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              label="Enter URL"
              variant="outlined"
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Grid>
          <Grid item xs={4}>
            <Button
              size="medium"
              color="primary"
              variant="contained"
              onClick={handleOpen}
            >
              Open External App
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default HelloPanel
