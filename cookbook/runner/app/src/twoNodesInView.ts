import type { IdType } from 'cyweb/ApiTypes'

import type { CaseContext } from '../../harness'

const FIT_LIMIT_MS = 5000

/**
 * A fixture of two nodes, apart and in view, so that a right-click hits one
 * of them. Returns the network's id and each node's id by name.
 */
export const twoNodesInView = async (
  ctx: CaseContext,
  first: string,
  second: string,
): Promise<{ networkId: IdType } & Record<string, IdType>> => {
  const networkId = ctx.createFixture([[first, second]])
  const ids = ctx.nodeIdsByName(networkId)
  ctx.check(
    ctx.apis.viewport.updateNodePositions(networkId, {
      [ids[first]]: [0, 0],
      [ids[second]]: [300, 0],
    }).success,
    'the nodes are placed apart',
  )
  // The renderer offers `fit` for a network once it has drawn it, a moment
  // after the network is created. Until then, fit fails with APP5.
  const deadline = Date.now() + FIT_LIMIT_MS
  for (;;) {
    const fitted = await ctx.apis.viewport.fit(networkId)
    if (fitted.success) break
    ctx.check(
      fitted.error.code === 'APP5' && Date.now() < deadline,
      `the network is fitted to its view: ${fitted.error.message}`,
    )
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return { ...ids, networkId }
}
