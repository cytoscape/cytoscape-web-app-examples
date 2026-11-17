/**
 * Call site 3 of 4: a React component, such as a `'right-panel'` panel.
 *
 * Two sources, for two kinds of domain:
 *
 * - **Host-wide domains** (`element`, `network`, `selection`, `viewport`,
 *   `table`, `visualStyle`, `layout`, `export`, `workspace`): the `use*Api`
 *   hooks, one per domain.
 * - **Owner-bound domains** (`resource`, `dialog`, `appData`, `contextMenu`,
 *   `nodeGraphics`, `panel`): `useAppContext()?.apis`, and nothing else. A
 *   recipe that needs one of them takes that object.
 *
 * To follow the current network in a component, use the `useCyWebEvent` hook:
 * it subscribes on mount and unsubscribes on unmount.
 */
import { useCallback, useState } from 'react'

import { useAppContext } from 'cyweb/AppIdContext'
import { useElementApi } from 'cyweb/ElementApi'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useViewportApi } from 'cyweb/ViewportApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

import { addNodesToNetwork } from '../recipes/elements/add-nodes-to-network'
import { colorNodesByNumericColumn } from '../recipes/style/color-nodes-by-numeric-column'

const ExamplePanel = (): JSX.Element => {
  // Host-wide domains, from their hooks.
  const element = useElementApi()
  const viewport = useViewportApi()
  const workspace = useWorkspaceApi()
  // This app's own API object. It is null outside an app's own tree.
  const apis = useAppContext()?.apis

  const [message, setMessage] = useState('')
  const [nodeCount, setNodeCount] = useState<number | null>(null)

  // Read on a switch, and again when the data arrives: a read made on the
  // switch alone can fail with APP1.
  const readNodeCount = useCallback(
    ({ networkId }: { networkId: string }): void => {
      const current = workspace.getCurrentNetworkId()
      if (!current.success || current.data.networkId !== networkId) return
      const nodes = element.getNodeIds(networkId)
      setNodeCount(nodes.success ? nodes.data.nodeIds.length : null)
    },
    [element, workspace],
  )
  useCyWebEvent('network:switched', readNodeCount)
  useCyWebEvent('network:loaded', readNodeCount)

  const addChain = (): void => {
    const current = workspace.getCurrentNetworkId()
    if (!current.success) {
      setMessage(current.error.message)
      return
    }
    const added = addNodesToNetwork(
      { element, viewport },
      current.data.networkId,
      [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      [
        [0, 1],
        [1, 2],
      ],
    )
    setMessage(
      added.success
        ? `Added ${added.data.nodeIds.length} nodes`
        : added.error.message,
    )
  }

  // The app's own API object has every domain, so it serves a host-wide
  // recipe too. A recipe typed Pick<AppContextApis, …> accepts only this.
  const colorByScore = (): void => {
    if (apis === undefined) return
    const current = apis.workspace.getCurrentNetworkId()
    if (!current.success) {
      setMessage(current.error.message)
      return
    }
    const colored = colorNodesByNumericColumn(
      apis,
      current.data.networkId,
      'score',
    )
    setMessage(
      colored.success
        ? `Colored ${colored.data.mappedCount} nodes`
        : colored.error.message,
    )
  }

  return (
    <div>
      <p>{nodeCount === null ? 'No network' : `${nodeCount} nodes`}</p>
      <button onClick={addChain}>Add a chain of three nodes</button>
      <button onClick={colorByScore}>Color nodes by score</button>
      <p>{message}</p>
    </div>
  )
}

export default ExamplePanel
