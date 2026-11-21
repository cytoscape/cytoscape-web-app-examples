import { subnetworkFromSelection } from '../../recipes/network/subnetwork-from-selection'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'network/subnetwork-from-selection',
  run: (ctx) => {
    const { apis, check } = ctx
    const source = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['a', 'c'],
    ])
    const ids = ctx.nodeIdsByName(source)
    const edges = apis.element.getEdges(source)
    if (!edges.success) return check(false, 'the fixture edges are readable')
    const edgeOf = (a: string, b: string): string =>
      edges.data.edges.find(
        (e) => e.sourceId === ids[a] && e.targetId === ids[b],
      )?.id ?? ''

    check(
      apis.visualStyle.setDefault(source, 'nodeBackgroundColor', '#123456')
        .success &&
        apis.visualStyle.setBypass(source, 'nodeBorderWidth', [ids.a], 9)
          .success,
      'the source gets a default and a bypass',
    )
    check(
      apis.selection.exclusiveSelect(
        source,
        [ids.a, ids.b, ids.c],
        [edgeOf('a', 'b'), edgeOf('c', 'd')],
      ).success,
      'a, b, c and two edges are selected',
    )

    // Induced: every edge between selected nodes.
    const induced = subnetworkFromSelection(apis, source, { name: 'induced' })
    check(induced.success, 'the recipe succeeds')
    if (!induced.success) return
    const sub = induced.data.networkId
    ctx.adopt(sub)
    check(
      induced.data.nodeCount === 3 && induced.data.edgeCount === 3,
      `3 nodes and 3 edges (got ${induced.data.nodeCount}, ${induced.data.edgeCount})`,
    )
    const subNodes = apis.element.getNodeIds(sub)
    check(
      subNodes.success &&
        [...subNodes.data.nodeIds].sort().join() ===
          [ids.a, ids.b, ids.c].sort().join(),
      'the subnetwork keeps the node ids',
    )
    const copied = apis.visualStyle.getDefault(sub, 'nodeBackgroundColor')
    check(
      copied.success && copied.data.value === '#123456',
      'the style is copied',
    )
    const bypasses = apis.visualStyle.getBypasses(sub, 'nodeBorderWidth')
    check(
      bypasses.success && Object.keys(bypasses.data.bypasses).length === 0,
      'bypasses are not copied',
    )
    const current = apis.workspace.getCurrentNetworkId()
    check(
      current.success && current.data.networkId === sub,
      'the subnetwork is current',
    )

    // Selected edges only, and no style: c-d has an unselected end.
    const selected = subnetworkFromSelection(apis, source, {
      edges: 'selected',
      copyStyle: false,
    })
    check(selected.success, 'the recipe succeeds with selected edges')
    if (!selected.success) return
    ctx.adopt(selected.data.networkId)
    check(
      selected.data.edgeCount === 1,
      `only a-b is taken (got ${selected.data.edgeCount} edges)`,
    )
    const plain = apis.visualStyle.getDefault(
      selected.data.networkId,
      'nodeBackgroundColor',
    )
    check(
      plain.success && plain.data.value !== '#123456',
      'without copyStyle the host default stays',
    )

    check(apis.selection.clearSelection(source).success, 'selection cleared')
    const none = subnetworkFromSelection(apis, source)
    check(
      !none.success && none.error.code === 'RECIPE_NOTHING_SELECTED',
      'nothing selected is refused',
    )
  },
}

export default recipeCase
