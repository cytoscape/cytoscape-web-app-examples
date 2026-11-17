import { readNumericColumn } from '../../recipes/data/read-column-values-safely'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'data/read-column-values-safely',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)

    // Numbers stored as text, with the usual mess.
    check(
      apis.table.createColumn(networkId, 'node', 'text', 'string', '').success &&
        apis.table.setValues(networkId, 'node', [
          { id: ids.a, column: 'text', value: '1.5' },
          { id: ids.b, column: 'text', value: '2e3' },
          { id: ids.c, column: 'text', value: '1.5 kg' },
        ]).success,
      'a text column is written',
    )
    // A node added after the column was created has no value at all.
    const late = apis.element.createNode(networkId, [0, 0], {
      autoSelect: false,
    })
    check(late.success, 'a node is added')
    if (!late.success) return

    const text = readNumericColumn(apis, networkId, 'node', 'text')
    check(text.success, 'the recipe reads the text column')
    if (!text.success) return
    check(text.data.fromText, 'it says it parsed text')
    check(
      text.data.values[ids.a] === 1.5 && text.data.values[ids.b] === 2000,
      `"1.5" and "2e3" are numbers (${JSON.stringify(text.data.values)})`,
    )
    check(text.data.invalid.join() === ids.c, '"1.5 kg" is invalid')
    check(
      [...text.data.missing].sort().join() ===
        [ids.d, late.data.nodeId].sort().join(),
      `an empty string and no value are missing (${text.data.missing.join()})`,
    )
    check(
      text.data.range?.min === 1.5 && text.data.range?.max === 2000,
      'the range spans the numbers only',
    )

    // A numeric column created now fills every row, the late node's too: its
    // default is a value. NaN is invalid.
    check(
      apis.table.createColumn(networkId, 'node', 'score', 'double', 0).success &&
        apis.table.setValue(networkId, 'node', ids.a, 'score', Number.NaN)
          .success,
      'a double column with a NaN is written',
    )
    const score = readNumericColumn(apis, networkId, 'node', 'score')
    check(score.success, 'the recipe reads the double column')
    if (!score.success) return
    check(score.data.invalid.join() === ids.a, 'NaN is invalid')
    check(
      score.data.values[ids.b] === 0 && score.data.range?.min === 0 &&
        score.data.range?.max === 0,
      'the default 0 is a value, and all values are equal',
    )
    check(
      score.data.missing.length === 0 &&
        score.data.values[late.data.nodeId] === 0,
      'no node is missing: the default fills every row that existed',
    )

    check(
      apis.table.createColumn(networkId, 'node', 'flag', 'boolean', false)
        .success,
      'a boolean column exists',
    )
    const flag = readNumericColumn(apis, networkId, 'node', 'flag')
    check(
      !flag.success && flag.error.code === 'RECIPE_COLUMN_TYPE',
      'a boolean column is refused',
    )
    const none = readNumericColumn(apis, networkId, 'node', 'nothing')
    check(
      !none.success && none.error.code === 'RECIPE_NO_COLUMN',
      'a missing column is refused',
    )

    // Past the argument limit of a function call, with a stubbed host.
    const large = 200_000
    const stub = {
      table: {
        getTable: () => ({
          success: true,
          data: {
            columns: [{ name: 'v', type: 'double' }],
            rows: Array.from({ length: large }, (_, i) => ({ id: `n${i}`, v: i })),
          },
        }),
      },
    } as unknown as Parameters<typeof readNumericColumn>[0]
    const big = readNumericColumn(stub, 'large', 'node', 'v')
    check(
      big.success && big.data.range?.max === large - 1,
      'a column of 200,000 values is read, not thrown on',
    )
  },
}

export default recipeCase
