import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import TemplateContextMenuExample from './TemplateContextMenuExample'

const TemplatePanel = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const workspaceInfoResult = workspaceApi.getWorkspaceInfo()
  const workspaceName =
    workspaceInfoResult.success && workspaceInfoResult.data.name !== ''
      ? workspaceInfoResult.data.name
      : 'Untitled Workspace'

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 1,
        p: 3,
      }}
    >
      <Typography variant="h5">App Template</Typography>
      <Typography color="text.secondary">
        Start building your panel here.
      </Typography>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Workspace Name
        </Typography>
        <Typography variant="body1">{workspaceName}</Typography>
      </Box>
      <TemplateContextMenuExample />
    </Box>
  )
}

export default TemplatePanel
