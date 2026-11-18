import type { ApiResult, Cx2, IdType } from 'cyweb/ApiTypes'

import { computeOncePerNetwork } from '../../../recipes/ui/persist-results-per-network'
import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'

interface Scores {
  score: number
  when: Date
  dropped: undefined
  list: number[]
}

/** Whether a CX2 document holds this app's `key` in its `cyAppData` aspect. */
const exported = (cx2: Cx2, appId: string | undefined, key: string): boolean =>
  cx2.some((aspect) => {
    if (!Object.hasOwn(aspect, 'cyAppData')) return false
    const records = (aspect as { cyAppData: unknown }).cyAppData
    return (
      Array.isArray(records) &&
      records.some(
        (record: { appId?: unknown; key?: unknown }) =>
          record.appId === appId && record.key === key,
      )
    )
  })

const recipeCase: RecipeCase = {
  id: 'ui/persist-results-per-network',
  run: (ctx) => {
    const { apis, check } = ctx
    const appId = window.__cookbookApp?.id
    const networkId = ctx.createFixture([['a', 'b']])

    let computed = 0
    const compute = (): ApiResult<Scores> => {
      computed += 1
      return {
        success: true,
        data: { score: 0.5, when: new Date(0), dropped: undefined, list: [1, 2] },
      }
    }
    const inCx2 = (id: IdType, key: string): boolean => {
      const cx2 = apis.export.exportToCx2(id)
      if (!cx2.success) {
        check(false, `the network exports: ${cx2.error.message}`)
        return false
      }
      return exported(cx2.data, appId, key)
    }

    const first = computeOncePerNetwork(harness.apis, networkId, 'scores', compute)
    if (!first.success) return check(false, `first call: ${first.error.message}`)
    check(!first.data.cached && computed === 1, 'the first call computes')
    // The stored form, the first time too: JSON's.
    const stored = first.data.value as unknown as Record<string, unknown>
    check(
      stored.when === '1970-01-01T00:00:00.000Z',
      `a Date comes back as text (${String(stored.when)})`,
    )
    check(!Object.hasOwn(stored, 'dropped'), 'an undefined field is gone')

    const second = computeOncePerNetwork(harness.apis, networkId, 'scores', compute)
    if (!second.success) return check(false, 'the second call succeeds')
    check(second.data.cached && computed === 1, 'the second call reads the store')
    second.data.value.list.push(3)
    check(second.data.value.list.length === 3, 'the returned copy can be changed')

    const raw = harness.apis.appData.get(networkId, 'scores')
    if (!raw.success) return check(false, 'appData.get reads the result')
    const value = raw.data.value as { list: number[] }
    check(
      Object.isFrozen(value) && Object.isFrozen(value.list),
      'what the store returns is deeply frozen',
    )
    check(value.list.length === 2, 'changing the copy did not change the store')

    const refreshed = computeOncePerNetwork(
      harness.apis, networkId, 'scores', compute, { refresh: true },
    )
    check(
      refreshed.success && !refreshed.data.cached && computed === 2,
      'refresh computes again',
    )

    // Local by default; in the CX2 only when shared, and moved back after.
    check(!inCx2(networkId, 'scores'), 'a local result is not in the CX2')
    check(
      computeOncePerNetwork(harness.apis, networkId, 'scores', compute, {
        share: true,
        refresh: true,
      }).success && inCx2(networkId, 'scores'),
      'a shared result is in the cyAppData aspect',
    )
    check(
      computeOncePerNetwork(harness.apis, networkId, 'scores', compute, {
        refresh: true,
      }).success && !inCx2(networkId, 'scores'),
      'stored locally again, it leaves the aspect',
    )
    const back = harness.apis.appData.get(networkId, 'scores')
    check(back.success, 'and is still stored, locally')

    // A failure stores nothing.
    const failing = computeOncePerNetwork(harness.apis, networkId, 'none', () => ({
      success: false,
      error: { code: 'RECIPE_CASE', severity: 'error', message: 'no result' },
    }))
    check(
      !failing.success && failing.error.code === 'RECIPE_CASE',
      "compute's failure is returned",
    )
    const none = harness.apis.appData.get(networkId, 'none')
    check(!none.success && none.error.code === 'APP11', 'nothing was stored')
    const big = computeOncePerNetwork(harness.apis, networkId, 'big', () => ({
      success: true,
      data: { n: 10n },
    }))
    check(!big.success && big.error.code === 'APP12', 'a BigInt is refused (APP12)')

    // Per network; deleting the network deletes its results.
    const other = ctx.createFixture([['x', 'y']])
    const elsewhere = computeOncePerNetwork(harness.apis, other, 'scores', compute)
    check(
      elsewhere.success && !elsewhere.data.cached,
      'another network has its own results',
    )
    check(apis.network.deleteNetwork(other).success, 'the other network is deleted')
    const gone = harness.apis.appData.get(other, 'scores')
    check(
      !gone.success && gone.error.code === 'APP11',
      "a deleted network's results are gone",
    )
  },
}

export default recipeCase
