import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url, {
  // NON-REACT app. There is no JSX here and no UI component — it listens for
  // host events and logs statistics.
  //
  // `react: false` drops the React plugin AND the shared singleton block, so
  // `configuredShared` is `{}`. That is not an omission to be tidied up later:
  // declaring singletons this app never imports would be false metadata, and
  // the build verifier compares the declaration against reality. It is also why
  // this app reports 16 verify checks rather than 26 — the per-package share
  // assertions have nothing to assert.
  react: false,
})

// Identity (id, display name, port) lives in the `cyweb` block in package.json.
// See project-template/vite.config.ts for what defineCyWebApp sets up and why.
