import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'
// Import the version string directly from package.json.
// This keeps the app version in sync with the npm package automatically —
// no need to update it in two places. Requires `resolveJsonModule: true`
// in tsconfig.json (already enabled in this project).
// Note: use default import + destructure (not named import) to avoid a
// webpack warning about named exports from default-exporting JSON modules.
import packageJson from '../package.json'

const { version } = packageJson

export const HelloApp: CyAppWithLifecycle = {
  // Unique identifier for this app within the Cytoscape Web ecosystem.
  // Must match the `name` field in webpack.config.js ModuleFederationPlugin
  // so the host can locate this app's remoteEntry.js at runtime.
  id: 'hello',

  // Human-readable display name shown in the App Settings panel.
  name: 'Hello Cy World App',

  // Short description shown beneath the app name in the App Settings panel.
  // Optional, but recommended so users understand what the app does.
  description: 'Minimal panel example for Cytoscape Web app developers',

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
    },
  ],
}
