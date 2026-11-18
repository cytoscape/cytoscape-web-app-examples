import type { IdType, PositionRecord } from 'cyweb/ApiTypes'

import { registerGridLayout } from '../../../recipes/layout/register-app-layout'
import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'

const LAYOUT_ID = 'cookbook-grid'
const SPACING = 50

/** A grid of `count` places from (left, top), as sorted "x,y" strings. */
const grid = (left: number, top: number, count: number): string => {
  const columns = Math.ceil(Math.sqrt(count))
  return Array.from({ length: count }, (_, i) =>
    `${left + (i % columns) * SPACING},${top + Math.floor(i / columns) * SPACING}`,
  )
    .sort()
    .join(' ')
}

const recipeCase: RecipeCase = {
  id: 'layout/register-app-layout',
  run: async (ctx) => {
    const { apis, check } = ctx
    const registered = registerGridLayout(harness.apis, {
      id: LAYOUT_ID,
      displayName: 'Cookbook grid',
      spacing: SPACING,
    })
    check(registered.success, 'the layout is registered')
    ctx.onCleanup(() => {
      const removed = harness.apis.resource.unregisterLayout(LAYOUT_ID)
      if (!removed.success) throw new Error(removed.error.message)
    })

    const appId = window.__cookbookApp?.id
    const listed = apis.layout.getAvailableLayouts()
    if (!listed.success) return check(false, 'the layouts can be listed')
    const info = listed.data.layouts.find(
      (layout) => layout.appId === appId && layout.displayName === 'Cookbook grid',
    )
    if (info === undefined) return check(false, 'the layout is listed with the app id')
    check(
      info.algorithmName === `${appId}::${LAYOUT_ID}`,
      `the algorithm is named <appId>::<id> (${info.algorithmName})`,
    )

    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'e'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const start: PositionRecord = {
      [ids.a]: [100, 200],
      [ids.b]: [300, 400],
      [ids.c]: [500, 600],
      [ids.d]: [-50, 10],
      [ids.e]: [0, 0],
    }
    check(
      apis.viewport.updateNodePositions(networkId, start).success,
      'the nodes are placed apart',
    )
    const where = (nodes: IdType[]): string => {
      const read = apis.viewport.getNodePositions(networkId, nodes)
      if (!read.success) return '?'
      return nodes
        .map((id) => read.data.positions[id])
        .map((p) => (p === undefined ? '?' : `${p[0]},${p[1]}`))
        .sort()
        .join(' ')
    }
    const layOut = async (): Promise<void> => {
      const ran = await apis.layout.applyLayout(networkId, {
        algorithmName: info.algorithmName,
        fitAfterLayout: false,
      })
      check(ran.success, `the layout runs${ran.success ? '' : `: ${ran.error.message}`}`)
    }

    // Three selected nodes: a grid of two columns from their top-left,
    // (-50, 10). The others stay where they were.
    check(
      apis.selection.exclusiveSelect(networkId, [ids.b, ids.c, ids.d], []).success,
      'b, c and d are selected',
    )
    await layOut()
    check(
      where([ids.b, ids.c, ids.d]) === grid(-50, 10, 3),
      `the selected nodes form a grid (${where([ids.b, ids.c, ids.d])})`,
    )
    check(
      where([ids.a, ids.e]) === '0,0 100,200',
      `the other nodes did not move (${where([ids.a, ids.e])})`,
    )

    // Nothing selected: every node, from the top-left of all of them.
    check(
      apis.selection.exclusiveSelect(networkId, [], []).success,
      'the selection is cleared',
    )
    await layOut()
    const all = [ids.a, ids.b, ids.c, ids.d, ids.e]
    check(
      where(all) === grid(-50, 0, 5),
      `with nothing selected, every node is laid out (${where(all)})`,
    )

    // Unregistered, it is gone from the list.
    check(
      harness.apis.resource.unregisterLayout(LAYOUT_ID).success,
      'the layout is unregistered',
    )
    const after = apis.layout.getAvailableLayouts()
    check(
      after.success &&
        !after.data.layouts.some((layout) => layout.algorithmName === info.algorithmName),
      'an unregistered layout is not listed',
    )
    check(
      registerGridLayout(harness.apis, {
        id: LAYOUT_ID,
        displayName: 'Cookbook grid',
        spacing: SPACING,
      }).success,
      'registered again, for the cleanup to remove',
    )
  },
}

export default recipeCase
