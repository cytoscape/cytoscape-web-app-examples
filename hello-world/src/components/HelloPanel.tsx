import { useEffect } from 'react'

// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'

import { Network, IdType } from '@cytoscape-web/types'

interface HelloPanelProps {
  message: string
}

const HelloPanel = ({ message }: HelloPanelProps): JSX.Element => {
  const workspace = useWorkspaceStore((state: any) => state.workspace)

  const { networkIds } = workspace

  useEffect(() => {
    console.log('Hello Panel initialized with workspace:::', workspace)
  }, [])

  return (
    <div>
      <h5>Hello, Cytoscape from external server! {message}</h5>
      <p>Current Network ID: {workspace.currentNetworkId}</p>
      <p>Networks: {networkIds}</p>
    </div>
  )
}

export default HelloPanel
