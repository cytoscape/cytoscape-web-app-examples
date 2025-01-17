// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'
import { Box, Typography, Button, TextField } from '@mui/material'
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
    console.log('#############!!!!!!!!!!!!!!!!! adding')
    window.addEventListener('message', (event) => {
      const { data } = event
      console.log('###3 Received message from child', data)
      const networkWithView = createNetworkFromCx2({ cxData: data.payload })
      console.log('Sample network created by external App', networkWithView)
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

  const [url, setUrl] = useState(
    'http://localhost:3000/hello-world/external-webapp/',
  )

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
    const newTab = window.open(url, '_blank')
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
        <TextField
          label="Enter URL"
          variant="outlined"
          fullWidth
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button size="large" fullWidth color="primary" onClick={handleOpen}>
          Open External App
        </Button>
      </Box>
    </Box>
  )
}

export default HelloPanel
