import {
  setStyleDefaults,
  type StyleDefaults,
} from '../../recipes/style/set-style-defaults'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'style/set-style-defaults',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const oldFill = apis.visualStyle.getDefault(networkId, 'nodeBackgroundColor')
    if (!oldFill.success) return check(false, 'the old fill is readable')
    const hex = String(oldFill.data.value).toLowerCase()
    const oldRgb = `rgb(${[1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16))
      .join(',')})`

    // The user maps a's fill and gives b a width bypass.
    check(
      apis.visualStyle.createDiscreteMapping(
        networkId,
        'nodeBackgroundColor',
        'name',
        'string',
        { a: '#000000' },
      ).success &&
        apis.visualStyle.setBypass(networkId, 'nodeWidth', [ids.b], 10).success,
      'a mapping and a bypass exist',
    )

    const set = setStyleDefaults(apis, networkId, {
      nodeBackgroundColor: '#ff0000',
      nodeWidth: 50,
      nodeShape: 'ellipse',
    })
    check(set.success, 'the recipe succeeds')
    if (!set.success) return
    check(
      set.data.shadowedByMapping.join() === 'nodeBackgroundColor',
      `the fill is reported as mapped (${set.data.shadowedByMapping.join()})`,
    )
    check(
      JSON.stringify(set.data.bypassed) === JSON.stringify({ nodeWidth: 1 }),
      `one width bypass is reported (${JSON.stringify(set.data.bypassed)})`,
    )
    const width = apis.visualStyle.getDefault(networkId, 'nodeWidth')
    check(width.success && width.data.value === 50, 'the width default is 50')

    // On the canvas: the new width shows where nothing overrides it.
    await ctx.waitFor(
      () => ctx.rendered(ids.c, 'width') === '50px',
      'c is drawn 50 wide',
    )
    check(ctx.rendered(ids.b, 'width') === '10px', 'b keeps its bypass width')
    check(
      ctx.rendered(ids.a, 'background-color') === 'rgb(0,0,0)',
      'a keeps its mapped black',
    )
    // c has no key in the mapping, and still does not turn red: the mapping
    // falls back to the default it copied when it was made.
    check(
      ctx.rendered(ids.c, 'background-color') === oldRgb,
      `c keeps the mapping's own fallback, ${oldRgb}, not the new red`,
    )

    // All or none: a bad value leaves every default as it was.
    const bad = setStyleDefaults(apis, networkId, {
      nodeWidth: 99,
      nodeBackgroundColor: 'red',
    } as unknown as StyleDefaults)
    check(!bad.success, 'a color name is refused')
    const after = apis.visualStyle.getDefault(networkId, 'nodeWidth')
    check(after.success && after.data.value === 50, 'the width is still 50')

    const empty = setStyleDefaults(apis, networkId, {})
    check(
      !empty.success && empty.error.code === 'RECIPE_NO_DEFAULTS',
      'no defaults is refused',
    )
  },
}

export default recipeCase
