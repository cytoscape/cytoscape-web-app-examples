/**
 * @recipe Keep an app's results for each network
 * @aliases cache results, save results per network, remember results,
 *   persist analysis results, app data, store results with the network,
 *   compute once
 * @apis appData.get, appData.set
 * @related ui/open-own-panel-after-action, data/add-computed-column
 *
 * ## When to use
 *
 * The app computed something about a network (a score, a clustering, a
 * report) that is not a column, and the user should find it again when they
 * come back to that network, after a reload, or after turning the app off and
 * on. Optionally, the result travels with the network when it is shared.
 *
 * ## Preconditions
 *
 * - `apis` is the app's own object.
 * - The network is in the workspace.
 * - The result is plain data that survives a JSON round trip: no `Map`,
 *   `Set`, `Date`, class instance or `BigInt`.
 *
 * ## Side effects
 *
 * - Without `share`, the result is stored in this browser only, keyed to the
 *   network's id. It is in no export and no NDEx save.
 * - With `share: true`, it is stored in the network's `cyAppData` aspect: it
 *   is in every CX2 export and NDEx save, and the network is marked modified.
 *   Storing a key with the other `share` moves it; it is never in both.
 * - Records no undo entry. Deleting the network deletes its results. Turning
 *   the app off does not.
 * - If `compute` fails, or the store refuses its result, nothing is stored.
 *
 * ## Pitfalls
 *
 * - **What the store returns is frozen**, deeply: writing to it throws a
 *   `TypeError`. The recipe returns a copy (`structuredClone`) the caller may
 *   change; the stored value stays as it was until `set` again.
 * - **The store keeps what JSON keeps.** A value is stored as its JSON round
 *   trip: an `undefined` field disappears, a `Date` comes back as a string.
 *   The recipe always returns the stored form, the first time too, so a
 *   cached and a fresh result look the same. A `BigInt` or a cycle is refused
 *   (`APP12`); a value over the size limit too (`APP13`).
 * - **A cached result can be stale.** The store does not know when the
 *   network changes. Pass `refresh: true` after the user edits it, or put a
 *   fingerprint (a node count, an edge count) in the key.
 * - **Keys are this app's own,** per network: another app cannot read or
 *   overwrite them, and they need no app prefix.
 * - **Nothing stored is `APP11`**, which is not an error here: the recipe
 *   computes. Any other failure is returned as it is.
 * - Persistence topics: local by default and in CX2 only with `share`, and
 *   frozen reads, are covered above.
 *
 * ## Don't
 *
 * - Don't keep per-network results in `localStorage` or a module variable:
 *   they would outlive the network, or be lost on reload.
 * - Don't share a cache that can be recomputed. `share` puts it in every
 *   copy of the network the user sends to anyone.
 * - Don't write into the value `appData.get` returns.
 *
 * ## Wiring
 *
 * Owner-bound: `apis` must be the app's own object: the `onClick` parameter
 * of an `'apps-menu'` entry (`wiring/from-apps-menu.ts`), `useAppContext()?.apis`
 * in a component (`wiring/from-panel.tsx`), or `context.apis` in `mount()`.
 */
import type { ApiResult, AppContextApis, IdType } from 'cyweb/ApiTypes'

export interface PersistOptions {
  /** Store in the network's `cyAppData` aspect, which travels with it. */
  share?: boolean
  /** Compute and store again, even if a result is stored. */
  refresh?: boolean
}

export interface PersistedResult<T> {
  /** A copy of the stored value: the caller may change it. */
  value: T
  /** Whether it came from the store rather than from `compute`. */
  cached: boolean
}

/** The stored value, as a copy the caller may write to. */
function readBack<T>(
  apis: Pick<AppContextApis, 'appData'>,
  networkId: IdType,
  key: string,
): ApiResult<T> {
  const stored = apis.appData.get(networkId, key)
  if (!stored.success) return stored
  return { success: true, data: structuredClone(stored.data.value) as T }
}

export function computeOncePerNetwork<T>(
  apis: Pick<AppContextApis, 'appData'>,
  networkId: IdType,
  key: string,
  compute: () => ApiResult<T>,
  options: PersistOptions = {},
): ApiResult<PersistedResult<T>> {
  if (options.refresh !== true) {
    const cached = readBack<T>(apis, networkId, key)
    if (cached.success) {
      return { success: true, data: { value: cached.data, cached: true } }
    }
    // APP11: nothing stored yet. Anything else is a real failure.
    if (cached.error.code !== 'APP11') return cached
  }

  const computed = compute()
  if (!computed.success) return computed
  const stored = apis.appData.set(networkId, key, computed.data, {
    export: options.share === true,
  })
  if (!stored.success) return stored

  // The stored form, not the caller's object: see Pitfalls.
  const fresh = readBack<T>(apis, networkId, key)
  if (!fresh.success) return fresh
  return { success: true, data: { value: fresh.data, cached: false } }
}
