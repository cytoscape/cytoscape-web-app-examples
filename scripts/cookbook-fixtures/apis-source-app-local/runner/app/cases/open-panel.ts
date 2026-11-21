import { openPanel } from '../../../recipes/ui/open-panel'

// Named harness, and not the app's harness module.
const harness = { apis: window.CyWebApi }

export default {
  id: 'ui/open-panel',
  run: () => {
    openPanel(harness.apis, 'Tab')
  },
}
