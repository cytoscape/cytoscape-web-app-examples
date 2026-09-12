import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'

// Your app's identity, from the `cyweb` block and the standard fields in
// package.json. Four values, supplied by the build.
//
// NOT `import packageJson from '../package.json'`, which is what this used to
// be: that pulls the WHOLE file into the browser bundle — devDependencies,
// scripts, every private field — to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'
import { createExampleNetwork, createNetworkFromSampleCx2 } from './menuActions'

export const NetworkWorkflowsApp: CyAppWithLifecycle = {
  // Identity comes from package.json — change it there, not here. `id` is the
  // Module Federation container name, the CyApp id and the registry id at once,
  // so it is one value rather than three that have to agree.
  id,
  name: displayName,
  description,
  version,
  apiVersion: '1.0',
  resources: [
    // 'apps-menu' entries are plain data since api-types 1.0.0-beta.4: the
    // host renders the row and closes the menu itself, and hands the app's
    // API to onClick. There is no component and no closeOnAction any more.
    {
      slot: 'apps-menu',
      id: 'CreateNetworkMenu',
      label: 'Create Example Network',
      onClick: createExampleNetwork,
    },
    {
      slot: 'apps-menu',
      id: 'CreateNetworkFromCx2Menu',
      label: 'Create Network from CX2',
      onClick: createNetworkFromSampleCx2,
    },
    {
      slot: 'right-panel',
      id: 'JupyterConnectorPanel',
      title: 'Jupyter Link',
      component: lazy(() => import('./components/JupyterConnectorPanel')),
    },
  ],
}
