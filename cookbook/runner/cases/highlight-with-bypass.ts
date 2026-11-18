import { highlightWithBypass } from '../../recipes/style/highlight-with-bypass'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'style/highlight-with-bypass',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const bypass = (vpName: 'nodeBorderWidth' | 'nodeBorderColor', id: string) => {
      const read = apis.visualStyle.getBypass(networkId, vpName, id)
      return read.success ? read.data.value : 'unreadable'
    }

    // The user had already given c a border.
    check(
      apis.visualStyle.setBypass(networkId, 'nodeBorderWidth', [ids.c], 3)
        .success,
      'c has a width bypass of 3',
    )

    const targets = [ids.b, ids.c]
    const highlight = highlightWithBypass(apis, networkId, targets, {
      color: '#ff0000',
      width: 6,
    })
    // The caller reuses its array: clear() must not follow it.
    targets[0] = ids.a
    check(highlight.success, 'the recipe succeeds')
    if (!highlight.success) return
    check(
      bypass('nodeBorderWidth', ids.b) === 6 &&
        bypass('nodeBorderColor', ids.b) === '#ff0000' &&
        bypass('nodeBorderWidth', ids.c) === 6,
      'b and c are highlighted',
    )
    check(bypass('nodeBorderWidth', ids.a) === undefined, 'a is untouched')
    await ctx.waitFor(
      () => ctx.rendered(ids.b, 'border-width') === '6px',
      'b is drawn with a 6px border',
    )

    const cleared = highlight.data.clear()
    check(cleared.success, 'clear() succeeds')
    check(
      bypass('nodeBorderWidth', ids.b) === undefined &&
        bypass('nodeBorderColor', ids.b) === undefined,
      'b has no bypass again',
    )
    check(
      bypass('nodeBorderWidth', ids.c) === 3 &&
        bypass('nodeBorderColor', ids.c) === undefined,
      'c has its own width of 3 again',
    )

    // A second clear() leaves a bypass set after the first one alone.
    check(
      apis.visualStyle.setBypass(networkId, 'nodeBorderWidth', [ids.b], 4)
        .success,
      'the user gives b a width of 4',
    )
    check(
      highlight.data.clear().success && bypass('nodeBorderWidth', ids.b) === 4,
      'a second clear() changes nothing',
    )

    const empty = highlightWithBypass(apis, networkId, [])
    check(
      !empty.success && empty.error.code === 'RECIPE_NO_NODES',
      'no nodes is refused',
    )
    const unknown = highlightWithBypass(apis, networkId, [ids.a, 'no-such'])
    check(!unknown.success, 'an unknown id fails')
    check(
      bypass('nodeBorderWidth', ids.a) === undefined,
      'and sets nothing: all or none',
    )
  },
}

export default recipeCase
