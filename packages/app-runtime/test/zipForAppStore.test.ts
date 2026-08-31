// The packager, driven through its own hooks.
//
// The existing option test never invoked it, so nothing held the archive itself
// to anything. These cases run `buildStart` and `closeBundle` over a real
// directory and open what comes out.

import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'

import { parseAppMeta, parseSubmissionMeta, readPackageSnapshot } from '../src/vite/appMeta.js'
import { CYWEB_HOST_REQUIRED } from '../src/runtime/cywebHostSentinel.js'
import { zipForAppStore } from '../src/vite/zipForAppStore.js'

const APP_META = {
  id: 'myApp',
  displayName: 'My App',
  port: 6431,
  version: '1.0.0',
  description: 'Colors nodes by degree',
}

/** A build output good enough to pass verification is not the point here. */
const appRoot = (over: { version?: string } = {}): string => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-zip-'))
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: '@example/my-app',
      version: over.version ?? '1.0.0',
      description: 'Colors nodes by degree',
      cyweb: APP_META,
    }),
  )
  const dist = join(dir, 'dist')
  mkdirSync(join(dist, 'assets'), { recursive: true })

  // Enough of a real build to pass verification, which the packager now runs
  // before it will write anything: an ESM entry with the resolver registered,
  // and the audit fields `manifest.additionalData` embeds.
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

interface Recorded {
  warnings: string[]
  infos: string[]
}

/** Runs the plugin the way Vite would, and reports what it said. */
const runPackager = async (root: string): Promise<{ error?: string; recorded: Recorded }> => {
  const snapshot = readPackageSnapshot(root)
  const plugin = zipForAppStore({
    appMeta: parseAppMeta(snapshot),
    submissionMeta: parseSubmissionMeta(snapshot),
    expectedShared: {},
    sdkVersion: '0.4.0-next.1',
  }) as any

  const recorded: Recorded = { warnings: [], infos: [] }
  const context = {
    error: (message: string) => {
      throw new Error(message)
    },
    warn: (message: string) => recorded.warnings.push(message),
    info: (message: string) => recorded.infos.push(message),
  }

  plugin.configResolved({ root, build: { outDir: 'dist' } })
  plugin.buildStart.call(context)
  try {
    await plugin.closeBundle.call(context)
  } catch (cause) {
    return { error: (cause as Error).message, recorded }
  }
  return { recorded }
}

const membersOf = (zipPath: string): string[] =>
  new AdmZip(zipPath, { noSort: true } as any).getEntries().map((e) => e.entryName)

describe('the archive it writes', () => {
  it('contains one root manifest, one root entry, and no denied class', async () => {
    const root = appRoot()
    const { error } = await runPackager(root)
    expect(error).toBeUndefined()

    const members = membersOf(join(root, 'myApp-1.0.0.zip'))
    expect(members.filter((m) => m === 'cy-manifest.json')).toHaveLength(1)
    expect(members.filter((m) => m === 'remoteEntry.js')).toHaveLength(1)
    expect(members).not.toContain('index.html')
    expect(members).not.toContain('mf-stats.json')
  })

  it('names the manifest identity after package.json and the container', async () => {
    const root = appRoot()
    await runPackager(root)
    const manifest = JSON.parse(
      new AdmZip(join(root, 'myApp-1.0.0.zip')).readAsText('cy-manifest.json'),
    )
    expect(manifest.id).toBe('myApp')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.entry).toBe('remoteEntry.js')
  })

  it('emits members in unsigned UTF-8 byte order', async () => {
    const root = appRoot()
    writeFileSync(join(root, 'dist', 'assets', 'Zed.js'), '\n')
    writeFileSync(join(root, 'dist', 'assets', '_under.js'), '\n')
    await runPackager(root)

    const members = membersOf(join(root, 'myApp-1.0.0.zip'))
    expect([...members]).toEqual([...members].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))))
    // `Z` (0x5A) before `_` (0x5F) before lowercase — not adm-zip's default,
    // which lowercases and then localeCompares.
    expect(members.indexOf('assets/Zed.js')).toBeLessThan(members.indexOf('assets/_under.js'))
  })

  it('warns about the build-machine paths a developer upload would disclose', async () => {
    const root = appRoot()
    writeFileSync(
      join(root, 'dist', 'remoteEntry.js'),
      'export { a as init, b as get }\nregister("cyweb-host-resolver")\n' +
        'const p = "/home/someone/project/node_modules/x"\n',
    )
    const { recorded } = await runPackager(root)
    expect(recorded.warnings.join('\n')).toContain('may disclose your username')
  })

  it('warns for each recommended field the package does not declare', async () => {
    const { recorded } = await runPackager(appRoot())
    expect(recorded.warnings.join('\n')).toContain('author is not declared')
    expect(recorded.warnings.join('\n')).toContain('policy-pending')
  })
})

describe('what it refuses to package', () => {
  it('rejects a symlinked file rather than storing its target', async () => {
    // addLocalFile would have stored the TARGET's content as an ordinary
    // member, leaving the Store unable to tell it came from outside the build.
    const root = appRoot()
    const outside = join(root, 'secret.js')
    writeFileSync(outside, 'export const secret = 1\n')
    symlinkSync(outside, join(root, 'dist', 'assets', 'linked.js'))

    const { error } = await runPackager(root)
    expect(error).toContain('symbolic link')
    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(false)
  })

  it('rejects a symlinked directory', async () => {
    const root = appRoot()
    mkdirSync(join(root, 'elsewhere'))
    writeFileSync(join(root, 'elsewhere', 'x.js'), '\n')
    symlinkSync(join(root, 'elsewhere'), join(root, 'dist', 'assets', 'linked'))
    expect((await runPackager(root)).error).toContain('symbolic link')
  })

  it('rejects a broken link', async () => {
    // Verification reaches it first — it reads every .js file in the output —
    // so the message names the unreadable file rather than the link. What
    // matters is that nothing is packaged and the file is named.
    const root = appRoot()
    symlinkSync(join(root, 'nothing-here.js'), join(root, 'dist', 'assets', 'dangling.js'))
    const { error } = await runPackager(root)
    expect(error).toContain('assets/dangling.js')
    expect(error).toContain('could not be read')
    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(false)
  })

  it('rejects a FIFO, which is not a regular file', async () => {
    const root = appRoot()
    try {
      execFileSync('mkfifo', [join(root, 'dist', 'assets', 'pipe')])
    } catch {
      return // no mkfifo on this platform; the rule is still asserted above
    }
    expect((await runPackager(root)).error).toContain('not a regular file')
  })

  it('refuses an unmatched extension', async () => {
    const root = appRoot()
    writeFileSync(join(root, 'dist', 'assets', 'data.csv'), 'a,b\n')
    const { error } = await runPackager(root)
    expect(error).toContain('no publish class covers')
    expect(error).toContain('data.csv')
  })

  it('refuses a cy-manifest.json that is already in the build output', async () => {
    const root = appRoot()
    writeFileSync(join(root, 'dist', 'cy-manifest.json'), '{"formatVersion":1}\n')
    expect((await runPackager(root)).error).toContain('already exists')
  })
})

describe('the stale-output guarantee, scoped exactly', () => {
  it('leaves nothing at this run\'s final path when packaging fails', async () => {
    const root = appRoot()
    await runPackager(root) // a good archive first
    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(true)

    writeFileSync(join(root, 'dist', 'assets', 'data.csv'), 'a,b\n')
    const { error } = await runPackager(root)
    expect(error).toBeDefined()
    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(false)
  })

  it('leaves an earlier version\'s archive alone', async () => {
    // Deliberate. Removing files this run cannot name is how a packager deletes
    // a release someone still wanted.
    const root = appRoot()
    await runPackager(root)
    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(true)

    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: '@example/my-app', version: '1.1.0', cyweb: APP_META }),
    )
    await runPackager(root)

    expect(existsSync(join(root, 'myApp-1.1.0.zip'))).toBe(true)
    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(true)
  })

  it('leaves no temporary file behind, on success or on failure', async () => {
    const root = appRoot()
    await runPackager(root)
    writeFileSync(join(root, 'dist', 'assets', 'data.csv'), 'a,b\n')
    await runPackager(root)
    expect(readdirSync(root).filter((f) => f.includes('.tmp-'))).toEqual([])
  })
})

describe('the captured snapshot is what gets packaged', () => {
  it('ignores a package.json edited after the plugin was constructed', async () => {
    // `defineCyWebApp` takes one snapshot at config time and hands it to the
    // packager. If the packager re-read the file instead, a mid-build edit could
    // put one identity in the container and a different one in the archive.
    const root = appRoot()
    const snapshot = readPackageSnapshot(root)
    const plugin = zipForAppStore({
      appMeta: parseAppMeta(snapshot),
      submissionMeta: parseSubmissionMeta(snapshot),
      expectedShared: {},
      sdkVersion: '0.4.0-next.1',
    }) as any

    // Everything the manifest and the filename come from, changed underneath.
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: '@example/other',
        version: '9.9.9',
        description: 'a different description',
        author: 'Someone Else',
        peerDependencies: { react: '18.3.1' },
        cyweb: { id: 'otherApp', displayName: 'Other App', port: 6432 },
      }),
    )

    const context = { error: (m: string) => { throw new Error(m) }, warn: () => {}, info: () => {} }
    plugin.configResolved({ root, build: { outDir: 'dist' } })
    plugin.buildStart.call(context)
    await plugin.closeBundle.call(context)

    expect(existsSync(join(root, 'myApp-1.0.0.zip'))).toBe(true)
    expect(existsSync(join(root, 'otherApp-9.9.9.zip'))).toBe(false)

    const manifest = JSON.parse(
      new AdmZip(join(root, 'myApp-1.0.0.zip')).readAsText('cy-manifest.json'),
    )
    expect(manifest.id).toBe('myApp')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.description).toBe('Colors nodes by degree')
    expect(manifest.author).toBeUndefined()
  })
})
