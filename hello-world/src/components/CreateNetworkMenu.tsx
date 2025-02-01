import { NetworkWithView, WorkspaceStore } from '@cytoscape-web/types'

import { MenuItem } from '@mui/material'
import { useCreateNetworkWithView } from 'cyweb/CreateNetwork'
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'

interface CreateNetworkMenuProps {
  handleClose?: () => void
}

const CreateNetworkMenu = ({
  handleClose,
}: CreateNetworkMenuProps): JSX.Element => {
  // Get the function to create a network with a view
  const createNetworkWithView = useCreateNetworkWithView()
  const setCurrentNetworkId = useWorkspaceStore(
    (state: WorkspaceStore) => state.setCurrentNetworkId,
  )
  const addNetworkIds = useWorkspaceStore(
    (state: WorkspaceStore) => state.addNetworkIds,
  )

  const handleClick = (): void => {
    // Create a sample network with tables, views, and styles
    const newNetwork: NetworkWithView = createNetworkWithView({
      name: 'Created by hello-world App',
      description: 'This network was created by hello-world app',
      edgeList: [
        ['A', 'B', 'type1'],
        ['B', 'C', 'type2'],
        ['C', 'A', 'type1'],
      ],
    })

    addNetworkIds(newNetwork.network.id)
    console.log('Sample network created', newNetwork)

    // Set this new network as the current network in the workspace
    setTimeout(() => {
      setCurrentNetworkId(newNetwork.network.id)
    }, 1000)

    handleClose && handleClose()
  }

  return <MenuItem onClick={handleClick}>Create an example network</MenuItem>
}

export default CreateNetworkMenu
