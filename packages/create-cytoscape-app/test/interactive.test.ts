import { describe, expect, it } from 'vitest'

import { isInteractive } from '../src/interactive.js'

describe('isInteractive', () => {
  it('prompts at a terminal', () => {
    expect(isInteractive(false, { isTTY: true })).toBe(true)
  })

  it('does not prompt under --yes', () => {
    expect(isInteractive(true, { isTTY: true })).toBe(false)
  })

  // Issue #6: pasting the three-line Quick Start fed `cd my-app` and
  // `npm run dev` to the prompts as answers, then exited 13 with stdin
  // exhausted. Nothing about that error named the cause.
  it('does not prompt when stdin is a pipe', () => {
    expect(isInteractive(false, { isTTY: false })).toBe(false)
  })

  // Node leaves isTTY undefined rather than false for some stdin kinds.
  it('does not prompt when isTTY is undefined', () => {
    expect(isInteractive(false, {})).toBe(false)
  })
})
