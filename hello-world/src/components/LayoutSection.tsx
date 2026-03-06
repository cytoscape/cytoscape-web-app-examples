import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useCallback, useState } from 'react'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useLayoutApi } from 'cyweb/LayoutApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

export const LayoutSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const layoutApi = useLayoutApi()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [layoutStatus, setLayoutStatus] = useState<'idle' | 'running' | 'done'>(
    'idle',
  )

  const handleLayoutCompleted = useCallback(() => {
    setLayoutStatus('done')
  }, [])
  useCyWebEvent('layout:completed', handleLayoutCompleted)

  const handleApplyLayout = (): void => {
    setErrorMessage(null)
    const currentNetwork = workspaceApi.getCurrentNetworkId()
    if (!currentNetwork.success) {
      setErrorMessage(currentNetwork.error.message)
      return
    }
    setLayoutStatus('running')
    layoutApi
      .applyLayout(currentNetwork.data.networkId)
      .then((result) => {
        if (!result.success) {
          setErrorMessage(result.error.message)
          setLayoutStatus('idle')
        }
      })
      .catch((e: unknown) => {
        setErrorMessage(String(e))
        setLayoutStatus('idle')
      })
  }

  return (
    <Box>
      {errorMessage !== null && (
        <Alert
          severity="error"
          onClose={() => setErrorMessage(null)}
          sx={{ mb: 1 }}
        >
          {errorMessage}
        </Alert>
      )}
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={8}>
          <Typography variant="subtitle1" fontWeight="bold">
            Example 3: Layout
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Apply the preferred layout; status updates via{' '}
            <code>layout:completed</code> event
          </Typography>
          {layoutStatus === 'done' && (
            <Typography variant="body2" color="success.main">
              Layout completed ✓
            </Typography>
          )}
        </Grid>
        <Grid item xs={4} textAlign="right">
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={handleApplyLayout}
            disabled={layoutStatus === 'running'}
          >
            {layoutStatus === 'running' ? 'Running…' : 'Apply Layout'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}
