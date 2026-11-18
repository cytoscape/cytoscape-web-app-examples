import { openPanel } from '../../../recipes/ui/open-panel'
import { harness } from '../src/harness'

// The right object, written in a way the check does not follow.
export default {
  id: 'ui/open-panel',
  run: () => {
    const { apis } = harness
    openPanel(apis, 'Tab')
  },
}
