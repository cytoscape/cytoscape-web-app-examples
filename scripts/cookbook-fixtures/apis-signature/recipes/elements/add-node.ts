/**
 * @recipe Add one node
 * @aliases add a node
 * @apis element.createNode
 * @related ui/open-panel
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
import type { ApiResult, CyWebApiType, IdType } from 'cyweb/ApiTypes'

export function addNode(
  apis: CyWebApiType,
  networkId: IdType,
): ApiResult<{ nodeId: IdType }> {
  // apis.element.deleteNodes(networkId, []) is a comment, not a call.
  const created = apis.element.createNode(networkId, [0, 0])
  if (!created.success) return created
  return { success: true, data: { nodeId: created.data.nodeId } }
}
