import { createNetworkFromTable } from '../../recipes/network/create-network-from-table'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'network/create-network-from-table',
  run: (ctx) => {
    const { apis, check } = ctx
    // Typed as plain records: a literal with a toString key would clash with
    // Object's own method in TypeScript's inference.
    const rows: Array<Record<string, string | number>> = [
      // Only this row has a "toString" cell: the others have none, whatever
      // Object.prototype says.
      { from: 'A', to: 'B', interaction: 'pp', weight: 0.5, toString: 'tag' },
      { from: 'B', to: 'C', interaction: 'pd', weight: 2 },
      { from: 'A', to: 'C', interaction: 'pp' },
      // A second edge between A and B: rows are matched by order, not ends.
      { from: 'A', to: 'B', interaction: 'pd', weight: 1 },
    ]
    const made = createNetworkFromTable(apis, 'cookbook-fixture table', rows, {
      source: 'from',
      target: 'to',
    })
    check(made.success, 'the recipe succeeds')
    if (!made.success) return
    const { networkId, edgeIds, columns } = made.data
    ctx.adopt(networkId)

    check(
      columns.interaction === 'string' && columns.weight === 'double' &&
        columns['toString'] === 'string',
      `interaction and toString are text, weight a double (${JSON.stringify(columns)})`,
    )
    const current = apis.workspace.getCurrentNetworkId()
    check(
      current.success && current.data.networkId === networkId,
      'the new network is current',
    )
    const names = ctx.nodeIdsByName(networkId)
    check(Object.keys(names).sort().join() === 'A,B,C', 'three named nodes')

    // Read every edge back: its ends and its values are the row's.
    const edges = apis.element.getEdges(networkId, edgeIds)
    check(edges.success && edges.data.edges.length === 4, 'four edges')
    if (!edges.success) return
    rows.forEach((row, i) => {
      const edge = edges.data.edges.find((e) => e.id === edgeIds[i])
      const values = apis.table.getRow(networkId, 'edge', edgeIds[i])
      check(
        edge?.sourceId === names[String(row.from)] &&
          edge?.targetId === names[String(row.to)],
        `edge ${i} joins ${row.from} to ${row.to}`,
      )
      check(
        values.success &&
          values.data.row.interaction === row.interaction &&
          values.data.row.weight === row.weight,
        `edge ${i} holds row ${i}'s values (${JSON.stringify(values)})`,
      )
    })

    const firstRow = apis.table.getRow(networkId, 'edge', edgeIds[0])
    const secondRow = apis.table.getRow(networkId, 'edge', edgeIds[1])
    check(
      firstRow.success && firstRow.data.row['toString'] === 'tag' &&
        secondRow.success && !Object.hasOwn(secondRow.data.row, 'toString'),
      'only the first edge has a toString value',
    )

    // Refusals create no network.
    const before = apis.workspace.getNetworkIds()
    const noTarget = createNetworkFromTable(apis, 'x', [{ from: 'A' }], {
      source: 'from',
      target: 'to',
    })
    check(
      !noTarget.success && noTarget.error.code === 'RECIPE_MISSING_ENDPOINT',
      'a row without a target is refused',
    )
    const mixed = createNetworkFromTable(
      apis,
      'x',
      [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 'heavy' },
      ],
      { source: 'from', target: 'to' },
    )
    check(
      !mixed.success && mixed.error.code === 'RECIPE_MIXED_TYPES',
      'a column of numbers and text is refused',
    )
    const byCase = createNetworkFromTable(
      apis,
      'x',
      [{ from: 'A', to: 'B', score: 1, Score: 2 }],
      { source: 'from', target: 'to' },
    )
    check(
      !byCase.success && byCase.error.code === 'RECIPE_COLUMN_NAME',
      'two names that differ only by case are refused',
    )
    const after = apis.workspace.getNetworkIds()
    check(
      before.success &&
        after.success &&
        after.data.networkIds.length === before.data.networkIds.length,
      'a refusal creates no network',
    )
  },
}

export default recipeCase
