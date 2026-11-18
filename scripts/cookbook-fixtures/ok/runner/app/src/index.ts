import type { AppContext } from 'cyweb/ApiTypes'

import { harness } from './harness'

export default {
  mount(context: AppContext): void {
    harness.apis = context.apis
  },
}
