import type { AppContext } from 'cyweb/ApiTypes'

import { openPanel } from '../recipes/ui/open-panel'

// Right object, written in a way the check does not follow.
export const lifecycle = {
  mount(context: AppContext): void {
    const { apis } = context
    openPanel(apis, 'Tab')
  },
}
