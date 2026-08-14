import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'

// Your app's identity, from the `cyweb` block and the standard fields in
// package.json. Four values, supplied by the build.
//
// NOT `import packageJson from '../package.json'`, which is what this used to
// be: that pulls the WHOLE file into the browser bundle — devDependencies,
// scripts, every private field — to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

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
    {
      slot: 'apps-menu',
      id: 'CreateNetworkMenu',
      title: 'Create Example Network',
      component: lazy(() => import('./components/CreateNetworkMenu')),
      closeOnAction: true,
    },
    {
      slot: 'apps-menu',
      id: 'CreateNetworkFromCx2Menu',
      title: 'Create Network from CX2',
      component: lazy(() => import('./components/CreateNetworkFromCx2Menu')),
      closeOnAction: true,
    },
    {
      slot: 'right-panel',
      id: 'JupyterConnectorPanel',
      title: 'Jupyter Link',
      component: lazy(() => import('./components/JupyterConnectorPanel')),
    },
  ],
}
