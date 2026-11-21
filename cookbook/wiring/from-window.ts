/**
 * Call site 4 of 4: `window.CyWebApi`, from code that is not an app.
 *
 * Use it from a script on the page, a bookmarklet or a test. Two limits:
 *
 * - **Wait for `whenReady()`.** `window.CyWebApi` exists before the host has
 *   finished starting, and its methods may not work until then.
 * - **Host-wide domains only.** `window.CyWebApi` has no `resource`, `dialog`
 *   or `appData`. Its `contextMenu`, `nodeGraphics` and `panel` belong to no
 *   app: what they register is not removed when an app is disabled. Never
 *   pass it to a recipe that takes `Pick<AppContextApis, …>`.
 */
import type { ApiResult } from 'cyweb/ApiTypes'

import {
  addNodesToNetwork,
  type AddedElements,
} from '../recipes/elements/add-nodes-to-network'

export async function addChainFromPage(): Promise<ApiResult<AddedElements>> {
  const api = await window.CyWebApi.whenReady()

  const current = api.workspace.getCurrentNetworkId()
  if (!current.success) return current

  return addNodesToNetwork(
    api,
    current.data.networkId,
    [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    [
      [0, 1],
      [1, 2],
    ],
  )
}
