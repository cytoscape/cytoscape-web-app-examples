import { Network, NetworkWithView } from '@cytoscape-web/types'
import { MenuItem } from '@mui/material'
import {
  createEmptyNetwork,
  useCreateNetworkWithView,
} from 'cyweb/CreateNetwork'

const MenuExample = (): JSX.Element => {
  // Get the function to create a network with a view
  const createNetworkWithView = useCreateNetworkWithView()

  const handleClick = (): void => {
    // const newNet: Network = createEmptyNetwork()
    const newNetwork: NetworkWithView = createNetworkWithView({
      name: 'Empty Network1',
    })
    console.log('Empty network created', newNetwork)
    const network: Network = newNetwork.network
    alert(`Network Created: ${network.id}`)
  }

  return <MenuItem onClick={handleClick}>Create empty network</MenuItem>
}

export default MenuExample
