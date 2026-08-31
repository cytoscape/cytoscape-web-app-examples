// `cyweb-app manifest`, as a function and as a process.
//
// The function cases are cheap, so they carry the matrix. The process cases
// carry what only a real process shows — that stdout and stderr really are
// separate streams, and that the exit code is what a script will see — and they
// run against a FRESHLY PACKED candidate, because package-local tests do not
// build dist/ first and a stale workspace build must not be what is exercised.

import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import AdmZip from 'adm-zip'
import { beforeAll, describe, expect, it } from 'vitest'

import { parseAppMeta, parseSubmissionMeta, readPackageSnapshot } from '../src/vite/appMeta.js'
import { runManifest } from '../src/cli/manifest.js'
import { zipForAppStore } from '../src/vite/zipForAppStore.js'
import { appRootFixture } from './fixtures/appRoot.js'

const PKG = {
  name: '@example/my-app',
  version: '1.0.0',
  description: 'Colors nodes by degree',
  author: 'Jane Doe',
  license: 'MIT',
  cyweb: { id: 'myApp', displayName: 'My App', port: 6431 },
}

const appRoot = (pkg: unknown = PKG): string => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-manifest-cmd-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  return dir
}

describe('where the output goes', () => {
  it('puts JSON on stdout and warnings on stderr', () => {
    // `cyweb-app manifest > file` has to be a usable thing to type.
    const { stdout, stderr, exitCode } = runManifest({ root: appRoot(), force: false })
    expect(exitCode).toBe(0)
    expect(JSON.parse(stdout).id).toBe('myApp')
    expect(stdout).not.toContain('·')
    expect(stderr).toContain('repository is not declared')
  })

  it('leaves stdout empty when writing to --out', () => {
    const root = appRoot()
    const out = join(root, 'cy-manifest.json')
    const { stdout, exitCode } = runManifest({ root, out, force: false })
    expect(exitCode).toBe(0)
    expect(stdout).toBe('')
    expect(JSON.parse(readFileSync(out, 'utf8')).id).toBe('myApp')
  })

  it('reports invalid metadata on stderr and exits 1', () => {
    const root = appRoot({ ...PKG, homepage: 'ftp://example.org' })
    const { stdout, stderr, exitCode } = runManifest({ root, force: false })
    expect(exitCode).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('ftp')
  })
})

describe('--out is unrestricted, but not surprising', () => {
  it('refuses an existing destination without --force', () => {
    const root = appRoot()
    const out = join(root, 'existing.json')
    writeFileSync(out, 'keep me\n')
    const { stderr, exitCode } = runManifest({ root, out, force: false })
    expect(exitCode).toBe(1)
    expect(stderr).toContain('--force')
    expect(readFileSync(out, 'utf8')).toBe('keep me\n')
  })

  it('overwrites it with --force', () => {
    const root = appRoot()
    const out = join(root, 'existing.json')
    writeFileSync(out, 'replace me\n')
    expect(runManifest({ root, out, force: true }).exitCode).toBe(0)
    expect(JSON.parse(readFileSync(out, 'utf8')).id).toBe('myApp')
  })

  it('writes anywhere the developer names — it is a typed argument, not derived', () => {
    const root = appRoot()
    const elsewhere = mkdtempSync(join(tmpdir(), 'cyweb-elsewhere-'))
    const out = join(elsewhere, 'deep.json')
    expect(runManifest({ root, out, force: false }).exitCode).toBe(0)
    expect(existsSync(out)).toBe(true)
  })

  it('refuses a symlink destination rather than writing through it', () => {
    const root = appRoot()
    const target = join(root, 'target.json')
    writeFileSync(target, 'original\n')
    const link = join(root, 'link.json')
    symlinkSync(target, link)

    const { stderr, exitCode } = runManifest({ root, out: link, force: true })
    expect(exitCode).toBe(1)
    expect(stderr).toContain('symbolic link')
    expect(readFileSync(target, 'utf8')).toBe('original\n')
  })

  it('refuses a symlinked ancestor, where the typed path is not the written path', () => {
    const root = appRoot()
    const real = join(root, 'real')
    mkdirSync(real)
    symlinkSync(real, join(root, 'linked'))

    const { stderr, exitCode } = runManifest({
      root,
      out: join(root, 'linked', 'cy-manifest.json'),
      force: false,
    })
    expect(exitCode).toBe(1)
    expect(stderr).toContain('symbolic link')
  })

  it('reports a missing parent directory instead of creating one', () => {
    const root = appRoot()
    const { stderr, exitCode } = runManifest({
      root,
      out: join(root, 'nope', 'cy-manifest.json'),
      force: false,
    })
    expect(exitCode).toBe(1)
    expect(stderr).toContain('does not create directories')
  })

  it('leaves no temporary file behind', () => {
    const root = appRoot()
    runManifest({ root, out: join(root, 'a.json'), force: false })
    runManifest({ root, out: join(root, 'a.json'), force: false }) // refused
    expect(readdirSync(root).filter((f) => f.includes('.tmp-'))).toEqual([])
  })
})

describe('paths resolve against the current directory', () => {
  it('takes --root and --out relative to cwd, not to each other', () => {
    const parent = mkdtempSync(join(tmpdir(), 'cyweb-cwd-'))
    mkdirSync(join(parent, 'app'))
    writeFileSync(join(parent, 'app', 'package.json'), JSON.stringify(PKG))

    const { exitCode } = runManifest({
      root: 'app',
      out: 'out.json',
      force: false,
      cwd: parent,
    })
    expect(exitCode).toBe(0)
    expect(existsSync(join(parent, 'out.json'))).toBe(true)
    expect(existsSync(join(parent, 'app', 'out.json'))).toBe(false)
  })
})

describe('the packed candidate, as a real process', () => {
  let cli = ''
  let extracted = ''

  beforeAll(() => {
    // npm pack runs prepack, so this is a fresh build of the candidate — not
    // whatever happens to be sitting in the workspace dist/.
    const packageRoot = join(import.meta.dirname, '..')
    extracted = mkdtempSync(join(tmpdir(), 'cyweb-cli-pack-'))
    const tarball = execFileSync('npm', ['pack', '--pack-destination', extracted, '--silent'], {
      cwd: packageRoot,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .at(-1) as string
    execFileSync('tar', ['-xzf', join(extracted, tarball), '-C', extracted])
    cli = join(extracted, 'package', 'dist', 'cli', 'cyweb-app.js')
  }, 120_000)

  // spawnSync, not execFileSync: the success path has stderr output too, and
  // execFileSync only hands it back when the process fails.
  const run = (args: string[]): { status: number; stdout: string; stderr: string } => {
    const result = spawnSync('node', [cli, ...args], { encoding: 'utf8' })
    return { status: result.status ?? -1, stdout: result.stdout, stderr: result.stderr }
  }

  /** The version the packed CLI will report, read from the extracted tarball. */
  const packedSdkVersion = (): string =>
    JSON.parse(readFileSync(join(extracted, 'package', 'package.json'), 'utf8')).version as string

  it('runs the packed binary, not the workspace one', () => {
    expect(cli).toContain('cyweb-cli-pack-')
    expect(existsSync(cli)).toBe(true)
  })

  it('exits 0 with JSON on stdout and warnings on stderr', () => {
    const { status, stdout, stderr } = run(['manifest', '--root', appRoot()])
    expect(status).toBe(0)
    expect(() => JSON.parse(stdout)).not.toThrow()
    expect(stderr).toContain('repository is not declared')
  })

  it('exits 2 on a usage error and 1 on work that failed', () => {
    expect(run(['manifest', '--nope']).status).toBe(2)
    expect(run(['manifest', '--force']).status).toBe(2)
    expect(run(['nonsense']).status).toBe(2)
    expect(run(['manifest', '--root', mkdtempSync(join(tmpdir(), 'empty-'))]).status).toBe(1)
  })

  it('says nothing on stdout when writing to --out', () => {
    const root = appRoot()
    const { status, stdout } = run(['manifest', '--root', root, '--out', join(root, 'm.json')])
    expect(status).toBe(0)
    expect(stdout).toBe('')
    expect(existsSync(join(root, 'm.json'))).toBe(true)
  })

  it('prints usage to stderr on a usage error, and to stdout for --help', () => {
    expect(run(['--help']).stdout).toContain('cyweb-app manifest')
    expect(run(['--nope']).stderr).toContain('cyweb-app manifest')
    expect(run(['--nope']).stdout).toBe('')
  })

  it('is byte-identical to the copy the packager embeds in an archive', async () => {
    // The whole reason both call one serializer. "Equal objects" would pass with
    // different spacing; this would not.
    //
    // The archive is built HERE rather than read from wherever another suite
    // left one: a stale archive carries the generator string of whichever SDK
    // version built it, so the comparison would pass or fail on suite order and
    // on how recently someone ran a release.
    const root = appRootFixture()
    const snapshot = readPackageSnapshot(root)
    const plugin = zipForAppStore({
      appMeta: parseAppMeta(snapshot),
      submissionMeta: parseSubmissionMeta(snapshot),
      expectedShared: {},
      sdkVersion: packedSdkVersion(),
    }) as any
    const silent = { error: (m: string) => { throw new Error(m) }, warn: () => {}, info: () => {} }
    plugin.configResolved({ root, build: { outDir: 'dist' } })
    plugin.buildStart.call(silent)
    await plugin.closeBundle.call(silent)

    const embedded = new AdmZip(join(root, 'myApp-1.0.0.zip')).readFile('cy-manifest.json') as Buffer
    const printed = execFileSync('node', [cli, 'manifest', '--root', root], {
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    expect(Buffer.compare(embedded, printed)).toBe(0)
  })
})
