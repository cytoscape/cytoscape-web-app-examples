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
 * To follow the current network in a component, read it once when the
 * component mounts, then on its events through the `useCyWebEvent` hook, which
 * subscribes on mount and unsubscribes on unmount. Clear what you show when no
 * network is current.
 */
import { useCallback, useEffect, useState } from 'react'

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

  // Always show the network that is current now, whatever event asked.
  // No network, or one whose data has not arrived yet, shows nothing.
  const readNodeCount = useCallback((): void => {
    const current = workspace.getCurrentNetworkId()
    if (!current.success) {
      setNodeCount(null)
      return
    }
    const nodes = element.getNodeIds(current.data.networkId)
    setNodeCount(nodes.success ? nodes.data.nodeIds.length : null)
  }, [element, workspace])

  // 1. When the panel opens: a network may already be on screen, and no
  //    event will announce it.
  useEffect(() => {
    readNodeCount()
  }, [readNodeCount])
  // 2. On every switch, including to no network at all (an empty id).
  useCyWebEvent('network:switched', readNodeCount)
  // 3. When data arrives: a read made on the switch alone can fail with APP1.
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
