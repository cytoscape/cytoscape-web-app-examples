import { joinTableByKey } from '../../recipes/data/join-table-by-key'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'data/join-table-by-key',
  run: (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const columnNames = (): string => {
      const columns = apis.table.getColumns(networkId, 'node')
      return columns.success
        ? columns.data.columns.map((c) => `${c.name}:${c.type}`).join()
        : ''
    }

    // Windows line endings, a typed column, an untyped one, an empty number
    // and a key that matches no node. Spellings match the table exactly.
    const tsv =
      'name\tscore:double\tgroup\r\n' +
      'a\t1.5\tx\r\n' +
      'b\t\ty\r\n' +
      'z\t3\tw\r\n'
    const joined = joinTableByKey(apis, networkId, tsv, 'name')
    check(joined.success, 'the recipe succeeds')
    if (!joined.success) return
    check(joined.data.matchedElements === 2, 'two nodes get values')
    check(joined.data.unmatchedKeys.join() === 'z', 'z matches nothing')
    check(
      [...joined.data.newColumns].sort().join() === 'group,score',
      `group and score are created (${joined.data.newColumns.join()})`,
    )
    const a = apis.table.getRow(networkId, 'node', ids.a)
    const b = apis.table.getRow(networkId, 'node', ids.b)
    check(
      a.success && a.data.row.score === 1.5 && a.data.row.group === 'x',
      `a holds 1.5 and x (${JSON.stringify(a)})`,
    )
    check(
      b.success && b.data.row.group === 'y',
      'b holds y, with no carriage return left on it',
    )
    check(
      b.success && b.data.row.score !== 1.5,
      'an empty number writes nothing',
    )

    const before = columnNames()
    const clash = joinTableByKey(
      apis,
      networkId,
      'name\tScore:double\na\t2\n',
      'name',
    )
    check(
      !clash.success && clash.error.code === 'RECIPE_NAME_CLASH',
      'Score next to score is refused',
    )
    const twice = joinTableByKey(
      apis,
      networkId,
      'name\tnote\na\t1\na\t2\n',
      'name',
    )
    check(
      !twice.success && twice.error.code === 'RECIPE_DUPLICATE_KEY',
      'a key twice in the file is refused',
    )
    const emptyKey = joinTableByKey(
      apis,
      networkId,
      'name\tnote\na\t1\n\t2\n',
      'name',
    )
    check(
      !emptyKey.success && emptyKey.error.code === 'RECIPE_EMPTY_KEY',
      'a row with no key is refused, not skipped in silence',
    )
    const retyped = joinTableByKey(
      apis,
      networkId,
      'name\tscore:long\na\t2\n',
      'name',
    )
    check(
      !retyped.success && retyped.error.code === 'RECIPE_COLUMN_TYPE',
      'score declared as long over a double column is refused',
    )
    const noKey = joinTableByKey(apis, networkId, 'gene\tv\na\t1\n', 'gene')
    check(
      !noKey.success && noKey.error.code === 'RECIPE_NO_KEY_COLUMN',
      'a key the table lacks is refused',
    )
    const notInFile = joinTableByKey(apis, networkId, 'v\n1\n', 'name')
    check(
      !notInFile.success && notInFile.error.code === 'RECIPE_NO_KEY_IN_FILE',
      'a file without the key is refused',
    )
    check(columnNames() === before, 'the refusals create no column')

    // Edges by id: an edge-list network has no edge rows, and a plain import
    // would report the match and store nothing.
    const edges = apis.element.getEdgeIds(networkId)
    if (!edges.success) return check(false, 'edges readable')
    const [first, second] = edges.data.edgeIds
    const byId = joinTableByKey(
      apis,
      networkId,
      `id\tweight:double\n${first}\t0.5\n`,
      'id',
      'edge',
    )
    check(byId.success, 'edges are joined by id')
    check(
      byId.success && byId.data.createdRows === 1 && byId.data.matchedElements === 1,
      `one empty row is created, for the one edge named (${JSON.stringify(byId)})`,
    )
    const weight = apis.table.getValue(networkId, 'edge', first, 'weight')
    check(
      weight.success && weight.data.value === 0.5,
      `the weight is stored and reads back (${JSON.stringify(weight)})`,
    )
    const untouched = apis.table.getRow(networkId, 'edge', second)
    check(!untouched.success, 'an edge the file does not name gets no row')

    // Again: the row exists now, and is updated, not replaced.
    const again = joinTableByKey(
      apis,
      networkId,
      `id\tlabel\n${first}\tstrong\n`,
      'id',
      'edge',
    )
    const row = apis.table.getRow(networkId, 'edge', first)
    check(
      again.success && again.data.createdRows === 0 && row.success &&
        row.data.row.weight === 0.5 && row.data.row.label === 'strong',
      'a second import keeps the first one\'s value',
    )
  },
}

export default recipeCase
