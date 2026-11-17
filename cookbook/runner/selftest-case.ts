import type { RecipeCase } from './harness'

/**
 * A case that must fail. `run.mjs --selftest` runs it to prove two things:
 * the runner reports a failed check as a failure, and the cleanup still runs
 * after one, so the fixture network is gone.
 */
const selftestCase: RecipeCase = {
  id: 'selftest/must-fail',
  run: (ctx) => {
    const networkId = ctx.createFixture([['a', 'b']])
    const nodes = ctx.apis.element.getNodeIds(networkId)
    ctx.check(
      nodes.success && nodes.data.nodeIds.length === 3,
      'a network made from one edge has three nodes (it has two)',
    )
  },
}

export default selftestCase
