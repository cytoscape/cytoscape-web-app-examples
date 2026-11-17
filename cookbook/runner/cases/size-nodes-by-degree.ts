import { sizeNodesByDegree } from '../../recipes/style/size-nodes-by-degree'
import type { RecipeCase } from '../harness'

interface ContinuousMapping {
  type: string
  attribute: string
  controlPoints?: Array<{ value: unknown; vpValue: unknown }>
}

const recipeCase: RecipeCase = {
  id: 'style/size-nodes-by-degree',
  run: async (ctx) => {
    const { apis, check } = ctx
    // A star: a has three edges, the others one.
    const star = ctx.createFixture([
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'd'],
    ])
    const ids = ctx.nodeIdsByName(star)

    const sized = sizeNodesByDegree(apis, star)
    check(sized.success, 'the recipe succeeds')
    if (!sized.success) return
    check(sized.data.min === 1 && sized.data.max === 3, 'degrees 1 to 3')

    for (const vpName of ['nodeWidth', 'nodeHeight'] as const) {
      const read = apis.visualStyle.getMapping(star, vpName)
      const mapping = (read.success ? read.data.mapping : undefined) as
        | ContinuousMapping
        | undefined
      const points = mapping?.controlPoints ?? []
      check(
        mapping?.type === 'continuous' && mapping.attribute === 'degree',
        `${vpName} is mapped from degree`,
      )
      check(
        points[0]?.value === 1 && points[0]?.vpValue === 20 &&
          points[1]?.value === 3 && points[1]?.vpValue === 80,
        `${vpName} runs from 20 at 1 to 80 at 3`,
      )
    }
    await ctx.waitFor(
      () => ctx.rendered(ids.a, 'width') === '80px',
      'the hub is drawn 80 wide',
    )
    check(ctx.rendered(ids.b, 'height') === '20px', 'a leaf is drawn 20 high')

    // A ring: every degree is 2. Refused before writing anything.
    const ring = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'a'],
    ])
    const flat = sizeNodesByDegree(apis, ring)
    check(
      !flat.success && flat.error.code === 'RECIPE_SINGLE_VALUE',
      'equal degrees are refused',
    )
    const ringColumns = apis.table.getColumns(ring, 'node')
    check(
      ringColumns.success &&
        !ringColumns.data.columns.some((c) => c.name === 'degree'),
      'the refusal writes no column',
    )

    // A network with a Degree column and no degree column. (Adding Degree
    // next to degree would itself fail on 1.1.1, which compares ignoring case.)
    const path = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
    ])
    check(
      apis.table.createColumn(path, 'node', 'Degree', 'integer', 0).success,
      'a Degree column exists',
    )
    const clash = sizeNodesByDegree(apis, path, { column: 'degree' })
    check(
      !clash.success && clash.error.code === 'RECIPE_NAME_CLASH',
      'degree next to Degree is refused',
    )
  },
}

export default recipeCase
