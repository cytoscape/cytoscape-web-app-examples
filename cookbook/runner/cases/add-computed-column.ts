import { addDegreeColumn } from '../../recipes/data/add-computed-column'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'data/add-computed-column',
  run: (ctx) => {
    const { apis, check } = ctx
    // b has three edges; c has one plus a self-loop, which counts twice.
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['b', 'd'],
      ['c', 'c'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const degreeOf = (): Record<string, unknown> => {
      const table = apis.table.getTable(networkId, 'node', {
        columns: ['name', 'degree'],
      })
      if (!table.success) return {}
      return Object.fromEntries(
        table.data.rows.map((row) => [String(row.name), row.degree]),
      )
    }

    const first = addDegreeColumn(apis, networkId)
    check(first.success, 'the recipe succeeds')
    if (!first.success) return
    check(first.data.created, 'it creates the column')
    check(
      first.data.min === 1 && first.data.max === 3,
      `the range is 1 to 3 (got ${first.data.min} to ${first.data.max})`,
    )
    check(
      JSON.stringify(degreeOf()) === JSON.stringify({ a: 1, b: 3, c: 3, d: 1 }),
      `the degrees are written (got ${JSON.stringify(degreeOf())})`,
    )
    const columns = apis.table.getColumns(networkId, 'node')
    check(
      columns.success &&
        columns.data.columns.find((c) => c.name === 'degree')?.type ===
          'integer',
      'the column is an integer column',
    )

    // Again, after an edge more: the column is updated, not created.
    check(
      apis.element.createEdge(networkId, ids.a, ids.d, { autoSelect: false })
        .success,
      'an edge is added',
    )
    const second = addDegreeColumn(apis, networkId)
    check(
      second.success && !second.data.created && degreeOf().a === 2,
      'running it again updates the column',
    )

    // Same letters, other case: refused on both releases.
    check(
      apis.table.createColumn(networkId, 'node', 'Rank', 'integer', 0).success,
      'a Rank column exists',
    )
    const clash = addDegreeColumn(apis, networkId, 'rank')
    check(
      !clash.success && clash.error.code === 'RECIPE_NAME_CLASH',
      'rank next to Rank is refused',
    )
    check(
      apis.table.createColumn(networkId, 'node', 'note', 'string', '').success,
      'a text column exists',
    )
    const typed = addDegreeColumn(apis, networkId, 'note')
    check(
      !typed.success && typed.error.code === 'RECIPE_COLUMN_TYPE',
      'a text column of that name is refused',
    )
  },
}

export default recipeCase
