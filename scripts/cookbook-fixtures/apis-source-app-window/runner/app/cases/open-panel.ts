import { openPanel } from '../../../recipes/ui/open-panel'

// Inside the verification app, window.CyWebApi is still not the app's own.
export default {
  id: 'ui/open-panel',
  run: () => {
    openPanel(window.CyWebApi, 'Tab')
  },
}
