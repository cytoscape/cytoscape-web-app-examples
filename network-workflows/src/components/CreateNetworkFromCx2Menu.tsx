import Typography from '@mui/material/Typography'
import { Cx2 } from 'cyweb/ApiTypes'
import { useNetworkApi } from 'cyweb/NetworkApi'

const sampleUrl =
  'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/development/docs/data/sample2.cx2'

/**
 * Menu item that fetches a CX2 file from a remote URL and creates a network.
 * Registered with closeOnAction: true — the host auto-closes the menu.
 */
const CreateNetworkFromCx2Menu = (): JSX.Element => {
  const networkApi = useNetworkApi()

  const fetchCx2fromURL = async (url: string): Promise<Cx2> => {
    const response = await fetch(url)
    return (await response.json()) as Cx2
  }

  const handleClick = (): void => {
    fetchCx2fromURL(sampleUrl).then((cx2) => {
      const result = networkApi.createNetworkFromCx2({
        cxData: cx2,
        navigate: true,
        addToWorkspace: true,
      })
      if (!result.success) {
        console.error(result.error.message)
      }
    })
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
      Create a network from remote CX2
    </Typography>
  )
}

export default CreateNetworkFromCx2Menu
