// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { Box, Typography } from '@mui/material'

interface HelloPanelProps {
  message: string
}

const HelloPanel = ({ message }: HelloPanelProps): JSX.Element => {
  const workspace = useWorkspaceStore((state: any) => state.workspace)

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
      <Typography variant="h5">
        Hello, Cytoscape (from external app!) {message}
      </Typography>
      <Typography variant="subtitle1">
        Current Network ID: {workspace.currentNetworkId}
      </Typography>
    </Box>
  )
}

export default HelloPanel
