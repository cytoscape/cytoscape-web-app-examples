/**
 * Example 10: ExportApi
 *
 * Shows how to export the current network to CX2 format.
 *
 * Key patterns demonstrated:
 *   - `exportApi.exportToCx2()` returns a CX2 document (array of aspect objects).
 *   - The result can be serialized to JSON for download or API submission.
 *   - This example displays a summary of the exported CX2 aspects.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useExportApi } from 'cyweb/ExportApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

export const ExportSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const exportApi = useExportApi()
  const [exportInfo, setExportInfo] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleExport = (): void => {
    setErrorMessage(null)
    setExportInfo(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    const result = exportApi.exportToCx2(current.data.networkId)
    if (result.success) {
      const cx2 = result.data
      const json = JSON.stringify(cx2)
      const aspectNames = cx2
        .filter((item: any) => typeof item === 'object' && item !== null)
        .map((item: any) => Object.keys(item)[0])
        .filter(Boolean)
      setExportInfo(
        `CX2 exported: ${aspectNames.length} aspects, ${json.length} bytes\n` +
          `Aspects: ${aspectNames.join(', ')}`,
      )
    } else {
      setErrorMessage(result.error.message)
    }
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
          <Typography variant="h6">Example 10: Export</Typography>
          <Typography variant="body2" color="text.secondary">
            Export current network to CX2
          </Typography>
        </Grid>
        <Grid item xs={4} textAlign="right">
          <Button size="small" variant="contained" onClick={handleExport}>
            Export CX2
          </Button>
        </Grid>
      </Grid>
      {exportInfo !== null && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          {exportInfo}
        </Box>
      )}
    </Box>
  )
}
