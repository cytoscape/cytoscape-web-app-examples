/**
 * The verification app's half of the harness: where its cases find the app's
 * own API object.
 *
 * `mount()` assigns `harness.apis` from `context.apis`, once, and nothing
 * else writes it (the generator checks both). A case in `../cases` passes
 * `harness.apis` to an owner-bound recipe, the one form the `apis-source`
 * check accepts here besides the three a real app uses.
 *
 * The cast is the price of a field that exists only after `mount()`: the
 * runner runs these cases only once the app is active, so a case never reads
 * it before then.
 */
import type { AppContextApis } from 'cyweb/ApiTypes'

interface AppHarness {
  apis: AppContextApis
}

export const harness = {} as AppHarness
