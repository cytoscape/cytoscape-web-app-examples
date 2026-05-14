import { lazy } from 'react'

import { AppContext, CyAppWithLifecycle } from 'cyweb/ApiTypes'
// Import the version string directly from package.json.
// This keeps the app version in sync with the npm package automatically —
// no need to update it in two places. Requires `resolveJsonModule: true`
// in tsconfig.json (already enabled in this project).
// Note: use default import + destructure (not named import) to avoid a
// webpack warning about named exports from default-exporting JSON modules.
import packageJson from '../package.json'

import { getLifecycleSnapshot, setLifecycleState } from './lifecycleState'

const { version } = packageJson

// ── Module-level variable ─────────────────────────────────────────────────────
//
// _networkHandler holds the exact function reference passed to addEventListener
// so that unmount() can pass the same reference to removeEventListener.
//
// Why module-level, not a closure inside mount()?
//   mount() and unmount() are separate method calls on the same object.
//   A closure would require storing the reference on `this`, but CyAppWithLifecycle
//   is a plain object — module-level variables are the idiomatic solution.
//
// Initialised to null to make it clear the listener is not yet registered.
let _networkHandler: ((e: Event) => void) | null = null

export const HelloApp: CyAppWithLifecycle = {
  // Unique identifier for this app within the Cytoscape Web ecosystem.
  // Must match the `name` field in webpack.config.js ModuleFederationPlugin
  // so the host can locate this app's remoteEntry.js at runtime.
  id: 'hello',

  // Human-readable display name shown in the App Settings panel.
  name: 'Hello Cytoscape World App',

  // Short description shown beneath the app name in the App Settings panel.
  // Optional, but recommended so users understand what the app does.
  description:
    'Reference app demonstrating core App API patterns: visual style editing, ' +
    'selection tracking / clearing, async layout execution, app lifecycle hooks, ' +
    'and both component-scoped and app-scoped event handling.',

  // Semantic version of this app, imported from package.json.
  // Displayed in the App Settings panel alongside the app name.
  version,

  // The Cytoscape Web App API version this app targets.
  // Used for future compatibility checks. Set to '1.0' for all current apps.
  apiVersion: '1.0',

  // ── Declarative resource registration (Phase 2) ───────────────────────────
  //
  // Use `resources` for UI components that the host renders: panels and menu items.
  // The host registers these automatically when the app is loaded.
  //
  // Context menu items are NOT declared here — they need access to `apis`
  // (for calling other APIs in the handler) and are registered in mount() below.
  resources: [
    {
      slot: 'right-panel',
      id: 'HelloPanel',
      title: 'Hello World',
      component: lazy(() => import('./components/HelloPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'NetworkSummaryMenuItem',
      title: 'Network Summary',
      component: lazy(() => import('./components/NetworkSummaryMenuItem')),
    },
  ],

  /**
   * Called once by the host after this app's resources are registered and
   * the App API is fully initialised.
   *
   * Use mount() for:
   *   - Context menu items (handlers need access to apis)
   *   - Global event listeners that must outlive individual components
   *   - Module-level resource initialisation (timers, WebSockets, etc.)
   *
   * context.apis includes all domain APIs plus per-app contextMenu and
   * resource factories. Items registered via context.apis.contextMenu are
   * automatically cleaned up when the app is disabled — no explicit
   * removal in unmount() is needed.
   */
  mount(context: AppContext): void {
    // 1. Mark the app as mounted so LifecycleSection can display the status.
    setLifecycleState({ mounted: true })

    // 2. Read the initial network ID via context.apis — no React hook needed.
    const initialNetwork = context.apis.workspace.getCurrentNetworkId()
    if (initialNetwork.success) {
      setLifecycleState({ lastNetworkId: initialNetwork.data.networkId })
    }

    // 3. Register always-on context menu items.
    //    Unlike panels/menus (declared in `resources` above), context menu items
    //    are registered here because their handlers need access to `context.apis`.
    //    The host auto-cleans these when the app is disabled — no need to store
    //    itemIds or remove them in unmount().
    context.apis.contextMenu.addContextMenuItem({
      label: 'Hello: Log Node Info',
      targetTypes: ['node'],
      handler: (ctx) => {
        const nodeResult = context.apis.element.getNode(
          ctx.networkId,
          ctx.id!,
        )
        if (nodeResult.success) {
          console.info('[HelloApp] Node info:', nodeResult.data)
        }
      },
    })

    // 4. Register a raw DOM event listener for 'network:switched'.
    //    Storing the function in _networkHandler is mandatory — removeEventListener
    //    requires the exact same function reference that was passed to addEventListener.
    _networkHandler = (e: Event): void => {
      const { networkId } = (e as CustomEvent<{ networkId: string }>).detail
      const currentCount = getLifecycleSnapshot().networkSwitchCount
      setLifecycleState({
        lastNetworkId: networkId,
        networkSwitchCount: currentCount + 1,
      })
    }
    window.addEventListener('network:switched', _networkHandler)
    console.info(
      'HelloApp mounted: context menu + event listener registered.',
    )
  },

  /**
   * Called when the app is deactivated or the page is about to unload.
   *
   * Only manual cleanup is needed here — event listeners added via
   * addEventListener must be explicitly removed. Context menu items and
   * resource registrations (panels, menu items) are automatically
   * cleaned up by the host via cleanupAllForApp.
   */
  unmount(): void {
    // Remove the event listener using the stored reference.
    if (_networkHandler !== null) {
      window.removeEventListener('network:switched', _networkHandler)
      _networkHandler = null
    }
    console.info(
      'HelloApp unmounted: event listener removed. ' +
        'Context menu items and resources auto-cleaned by host.',
    )

    setLifecycleState({ mounted: false })
  },
}
