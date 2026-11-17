/**
 * @recipe Open the app’s own panel
 * @aliases show my panel
 * @apis panel.open
 * @related elements/add-node
 *
 * ## When to use
 *
 * Fixture text.
 *
 * ## Preconditions
 *
 * Fixture text.
 *
 * ## Side effects
 *
 * Fixture text.
 *
 * ## Pitfalls
 *
 * Fixture text.
 *
 * ## Don't
 *
 * Fixture text.
 *
 * ## Wiring
 *
 * Fixture text.
 */
import type { ApiResult, CyWebApiType } from 'cyweb/ApiTypes'

export function openPanel(
  apis: Pick<CyWebApiType, 'panel'>,
  tabId: string,
): ApiResult<unknown> {
  return apis.panel.open('right', tabId)
}
