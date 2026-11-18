import { openPanel } from '../../recipes/ui/open-panel'

// The runner's ctx.apis is window.CyWebApi: never an app's own.
export default {
  id: 'elements/add-node',
  run: (ctx: { apis: Window['CyWebApi'] }) => {
    openPanel(ctx.apis, 'Tab')
  },
}
