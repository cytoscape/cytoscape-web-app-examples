import { useAppContext } from 'cyweb/AppIdContext'

import { openPanel } from '../recipes/ui/open-panel'

// Right: this apis is the app's own.
export const Panel = (): null => {
  const apis = useAppContext()?.apis
  if (apis !== undefined) openPanel(apis, 'Tab')
  return null
}

// Wrong, under the same name: a file-wide search for the hook's const would
// let it through.
export const openFromPage = (): void => {
  const apis = window.CyWebApi
  openPanel(apis, 'Tab')
}
