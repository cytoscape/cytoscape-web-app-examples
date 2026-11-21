/**
 * The part of the runner that runs inside the host page.
 *
 * `run.mjs` bundles this file with the cases of `runner/cases`, injects the
 * bundle into a running Cytoscape Web, and calls
 * `window.__cookbookRunner.run(id, host)` once per case.
 *
 * The cases of owner-bound and component recipes live in the verification
 * app (`runner/app`), which publishes them on `window.__cookbookApp` when it
 * mounts. They run here too, with the same context: `ctx.apis` is the
 * anonymous `window.CyWebApi`, and the app's own API object reaches those
 * cases through the app's `harness.apis`, never through `ctx`.
 */
import type { CyWebApiType, IdType } from 'cyweb/ApiTypes'

/**
 * What a user does, done by the runner with real mouse and keyboard events
 * (Playwright). Selectors are Playwright's: `text="Apps"`,
 * `[data-testid="…"]`, `role=menuitem[name="…"]`. Each action waits for its
 * target, and fails the case if it does not appear.
 */
export interface CaseUi {
  click: (selector: string) => Promise<void>
  fill: (selector: string, text: string) => Promise<void>
  press: (key: string) => Promise<void>
  /** Whether `selector` names a visible element now. Does not wait. */
  visible: (selector: string) => Promise<boolean>
  /** Wait until `selector` names a visible element, or none. */
  waitFor: (selector: string, state: 'visible' | 'hidden') => Promise<void>
  /** Open the host's context menu on a node of the current network. */
  rightClickNode: (nodeId: IdType) => Promise<void>
  /**
   * Click, and return the address of the window the click opened, or null
   * when none opens within two seconds. The window is closed again. The
   * runner answers `https://cookbook.invalid/` itself: nothing leaves the
   * machine.
   */
  clickForPopup: (selector: string) => Promise<string | null>
  /** Turn an app on or off with its switch in Apps ▸ Manage Apps.... */
  setAppEnabled: (appId: string, enabled: boolean) => Promise<void>
}

export interface CaseContext {
  apis: CyWebApiType
  /** The host under test. Branch on it only for a difference a header states. */
  host: { version: string }
  /**
   * Create an isolated network from an edge list of node names. It becomes
   * the current network, and it is deleted when the case ends, pass or fail.
   */
  createFixture: (edgeList: Array<[string, string]>) => IdType
  /**
   * Delete a network the recipe created when the case ends, pass or fail, as
   * for a fixture.
   */
  adopt: (networkId: IdType) => void
  /** Map each node's `name` to its id. */
  nodeIdsByName: (networkId: IdType) => Record<string, IdType>
  /**
   * What the canvas shows for an element of the current network: one
   * Cytoscape.js style property (`'display'`, `'border-width'`,
   * `'background-color'`, …), read from the host's renderer, or null when
   * the element is not drawn. Colors read as `rgb(r,g,b)`, sizes as `8px`.
   * Only for checking what rendering does: recipes never touch the renderer.
   */
  rendered: (elementId: IdType, property: string) => string | null
  /** Run `undo` when the case ends, pass or fail. Last registered runs first. */
  onCleanup: (undo: () => void) => void
  /** Fail the case with `what` unless `condition` holds. */
  check: (condition: boolean, what: string) => void
  /** Wait until `condition` holds, or fail the case with `what`. */
  waitFor: (condition: () => boolean, what: string) => Promise<void>
  /** Real user input, for cases that go through the host's own UI. */
  ui: CaseUi
}

export interface RecipeCase {
  /**
   * The recipe's id: `<category>/<file name without extension>`. A behavior
   * case of the verification app, which belongs to no recipe, is
   * `behavior/<file name>`.
   */
  id: string
  run: (ctx: CaseContext) => void | Promise<void>
}

/** What the verification app publishes when it mounts. */
export interface VerificationApp {
  /** The app's id: its Module Federation name and `CyApp.id`. */
  id: string
  /** The cases of `runner/app/cases` and `runner/app/behaviors`. */
  cases: RecipeCase[]
}

/** The runner's side of `CaseUi`, exposed by `run.mjs`. */
type UiAction = (action: keyof CaseUi, ...args: unknown[]) => Promise<unknown>

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
    __cookbookApp?: VerificationApp
    __cookbookUi?: UiAction
  }
}

const uiAction = async (
  action: keyof CaseUi,
  ...args: unknown[]
): Promise<unknown> => {
  const perform = window.__cookbookUi
  if (perform === undefined) {
    throw new Error('the runner exposes no UI actions to this page')
  }
  return await perform(action, ...args)
}

const ui: CaseUi = {
  click: async (selector) => {
    await uiAction('click', selector)
  },
  fill: async (selector, text) => {
    await uiAction('fill', selector, text)
  },
  press: async (key) => {
    await uiAction('press', key)
  },
  visible: async (selector) => (await uiAction('visible', selector)) === true,
  waitFor: async (selector, state) => {
    await uiAction('waitFor', selector, state)
  },
  rightClickNode: async (nodeId) => {
    await uiAction('rightClickNode', nodeId)
  },
  clickForPopup: async (selector) => {
    const url = await uiAction('clickForPopup', selector)
    return typeof url === 'string' ? url : null
  },
  setAppEnabled: async (appId, enabled) => {
    await uiAction('setAppEnabled', appId, enabled)
  },
}

/**
 * The part of Cytoscape.js the cases read. The host publishes its renderer on
 * `window.debug.cy` while debug is on, which the runner turns on; 1.1.0 and
 * 1.1.1 both do.
 */
interface RenderedElements {
  getElementById: (id: string) => {
    length: number
    style: (property: string) => unknown
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

  const deleteLater = (networkId: IdType): void => {
    cleanups.push(() => {
      // A case may delete the network itself. One that is gone needs nothing;
      // run.mjs still fails the run on any network left behind.
      const present = apis.workspace.getNetworkIds()
      if (present.success && !present.data.networkIds.includes(networkId)) {
        return
      }
      const deleted = apis.network.deleteNetwork(networkId)
      if (!deleted.success) throw new Error(deleted.error.message)
    })
  }

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
      deleteLater(networkId)
      return networkId
    },
    adopt: (networkId) => deleteLater(networkId),
    rendered: (elementId, property) => {
      const cy = (window as unknown as { debug?: { cy?: RenderedElements } })
        .debug?.cy
      const element = cy?.getElementById(elementId)
      return element === undefined || element.length === 0
        ? null
        : String(element.style(property))
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
    ui,
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

/** The bundled cases, then the verification app's, once it has mounted. */
const allCases = (bundled: RecipeCase[]): RecipeCase[] => [
  ...bundled,
  ...(window.__cookbookApp?.cases ?? []),
]

export const installRunner = (cases: RecipeCase[]): void => {
  window.__cookbookRunner = {
    get ids() {
      return allCases(cases).map((c) => c.id)
    },
    run: async (id, host) => {
      const recipeCase = allCases(cases).find((c) => c.id === id)
      if (recipeCase === undefined) {
        return {
          id,
          pass: false,
          message: `no case named ${id} in the bundle or the verification app`,
          cleanupErrors: [],
        }
      }
      return await runCase(recipeCase, host)
    },
  }
}
