import { labelFromColumn } from '../../recipes/style/label-from-column'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'style/label-from-column',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([['a', 'b']])
    const ids = ctx.nodeIdsByName(networkId)

    check(
      apis.table.createColumn(networkId, 'node', 'symbol', 'string', '')
        .success &&
        apis.table.setValue(networkId, 'node', ids.a, 'symbol', 'TP53').success,
      'a symbol column is written',
    )
    const labeled = labelFromColumn(apis, networkId, 'symbol')
    check(labeled.success, 'the recipe succeeds')
    const mapping = apis.visualStyle.getMapping(networkId, 'nodeLabel')
    check(
      mapping.success && mapping.data.mapping?.type === 'passthrough' &&
        mapping.data.mapping.attribute === 'symbol',
      'the label is a passthrough mapping from symbol',
    )
    await ctx.waitFor(
      () => ctx.rendered(ids.a, 'label') === 'TP53',
      'a is labeled TP53',
    )

    // A number is shown as it is stored.
    check(
      apis.table.createColumn(networkId, 'node', 'score', 'double', 0).success &&
        apis.table.setValue(networkId, 'node', ids.a, 'score', 0.123456)
          .success,
      'a score column is written',
    )
    check(labelFromColumn(apis, networkId, 'score').success, 'score labels')
    await ctx.waitFor(
      () => ctx.rendered(ids.a, 'label') === '0.123456',
      'a is labeled 0.123456, unformatted',
    )

    // Back to name.
    check(labelFromColumn(apis, networkId, 'name').success, 'name labels')
    await ctx.waitFor(
      () => ctx.rendered(ids.a, 'label') === 'a',
      'a is labeled a again',
    )

    // Edges, from the edge table.
    const edges = apis.element.getEdgeIds(networkId)
    if (!edges.success) return check(false, 'edges readable')
    check(
      apis.table.createColumn(networkId, 'edge', 'kind', 'string', 'pp')
        .success,
      'an edge column exists',
    )
    check(
      labelFromColumn(apis, networkId, 'kind', 'edge').success,
      'edges label from kind',
    )
    const edgeMapping = apis.visualStyle.getMapping(networkId, 'edgeLabel')
    check(
      edgeMapping.success && edgeMapping.data.mapping?.attribute === 'kind',
      'the edge label is mapped from kind',
    )

    check(
      apis.table.createColumn(networkId, 'node', 'tags', 'list_of_string', [])
        .success,
      'a list column exists',
    )
    const list = labelFromColumn(apis, networkId, 'tags')
    check(
      !list.success && list.error.code === 'RECIPE_COLUMN_TYPE',
      'a list column is refused',
    )
    const none = labelFromColumn(apis, networkId, 'nothing')
    check(
      !none.success && none.error.code === 'RECIPE_NO_COLUMN',
      'a missing column is refused',
    )
  },
}

export default recipeCase
