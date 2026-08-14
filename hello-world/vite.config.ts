import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url, {
  // A SECOND federated module, beyond the mandatory './AppConfig'.
  //
  // It is here as the strongest available test that React really is one shared
  // instance across the federation boundary: the host renders this menu item
  // inside its OWN React tree, and the component uses hooks. Two Reacts throw
  // "invalid hook call" long before anything appears on screen.
  exposes: {
    './NetworkSummaryMenuItem': './src/components/NetworkSummaryMenuItem.tsx',
  },
})

// Everything else — the ESM remote type, the production sentinel, the runtime
// plugin that resolves the host at load time, the five shared singletons, the
// './AppConfig' expose and the bundled-shared-package gate — comes from
// defineCyWebApp. See project-template/vite.config.ts for what that means and
// why none of it is yours to write.
//
// Identity (id, display name, port) lives in the `cyweb` block in package.json.
