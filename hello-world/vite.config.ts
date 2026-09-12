import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)

// This used to expose a second federated module, './NetworkSummaryMenuItem',
// on the reasoning that the host rendering a hooks-using menu component inside
// its own React tree was the strongest available proof that React is one
// shared instance across the federation boundary.
//
// Since api-types 1.0.0-beta.4 the host renders no menu components at all —
// an 'apps-menu' entry is plain data — so that expose described something that
// no longer happened, and nothing imported it. The property it stood for is
// still exercised at runtime, through the only module the host loads:
// './AppConfig' declares the right-panel component, which the host mounts in
// its own tree, and the Apps-menu action opens a dialog whose body the host
// likewise renders. Two Reacts would fail there just as loudly.
//
// Everything else — the ESM remote type, the production sentinel, the runtime
// plugin that resolves the host at load time, the five shared singletons, the
// './AppConfig' expose and the bundled-shared-package gate — comes from
// defineCyWebApp. See project-template/vite.config.ts for what that means and
// why none of it is yours to write.
//
// Identity (id, display name, port) lives in the `cyweb` block in package.json.
