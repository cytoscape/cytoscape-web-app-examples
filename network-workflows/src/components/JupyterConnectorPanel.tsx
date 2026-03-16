import { useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import { Box, Typography, Button, TextField, Grid } from '@mui/material'
import { useNetworkApi } from 'cyweb/NetworkApi'

const JupyterType: string = 'jupyter_cx2'

const JupyterConnectorPanel = (): JSX.Element => {
  // Check the connection to the Jupyter Instance
  const [isLinked, setIsLinked] = useState<boolean>(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [jupyterWindow, setJupyterWindow] = useState<Window | null>(null)

  const networkApi = useNetworkApi()

  const messageHandler = (event: MessageEvent) => {
    const { data } = event
    if (!data || !data.payload) {
      return
    }

    // Check data type and create network
    const { type, payload } = data
    if (!type || !payload || type !== JupyterType) {
      return
    }

    const result = networkApi.createNetworkFromCx2({
      cxData: payload,
      navigate: true,
      addToWorkspace: true,
    })
    if (!result.success) {
      console.error(result.error.message)
      return
    }

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

    // Add delay to wait for the new window to be ready
    setTimeout(() => {
      initializeListener()
      setIsLinked(true)
      setJupyterWindow(childWindow)
    }, 2000)

    const checkWindowInterval = setInterval(() => {
      if (!childWindow || childWindow.closed) {
        clearInterval(checkWindowInterval)
        setIsLinked(false)
        setSnackbarOpen(true)
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
        <Grid item xs={12}>
          <Grid
            container
            spacing={1}
            paddingTop={'1em'}
            justifyContent="flex-end"
            alignItems="end"
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
