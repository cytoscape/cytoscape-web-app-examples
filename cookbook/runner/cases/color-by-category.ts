import { colorByCategory } from '../../recipes/style/color-by-category'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'style/color-by-category',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const defaultFill = apis.visualStyle.getDefault(
      networkId,
      'nodeBackgroundColor',
    )

    check(
      apis.table.createColumn(networkId, 'node', 'kind', 'string', '').success &&
        apis.table.setValues(networkId, 'node', [
          { id: ids.a, column: 'kind', value: 'tf' },
          { id: ids.b, column: 'kind', value: 'kinase' },
          { id: ids.c, column: 'kind', value: 'kinase' },
        ]).success,
      'a kind column is written; d has none',
    )
    const colored = colorByCategory(apis, networkId, 'kind')
    check(colored.success, 'the recipe succeeds')
    if (!colored.success) return
    check(
      JSON.stringify(colored.data.colors) ===
        JSON.stringify({ kinase: '#e69f00', tf: '#56b4e9' }),
      `sorted values get the first colors (${JSON.stringify(colored.data.colors)})`,
    )
    const mapping = apis.visualStyle.getMapping(networkId, 'nodeBackgroundColor')
    check(
      mapping.success && mapping.data.mapping?.type === 'discrete' &&
        mapping.data.mapping.attribute === 'kind',
      'the fill is a discrete mapping from kind',
    )
    await ctx.waitFor(
      () => ctx.rendered(ids.b, 'background-color') === 'rgb(230,159,0)',
      'a kinase is drawn orange',
    )
    check(
      ctx.rendered(ids.a, 'background-color') === 'rgb(86,180,233)',
      'a tf is drawn sky blue',
    )

    // Whole numbers: the host turns the text keys back into numbers.
    check(
      apis.table.createColumn(networkId, 'node', 'group', 'long', 0).success &&
        apis.table.setValue(networkId, 'node', ids.d, 'group', 7).success,
      'a group column is written',
    )
    const byGroup = colorByCategory(apis, networkId, 'group')
    check(
      byGroup.success &&
        JSON.stringify(byGroup.data.colors) ===
          JSON.stringify({ 0: '#e69f00', 7: '#56b4e9' }),
      'groups 0 and 7 get colors',
    )
    await ctx.waitFor(
      () => ctx.rendered(ids.d, 'background-color') === 'rgb(86,180,233)',
      'group 7 is drawn sky blue: numeric keys match',
    )

    // A category is data: "__proto__" is a value like any other.
    check(
      apis.table.setValue(networkId, 'node', ids.d, 'kind', '__proto__').success,
      'd is of kind __proto__',
    )
    const odd = colorByCategory(apis, networkId, 'kind')
    check(
      odd.success &&
        Object.keys(odd.data.colors).join() === '__proto__,kinase,tf' &&
        odd.data.uncolored.length === 0,
      `__proto__ gets a color like the others (${odd.success ? Object.keys(odd.data.colors).join() : ''})`,
    )
    await ctx.waitFor(
      () => ctx.rendered(ids.d, 'background-color') === 'rgb(230,159,0)',
      'the __proto__ node is drawn in the first color',
    )

    const short = colorByCategory(apis, networkId, 'kind', ['#000000'])
    check(
      short.success && short.data.uncolored.join() === 'kinase,tf',
      'values past the palette are reported',
    )
    check(
      apis.table.createColumn(networkId, 'node', 'flag', 'boolean', false)
        .success,
      'a boolean column exists',
    )
    const flag = colorByCategory(apis, networkId, 'flag')
    check(
      !flag.success && flag.error.code === 'RECIPE_COLUMN_TYPE',
      'a boolean column is refused',
    )
    check(defaultFill.success, 'the default fill is readable')
  },
}

export default recipeCase
