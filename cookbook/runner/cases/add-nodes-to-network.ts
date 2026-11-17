import { addNodesToNetwork } from '../../recipes/elements/add-nodes-to-network'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'elements/add-nodes-to-network',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([['x', 'y']])
    const fixture = ctx.nodeIdsByName(networkId)

    // A selection the recipe must leave alone.
    const selected = apis.selection.exclusiveSelect(networkId, [fixture.x], [])
    check(selected.success, 'the fixture node can be selected')
    const before = apis.viewport.getNodePositions(networkId)
    check(before.success, 'the fixture positions are readable')
    if (!before.success) return
    const lowest = Math.max(
      ...Object.values(before.data.positions).map((p) => p[1]),
    )

    const added = addNodesToNetwork(
      apis,
      networkId,
      [{ name: 'A' }, { name: 'B', attributes: { name: 'ignored' } }, { name: 'C' }],
      [
        [0, 1],
        [1, 2],
      ],
    )
    check(added.success, 'the recipe succeeds')
    if (!added.success) return
    const { nodeIds, edgeIds } = added.data
    check(nodeIds.length === 3, 'it returns three node ids')
    check(edgeIds.length === 2, 'it returns two edge ids')

    // Read back through the read-side APIs.
    const nodes = apis.element.getNodes(networkId)
    check(nodes.success, 'the nodes are readable')
    if (!nodes.success) return
    check(nodes.data.nodes.length === 5, 'the network has five nodes')
    const names = nodeIds.map(
      (id) => nodes.data.nodes.find((n) => n.id === id)?.attributes.name,
    )
    check(
      names.join(',') === 'A,B,C',
      `the new nodes are named A, B and C in order (got ${names.join(',')})`,
    )

    const positions = nodeIds.map(
      (id) => nodes.data.nodes.find((n) => n.id === id)?.position ?? [0, 0],
    )
    check(
      new Set(positions.map((p) => `${p[0]},${p[1]}`)).size === 3,
      'the new nodes do not overlap',
    )
    check(
      positions.every((p) => p[1] > lowest),
      'the new nodes are below the existing ones',
    )

    const edges = apis.element.getEdges(networkId, edgeIds)
    check(edges.success, 'the new edges are readable')
    if (!edges.success) return
    const chain = edges.data.edges.map((e) => `${e.sourceId}>${e.targetId}`)
    check(
      chain.join(' ') ===
        `${nodeIds[0]}>${nodeIds[1]} ${nodeIds[1]}>${nodeIds[2]}`,
      'the edges connect A to B and B to C',
    )
    const allEdges = apis.element.getEdgeIds(networkId)
    check(
      allEdges.success && allEdges.data.edgeIds.length === 3,
      'the network has three edges',
    )

    const selection = apis.selection.getSelection(networkId)
    check(
      selection.success &&
        selection.data.selectedNodes.join(',') === fixture.x &&
        selection.data.selectedEdges.length === 0,
      'the selection is unchanged',
    )

    // A bad link is rejected before anything is created.
    const bad = addNodesToNetwork(apis, networkId, [{ name: 'D' }], [[0, 3]])
    check(
      !bad.success && bad.error.code === 'RECIPE_BAD_LINK',
      'a link to a missing node fails',
    )
    const empty = addNodesToNetwork(apis, networkId, [])
    check(
      !empty.success && empty.error.code === 'RECIPE_NO_NODES',
      'an empty list of nodes fails',
    )
    const after = apis.element.getNodeIds(networkId)
    check(
      after.success && after.data.nodeIds.length === 5,
      'a rejected call creates nothing',
    )

    // A failure of the host comes back as it is.
    const missing = addNodesToNetwork(apis, 'no-such-network', [{ name: 'E' }])
    check(
      !missing.success && !missing.error.code.startsWith('RECIPE_'),
      'an unknown network fails with the host’s own error',
    )
  },
}

export default recipeCase
