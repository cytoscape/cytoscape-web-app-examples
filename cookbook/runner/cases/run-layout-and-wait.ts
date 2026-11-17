import { runLayoutAndWait } from '../../recipes/layout/run-layout-and-wait'
import type { RecipeCase } from '../harness'

const recipeCase: RecipeCase = {
  id: 'layout/run-layout-and-wait',
  run: async (ctx) => {
    const { apis, check } = ctx
    const networkId = ctx.createFixture([
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ])
    // How far apart the nodes are, along either axis.
    const spread = (id: string): number => {
      const read = apis.viewport.getNodePositions(id)
      if (!read.success) return -1
      const points = Object.values(read.data.positions)
      const extent = (axis: 0 | 1): number => {
        const values = points.map((p) => p[axis])
        return values.length === 0 ? 0 : Math.max(...values) - Math.min(...values)
      }
      return Math.max(extent(0), extent(1))
    }
    check(spread(networkId) === 0, 'a new network starts with every node at 0')

    const layouts = apis.layout.getAvailableLayouts()
    if (!layouts.success) return check(false, 'layouts are listed')
    const grid = layouts.data.layouts.find((l) =>
      l.algorithmName.toLowerCase().includes('grid'),
    )
    if (grid === undefined) return check(false, 'the host has a grid layout')

    // Every layout event, with its network: the order for the fixture, and
    // none at all for a call that fails.
    const seen: Array<{ type: string; networkId: string }> = []
    const onStarted = (e: WindowEventMap['layout:started']): void => {
      seen.push({ type: 'started', networkId: e.detail.networkId })
    }
    const onCompleted = (e: WindowEventMap['layout:completed']): void => {
      seen.push({ type: 'completed', networkId: e.detail.networkId })
    }
    const events = (id: string): string[] =>
      seen.filter((e) => e.networkId === id).map((e) => e.type)
    window.addEventListener('layout:started', onStarted)
    window.addEventListener('layout:completed', onCompleted)
    ctx.onCleanup(() => {
      window.removeEventListener('layout:started', onStarted)
      window.removeEventListener('layout:completed', onCompleted)
    })

    const laidOut = await runLayoutAndWait(apis, networkId, {
      algorithmName: grid.algorithmName,
    })
    check(laidOut.success, `the recipe succeeds (${JSON.stringify(laidOut)})`)
    check(
      laidOut.success && laidOut.data.stillCurrent,
      'the network is still current',
    )
    check(spread(networkId) > 0, 'the nodes have moved apart')
    check(
      events(networkId).join() === 'started,completed',
      `started, then completed, before the promise resolved (${events(networkId).join()})`,
    )

    // A network that is not current: laid out, not fitted, not current.
    const other = ctx.createFixture([['x', 'y']])
    check(
      apis.workspace.switchCurrentNetwork(networkId).success,
      'the first network is current again',
    )
    const background = await runLayoutAndWait(apis, other, {
      algorithmName: grid.algorithmName,
    })
    check(
      background.success && !background.data.stillCurrent,
      'a background layout succeeds and reports it is not current',
    )
    check(spread(other) > 0, 'its nodes have moved apart')

    const unknown = await runLayoutAndWait(apis, networkId, {
      algorithmName: 'no-such-layout',
    })
    check(
      !unknown.success && unknown.error.code === 'RECIPE_UNKNOWN_LAYOUT',
      'an unknown algorithm is refused',
    )
    const missing = await runLayoutAndWait(apis, 'no-such-network')
    check(
      !missing.success && missing.error.code === 'APP1',
      `an unknown network resolves to the host's failure (${JSON.stringify(missing)})`,
    )
    check(
      events('no-such-network').length === 0 &&
        events(networkId).join() === 'started,completed',
      'a failed call fires no layout event at all',
    )
  },
}

export default recipeCase
