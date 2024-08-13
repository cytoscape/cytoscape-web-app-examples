import { useEffect } from 'react'

// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'

import { IdType } from '@cytoscape-web/types'

const CreateNetworkPanel = (): JSX.Element => {
  const workspace = useWorkspaceStore((state: any) => state.workspace)

  const ids: IdType[] = workspace.networkIds

  useEffect(() => {
    console.log('Create Network Panel initialized', workspace)
  }, [])

  return (
    <div>
      <h4>Create a network</h4>
      <p>Current Network ID: {workspace.currentNetworkId}</p>
      <h5>Networks:</h5>
    </div>
  )
}

export default CreateNetworkPanel
