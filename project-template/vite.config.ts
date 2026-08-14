import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)

// That is the whole build configuration. What it sets up for you:
//
//   - the `cyweb` remote, with `type: 'module'` — the host emits an ESM
//     remoteEntry.js, and the plugin's default (`'var'`) resolves NO exports
//     against it and fails silently
//   - a production entry that is a SENTINEL, not a URL, so one artifact works
//     against any deployment; the host publishes its own entry on
//     window.__CYWEB_HOST__ at boot
//   - the runtime plugin that reads it — without registration the resolver is
//     inert and the app keeps whatever entry was compiled in
//   - `shared` matching the host's five singletons exactly, with
//     `import: false` so no second copy of React or MUI is bundled
//   - `./AppConfig` exposed from src/index.ts, the module the host loads
//   - a build-time gate that fails if a shared package's implementation ends up
//     in your chunks anyway
//
// Every one of those looks correct in a config file when it is wrong, which is
// why they are not yours to write. `npm run verify:federation` asserts them
// against the built output.
//
// Your app's identity — id, display name, port — lives in the `cyweb` block in
// package.json, written once and read from there by the build, by the app
// config, and by the dev install URL.
//
// Need to add a plugin, an alias or a `define`? Pass `{ vite: { … } }`. It is
// merged last, and touching a field the SDK owns fails the build with the path
// named rather than silently winning or silently losing.
//
// Full reasoning: node_modules/@cytoscape-web/app-runtime/dist/vite/index.js
// and the design at design/specifications/app-sdk/app-sdk-design.md.
