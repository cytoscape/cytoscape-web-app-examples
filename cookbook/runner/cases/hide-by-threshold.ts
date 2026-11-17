import { hideByThreshold } from '../../recipes/style/hide-by-threshold'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'style/hide-by-threshold',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const edges = apis.element.getEdges(networkId)
    if (!edges.success) return check(false, 'the fixture edges are readable')
    const edgeOf = (a: string, b: string): string =>
      edges.data.edges.find(
        (e) => e.sourceId === ids[a] && e.targetId === ids[b],
      )?.id ?? ''
    const hidden = (vpName: 'nodeVisibility' | 'edgeVisibility'): string => {
      const read = apis.visualStyle.getBypasses(networkId, vpName)
      return read.success ? Object.keys(read.data.bypasses).sort().join() : '?'
    }

    check(
      apis.table.createColumn(networkId, 'node', 'score', 'double', 1).success &&
        apis.table.setValue(networkId, 'node', ids.b, 'score', 0.1).success,
      'b scores 0.1, the others 1',
    )
    // The user had already hidden d, and shown b on purpose.
    check(
      apis.visualStyle.setBypass(networkId, 'nodeVisibility', [ids.d], 'none')
        .success &&
        apis.visualStyle.setBypass(networkId, 'nodeVisibility', [ids.b], 'element')
          .success,
      "d is hidden by the user, and b has an 'element' bypass",
    )
    const visibility = (id: string): unknown => {
      const read = apis.visualStyle.getBypass(networkId, 'nodeVisibility', id)
      return read.success ? read.data.value : 'unreadable'
    }
    const late = apis.element.createNode(networkId, [0, 0], {
      autoSelect: false,
    })
    if (!late.success) return check(false, 'a node with no score is added')

    const result = hideByThreshold(apis, networkId, 'score', 0.5)
    check(result.success, 'the recipe succeeds')
    if (!result.success) return
    check(
      result.data.nodeIds.join() === ids.b,
      "only b is hidden: its 'element' bypass does not count as hidden",
    )
    check(visibility(ids.b) === 'none', "b's bypass is now 'none'")
    check(
      [...result.data.edgeIds].sort().join() ===
        [edgeOf('a', 'b'), edgeOf('b', 'c')].sort().join(),
      "b's two edges are hidden with it",
    )
    check(
      hidden('nodeVisibility') === [ids.b, ids.d].sort().join(),
      'b and d have a visibility bypass; the late node, with no score, none',
    )
    await ctx.waitFor(
      () => ctx.rendered(ids.b, 'display') === 'none',
      'b is not drawn',
    )

    // A selection change from code. On 1.1.0 the renderer shows every
    // element again, while the style still hides b; 1.1.1 fixed that.
    check(
      apis.selection.exclusiveSelect(networkId, [ids.a], []).success,
      'a is selected from code',
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
    const shownAgain = ctx.host.version === '1.1.0'
    check(
      ctx.rendered(ids.b, 'display') === (shownAgain ? 'element' : 'none'),
      shownAgain
        ? 'on 1.1.0 the hidden node is drawn again after a selection change'
        : 'from 1.1.1 the hidden node stays hidden after a selection change',
    )
    check(hidden('nodeVisibility').includes(ids.b), 'the bypass is still set')

    const shown = result.data.show()
    check(shown.success, 'show() succeeds')
    check(visibility(ids.b) === 'element', "b has its 'element' bypass back")
    check(visibility(ids.d) === 'none', "the user's d stays hidden")
    check(
      hidden('nodeVisibility') === [ids.b, ids.d].sort().join(),
      'no other node has a bypass',
    )
    check(hidden('edgeVisibility') === '', 'no edge stays hidden')

    // A second show() leaves what the user did since alone.
    check(
      apis.visualStyle.setBypass(networkId, 'nodeVisibility', [ids.b], 'none')
        .success,
      'the user hides b',
    )
    check(
      result.data.show().success && visibility(ids.b) === 'none',
      'a second show() changes nothing',
    )
    check(
      apis.visualStyle.setBypass(networkId, 'nodeVisibility', [ids.b], 'element')
        .success,
      "b is given its 'element' bypass again",
    )

    const withMissing = hideByThreshold(apis, networkId, 'score', 0.5, {
      hideMissing: true,
    })
    check(
      withMissing.success &&
        [...withMissing.data.nodeIds].sort().join() ===
          [ids.b, late.data.nodeId].sort().join(),
      'hideMissing hides the node with no score too',
    )
    if (withMissing.success) withMissing.data.show()

    check(
      apis.table.createColumn(networkId, 'node', 'kind', 'string', '').success,
      'a text column exists',
    )
    const text = hideByThreshold(apis, networkId, 'kind', 1)
    check(
      !text.success && text.error.code === 'RECIPE_COLUMN_NOT_NUMERIC',
      'a text column is refused',
    )
  },
}

export default recipeCase
