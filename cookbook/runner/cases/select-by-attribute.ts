import { selectByAttribute } from '../../recipes/selection/select-by-attribute'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'selection/select-by-attribute',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const selected = (): string => {
      const read = apis.selection.getSelection(networkId)
      return read.success ? [...read.data.selectedNodes].sort().join() : '?'
    }

    check(
      apis.table.createColumn(networkId, 'node', 'count', 'long', 0).success &&
        apis.table.setValues(networkId, 'node', [
          { id: ids.a, column: 'count', value: 5 },
          { id: ids.c, column: 'count', value: 5 },
        ]).success,
      'a count column is written',
    )
    const late = apis.element.createNode(networkId, [0, 0], {
      autoSelect: false,
    })
    if (!late.success) return check(false, 'a node with no count is added')

    const fives = selectByAttribute(apis, networkId, 'count', (v) => v === 5)
    check(fives.success, 'the recipe succeeds')
    check(
      selected() === [ids.a, ids.c].sort().join(),
      `a and c are selected (${selected()})`,
    )
    check(fives.success && fives.data.missing === 1, 'one node has no count')

    const asText = selectByAttribute(apis, networkId, 'count', (v) => v === '5')
    check(
      asText.success && asText.data.selectedIds.length === 0,
      "'5' as text matches nothing in a long column",
    )

    check(
      apis.selection.exclusiveSelect(networkId, [ids.b], []).success,
      'b selected',
    )
    const added = selectByAttribute(apis, networkId, 'count', (v) => v === 5, {
      mode: 'add',
    })
    check(
      added.success && selected() === [ids.a, ids.b, ids.c].sort().join(),
      "'add' keeps b",
    )

    // Edges, from the edge table.
    const edges = apis.element.getEdgeIds(networkId)
    if (!edges.success) return check(false, 'edges readable')
    // An edge-list network has no edge rows: editRows creates them.
    const [light, heavyEdge] = edges.data.edgeIds
    check(
      apis.table.createColumn(networkId, 'edge', 'weight', 'double', 0).success &&
        apis.table.editRows(networkId, 'edge', {
          [light]: { weight: 0.1 },
          [heavyEdge]: { weight: 0.9 },
        }).success,
      'edge weights are written',
    )
    const heavy = selectByAttribute(
      apis,
      networkId,
      'weight',
      (v) => typeof v === 'number' && v > 0.8,
      { tableType: 'edge' },
    )
    const edgeSelection = apis.selection.getSelection(networkId)
    check(
      heavy.success && edgeSelection.success &&
        edgeSelection.data.selectedEdges.join() === heavyEdge &&
        edgeSelection.data.selectedNodes.length === 0,
      'the heavy edge alone is selected',
    )

    const throws = selectByAttribute(apis, networkId, 'count', () => {
      throw new Error('boom')
    })
    check(
      !throws.success && throws.error.code === 'RECIPE_TEST_THREW',
      'a test that throws is reported, not thrown',
    )
    const none = selectByAttribute(apis, networkId, 'nothing', () => true)
    check(
      !none.success && none.error.code === 'RECIPE_NO_COLUMN',
      'a missing column is refused',
    )
  },
}

export default recipeCase
