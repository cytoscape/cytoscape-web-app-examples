import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useRef, useState } from 'react'
import type { ContextMenuHandlerContext } from 'cyweb/ApiTypes'
import { useAppContext } from 'cyweb/AppIdContext'

const TemplateContextMenuExample = (): JSX.Element => {
  const ctx = useAppContext()
  const contextMenuItemId = useRef<string | null>(null)
  const [lastContextTarget, setLastContextTarget] = useState<string | null>(
    null,
  )

  const handleRegisterContextMenu = (): void => {
    if (ctx === null || contextMenuItemId.current !== null) return

    const result = ctx.apis.contextMenu.addContextMenuItem({
      label: 'Template: Say hello',
      targetTypes: ['canvas'],
      handler: (context: ContextMenuHandlerContext) => {
        setLastContextTarget(context.type)
      },
    })

    if (result.success) {
      contextMenuItemId.current = result.data.itemId
    }
  }

  // Note: explicit cleanup is not strictly needed — the host auto-cleans
  // all items registered via AppContext.apis.contextMenu when the app is
  // disabled. But explicit removal keeps the component self-contained.

  if (ctx === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        AppContext not available
      </Typography>
    )
  }

  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        Context Menu Example
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Register one canvas menu item, then right-click the background.
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={handleRegisterContextMenu}
        disabled={contextMenuItemId.current !== null}
      >
        Register Context Menu Item
      </Button>
      {lastContextTarget !== null ? (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Last action target: {lastContextTarget}
        </Typography>
      ) : null}
    </Box>
  )
}

export default TemplateContextMenuExample
