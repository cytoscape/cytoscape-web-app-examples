/**
 * Example 12: TSV Table Download
 *
 * Shows how to export node/edge tables as TSV files and trigger a
 * browser download — a common pattern for saving data locally.
 *
 * Key patterns demonstrated:
 *   - `tableApi.exportTableToTsv()` returns a compact TSV string.
 *   - The `Blob` + `URL.createObjectURL` + `<a download>` pattern triggers
 *     a file save dialog without a server round-trip.
 *   - Edge table TSV always includes `source` and `target` columns.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useTableApi } from 'cyweb/TableApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

/** Trigger a browser download from an in-memory string. */
function downloadTsv(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/tab-separated-values' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const TsvDownloadSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const tableApi = useTableApi()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const handleDownload = (tableType: 'node' | 'edge'): void => {
    setErrorMessage(null)
    setInfo(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    const result = tableApi.exportTableToTsv(current.data.networkId, tableType)
    if (result.success) {
      const filename = `${tableType}-table.tsv`
      downloadTsv(result.data.tsvText, filename)
      const lineCount = result.data.tsvText.split('\n').length - 1
      setInfo(`Downloaded ${filename} (${lineCount} rows)`)
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
        <Grid item xs={6}>
          <Typography variant="h6">Example 12: TSV Download</Typography>
          <Typography variant="body2" color="text.secondary">
            Export tables as TSV files
          </Typography>
        </Grid>
        <Grid item xs={6} textAlign="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="contained"
              onClick={() => handleDownload('node')}
            >
              Nodes TSV
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => handleDownload('edge')}
            >
              Edges TSV
            </Button>
          </Stack>
        </Grid>
      </Grid>
      {info !== null && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
          }}
        >
          {info}
        </Box>
      )}
    </Box>
  )
}
