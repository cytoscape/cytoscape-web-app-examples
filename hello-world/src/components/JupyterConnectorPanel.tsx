import React, { useState, useEffect, useRef } from 'react'
import Snackbar from '@mui/material/Snackbar'
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { Box, Typography, Button, TextField, Grid } from '@mui/material'
import { NetworkWithView, WorkspaceStore } from '@cytoscape-web/types'
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'

const JupyterType: string = 'jupyter_cx2'

const JupyterConnectorPanel: React.FC = () => {
  // Check the connection to the Jupyter Instance
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [jupyterWindow, setJupyterWindow] = useState<Window | null>(null)

  const createNetworkFromCx2 = useCreateNetworkFromCx2()

  const setCurrentNetworkId = useWorkspaceStore(
    (state: WorkspaceStore) => state.setCurrentNetworkId,
  )

  const messageHandler = (event: MessageEvent) => {
    console.log('Received message from external web app', event)
    const { data } = event
    if (!data || !data.payload) {
      return
    }

    // Check data type and create network
    const { type, payload } = data
    if (!type || !payload || type !== JupyterType) {
      return
    }

    console.log('Received CX2 data from Jupyter Lab', payload)

    const networkWithView: NetworkWithView = createNetworkFromCx2({
      cxData: payload,
    })
    setCurrentNetworkId(networkWithView.network.id)

    window.focus()
  }

  const initializeListener = () => {
    window.removeEventListener('message', messageHandler)
    window.addEventListener('message', messageHandler)
  }

  const [url, setUrl] = useState('http://localhost:8888/lab')

  const handleOpen = () => {
    const childWindow = window.open(
      url + '?parentName=' + window.name,
      'newWindow',
      'height=800,width=800',
    )
    console.log('Connected:', childWindow)

    // Add delay to wait for the new window to be ready
    setTimeout(() => {
      initializeListener()
      setIsLinked(true)
      setJupyterWindow(childWindow)
    }, 2000)

    const checkWindowInterval = setInterval(() => {
      if (!childWindow || childWindow.closed) {
        console.log('The new window has been closed.')
        clearInterval(checkWindowInterval)
        setIsLinked(false)
        setSnackbarOpen(true)
        // Additional cleanup code can be added here if needed
      }
    }, 2000)
  }

  const handleFocus = () => {
    if (jupyterWindow) {
      jupyterWindow.focus()
    }
  }

  return (
    <>
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
        <Box sx={{ marginBottom: '1em', textAlign: 'center' }}>
          <img
            src="https://jupyter.org/assets/homepage/main-logo.svg"
            alt="Jupyter Logo"
            style={{ width: '10em', marginBottom: '1em' }}
          />
          <Typography variant="h4">Jupyter Link App</Typography>
          <Typography variant="subtitle1">
            Visualize networks generated in Jupyter Lab
          </Typography>
        </Box>
        <Grid
          sx={{ paddingTop: '2em' }}
          container
          spacing={2}
          alignItems="center"
          justifyContent="center"
        >
          <Grid item xs={12}>
            <Typography variant="body1">
              How to connect to Jupyter Lab:
            </Typography>
            <Typography component="div">
              <ol>
                <li>Start your Jupyter Lab instance.</li>
                <li>
                  Enter the URL of your Jupyter Lab instance in the field below.
                  You may need to inclued the URL with the access token.
                </li>
                <li>Click the "Open Jupyter Lab" button.</li>
                <li>New Jupyter Lab window will be opened.</li>
                <li>
                  Now you can send CX2 network data from Jupyter Lab to this
                  app. Use the following code snippet in your Jupyter Lab
                  notebook:
                </li>
              </ol>
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Target Jupyter Lab URL"
              variant="outlined"
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Grid>
          <Grid
            paddingTop={'1em'}
            xs={12}
            spacing={1}
            container
            justifyContent="flex-end"
            alignItems={'end'}
          >
            <Grid item>
              <Button
                size="medium"
                color="primary"
                variant="contained"
                onClick={handleOpen}
                disabled={isLinked}
              >
                {isLinked ? 'Connected' : 'Open Jupyter Lab'}
              </Button>
            </Grid>
            <Grid item>
              <Button
                size="medium"
                color="secondary"
                variant="contained"
                onClick={handleFocus}
                disabled={!isLinked}
              >
                Focus to Jupyter Lab window
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
        message="Disconnected from Jupyter Lab"
      />
    </>
  )
}

export default JupyterConnectorPanel
