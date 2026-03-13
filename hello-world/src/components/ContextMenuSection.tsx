/**
 * Example 6: ContextMenuApi
 *
 * Shows how to register and remove custom context menu items via the
 * Cytoscape Web Context Menu API.
 *
 * Key patterns demonstrated:
 *   - Import `useContextMenuApi` from the host via Module Federation.
 *   - Register separate menu items for node, edge, and canvas (background)
 *     targets — each with a different label and handler.
 *   - Store returned `itemId` values to enable clean removal.
 *   - Remove all registered items on demand or when the component unmounts.
 *   - Check `result.success` before using result data; on failure, display
 *     `result.error.message`. All API functions return ApiResult<T> and
 *     never throw across the API boundary.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'
import { useContextMenuApi } from 'cyweb/ContextMenuApi'
import type { ContextMenuHandlerContext } from 'cyweb/ApiTypes'

/**
 * Tracks the last handler invocation for display in the UI.
 */
interface LastAction {
  label: string
  type: string
  id?: string
}

export const ContextMenuSection = (): JSX.Element => {
  const contextMenuApi = useContextMenuApi()

  // IDs returned by addContextMenuItem — stored so we can remove them later.
  const nodeItemId = useRef<string | null>(null)
  const edgeItemId = useRef<string | null>(null)
  const canvasItemId = useRef<string | null>(null)

  const [registered, setRegistered] = useState(false)
  const [lastAction, setLastAction] = useState<LastAction | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Register three context menu items — one per target type.
  const handleRegister = (): void => {
    setErrorMessage(null)

    const nodeResult = contextMenuApi.addContextMenuItem({
      label: 'Hello: Inspect Node',
      targetTypes: ['node'],
      handler: (ctx: ContextMenuHandlerContext) => {
        setLastAction({ label: 'Inspect Node', type: ctx.type, id: ctx.id })
      },
    })
    if (!nodeResult.success) {
      setErrorMessage(nodeResult.error.message)
      return
    }
    nodeItemId.current = nodeResult.data.itemId

    const edgeResult = contextMenuApi.addContextMenuItem({
      label: 'Hello: Inspect Edge',
      targetTypes: ['edge'],
      handler: (ctx: ContextMenuHandlerContext) => {
        setLastAction({ label: 'Inspect Edge', type: ctx.type, id: ctx.id })
      },
    })
    if (!edgeResult.success) {
      setErrorMessage(edgeResult.error.message)
      return
    }
    edgeItemId.current = edgeResult.data.itemId

    const canvasResult = contextMenuApi.addContextMenuItem({
      label: 'Hello: Canvas Action',
      targetTypes: ['canvas'],
      handler: (ctx: ContextMenuHandlerContext) => {
        setLastAction({ label: 'Canvas Action', type: ctx.type })
      },
    })
    if (!canvasResult.success) {
      setErrorMessage(canvasResult.error.message)
      return
    }
    canvasItemId.current = canvasResult.data.itemId

    setRegistered(true)
  }

  // Remove all three registered items.
  const handleRemove = (): void => {
    setErrorMessage(null)
    for (const id of [
      nodeItemId.current,
      edgeItemId.current,
      canvasItemId.current,
    ]) {
      if (id !== null) {
        const result = contextMenuApi.removeContextMenuItem(id)
        if (!result.success) {
          setErrorMessage(result.error.message)
        }
      }
    }
    nodeItemId.current = null
    edgeItemId.current = null
    canvasItemId.current = null
    setRegistered(false)
    setLastAction(null)
  }

  // Clean up on unmount so stale menu items are not left in the registry.
  useEffect(() => {
    return () => {
      for (const id of [
        nodeItemId.current,
        edgeItemId.current,
        canvasItemId.current,
      ]) {
        if (id !== null) {
          contextMenuApi.removeContextMenuItem(id)
        }
      }
    }
    // contextMenuApi is a stable singleton — no dependency needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <Typography variant="h6">Example 6: Context Menu</Typography>
          <Typography variant="body2" color="text.secondary">
            Register custom items for node, edge, and canvas right-click menus
          </Typography>
        </Grid>
        <Grid item xs={4} textAlign="right">
          {registered ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleRemove}
            >
              Remove Items
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={handleRegister}
            >
              Register Items
            </Button>
          )}
        </Grid>
      </Grid>
      {registered && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label="Node: Hello: Inspect Node" color="primary" />
          <Chip size="small" label="Edge: Hello: Inspect Edge" color="secondary" />
          <Chip size="small" label="Canvas: Hello: Canvas Action" color="default" />
        </Stack>
      )}
      {lastAction !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Last triggered: <strong>{lastAction.label}</strong> on{' '}
          <strong>{lastAction.type}</strong>
          {lastAction.id !== undefined ? ` (id: ${lastAction.id})` : ''}
        </Typography>
      )}
    </Box>
  )
}
