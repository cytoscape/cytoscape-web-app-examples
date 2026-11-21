import { harness } from './harness'

// A second write: harness.apis would no longer be what mount() was given.
export const reset = (): void => {
  harness.apis = window.CyWebApi as never
}
