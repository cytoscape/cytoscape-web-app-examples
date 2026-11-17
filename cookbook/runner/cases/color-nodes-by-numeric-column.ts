import { colorNodesByNumericColumn } from '../../recipes/style/color-nodes-by-numeric-column'
import type { RecipeCase } from '../harness'

/**
 * What `getMapping` returns for a continuous mapping at run time. The type
 * the API declares for a mapping has no control points, and is not exported,
 * so the case reads them through this shape and fails if they are not there.
 */
interface ContinuousMapping {
  type: string
  attribute: string
  controlPoints?: Array<{ value: unknown; vpValue: unknown }>
}

const recipeCase: RecipeCase = {
  id: 'style/color-nodes-by-numeric-column',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)

    const scoreColumn = apis.table.createColumn(
      networkId,
      'node',
      'score',
      'double',
      0,
    )
    check(scoreColumn.success, 'a double column can be created')
    const scores = apis.table.setValues(networkId, 'node', [
      { id: ids.a, column: 'score', value: 1.5 },
      { id: ids.b, column: 'score', value: 5 },
      { id: ids.c, column: 'score', value: 10 },
    ])
    check(scores.success, 'the scores can be written')

    const colored = colorNodesByNumericColumn(apis, networkId, 'score', {
      low: '#0000ff',
      high: '#ff0000',
    })
    check(colored.success, 'the recipe succeeds')
    if (!colored.success) return
    // Node d keeps the column's default, 0.
    check(colored.data.min === 0, `min is 0 (got ${colored.data.min})`)
    check(colored.data.max === 10, `max is 10 (got ${colored.data.max})`)
    check(
      colored.data.mappedCount + colored.data.unmappedCount === 4,
      'every node is counted once',
    )

    // Read the mapping back.
    const read = apis.visualStyle.getMapping(networkId, 'nodeBackgroundColor')
    check(read.success, 'the mapping is readable')
    if (!read.success) return
    const mapping: ContinuousMapping | undefined = read.data.mapping
    check(mapping !== undefined, 'the fill color has a mapping')
    if (mapping === undefined) return
    check(mapping.type === 'continuous', 'the mapping is continuous')
    check(mapping.attribute === 'score', 'it reads the score column')
    const points = mapping.controlPoints ?? []
    check(points.length === 2, `it has two control points (${points.length})`)
    check(
      points[0]?.value === 0 && points[0]?.vpValue === '#0000ff',
      'the lowest value is blue',
    )
    check(
      points[1]?.value === 10 && points[1]?.vpValue === '#ff0000',
      'the highest value is red',
    )

    // A long column, to show that the column's own type is passed on.
    check(
      apis.table.createColumn(networkId, 'node', 'count', 'long', 0).success,
      'a long column can be created',
    )
    check(
      apis.table.setValue(networkId, 'node', ids.a, 'count', 7).success,
      'a count can be written',
    )
    const byCount = colorNodesByNumericColumn(apis, networkId, 'count')
    check(byCount.success, 'the recipe works on a long column')
    const afterCount = apis.visualStyle.getMapping(
      networkId,
      'nodeBackgroundColor',
    )
    check(
      afterCount.success && afterCount.data.mapping?.attribute === 'count',
      'the new mapping replaces the old one',
    )

    // The header says a wrong attributeType fails with MI2.
    const wrongType = apis.visualStyle.createContinuousMapping(
      networkId,
      'nodeBackgroundColor',
      {
        vpType: 'color',
        attribute: 'score',
        attributeType: 'long',
        attributeValues: [0, 10],
      },
    )
    check(
      !wrongType.success && wrongType.error.code === 'MI2',
      'a wrong attributeType fails with MI2',
    )

    // Each refusal leaves the mapping as it was.
    check(
      apis.table.createColumn(networkId, 'node', 'grade', 'string', '').success,
      'a string column can be created',
    )
    const byString = colorNodesByNumericColumn(apis, networkId, 'grade')
    check(
      !byString.success && byString.error.code === 'RECIPE_COLUMN_NOT_NUMERIC',
      'a string column fails',
    )
    check(
      apis.table.createColumn(networkId, 'node', 'flat', 'double', 3).success,
      'a constant column can be created',
    )
    const byFlat = colorNodesByNumericColumn(apis, networkId, 'flat')
    check(
      !byFlat.success && byFlat.error.code === 'RECIPE_SINGLE_VALUE',
      'a column of equal values fails',
    )
    const byNothing = colorNodesByNumericColumn(apis, networkId, 'no-such')
    check(!byNothing.success, 'a missing column fails')
    const unchanged = apis.visualStyle.getMapping(
      networkId,
      'nodeBackgroundColor',
    )
    check(
      unchanged.success && unchanged.data.mapping?.attribute === 'count',
      'a refused call changes no mapping',
    )

    // A network past the argument limit of a function call (about 120,000).
    // The host is stubbed: what is checked is the recipe's own arithmetic,
    // and 200,000 real nodes would take the case minutes to build.
    const large = 200_000
    const stub = {
      table: {
        getTable: () => ({
          success: true,
          data: {
            columns: [{ name: 'score', type: 'double' }],
            rows: Array.from({ length: large }, (_, i) => ({ score: i })),
          },
        }),
      },
      visualStyle: {
        createContinuousMapping: () => ({ success: true, data: undefined }),
      },
    } as unknown as Parameters<typeof colorNodesByNumericColumn>[0]
    const byLarge = colorNodesByNumericColumn(stub, 'large', 'score')
    check(
      byLarge.success &&
        byLarge.data.max === large - 1 &&
        byLarge.data.mappedCount === large,
      'a column of 200,000 values is graded, not thrown on',
    )
  },
}

export default recipeCase
