// Dynamic import from the host app
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useNetworkStore } from 'cyweb/NetworkStore'

import { IdType, Network, Workspace, Node, Edge } from '@cytoscape-web/types'
import { Box } from '@mui/material'

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

  if (!curNetwork) {
    return <Box sx={{ padding: '2em' }}>Please load a network</Box>
  }

  return (
    <Box sx={{ padding: '2em' }}>
      <h4>Simple Panel App {message}</h4>
      <h5>Sample panel-type app to display custom components</h5>
      <Box sx={{ padding: '1em', border: '1px solid #777' }}>
        <p>Current Network ID: {workspace.currentNetworkId}</p>
        <h5>Num. nodes: {nodes.length}</h5>
        <h5>Num. edges: {edges.length}</h5>
        <h6>(You can add any custom components here...)</h6>
      </Box>
    </Box>
  )
}

export default SimplePanel
