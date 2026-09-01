// The wire format: what the SDK produces, and what canonical validity means.
//
// Two corpora run here, and they are deliberately separate. Package-source
// normalization is SDK-only — npm's author objects, repository shorthands and
// SSH URLs are producer INPUTS. Canonical wire validation is what both the SDK
// and the App Store implement, and every source form is invalid there: a Store
// that normalized an upload would be rewriting a submitted identity.

import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'

import {
  parseAppMeta,
  parseSubmissionMeta,
  readPackageSnapshot,
} from '../src/vite/appMeta.js'
import {
  buildCyManifest,
  CY_MANIFEST_FILENAME,
  CY_MANIFEST_FORMAT_VERSION,
  serializeCyManifest,
  validateCyManifestWire,
  type CyManifestV1,
} from '../src/vite/cyManifest.js'
import { PREDICATES } from '../src/vite/manifestPredicates.js'

const schemaAt = (name: string): string =>
  join(import.meta.dirname, '..', 'schema', name)
const readJson = (path: string): any => JSON.parse(readFileSync(path, 'utf8'))

const SCHEMA = readJson(schemaAt('cy-manifest-v1.schema.json'))
const LEDGER = readJson(schemaAt('ledger.json'))
const SOURCE_CORPUS = readJson(
  schemaAt('corpus/package-source-normalization.json'),
)
const WIRE_CORPUS = readJson(schemaAt('corpus/canonical-wire-validation.json'))

const SDK_VERSION = '0.4.0-next.1'

const validateSchema = new Ajv2020({ strict: false, allErrors: true }).compile(
  SCHEMA,
)

/** Builds a manifest the way the packaging path will: one snapshot, two parses. */
const buildFrom = (pkg: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-manifest-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  const snapshot = readPackageSnapshot(dir)
  return buildCyManifest(
    parseAppMeta(snapshot),
    parseSubmissionMeta(snapshot),
    SDK_VERSION,
  )
}

describe('shipped artifacts', () => {
  it('records every artifact in the ledger under its own $id and digest', () => {
    // Validating fixtures against whatever is packed today cannot detect that a
    // later commit reused an identity for different bytes. The ledger can.
    expect(LEDGER.entries.length).toBeGreaterThan(0)
    for (const entry of LEDGER.entries) {
      const bytes = readFileSync(schemaAt(entry.file))
      expect(`sha256:${createHash('sha256').update(bytes).digest('hex')}`).toBe(
        entry.sha256,
      )
      expect(JSON.parse(bytes.toString('utf8')).$id).toBe(entry.$id)
    }
    const ids = LEDGER.entries.map((e: { $id: string }) => e.$id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ships a preview identity, not a stable one', () => {
    // The stable identity is issued only when the handshake closes, because
    // after it the envelope is frozen and a change costs a formatVersion.
    for (const entry of LEDGER.entries) expect(entry.$id).toContain('/draft/')
  })

  it('reads its constants from the predicate artifact rather than restating them', () => {
    expect(PREDICATES.reservedIds.values).toContain('__proto__')
    expect(PREDICATES.reservedIds.values).toContain('cyweb')
    expect(PREDICATES.version.maxNumericIdentifier).toBe(
      Number.MAX_SAFE_INTEGER,
    )
  })
})

describe('package-source normalization corpus', () => {
  it.each(SOURCE_CORPUS.cases as any[])('$name', (testCase: any) => {
    const pkg = { ...SOURCE_CORPUS.base, ...testCase.package }

    if (testCase.expectInvalid !== undefined) {
      expect(() => buildFrom(pkg)).toThrow(testCase.expectInvalid)
      return
    }

    const { manifest, warnings } = buildFrom(pkg)
    if (testCase.expect !== undefined) {
      for (const [field, value] of Object.entries(testCase.expect)) {
        expect(manifest[field as keyof CyManifestV1]).toEqual(value)
      }
    }
    for (const field of testCase.expectAbsent ?? []) {
      expect(manifest[field as keyof CyManifestV1]).toBeUndefined()
    }
    if (testCase.expectWarning !== undefined) {
      expect(warnings.join('\n')).toContain(testCase.expectWarning)
    }
    // Whatever the producer emits must satisfy the contract it publishes.
    expect(validateCyManifestWire(manifest)).toEqual([])
    expect(validateSchema(manifest)).toBe(true)
  })
})

describe('canonical wire validation corpus', () => {
  const documentFor = (testCase: any): unknown => {
    if ('replace' in testCase) return testCase.replace
    const doc: Record<string, unknown> = {
      ...WIRE_CORPUS.valid,
      ...(testCase.patch ?? {}),
    }
    for (const field of testCase.remove ?? []) delete doc[field]
    return doc
  }

  it.each(WIRE_CORPUS.cases as any[])('$name', (testCase: any) => {
    const problems = validateCyManifestWire(documentFor(testCase))
    if (testCase.valid) {
      expect(problems).toEqual([])
    } else {
      expect(problems.join('\n')).toContain(testCase.reason)
    }
  })

  it('never accepts what the JSON Schema rejects', () => {
    // The schema is one of three parts of canonical validity and is strictly
    // weaker than the whole: it cannot express a predicate. So the implication
    // runs one way, and it has to hold for every case in the corpus.
    for (const testCase of WIRE_CORPUS.cases) {
      const doc = documentFor(testCase)
      if (validateSchema(doc)) continue
      expect(
        validateCyManifestWire(doc).length,
        `${testCase.name}`,
      ).toBeGreaterThan(0)
    }
  })
})

describe('serializeCyManifest', () => {
  const { manifest } = buildFrom({
    ...SOURCE_CORPUS.base,
    description: 'Colors nodes by degree',
    author: 'Jane Doe',
    license: 'MIT',
    repository: 'https://github.com/example/my-app',
    homepage: 'https://example.org/my-app',
    keywords: ['layout'],
  })

  it('emits the fixed field order, two-space indent and one trailing newline', () => {
    const text = serializeCyManifest(manifest)
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).not.toMatch(/\n\n$/)
    expect(text.split('\n')[1]).toBe('  "formatVersion": 1,')
    expect(Object.keys(JSON.parse(text))).toEqual([
      'formatVersion',
      'id',
      'name',
      'version',
      'type',
      'entry',
      'description',
      'author',
      'license',
      'repository',
      'homepage',
      'tags',
      'generator',
    ])
  })

  it('is stable — the same manifest serializes to the same bytes', () => {
    // The archive copy and the CLI copy are compared byte for byte, so "equal
    // objects" is not the guarantee that matters.
    expect(Buffer.from(serializeCyManifest(manifest))).toEqual(
      Buffer.from(serializeCyManifest({ ...manifest })),
    )
  })

  it('carries no BOM', () => {
    expect(serializeCyManifest(manifest).charCodeAt(0)).toBe('{'.charCodeAt(0))
  })

  it('enforces the document limit in octets, which JSON Schema cannot express', () => {
    // maxLength counts code points of a decoded string, not bytes of a file.
    const huge = { ...manifest, description: 'あ'.repeat(6000) }
    expect(() => serializeCyManifest(huge)).toThrow(/over the 16384-byte limit/)
  })
})

describe('the manifest the SDK produces', () => {
  it('names the file and the format version it was built for', () => {
    expect(CY_MANIFEST_FILENAME).toBe('cy-manifest.json')
    expect(CY_MANIFEST_FORMAT_VERSION).toBe(1)
  })

  it('carries no url — the Store assigns one when it hosts the bundle', () => {
    const { manifest } = buildFrom(SOURCE_CORPUS.base)
    expect(manifest).not.toHaveProperty('url')
    expect(manifest.entry).toBe('remoteEntry.js')
  })

  it('emits no unknown property of any kind', () => {
    const { manifest } = buildFrom({
      ...SOURCE_CORPUS.base,
      unrelated: 'x',
      scripts: {},
    })
    expect(Object.keys(manifest).sort()).toEqual(
      [
        'entry',
        'formatVersion',
        'generator',
        'id',
        'name',
        'type',
        'version',
      ].sort(),
    )
  })

  it('reports every missing recommended field, in policy-pending language', () => {
    const { warnings } = buildFrom(SOURCE_CORPUS.base)
    for (const field of PREDICATES.readinessWarnings.fields) {
      expect(warnings.join('\n')).toContain(field)
    }
    expect(warnings.join('\n')).toContain('policy-pending')
    // "recommended", never "the Store requires this" — the profile that decides
    // the mandatory set is owned by the App Store and does not exist yet.
    expect(warnings.join('\n')).not.toContain('the Store requires')
  })

  it('collects every problem instead of failing one at a time', () => {
    // Fixing four fields should take one build, not four.
    let message = ''
    try {
      buildFrom({
        ...SOURCE_CORPUS.base,
        description: 42,
        license: [],
        homepage: 'ftp://x.org',
      })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('description must be a string')
    expect(message).toContain('license must be a string')
    expect(message).toContain('ftp')
  })
})

describe('the SemVer corpus, with two expectations per case', () => {
  const CORPUS = readJson(schemaAt('corpus/semver-profile.json'))
  const base = SOURCE_CORPUS.base

  it.each(CORPUS.cases as any[])('version $version', (testCase: any) => {
    const pkg = { ...base, version: testCase.version }

    // grammarValid is the runtime reader's question, asked on every build.
    const dir = mkdtempSync(join(tmpdir(), 'cyweb-semver-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
    const snapshot = readPackageSnapshot(dir)
    if (!testCase.grammarValid) {
      expect(() => parseAppMeta(snapshot)).toThrow(/canonical SemVer/)
      return
    }
    expect(parseAppMeta(snapshot).version).toBe(testCase.version)

    // submissionProfileValid is asked only where a manifest is built.
    if (testCase.submissionProfileValid) {
      expect(buildFrom(pkg).manifest.version).toBe(testCase.version)
    } else {
      expect(() => buildFrom(pkg)).toThrow(/"version"/)
    }
  })

  it('has at least one case that is grammar-valid and profile-invalid', () => {
    // If it did not, the split would be untested and could quietly collapse.
    expect(
      CORPUS.cases.some(
        (c: any) => c.grammarValid && !c.submissionProfileValid,
      ),
    ).toBe(true)
  })
})

describe('the reserved-id corpus', () => {
  it.each([...PREDICATES.reservedIds.values])(
    'the runtime reader rejects %s',
    (id) => {
      // A RUNTIME rule, not a submission-profile one: the host indexes apps in
      // ordinary objects, where these names collide with inherited properties.
      const dir = mkdtempSync(join(tmpdir(), 'cyweb-reserved-'))
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          ...SOURCE_CORPUS.base,
          cyweb: { id, displayName: 'X', port: 6000 },
        }),
      )
      expect(() => parseAppMeta(readPackageSnapshot(dir))).toThrow(/reserved/)
    },
  )

  it.each([...PREDICATES.reservedIds.values])(
    'canonical wire validation rejects %s',
    (id) => {
      expect(
        validateCyManifestWire({ ...WIRE_CORPUS.valid, id }).join('\n'),
      ).toContain('reserved')
    },
  )
})

describe('the artifacts as they ship, not as they sit in the workspace', () => {
  // The App Store pins these by $id and SHA-256 digest, taken over the exact
  // raw bytes of the packed candidate — no newline normalization, no
  // transcoding, no JSON canonicalization, because a digest over the same
  // content reformatted pins nothing. Validating against the workspace copy
  // would not prove the shipped copy is the same file.
  it('packs the schema, the predicates and the corpora, byte-identical to the ledger', async () => {
    const { execFileSync } = await import('node:child_process')
    const packageRoot = join(import.meta.dirname, '..')
    const out = mkdtempSync(join(tmpdir(), 'cyweb-pack-'))

    const tarball = execFileSync(
      'npm',
      ['pack', '--pack-destination', out, '--silent'],
      {
        cwd: packageRoot,
        encoding: 'utf8',
      },
    )
      .trim()
      .split('\n')
      .at(-1) as string
    execFileSync('tar', ['-xzf', join(out, tarball), '-C', out])

    const packed = (name: string): string =>
      join(out, 'package', 'schema', name)

    for (const entry of LEDGER.entries) {
      const bytes = readFileSync(packed(entry.file))
      expect(
        `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        `${entry.file} in the tarball differs from the ledger`,
      ).toBe(entry.sha256)
    }

    // And the fixtures still pass against the schema resolved from the tarball.
    const packedSchema = readJson(packed('cy-manifest-v1.schema.json'))
    const validatePacked = new Ajv2020({
      strict: false,
      allErrors: true,
    }).compile(packedSchema)
    for (const testCase of SOURCE_CORPUS.cases) {
      if (testCase.expectInvalid !== undefined) continue
      const { manifest } = buildFrom({
        ...SOURCE_CORPUS.base,
        ...testCase.package,
      })
      expect(validatePacked(manifest), `${testCase.name}`).toBe(true)
    }
  }, 120_000)
})

describe('the producer never emits what the wire rules reject', () => {
  // Three separate bugs made this false at once — an SSH password dropped
  // rather than refused, `…/repo.git/` keeping its suffix because `.git$` does
  // not match a trailing slash, and a homepage growing past its limit when the
  // URL parser percent-encoded it. Each was a different mistake producing the
  // same class of defect, which is why the invariant is now asserted rather
  // than trusted once per normalizer.
  const hostile = [
    {
      name: 'an SSH URL with a password',
      pkg: { repository: 'ssh://git:secret@github.com/e/a.git' },
    },
    {
      name: 'a repository with a trailing slash after .git',
      pkg: { repository: 'https://github.com/e/a.git/' },
    },
    {
      name: 'a repository path needing percent-encoding',
      pkg: { repository: 'https://github.com/e/repo name' },
    },
    {
      name: 'a repository path with a non-ASCII segment',
      pkg: { repository: 'https://github.com/e/リポジトリ' },
    },
    {
      name: 'a homepage that grows past its limit when encoded',
      pkg: { homepage: `https://example.org/${'あ'.repeat(200)}` },
    },
    {
      name: 'a homepage with a trailing-dot host',
      pkg: { homepage: 'https://example.org./x' },
    },
    {
      name: 'an author that is only an email',
      pkg: { author: 'jane@example.org' },
    },
    {
      name: 'keywords that differ only by ASCII case',
      pkg: { keywords: ['Layout', 'layout'] },
    },
    {
      name: 'a repository shorthand',
      pkg: { repository: 'github:example/app' },
    },
  ]

  it.each(hostile)(
    '$name either fails, or produces a canonical manifest',
    ({ pkg }) => {
      let manifest
      try {
        manifest = buildFrom({ ...SOURCE_CORPUS.base, ...pkg }).manifest
      } catch (error) {
        // Rejecting the input is fine. Emitting something invalid is not.
        expect((error as Error).message).not.toContain('internal:')
        return
      }
      expect(validateCyManifestWire(manifest)).toEqual([])
      expect(validateSchema(manifest)).toBe(true)
    },
  )

  it('refuses an SSH password rather than dropping it', () => {
    // Silently discarding it is how a credential committed to package.json
    // reaches a public manifest as if it had never been there.
    expect(() =>
      buildFrom({
        ...SOURCE_CORPUS.base,
        repository: 'ssh://git:secret@github.com/e/a.git',
      }),
    ).toThrow(/carries credentials/)
  })

  it('strips a trailing slash before the .git suffix, not after', () => {
    expect(
      buildFrom({
        ...SOURCE_CORPUS.base,
        repository: 'https://github.com/e/a.git/',
      }).manifest.repository,
    ).toBe('https://github.com/e/a')
  })

  it('rejects a repository path the URL parser would percent-encode', () => {
    expect(() =>
      buildFrom({
        ...SOURCE_CORPUS.base,
        repository: 'https://github.com/e/repo name',
      }),
    ).toThrow(/percent-encoded/)
  })

  it('measures the homepage limit on what it emits, not on what it read', () => {
    expect(() =>
      buildFrom({
        ...SOURCE_CORPUS.base,
        homepage: `https://example.org/${'あ'.repeat(200)}`,
      }),
    ).toThrow(/once percent-encoded/)
  })
})
