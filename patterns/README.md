# Implementation Patterns

Practical patterns for Cytoscape Web plugin apps, extracted from working examples.

---

## 1. Read Network Data from Host Stores

**Source:** `simple-panel/src/components/SimplePanel.tsx`

```typescript
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useNetworkStore }   from 'cyweb/NetworkStore'
import { IdType, Network, Node, Edge, Workspace } from '@cytoscape-web/types'

const workspace: Workspace = useWorkspaceStore((state: any) => state.workspace)
const networks: Map<IdType, Network> = useNetworkStore((state: any) => state.networks)

const currentNetwork = networks.get(workspace.currentNetworkId)
const nodes: Node[] = currentNetwork?.nodes ?? []
const edges: Edge[] = currentNetwork?.edges ?? []
```

---

## 2. Create a Network from Scratch

**Source:** `hello-world/src/components/CreateNetworkMenu.tsx`

```typescript
import { useCreateNetworkWithView } from 'cyweb/CreateNetwork'

const createNetworkWithView = useCreateNetworkWithView()

const handleCreate = async () => {
  await createNetworkWithView(cx2NetworkData) // accepts CX2 format
  handleClose()
}
```

---

## 3. Create a Network from a CX2 File

**Source:** `hello-world/src/components/CreateNetworkFromCx2Menu.tsx`

```typescript
import { useCreateNetworkFromCx2WithView } from 'cyweb/CreateNetworkFromCx2'

const createFromCx2 = useCreateNetworkFromCx2WithView()

const handleFileSelect = async (cx2Data: Cx2) => {
  await createFromCx2(cx2Data)
  handleClose()
}
```

---

## 4. Open External Web App and Receive Data via postMessage

**Source:** `hello-world/src/components/` (JupyterConnectorPanel)

```typescript
// In a menu component — open the child window
const handleOpen = () => {
  window.open('https://external-app.example.com', '_blank')
  handleClose()
}

// In a panel component — receive data from the child
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.origin !== 'https://external-app.example.com') return
    const cx2Data = event.data.payload
    createNetworkWithView(cx2Data)
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}, [])
```

The child window can send data back using:
```javascript
window.opener.postMessage({ payload: cx2Data }, 'https://web.cytoscape.org')
```

---

## 5. Use the New App API (Phase 1 — `new-app-api` branch only)

The host exposes high-level typed APIs. All functions return `ApiResult<T>`.

```typescript
import { useNetworkApi }   from 'cyweb/NetworkApi'
import { useSelectionApi } from 'cyweb/SelectionApi'
import { useElementApi }   from 'cyweb/ElementApi'

const networkApi   = useNetworkApi()
const selectionApi = useSelectionApi()

// Always check result.success before accessing result.data
const result = await networkApi.getNetworkSummary(networkId)
if (result.success) {
  const summary = result.data
} else {
  console.error(result.error.message)
}

// Get selected nodes
const selResult = selectionApi.getSelectedNodes(networkId)
if (selResult.success) {
  const selectedNodes = selResult.data
}
```

For the full API surface, see `../cytoscape-web/src/app-api/types/index.ts`.

---

## 6. Modify Visual Style

```typescript
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'

const setVisualStyle = useVisualStyleStore((state: any) => state.set)

const applyStyle = () => {
  setVisualStyle(networkId, updatedVisualStyle)
}
```

---

## Notes

- All host store selectors use `(state: any) => state.field` — the `any` cast is intentional since plugin types for full store state are not exported.
- For patterns involving the new App API hooks, both repos must be on the `new-app-api` branch.
- See `CLAUDE.md` for the full list of available `cyweb/*` modules.
