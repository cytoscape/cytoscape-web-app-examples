// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'
import { Box, Typography, Button } from '@mui/material'
import { useState } from 'react'
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
  const workspace: Workspace = useWorkspaceStore(
    (state: WorkspaceStore) => state.workspace,
  )

  const setDefault: (
    networkId: IdType,
    vpName: VisualPropertyName,
    vpValue: VisualPropertyValueType,
  ) => void = useVisualStyleStore((state: VisualStyleStore) => state.setDefault)
  const [buttonClicked, setButtonClicked] = useState(false)

  const handleButtonClick = () => {
    setButtonClicked(true)
    setDefault(
      workspace.currentNetworkId,
      VisualPropertyName.NetworkBackgroundColor,
      randomColor(),
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
      <Typography variant="h5">Hello, Cytoscape Web!</Typography>
      <Typography variant="subtitle1">
        Current Network ID: {workspace.currentNetworkId}
      </Typography>
      <Typography variant="body1">from an external App: {message}</Typography>
      <Box sx={{ padding: '1em', width: '20em' }}>
        <Button
          size="large"
          fullWidth
          variant="outlined"
          color="primary"
          onClick={handleButtonClick}
        >
          {buttonClicked ? 'Background Color Updated!' : 'Click Me'}
        </Button>
      </Box>
    </Box>
  )
}

export default HelloPanel
