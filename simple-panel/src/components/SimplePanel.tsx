import { useEffect } from 'react'

// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'

import { Network, IdType } from '@cytoscape-web/types'

interface HelloPanelProps {
  message: string
}

const SimplePanel = ({ message }: HelloPanelProps): JSX.Element => {
  const workspace = useWorkspaceStore((state: any) => state.workspace)

  const ids: IdType[] = workspace.networkIds

  useEffect(() => {
    console.log('Simple Panel initialized', workspace)
  }, [])

  return (
    <div>
      <h4>Simple panel example {message}</h4>
      <p>Current Network ID: {workspace.currentNetworkId}</p>
      <h5>Networks:</h5>
      <ul>
        {ids.map((id: IdType) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
    </div>
  )
}

export default SimplePanel
