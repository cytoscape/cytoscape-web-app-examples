# Network Workflows — Real-World Cytoscape Web App Examples

Higher-level workflow examples that go beyond the per-API demos in
`hello-world`. Useful when you want to see how multiple APIs and host
events combine into a single user-facing feature.

| Field | Value |
|---|---|
| Federation name | `networkWorkflows` |
| Dev server port | `7000` |
| Entry point (local dev) | `networkWorkflows@http://localhost:7000/remoteEntry.js` |

---

## What it demonstrates

1. **Create Example Network** — an apps-menu item that builds a sample
   network in-memory using `networkApi.createNetworkFromEdgeList()`.
2. **Create Network from CX2** — an apps-menu item that fetches a remote
   CX2 file and imports it via `networkApi.createNetworkFromCx2()`.
3. **Jupyter Link** — a right-panel that listens for `postMessage`
   payloads from a sibling Jupyter Lab tab and ingests CX2 documents
   pushed from Python notebooks.

---

## Project structure

```
network-workflows/
├── src/
│   ├── index.ts                          ← exposed as ./AppConfig; re-exports the app config
│   ├── NetworkWorkflowsApp.tsx           ← app config + resource declarations
│   └── components/
│       ├── CreateNetworkMenu.tsx         ← apps-menu: build a sample network
│       ├── CreateNetworkFromCx2Menu.tsx  ← apps-menu: import remote CX2
│       └── JupyterConnectorPanel.tsx     ← right-panel: receive CX2 via postMessage
├── vite.config.ts                        ← Module Federation config
├── tsconfig.json
└── package.json
```

---

## Running locally

```bash
# Terminal 1 — start the host with the local app registry
cd ../cytoscape-web
npm install
npm run dev:local           # → http://localhost:5500

# Terminal 2 — start this plugin
cd cytoscape-web-app-examples/network-workflows
npm install
npm run dev                  # → http://localhost:7000
```

Open `http://localhost:5500`, then **Apps → App Settings** to enable
**Network Workflow Examples**. The two menu items appear under the
**Apps** dropdown; the **Jupyter Link** tab appears in the right-side
panel.

> Use `npm run dev:local` (not `npm run dev`) so the host loads
> `src/assets/apps.local.json` and discovers the locally running plugin.

---

## APIs used

| API            | Methods                                                           |
|----------------|-------------------------------------------------------------------|
| **NetworkApi** | `createNetworkFromEdgeList`, `createNetworkFromCx2`              |
| **EventBus**   | `network:created`, `network:switched`                             |
| **Window**     | `window.postMessage` listener for Jupyter integration             |

---

## Jupyter Lab integration

The `JupyterConnectorPanel` listens for `message` events on the
top-level `window`. A Jupyter notebook running in a sibling tab can
post a CX2 payload like:

```python
from IPython.display import Javascript

js = """
window.opener && window.opener.postMessage(
  { type: 'cyweb:create-network', payload: %s },
  'http://localhost:5500'
)
""" % cx2_json
display(Javascript(js))
```

The panel validates the payload shape, then calls
`networkApi.createNetworkFromCx2()` to import it into the workspace.

See `src/components/JupyterConnectorPanel.tsx` for the full handler
contract and origin-allowlist logic.

---

## Further reading

- [hello-world/](../hello-world/) — per-API reference with 13 self-contained examples
- [project-template/](../project-template/) — minimal starter for new apps
- [guides/](../guides/) — App Developer Guide
