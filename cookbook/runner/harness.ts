/**
 * The part of the runner that runs inside the host page.
 *
 * `run.mjs` bundles this file with every case, injects the bundle into a
 * running Cytoscape Web, and calls `window.__cookbookRunner.run(id, host)`
 * once per case. A case gets the anonymous `window.CyWebApi`, which is enough
 * for host-wide recipes. Owner-bound recipes run in the verification app.
 */
import type { CyWebApiType, IdType } from 'cyweb/ApiTypes'

export interface CaseContext {
  apis: CyWebApiType
  /** The host under test. Branch on it only for a difference a header states. */
  host: { version: string }
  /**
   * Create an isolated network from an edge list of node names. It becomes
   * the current network, and it is deleted when the case ends, pass or fail.
   */
  createFixture: (edgeList: Array<[string, string]>) => IdType
  /** Map each node's `name` to its id. */
  nodeIdsByName: (networkId: IdType) => Record<string, IdType>
  /** Run `undo` when the case ends, pass or fail. Last registered runs first. */
  onCleanup: (undo: () => void) => void
  /** Fail the case with `what` unless `condition` holds. */
  check: (condition: boolean, what: string) => void
  /** Wait until `condition` holds, or fail the case with `what`. */
  waitFor: (condition: () => boolean, what: string) => Promise<void>
}

export interface RecipeCase {
  /** The recipe's id: `<category>/<file name without extension>`. */
  id: string
  run: (ctx: CaseContext) => void | Promise<void>
}

export interface CaseOutcome {
  id: string
  pass: boolean
  /** Empty on a pass. */
  message: string
  /** Cleanup steps that threw. A case with any of these does not pass. */
  cleanupErrors: string[]
}

export interface CookbookRunner {
  ids: string[]
  run: (id: string, host: { version: string }) => Promise<CaseOutcome>
}

declare global {
  interface Window {
    __cookbookRunner?: CookbookRunner
  }
}

const WAIT_LIMIT_MS = 5000
const WAIT_STEP_MS = 25

class CaseFailure extends Error {}

const describe = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause)

const runCase = async (
  recipeCase: RecipeCase,
  host: { version: string },
): Promise<CaseOutcome> => {
  const apis = window.CyWebApi
  const cleanups: Array<() => void> = []
  let fixtureCount = 0

  const check = (condition: boolean, what: string): void => {
    if (!condition) throw new CaseFailure(what)
  }

  const ctx: CaseContext = {
    apis,
    host,
    check,
    onCleanup: (undo) => {
      cleanups.push(undo)
    },
    createFixture: (edgeList) => {
      fixtureCount += 1
      const created = apis.network.createNetworkFromEdgeList({
        name: `cookbook-fixture ${recipeCase.id} ${fixtureCount}`,
        edgeList,
      })
      if (!created.success) {
        throw new CaseFailure(`fixture: ${created.error.message}`)
      }
      const { networkId } = created.data
      cleanups.push(() => {
        // A case may delete its own fixture. One that is gone needs nothing;
        // run.mjs still fails the run on any network left behind.
        const present = apis.workspace.getNetworkIds()
        if (present.success && !present.data.networkIds.includes(networkId)) {
          return
        }
        const deleted = apis.network.deleteNetwork(networkId)
        if (!deleted.success) throw new Error(deleted.error.message)
      })
      return networkId
    },
    nodeIdsByName: (networkId) => {
      const table = apis.table.getTable(networkId, 'node', {
        columns: ['name'],
      })
      if (!table.success) {
        throw new CaseFailure(`node table: ${table.error.message}`)
      }
      const ids: Record<string, IdType> = {}
      for (const row of table.data.rows) {
        ids[String(row.name)] = String(row.id)
      }
      return ids
    },
    waitFor: async (condition, what) => {
      const deadline = Date.now() + WAIT_LIMIT_MS
      while (!condition()) {
        if (Date.now() > deadline) throw new CaseFailure(`timed out: ${what}`)
        await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS))
      }
    },
  }

  let message = ''
  try {
    await recipeCase.run(ctx)
  } catch (cause) {
    message = describe(cause)
    if (!(cause instanceof CaseFailure)) message = `threw: ${message}`
  }

  // Always, pass or fail: the next run must find nothing left behind.
  const cleanupErrors: string[] = []
  for (const undo of cleanups.reverse()) {
    try {
      undo()
    } catch (cause) {
      cleanupErrors.push(describe(cause))
    }
  }

  return {
    id: recipeCase.id,
    pass: message === '' && cleanupErrors.length === 0,
    message,
    cleanupErrors,
  }
}

export const installRunner = (cases: RecipeCase[]): void => {
  window.__cookbookRunner = {
    ids: cases.map((c) => c.id),
    run: async (id, host) => {
      const recipeCase = cases.find((c) => c.id === id)
      if (recipeCase === undefined) {
        return {
          id,
          pass: false,
          message: `no case named ${id} in the bundle`,
          cleanupErrors: [],
        }
      }
      return await runCase(recipeCase, host)
    },
  }
}
