import { openPanel } from '../recipes/ui/open-panel'

// window.CyWebApi satisfies the type, and is the wrong object: its panel
// belongs to no app.
export const openFromPage = (): void => {
  openPanel(window.CyWebApi, 'Tab')
}
