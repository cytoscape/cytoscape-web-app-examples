/**
 * TemplateMenuItem — Minimal Apps-menu action.
 *
 * Demonstrates:
 *   - Creating a network from an edge list (simplest API usage)
 *   - MUI components in a menu item
 *   - closeOnAction: true in TemplateApp.resources[] means the dropdown
 *     closes automatically after the user clicks — no handleClose needed.
 *
 * Replace this with your own menu action.
 */
import Typography from '@mui/material/Typography'

import { useNetworkApi } from 'cyweb/NetworkApi'

const TemplateMenuItem = (): JSX.Element => {
  const networkApi = useNetworkApi()

  const handleClick = (): void => {
    networkApi.createNetworkFromEdgeList({
      name: 'Template Network',
      description: 'Created by the App Template menu action.',
      edgeList: [
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'A'],
      ],
      addToWorkspace: true,
    })
  }

  return (
    <Typography
      sx={{
        px: 2,
        py: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={handleClick}
    >
      Create example network
    </Typography>
  )
}

export default TemplateMenuItem
