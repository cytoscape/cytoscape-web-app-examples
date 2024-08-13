import { useEffect } from 'react'

// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useNetworkStore } from 'cyweb/NetworkStore'

import { IdType, Network, Workspace, Node, Edge } from '@cytoscape-web/types'

interface HelloPanelProps {
  message: string
}

const SimplePanel = ({ message }: HelloPanelProps): JSX.Element => {
  const workspace: Workspace = useWorkspaceStore(
    (state: any) => state.workspace,
  )

  const { currentNetworkId } = workspace

  const networks: Map<IdType, Network> = useNetworkStore(
    (state: any) => state.networks,
  )
  const curNetwork: Network | undefined = networks.get(currentNetworkId)
  const nodes: Node[] = curNetwork?.nodes ?? []
  const edges: Edge[] = curNetwork?.edges ?? []

  const ids: IdType[] = workspace.networkIds

  useEffect(() => {
    console.log('Simple Panel initialized', workspace)
  }, [])

  return (
    <div>
      <h4>Simple panel example {message}</h4>
      <p>Current Network ID: {workspace.currentNetworkId}</p>
      <h5>Num. nodes: {nodes.length}</h5>
      <h5>Num. edges: {edges.length}</h5>
    </div>
  )
}

export default SimplePanel
