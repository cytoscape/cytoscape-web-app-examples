import { openPanel } from '../../recipes/ui/open-panel'

// The minimal runner's ctx.apis is window.CyWebApi: never an app's own.
export default {
  id: 'ui/open-panel',
  run: (ctx: { apis: Window['CyWebApi'] }) => {
    openPanel(ctx.apis, 'Tab')
  },
}
