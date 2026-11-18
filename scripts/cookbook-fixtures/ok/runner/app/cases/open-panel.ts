import { openPanel } from '../../../recipes/ui/open-panel'
import { harness } from '../src/harness'

// The verification app's form: harness.apis, from the app's harness module.
export default {
  id: 'ui/open-panel',
  run: () => {
    openPanel(harness.apis, 'Tab')
  },
}
