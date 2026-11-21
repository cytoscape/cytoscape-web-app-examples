import { addEdgesBetweenSelected } from '../../recipes/elements/add-edges-between-selected'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'elements/add-edges-between-selected',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const pairs = (): string[] => {
      const edges = apis.element.getEdges(networkId)
      if (!edges.success) return []
      const names = Object.fromEntries(
        Object.entries(ids).map(([name, id]) => [id, name]),
      )
      return edges.data.edges
        .map((e) => [names[e.sourceId], names[e.targetId]].sort().join(''))
        .sort()
    }

    check(
      apis.selection.exclusiveSelect(networkId, [ids.a, ids.b, ids.c], [])
        .success,
      'a, b and c are selected',
    )
    const added = addEdgesBetweenSelected(apis, networkId)
    check(added.success, 'the recipe succeeds')
    if (!added.success) return
    check(added.data.edgeIds.length === 2, 'two edges: a-c and b-c')
    check(
      pairs().join() === 'ab,ac,bc,cd',
      `a-b is not doubled (got ${pairs().join()})`,
    )
    const selection = apis.selection.getSelection(networkId)
    check(
      selection.success &&
        selection.data.selectedNodes.length === 3 &&
        selection.data.selectedEdges.length === 0,
      'the selection is unchanged',
    )

    const again = addEdgesBetweenSelected(apis, networkId)
    check(
      again.success && again.data.edgeIds.length === 0,
      'running it again adds nothing',
    )

    check(
      apis.selection.exclusiveSelect(
        networkId,
        [ids.a, ids.b, ids.c, ids.d],
        [],
      ).success,
      'all four are selected',
    )
    const capped = addEdgesBetweenSelected(apis, networkId, { maxEdges: 1 })
    check(
      !capped.success && capped.error.code === 'RECIPE_TOO_MANY_EDGES',
      'more edges than maxEdges are refused',
    )
    check(pairs().length === 4, 'the refusal creates no edge')

    // A large selection is refused quickly: the pairs are not all listed.
    // Stubbed host: 20,000 unconnected nodes would make 200 million pairs.
    const many = Array.from({ length: 20_000 }, (_, i) => `n${i}`)
    const stub = {
      selection: {
        getSelection: () => ({
          success: true,
          data: { selectedNodes: many, selectedEdges: [] },
        }),
      },
      element: {
        getEdges: () => ({ success: true, data: { edges: [], missing: [] } }),
      },
    } as unknown as Parameters<typeof addEdgesBetweenSelected>[0]
    const startedAt = performance.now()
    const huge = addEdgesBetweenSelected(stub, 'large')
    check(
      !huge.success && huge.error.code === 'RECIPE_TOO_MANY_EDGES' &&
        performance.now() - startedAt < 1000,
      'a selection of 20,000 nodes is refused at once',
    )

    check(
      apis.selection.exclusiveSelect(networkId, [ids.a], []).success,
      'one node selected',
    )
    const single = addEdgesBetweenSelected(apis, networkId)
    check(
      !single.success && single.error.code === 'RECIPE_TOO_FEW_NODES',
      'one node is refused',
    )
  },
}

export default recipeCase
