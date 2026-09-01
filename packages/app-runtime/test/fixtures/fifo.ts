import { execFileSync } from 'node:child_process'
import { lstatSync } from 'node:fs'

/**
 * Creates a FIFO at `path`, and says whether it really got one.
 *
 * On a Windows runner the MSYS `mkfifo` SUCCEEDS and creates `path.lnk` — which
 * Node reports as an ordinary file, so a test asserting "not a regular file"
 * fails on a shim rather than on the behaviour it is about. Checking `isFIFO()`
 * is what tells the two apart; a platform without FIFOs simply skips.
 */
export const madeAFifo = (path: string): boolean => {
  try {
    execFileSync('mkfifo', [path])
    return lstatSync(path).isFIFO()
  } catch {
    return false
  }
}
