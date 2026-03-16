/**
 * TemplatePanel — Minimal right-panel component.
 *
 * Demonstrates:
 *   - Reading workspace info via useWorkspaceApi()
 *   - ApiResult<T> pattern (check .success before .data)
 *   - MUI components (shared singletons from host)
 *
 * Replace this with your own panel UI.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

const TemplatePanel = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const result = workspaceApi.getWorkspaceInfo()
  const workspaceName =
    result.success && result.data.name !== ''
      ? result.data.name
      : 'Untitled Workspace'

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 3,
      }}
    >
      <Typography variant="h5">App Template</Typography>
      <Typography color="text.secondary">
        Start building your panel here.
      </Typography>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Workspace
        </Typography>
        <Typography variant="body1">{workspaceName}</Typography>
      </Box>
    </Box>
  )
}

export default TemplatePanel
