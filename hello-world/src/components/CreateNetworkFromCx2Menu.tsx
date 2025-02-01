import { MenuItem } from '@mui/material'
import { useCreateNetworkFromCx2 } from 'cyweb/CreateNetworkFromCx2'

interface CreateNetworkFromCx2MenuProps {
  handleClose?: () => void
}

const sampleUrl =
  'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/development/docs/data/sample2.cx2'

const CreateNetworkFromCx2Menu = ({
  handleClose,
}: CreateNetworkFromCx2MenuProps): JSX.Element => {
  const createNetworkFromCx2 = useCreateNetworkFromCx2()
  const fetchCx2fromURL = async (url: string): Promise<any> => {
    const response = await fetch(url)
    return await response.json()
  }

  const handleClick = (): void => {
    fetchCx2fromURL(sampleUrl).then((cx2) => {
      const networkWithView = createNetworkFromCx2({ cxData: cx2 })
    })
    handleClose && handleClose()
  }

  return (
    <MenuItem onClick={handleClick}>Create a network from remote CX2</MenuItem>
  )
}

export default CreateNetworkFromCx2Menu
