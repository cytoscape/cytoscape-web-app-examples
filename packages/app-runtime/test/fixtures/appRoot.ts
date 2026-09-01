import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CYWEB_HOST_REQUIRED } from '../../src/runtime/cywebHostSentinel.js'

/**
 * An app directory with a build output good enough to pass verification.
 *
 * Shared, because two suites need the same thing and a test that reaches for an
 * archive another suite happened to leave behind is a test that passes or fails
 * on the order the suites ran in.
 */

export const APP_CYWEB = {
  id: 'myApp',
  displayName: 'My App',
  port: 6431,
}

export const appRootFixture = (over: { version?: string } = {}): string => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-fixture-'))
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: '@example/my-app',
      version: over.version ?? '1.0.0',
      description: 'Colors nodes by degree',
      cyweb: APP_CYWEB,
    }),
  )

  const dist = join(dir, 'dist')
  mkdirSync(join(dist, 'assets'), { recursive: true })
  writeFileSync(
    join(dist, 'remoteEntry.js'),
    'export { a as init, b as get }\nregister("cyweb-host-resolver")\n',
  )
  writeFileSync(
    join(dist, 'mf-manifest.json'),
    JSON.stringify({
      name: 'myApp',
      metaData: { remoteEntry: { type: 'module' } },
      exposes: [{ path: './AppConfig' }],
      shared: [],
      remotes: [{ alias: 'cyweb' }],
      configuredShared: {},
      configuredRemote: { name: 'cyweb', type: 'module', entry: CYWEB_HOST_REQUIRED },
      configuredRuntimePlugins: ['/somewhere/mfRuntimePlugin.js'],
    }),
  )
  writeFileSync(join(dist, 'assets', 'chunk-Abc.js'), 'export const x = 1\n')
  writeFileSync(join(dist, 'index.html'), '<!doctype html>\n')
  writeFileSync(join(dist, 'mf-stats.json'), '{}\n')
  return dir
}
