import { selectNeighbors } from '../../recipes/selection/select-neighbors'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'selection/select-neighbors',
  run: (ctx) => {
    const { apis, check } = ctx
    // A path a → b → c → d, and e → b.
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['e', 'b'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const names = Object.fromEntries(
      Object.entries(ids).map(([name, id]) => [id, name]),
    )
    const selectedNames = (): string => {
      const read = apis.selection.getSelection(networkId)
      return read.success
        ? read.data.selectedNodes.map((id) => names[id]).sort().join('')
        : '?'
    }
    const start = (...nodes: string[]): void =>
      check(
        apis.selection.exclusiveSelect(
          networkId,
          nodes.map((n) => ids[n]),
          [],
        ).success,
        `${nodes.join()} selected`,
      )

    start('b')
    const one = selectNeighbors(apis, networkId)
    check(one.success, 'the recipe succeeds')
    check(selectedNames() === 'abce', `one hop from b (got ${selectedNames()})`)

    start('a')
    const two = selectNeighbors(apis, networkId, { hops: 2 })
    check(
      two.success && selectedNames() === 'abce',
      `two hops from a (got ${selectedNames()})`,
    )

    start('b')
    const out = selectNeighbors(apis, networkId, { direction: 'outgoing' })
    check(
      out.success && selectedNames() === 'bc',
      `outgoing from b (got ${selectedNames()})`,
    )
    start('b')
    const into = selectNeighbors(apis, networkId, { direction: 'incoming' })
    check(
      into.success && selectedNames() === 'abe',
      `incoming to b (got ${selectedNames()})`,
    )

    // An edge selected before stays selected.
    const edges = apis.element.getEdgeIds(networkId)
    if (!edges.success) return check(false, 'edges readable')
    check(
      apis.selection.exclusiveSelect(
        networkId,
        [ids.d],
        [edges.data.edgeIds[0]],
      ).success,
      'd and an edge selected',
    )
    check(selectNeighbors(apis, networkId).success, 'd expands')
    const kept = apis.selection.getSelection(networkId)
    check(
      kept.success && kept.data.selectedEdges.length === 1,
      'the selected edge stays selected',
    )

    check(apis.selection.clearSelection(networkId).success, 'cleared')
    const none = selectNeighbors(apis, networkId)
    check(
      !none.success && none.error.code === 'RECIPE_NOTHING_SELECTED',
      'nothing selected is refused',
    )
    const bad = selectNeighbors(apis, networkId, { hops: 0 })
    check(
      !bad.success && bad.error.code === 'RECIPE_BAD_HOPS',
      'zero hops are refused',
    )
  },
}

export default recipeCase
