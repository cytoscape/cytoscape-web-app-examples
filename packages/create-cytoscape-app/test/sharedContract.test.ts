// The scaffolder and the runtime reader have to agree, and cannot import from
// each other.
//
// `create-cytoscape-app` does not depend on `@cytoscape-web/app-runtime` — it
// only writes a package.json that names it — so the SemVer grammar and the
// reserved-id list are copied here. A copy is a copy that drifts, so these tests
// read the normative artifact and fail when it does. Scaffolding a project that
// then fails its own first build is the failure being prevented.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { RESERVED_APP_IDS, SEMVER, validateSpec } from '../src/scaffold.js'

const artifact = JSON.parse(
  readFileSync(
    join(
      import.meta.dirname,
      '../../app-runtime/schema/cy-manifest-v1.predicates.json',
    ),
    'utf8',
  ),
) as {
  reservedIds: { values: string[] }
  version: { grammarPattern: string }
}

const corpus = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '../../app-runtime/schema/corpus/semver-profile.json'),
    'utf8',
  ),
) as { cases: { version: string; grammarValid: boolean }[] }

const specWith = (over: Record<string, unknown>) => ({
  targetDir: 'my-app',
  packageName: 'my-app',
  id: 'myApp',
  displayName: 'My App',
  description: 'x',
  version: '1.0.0',
  port: 6431,   // 6000 is X11, and the scaffolder refuses browser-blocked ports
  template: 'panel' as const,
  ...over,
})

describe('SemVer grammar', () => {
  it('is byte-for-byte the pattern the predicate artifact defines', () => {
    expect(SEMVER.source).toBe(artifact.version.grammarPattern)
  })

  it.each(corpus.cases.map((c) => [c.version === '' ? '(empty)' : c.version, c]))(
    'agrees with the runtime reader on %s',
    (_label, testCase) => {
      expect(SEMVER.test(testCase.version)).toBe(testCase.grammarValid)
    },
  )

  it('rejects a version the old looser pattern accepted', () => {
    // The previous regex allowed leading zeroes in a numeric prerelease
    // identifier, so `1.0.0-01` scaffolded and then failed the first build.
    expect(validateSpec(specWith({ version: '1.0.0-01' })).join('\n')).toContain(
      'is not canonical SemVer',
    )
  })
})

describe('reserved app ids', () => {
  it('is exactly the list the predicate artifact defines', () => {
    expect([...RESERVED_APP_IDS].sort()).toEqual([...artifact.reservedIds.values].sort())
  })

  it.each(RESERVED_APP_IDS.map((id) => [id]))('refuses to scaffold --id %s', (id) => {
    expect(validateSpec(specWith({ id })).join('\n')).toContain('is reserved')
  })

  it('still accepts an ordinary id', () => {
    expect(validateSpec(specWith({}))).toEqual([])
  })
})
