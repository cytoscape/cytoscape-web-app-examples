import { usePanelApi } from 'cyweb/PanelApi'

import { openPanel } from '../recipes/ui/open-panel'

// The anonymous hook: the same wrong object as window.CyWebApi.
export const Panel = (): null => {
  const panel = usePanelApi()
  openPanel({ panel }, 'Tab')
  return null
}
