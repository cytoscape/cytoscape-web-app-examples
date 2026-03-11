import { lazy } from 'react'

import { AppContext, ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'
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

  // List of UI components this app contributes to the host.
  // Each entry maps a component ID to a ComponentType:
  //   ComponentType.Panel — rendered in the right-side App Panel area
  //   ComponentType.Menu  — rendered as an item under the "Apps" menu bar
  // The `id` must match the key used in `exposes` inside webpack.config.js.
  components: [
    {
      id: 'HelloPanel',
      type: ComponentType.Panel,
      // Pre-build the lazy component here so the host can render it directly.
      // This eliminates the need for a separate './HelloPanel' entry in webpack exposes.
      component: lazy(() => import('./components/HelloPanel')),
    },
    {
      id: 'NetworkSummaryMenuItem',
      type: ComponentType.Menu,
      // Menu components can also be lazy-loaded, just like panels.
      component: lazy(() => import('./components/NetworkSummaryMenuItem')),
    },
  ],

  /**
   * Called once by the host after this app's components are registered and
   * the App API is fully initialised.
   *
   * Use mount() to:
   *   - Read initial host state via context.apis (same object as window.CyWebApi)
   *   - Register global event listeners that must outlive individual components
   *   - Initialise module-level resources (timers, WebSockets, third-party libs)
   *
   * context.apis vs. React hooks:
   *   React hooks (useWorkspaceApi, useCyWebEvent, …) can only be called inside
   *   a React component. context.apis gives you the exact same API objects
   *   without needing a rendering context — useful here and for vanilla JS code.
   *
   * App-level listener vs. useCyWebEvent (Example 2):
   *   useCyWebEvent wraps addEventListener in useEffect and is tied to the
   *   component's lifetime. The listener below lives for the entire time the
   *   app is mounted, even if the panel is hidden or not yet rendered.
   */
  mount(context: AppContext): void {
    // 1. Mark the app as mounted so LifecycleSection can display the status.
    setLifecycleState({ mounted: true })

    // 2. Read the initial network ID via context.apis — no React hook needed.
    //    context.apis.workspace is the same WorkspaceApi returned by
    //    useWorkspaceApi() inside components, but accessible here without React.
    const initialNetwork = context.apis.workspace.getCurrentNetworkId()
    if (initialNetwork.success) {
      setLifecycleState({ lastNetworkId: initialNetwork.data.networkId })
    }

    // 3. Register a raw DOM event listener for 'network:switched'.
    //    Storing the function in _networkHandler is mandatory — removeEventListener
    //    requires the exact same function reference that was passed to addEventListener.
    //    Passing a new arrow function in unmount() would silently do nothing.
    _networkHandler = (e: Event): void => {
      const { networkId } = (e as CustomEvent<{ networkId: string }>).detail
      // Read the current count before overwriting _state so the increment is correct.
      // JavaScript is single-threaded, so no race condition is possible here.
      const currentCount = getLifecycleSnapshot().networkSwitchCount
      setLifecycleState({
        lastNetworkId: networkId,
        networkSwitchCount: currentCount + 1,
      })
    }
    window.addEventListener('network:switched', _networkHandler)
    console.info(
      'HelloApp mounted: event listener registered, initial state set.',
    )
  },

  /**
   * Called when the app is deactivated or the page is about to unload.
   * Always called — even on page refresh.
   *
   * Rules:
   *   - Remove every listener added in mount().
   *   - Cancel pending timers, promises, or async tasks.
   *   - After unmount() returns, no code from this app should execute.
   *
   * Skipping cleanup causes listener leaks: stale handlers may fire after
   * the app has been disabled and receive events they should no longer handle.
   */
  unmount(): void {
    // 4. Remove the listener using the stored reference.
    //    removeEventListener is a no-op if _networkHandler is null,
    //    but the null check makes the intent explicit.
    if (_networkHandler !== null) {
      window.removeEventListener('network:switched', _networkHandler)
      _networkHandler = null
    }
    console.info(
      'HelloApp unmounted: event listener removed, resources cleaned up.',
    )

    // 5. Update shared state so LifecycleSection reflects the unmounted status.
    setLifecycleState({ mounted: false })
  },
}
