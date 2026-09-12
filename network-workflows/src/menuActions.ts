/**
 * Actions behind this app's Apps-menu entries.
 *
 * Since api-types 1.0.0-beta.4 an 'apps-menu' entry is plain data — a label
 * and an onClick(apis) — and the host renders the row itself. These used to be
 * React components (CreateNetworkMenu.tsx, CreateNetworkFromCx2Menu.tsx) that
 * drew their own <Typography> row and called useNetworkApi(); the row is gone
 * and the API arrives as the onClick argument, so all that is left is the
 * action.
 *
 * Kept in one file, not inline in the resources array, so each can be unit
 * tested with a stub `apis` and read without scrolling past the registration.
 */
import type { AppContextApis, Cx2 } from 'cyweb/ApiTypes'

const SAMPLE_CX2_URL =
  'https://raw.githubusercontent.com/cytoscape/cytoscape-web-app-examples/refs/heads/development/docs/data/sample2.cx2'

/** Create a small three-node example network and add it to the workspace. */
export const createExampleNetwork = (apis: AppContextApis): void => {
  const result = apis.network.createNetworkFromEdgeList({
    name: 'Created by network-workflows App',
    description: 'This network was created by network-workflows app',
    edgeList: [
      ['A', 'B', 'type1'],
      ['B', 'C', 'type2'],
      ['C', 'A', 'type1'],
    ],
    addToWorkspace: true,
  })
  if (!result.success) {
    console.error(result.error.message)
  }
}

/** Fetch a sample CX2 file from GitHub and create a network from it. */
export const createNetworkFromSampleCx2 = async (
  apis: AppContextApis,
): Promise<void> => {
  const response = await fetch(SAMPLE_CX2_URL)
  const cx2 = (await response.json()) as Cx2
  const result = apis.network.createNetworkFromCx2({
    cxData: cx2,
    navigate: true,
    addToWorkspace: true,
  })
  if (!result.success) {
    console.error(result.error.message)
  }
}
