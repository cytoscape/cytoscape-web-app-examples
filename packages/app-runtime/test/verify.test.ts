// The verifier is now shipped code, so it needs the treatment it gives others:
// proof that each check fails when it should. A gate nobody has seen reject
// anything is not known to work — the same reasoning that made the Vite
// migration exercise its deploy preflight in all three directions.
//
// Built against a synthetic dist/ rather than a real build. The real builds are
// covered by `npm run verify:federation`; what is uncovered without this is the
// verifier's own logic, which a passing repository cannot exercise negatively.

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { verifyApp } from '../src/cli/verify.js'

const PKG = {
  name: '@example/my-app',
  version: '0.1.0',
  description: 'Colors nodes by degree',
  cyweb: { id: 'myApp', displayName: 'My App', port: 6000 },
  peerDependencies: { react: '^18.3.1' },
}

const REMOTE_ENTry_OK =
  'const a=1;export{a as init,a as get};/* cyweb-host-resolver */\n'

const MANIFEST_OK = {
  id: 'myApp',
  name: 'myApp',
  metaData: { remoteEntry: { name: 'remoteEntry.js', path: '', type: 'module' } },
  exposes: [{ name: 'AppConfig', path: './AppConfig' }],
  shared: [{ name: 'react', version: '18.3.1', assets: { js: { sync: [], async: [] } } }],
  remotes: [{ alias: 'cyweb', moduleName: 'x', entry: 'y' }],
  configuredShared: { react: { singleton: true, import: false, requiredVersion: '^18.3.1' } },
  configuredRemote: {
    type: 'module',
    name: 'cyweb',
    entryGlobalName: 'cyweb',
    shareScope: 'default',
    entry: 'cyweb:__CYWEB_HOST_REQUIRED__',
  },
  configuredRuntimePlugins: ['/somewhere/mfRuntimePlugin.js'],
}

/** Writes a synthetic app + build output and returns the app root. */
const fixture = (
  overrides: {
    pkg?: Record<string, unknown>
    manifest?: Record<string, unknown>
    remoteEntry?: string
    extraFiles?: Record<string, string>
  } = {},
): string => {
  const root = mkdtempSync(join(tmpdir(), 'cyweb-verify-'))
  const dist = join(root, 'dist')
  mkdirSync(join(dist, 'assets'), { recursive: true })

  writeFileSync(join(root, 'package.json'), JSON.stringify({ ...PKG, ...overrides.pkg }))
  writeFileSync(join(dist, 'remoteEntry.js'), overrides.remoteEntry ?? REMOTE_ENTry_OK)
  writeFileSync(
    join(dist, 'mf-manifest.json'),
    JSON.stringify({ ...MANIFEST_OK, ...overrides.manifest }),
  )
  for (const [name, body] of Object.entries(overrides.extraFiles ?? {})) {
    writeFileSync(join(dist, name), body)
  }
  return root
}

const failuresOf = (root: string, expectExposes?: string[]): string =>
  verifyApp({ root, expectExposes }).failures.join(' | ')

describe('verifyApp', () => {
  it('passes a correct build', () => {
    const result = verifyApp({ root: fixture() })
    expect(result.failures).toEqual([])
    expect(result.checks.length).toBeGreaterThan(10)
  })

  it('rejects a Webpack var library', () => {
    // Resolves NO exports against the ESM host and fails silently — the single
    // least legible failure in the whole setup.
    expect(failuresOf(fixture({ remoteEntry: 'var myApp;(()=>{})()' }))).toMatch(
      /var` library/,
    )
  })

  it('rejects a remote that is not type: module', () => {
    expect(
      failuresOf(fixture({ manifest: { configuredRemote: { ...MANIFEST_OK.configuredRemote, type: 'var' } } })),
    ).toMatch(/type: 'module'/)
  })

  it('rejects a production build carrying a localhost entry', () => {
    expect(
      failuresOf(
        fixture({
          manifest: {
            configuredRemote: {
              ...MANIFEST_OK.configuredRemote,
              entry: 'http://localhost:5500/remoteEntry.js',
            },
          },
        }),
      ),
    ).toMatch(/ships the sentinel/)
  })

  it('rejects a build where the runtime plugin was never registered', () => {
    // The resolver can be named in the config and still not end up wired in, at
    // which point the app silently keeps its compiled-in entry.
    expect(failuresOf(fixture({ remoteEntry: 'const a=1;export{a as init,a as get}' }))).toMatch(
      /resolver was not registered/,
    )
  })

  it('rejects a container name that disagrees with cyweb.id', () => {
    expect(failuresOf(fixture({ manifest: { name: 'somethingElse' } }))).toMatch(
      /package\.json and the artifact disagree/,
    )
  })

  it('names the remedy when only the version range differs', () => {
    // npm install writes the version it RESOLVED into peerDependencies, which is
    // how a scaffolded app drifts from the SDK without anyone touching it.
    expect(
      failuresOf(fixture({ pkg: { peerDependencies: { react: '^18.9.9' } } })),
    ).toMatch(/set peerDependencies\["react"\] to "\^18\.3\.1"/)
  })

  it('rejects shared fallback chunks', () => {
    expect(
      failuresOf(
        fixture({
          manifest: {
            shared: [{ name: 'react', assets: { js: { sync: ['react-abc.js'], async: [] } } }],
          },
        }),
      ),
    ).toMatch(/no shared fallback chunks/)
  })

  it('rejects a developer host URL anywhere in the artifact', () => {
    expect(
      failuresOf(fixture({ extraFiles: { 'assets/x.js': 'e="http://localhost:5500/remoteEntry.js"' } })),
    ).toMatch(/developer host URL/)
  })

  it('rejects a bundled package.json', () => {
    expect(
      failuresOf(fixture({ extraFiles: { 'assets/x.js': 'const p={devDependencies:{vite:"8"}}' } })),
    ).toMatch(/package\.json is not bundled/)
  })

  it('accepts build-machine paths in remoteEntry.js and reports them', () => {
    // Not fatal there: the SSR loader emits them as dead literals on a correct
    // build. Accepted during the Vite migration on the grounds that CI publishes
    // from a fixed runner account.
    const result = verifyApp({
      root: fixture({ remoteEntry: `${REMOTE_ENTry_OK}//" /home/someone/proj/node_modules/react/index.js"` }),
    })
    expect(result.failures).toEqual([])
    expect(result.notes.join(' ')).toMatch(/absolute build-machine path/)
  })

  it('rejects build-machine paths that escaped into a chunk', () => {
    expect(
      failuresOf(
        fixture({ extraFiles: { 'assets/x.js': '"/home/someone/proj/node_modules/react/index.js"' } }),
      ),
    ).toMatch(/confined to remoteEntry\.js/)
  })

  it('asserts only ./AppConfig when the caller declares nothing', () => {
    // Standalone there is no second declaration to compare against, so an extra
    // expose is reported rather than failed.
    const result = verifyApp({
      root: fixture({
        manifest: {
          exposes: [
            { name: 'AppConfig', path: './AppConfig' },
            { name: 'Extra', path: './Extra' },
          ],
        },
      }),
    })
    expect(result.failures).toEqual([])
    expect(result.notes.join(' ')).toMatch(/also exposes \.\/Extra/)
  })

  it('rejects an undeclared expose when the caller does declare', () => {
    expect(
      failuresOf(
        fixture({
          manifest: {
            exposes: [
              { name: 'AppConfig', path: './AppConfig' },
              { name: 'Extra', path: './Extra' },
            ],
          },
        }),
        ['./AppConfig'],
      ),
    ).toMatch(/no undeclared exposes/)
  })

  it('says what to do when there is no build output', () => {
    const root = mkdtempSync(join(tmpdir(), 'cyweb-verify-'))
    writeFileSync(join(root, 'package.json'), JSON.stringify(PKG))
    expect(failuresOf(root)).toMatch(/run the build first/)
  })
})
