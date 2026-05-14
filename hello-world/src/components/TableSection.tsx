/**
 * Example 8: TableApi
 *
 * Shows how to read and write node/edge table data.
 *
 * Key patterns demonstrated:
 *   - `tableApi.getRow()` reads all attributes for a single element.
 *   - `tableApi.setValue()` writes a single cell value.
 *   - `tableApi.createColumn()` adds a new column with a data type and default.
 *   - Write operations fire `data:changed` events automatically.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useTableApi } from 'cyweb/TableApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { ValueTypeName } from 'cyweb/ApiTypes'

export const TableSection = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const tableApi = useTableApi()
  const selectionApi = useSelectionApi()
  const [rowData, setRowData] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleReadSelected = (): void => {
    setErrorMessage(null)
    setRowData(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    const networkId = current.data.networkId
    const sel = selectionApi.getSelection(networkId)
    if (!sel.success) {
      setErrorMessage(sel.error.message)
      return
    }
    const firstNodeId = sel.data.selectedNodes[0]
    if (!firstNodeId) {
      setErrorMessage('Select a node first.')
      return
    }
    const row = tableApi.getRow(networkId, 'node', firstNodeId)
    if (row.success) {
      setRowData(JSON.stringify(row.data.row, null, 2))
    } else {
      setErrorMessage(row.error.message)
    }
  }

  const handleAddColumn = (): void => {
    setErrorMessage(null)
    const current = workspaceApi.getCurrentNetworkId()
    if (!current.success) {
      setErrorMessage(current.error.message)
      return
    }
    const colName = `hello_${Date.now().toString(36)}`
    const result = tableApi.createColumn(
      current.data.networkId,
      'node',
      colName,
      ValueTypeName.String,
      'default-value',
    )
    if (result.success) {
      setRowData(`Column "${colName}" created.`)
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
          <Typography variant="h6">Example 8: Table Data</Typography>
          <Typography variant="body2" color="text.secondary">
            Read node attributes, add columns
          </Typography>
        </Grid>
        <Grid item xs={6} textAlign="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="contained"
              onClick={handleReadSelected}
            >
              Read Selected
            </Button>
            <Button size="small" variant="outlined" onClick={handleAddColumn}>
              + Column
            </Button>
          </Stack>
        </Grid>
      </Grid>
      {rowData !== null && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: 'grey.100',
            borderRadius: 1,
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            maxHeight: 120,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {rowData}
        </Box>
      )}
    </Box>
  )
}
