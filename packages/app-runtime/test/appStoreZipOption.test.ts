// Whether a build writes an App Store zip.
//
// The decision is pure, so it is tested here rather than by building five
// times. What matters is that the environment variable works in BOTH
// directions: a one-way switch sends an app that has the option committed back
// to editing its config file, which is the thing being avoided.

import { describe, expect, it } from 'vitest'

import { APP_ZIP_ENV, resolveAppStoreZip } from '../src/vite/zipForAppStore.js'

const env = (value: string) => ({ [APP_ZIP_ENV]: value })
const noEnv = {}

describe('resolveAppStoreZip — without the variable', () => {
  it('is off by default', () => {
    expect(resolveAppStoreZip(undefined, noEnv)).toBe(false)
  })

  it('follows the config option', () => {
    expect(resolveAppStoreZip(true, noEnv)).toBe(true)
    expect(resolveAppStoreZip(false, noEnv)).toBe(false)
  })
})

describe('resolveAppStoreZip — with the variable', () => {
  it.each(['1', 'true', 'yes', 'on'])('turns it on for %s', (v) => {
    expect(resolveAppStoreZip(undefined, env(v))).toBe(true)
  })

  // The direction a one-way switch would miss.
  it.each(['0', 'false', 'no', 'off'])('turns it off for %s', (v) => {
    expect(resolveAppStoreZip(true, env(v))).toBe(false)
  })

  it.each(['FALSE', 'Off'])('is case-insensitive (%s)', (v) => {
    expect(resolveAppStoreZip(true, env(v))).toBe(false)
  })

  it('is treated as unset when blank', () => {
    expect(resolveAppStoreZip(true, env('   '))).toBe(true)
    expect(resolveAppStoreZip(undefined, env(''))).toBe(false)
  })

  // Reached for at the moment someone wants a zip. Failing the build over a
  // spelling they got right in spirit would be the wrong trade.
  it('treats an unrecognised value as on rather than erroring', () => {
    expect(resolveAppStoreZip(undefined, env('please'))).toBe(true)
  })
})
