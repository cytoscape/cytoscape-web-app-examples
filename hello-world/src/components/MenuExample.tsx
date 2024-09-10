import { Network, NetworkWithView } from '@cytoscape-web/types'
import { MenuItem } from '@mui/material'
import { useCreateNetworkWithView } from 'cyweb/CreateNetwork'

interface MenuExampleProps {
  handleClose?: () => void
}

const MenuExample = ({ handleClose }: MenuExampleProps): JSX.Element => {
  // Get the function to create a network with a view
  const createNetworkWithView = useCreateNetworkWithView()

  const handleClick = (): void => {
    const newNetwork: NetworkWithView = createNetworkWithView({
      name: 'Empty Network1',
    })
    console.log('Empty network created', newNetwork)
    const network: Network = newNetwork.network
    alert(`An empty network created: ${network.id}`)
    handleClose && handleClose()
  }

  return <MenuItem onClick={handleClick}>Create an empty network</MenuItem>
}

export default MenuExample
