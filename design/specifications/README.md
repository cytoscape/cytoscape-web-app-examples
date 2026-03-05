# Specifications

Cross-cutting specifications that apply to all example apps in this repository.

## Documents

| File | Topic |
|------|-------|
| _(add files here as needed)_ | |

## What Goes Here

- **API usage contracts** — How apps are expected to consume `cyweb/*` APIs (e.g., `ApiResult<T>` handling, error boundary conventions)
- **Port and naming registry** — Canonical list of federation names and dev server ports (see table below)
- **Shared conventions** — Patterns that all apps must follow (e.g., `remotes.d.ts` structure, `shared` singletons)
- **Host compatibility matrix** — Which host API phase each example targets

## Port and Federation Name Registry

| App              | Federation Name | Dev Port | Production URL                                     |
|------------------|-----------------|----------|----------------------------------------------------|
| hello-world      | `hello`         | 2222     | `https://cytoscape.org/cytoscape-web-app-examples/hello-world/remoteEntry.js` |
| simple-menu      | `simpleMenu`    | 3333     | `https://cytoscape.org/cytoscape-web-app-examples/simple-menu/remoteEntry.js` |
| simple-panel     | `simplePanel`   | 4001     | `https://cytoscape.org/cytoscape-web-app-examples/simple-panel/remoteEntry.js` |
| project-template | `createNetwork` | 5555     | _(template only, not deployed)_                    |

Reserve ports above 5555 for new apps. Update this table when adding an app.

## Host API Compatibility

| Host API Phase | Branch        | Available `cyweb/*` modules added |
|---------------|---------------|-----------------------------------|
| Phase 0       | `development` | Stores, `CreateNetwork`, `CreateNetworkFromCx2` |
| Phase 1a–1g   | `new-app-api` | `ElementApi`, `NetworkApi`, `SelectionApi`, `ViewportApi`, `TableApi`, `VisualStyleApi`, `LayoutApi`, `ExportApi`, `WorkspaceApi`, `EventBus` |
