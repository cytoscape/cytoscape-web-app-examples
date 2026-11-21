import { emphasizeByThreshold } from '../../recipes/style/emphasize-by-threshold'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'style/emphasize-by-threshold',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const base = apis.visualStyle.getDefault(networkId, 'nodeBorderWidth')
    if (!base.success) return check(false, 'the default width is readable')

    check(
      apis.table.createColumn(networkId, 'node', 'fold', 'double', 0).success &&
        apis.table.setValues(networkId, 'node', [
          { id: ids.a, column: 'fold', value: 0.5 },
          { id: ids.b, column: 'fold', value: 2 },
          { id: ids.c, column: 'fold', value: 3 },
        ]).success,
      'a fold column is written; d keeps 0',
    )
    // A node added after the column has no value at all.
    const late = apis.element.createNode(networkId, [0, 0], {
      autoSelect: false,
    })
    if (!late.success) return check(false, 'a node is added')

    const emphasized = emphasizeByThreshold(apis, networkId, 'fold', 2, {
      color: '#ff0000',
      width: 8,
    })
    check(emphasized.success, 'the recipe succeeds')
    if (!emphasized.success) return
    check(emphasized.data.emphasized === 2, 'b and c pass')

    await ctx.waitFor(
      () => ctx.rendered(ids.c, 'border-width') === '8px',
      'c, above the threshold, is drawn with an 8px border',
    )
    check(
      ctx.rendered(ids.b, 'border-width') === '8px' &&
        ctx.rendered(ids.b, 'border-color') === 'rgb(255,0,0)',
      'b, exactly at the threshold, is emphasized',
    )
    const plain = `${String(base.data.value)}px`
    check(
      ctx.rendered(ids.a, 'border-width') === plain,
      `a, below it, keeps the default ${plain}`,
    )
    check(
      ctx.rendered(late.data.nodeId, 'border-width') === plain,
      'a node with no value keeps the default',
    )

    // A mapping follows the data.
    check(
      apis.table.setValue(networkId, 'node', ids.a, 'fold', 5).success,
      'a rises to 5',
    )
    await ctx.waitFor(
      () => ctx.rendered(ids.a, 'border-width') === '8px',
      'a is emphasized once its value passes',
    )

    check(
      apis.table.createColumn(networkId, 'node', 'label', 'string', '').success,
      'a text column exists',
    )
    const text = emphasizeByThreshold(apis, networkId, 'label', 1)
    check(
      !text.success && text.error.code === 'RECIPE_COLUMN_NOT_NUMERIC',
      'a text column is refused',
    )
    const nan = emphasizeByThreshold(apis, networkId, 'fold', Number.NaN)
    check(
      !nan.success && nan.error.code === 'RECIPE_BAD_THRESHOLD',
      'a threshold that is not a number is refused',
    )
  },
}

export default recipeCase
