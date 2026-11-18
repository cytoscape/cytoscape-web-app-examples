import { deleteSelected } from '../../recipes/elements/delete-selected'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'elements/delete-selected',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const edges = apis.element.getEdges(networkId)
    if (!edges.success) return check(false, 'the fixture edges are readable')
    const edgeOf = (a: string, b: string): string =>
      edges.data.edges.find(
        (e) => e.sourceId === ids[a] && e.targetId === ids[b],
      )?.id ?? ''

    // Node a (with its edges a-b and d-a) and the edge b-c.
    check(
      apis.selection.exclusiveSelect(networkId, [ids.a], [edgeOf('b', 'c')])
        .success,
      'a and b-c are selected',
    )
    const deleted = deleteSelected(apis, networkId)
    check(deleted.success, 'the recipe succeeds')
    if (!deleted.success) return
    check(
      deleted.data.nodeIds.join() === ids.a,
      `node a is deleted (got ${deleted.data.nodeIds.join()})`,
    )
    check(
      [...deleted.data.edgeIds].sort().join() ===
        [edgeOf('a', 'b'), edgeOf('d', 'a'), edgeOf('b', 'c')].sort().join(),
      'a-b, d-a and b-c are deleted',
    )

    const nodesLeft = apis.element.getNodeIds(networkId)
    check(
      nodesLeft.success &&
        [...nodesLeft.data.nodeIds].sort().join() ===
          [ids.b, ids.c, ids.d].sort().join(),
      'b, c and d remain',
    )
    const edgesLeft = apis.element.getEdgeIds(networkId)
    check(
      edgesLeft.success && edgesLeft.data.edgeIds.join() === edgeOf('c', 'd'),
      'only c-d remains',
    )

    check(
      apis.selection.exclusiveSelect(networkId, [], [edgeOf('c', 'd')])
        .success,
      'only an edge is selected',
    )
    const edgeOnly = deleteSelected(apis, networkId)
    check(
      edgeOnly.success &&
        edgeOnly.data.nodeIds.length === 0 &&
        edgeOnly.data.edgeIds.join() === edgeOf('c', 'd'),
      'an edge alone is deleted',
    )

    check(apis.selection.clearSelection(networkId).success, 'cleared')
    const nothing = deleteSelected(apis, networkId)
    check(
      !nothing.success && nothing.error.code === 'RECIPE_NOTHING_SELECTED',
      'nothing selected is refused',
    )
  },
}

export default recipeCase
