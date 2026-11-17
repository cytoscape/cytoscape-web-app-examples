import type { AppContext, AppContextApis } from 'cyweb/ApiTypes'

import { useAppContext } from 'cyweb/AppIdContext'

import { openPanel } from '../recipes/ui/open-panel'

// 1. context.apis, inside mount(context).
export const lifecycle = {
  mount(context: AppContext): void {
    openPanel(context.apis, 'Tab')
  },
}

// 2. The parameter of an onClick arrow function.
export const entry = {
  slot: 'apps-menu',
  onClick: (apis: AppContextApis) => {
    openPanel(apis, 'Tab')
  },
}

// 3. A const initialized from useAppContext()?.apis.
export const Panel = (): null => {
  const apis = useAppContext()?.apis
  if (apis !== undefined) openPanel(apis, 'Tab')
  return null
}
