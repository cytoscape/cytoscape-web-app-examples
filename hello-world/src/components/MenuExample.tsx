import {
  EdgeView,
  Network,
  NetworkStore,
  NetworkWithView,
  NodeView,
  TableStore,
  ViewModelStore,
  VisualPropertyName,
  VisualPropertyValueType,
} from '@cytoscape-web/types'

import { MenuItem } from '@mui/material'
import { useCreateNetworkWithView } from 'cyweb/CreateNetwork'
import { useNetworkStore } from 'cyweb/NetworkStore'
import { useViewModelStore } from 'cyweb/ViewModelStore'
import { useTableStore } from 'cyweb/TableStore'

interface MenuExampleProps {
  handleClose?: () => void
}

const MenuExample = ({ handleClose }: MenuExampleProps): JSX.Element => {
  // Get the function to create a network with a view
  const createNetworkWithView = useCreateNetworkWithView()

  const handleClick = (): void => {
    const newNetwork: NetworkWithView = createNetworkWithView({
      name: 'Created by hello-world App',
      description: 'This network was created by hello-world app',
      edgeList: [
        ['A', 'B', 'type1'],
        ['B', 'C', 'type2'],
        ['C', 'A', 'type1'],
      ],
    })

    // Update some Visual Style properties

    console.log('Sample network created', newNetwork)
    handleClose && handleClose()
  }

  return <MenuItem onClick={handleClick}>Create an example network</MenuItem>
}

export default MenuExample
