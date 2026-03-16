import Typography from '@mui/material/Typography'
import { useNetworkApi } from 'cyweb/NetworkApi'

/**
 * Menu item that creates a small example network.
 * Registered with closeOnAction: true — the host auto-closes the menu.
 */
const CreateNetworkMenu = (): JSX.Element => {
  const networkApi = useNetworkApi()

  const handleClick = (): void => {
    const result = networkApi.createNetworkFromEdgeList({
      name: 'Created by network-workflows App',
      description: 'This network was created by network-workflows app',
      edgeList: [
        ['A', 'B', 'type1'],
        ['B', 'C', 'type2'],
        ['C', 'A', 'type1'],
      ],
      addToWorkspace: true,
    })

    if (!result.success) {
      console.error(result.error.message)
    }
  }

  return (
    <Typography
      onClick={handleClick}
      sx={{
        width: '100%',
        px: 2,
        py: 1,
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'action.hover' },
      }}
    >
      Create an example network
    </Typography>
  )
}

export default CreateNetworkMenu
