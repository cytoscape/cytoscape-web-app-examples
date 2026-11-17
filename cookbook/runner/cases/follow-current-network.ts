import { followCurrentNetwork } from '../../recipes/events/follow-current-network'
import type { RecipeCase } from '../harness'

/**
 * The steps of the pattern: read at the start, read on a switch, read again
 * on `network:loaded` only for the network being waited for, clear when no
 * network is left, and stop.
 *
 * Every step uses the host's own events except step 3, which dispatches
 * `network:loaded` itself: the host delays a network's data only after a page
 * reload, which a case cannot do without losing the injected bundle.
 */
const recipeCase: RecipeCase = {
  id: 'events/follow-current-network',
  run: async (ctx) => {
    const { apis, check } = ctx
    const first = ctx.createFixture([['a', 'b']])

    const reads: string[] = []
    // While set, `read` reports that this network's data has not arrived.
    let notReady: string | null = null
    const read = (networkId: string): boolean => {
      reads.push(networkId)
      if (networkId === notReady) return false
      return apis.element.getNodeIds(networkId).success
    }

    let nones = 0
    const onNone = (): void => {
      nones += 1
    }

    const following = followCurrentNetwork(apis, read, onNone)
    check(following.success, 'the recipe succeeds')
    if (!following.success) return
    ctx.onCleanup(following.data.stop)

    // 1. The network already on screen is read at once.
    check(
      reads.join(',') === first,
      `the current network is read at the start (got ${reads.join(',')})`,
    )
    check(nones === 0, 'onNone is not called while a network is current')

    // 2. A switch made by the host is read.
    const second = ctx.createFixture([['c', 'd']])
    await ctx.waitFor(
      () => reads.includes(second),
      'the new current network is read after network:switched',
    )

    // 3. A network whose data had not arrived is read again when it loads,
    //    and a load of any other network is ignored.
    notReady = first
    const switched = apis.workspace.switchCurrentNetwork(first)
    check(switched.success, 'the host can switch back to the first network')
    await ctx.waitFor(
      () => reads[reads.length - 1] === first,
      'the switch back is read',
    )
    const beforeLoad = reads.length
    window.dispatchEvent(
      new CustomEvent('network:loaded', { detail: { networkId: second } }),
    )
    check(
      reads.length === beforeLoad,
      'network:loaded for another network is ignored',
    )
    notReady = null
    window.dispatchEvent(
      new CustomEvent('network:loaded', { detail: { networkId: first } }),
    )
    check(
      reads.length === beforeLoad + 1 && reads[reads.length - 1] === first,
      'network:loaded for the awaited network is read again',
    )
    window.dispatchEvent(
      new CustomEvent('network:loaded', { detail: { networkId: first } }),
    )
    check(
      reads.length === beforeLoad + 1,
      'a network that was read is not read again on a later load',
    )

    // 4. When the last network is closed, onNone is called.
    const workspace = apis.workspace.getNetworkIds()
    check(
      workspace.success &&
        [...workspace.data.networkIds].sort().join(',') ===
          [first, second].sort().join(','),
      'the workspace holds only this case’s fixtures',
    )
    check(
      apis.network.deleteNetwork(first).success &&
        apis.network.deleteNetwork(second).success,
      'the host deletes both fixtures',
    )
    await ctx.waitFor(() => nones === 1, 'onNone after the last network closed')
    check(!apis.workspace.getCurrentNetworkId().success, 'no network is current')

    // ... and at the start, when no network is current.
    let startNones = 0
    const fromEmpty = followCurrentNetwork(apis, read, () => {
      startNones += 1
    })
    check(
      fromEmpty.success && startNones === 1,
      'onNone is called at the start when no network is current',
    )
    if (fromEmpty.success) fromEmpty.data.stop()

    // 5. After stop(), nothing is read, and onNone is not called.
    following.data.stop()
    const afterStop = reads.length
    ctx.createFixture([['e', 'f']])
    await new Promise((resolve) => setTimeout(resolve, 300))
    check(reads.length === afterStop, 'nothing is read after stop()')
    check(nones === 1 && startNones === 1, 'onNone is not called after stop()')
  },
}

export default recipeCase
