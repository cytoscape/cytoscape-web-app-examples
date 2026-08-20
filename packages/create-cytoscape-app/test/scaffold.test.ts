// The scaffolder's contract, minus the filesystem where possible.
//
// The end-to-end property — scaffold, build, verify, under npm and pnpm — is a
// CI job, because it is the only thing that proves a template still works.
// What is here is everything that can fail without a build: the validation that
// must run BEFORE anything is written, and the package.json the generator emits.

import { existsSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  API_TYPES_VERSION,
  CROSS_ENV_VERSION,
  SDK_VERSION,
  HOST_SINGLETONS,
  RESERVED_PORTS,
  TEMPLATES,
  displayNameFromId,
  idFromDirectory,
  scaffold,
  validateSpec,
  type ScaffoldSpec,
} from '../src/scaffold.js'

const tmp = (): string => mkdtempSync(join(tmpdir(), 'cca-'))

const spec = (over: Partial<ScaffoldSpec> = {}): ScaffoldSpec => ({
  targetDir: join(tmp(), 'my-app'),
  packageName: 'my-app',
  id: 'myApp',
  displayName: 'My App',
  description: 'A Cytoscape Web app',
  version: '0.1.0',
  port: 6000,
  template: 'panel',
  ...over,
})

describe('idFromDirectory', () => {
  it.each([
    ['my-app', 'myApp'],
    ['degree_colorizer', 'degreeColorizer'],
    ['MyApp', 'myApp'],
    ['/a/b/network-stats', 'networkStats'],
    ['@you/my-app', 'myApp'],
  ])('%s -> %s', (dir, expected) => {
    expect(idFromDirectory(dir)).toBe(expected)
  })

  it('never produces something that is not an identifier', () => {
    // A directory can be called anything; the id cannot.
    for (const dir of ['123', '---', 'a b c', '.hidden']) {
      expect(idFromDirectory(dir)).toMatch(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)
    }
  })
})

describe('displayNameFromId', () => {
  it.each([
    ['myApp', 'My App'],
    ['degreeColorizer', 'Degree Colorizer'],
    ['hello', 'Hello'],
  ])('%s -> %s', (id, expected) => {
    expect(displayNameFromId(id)).toBe(expected)
  })
})

describe('validateSpec', () => {
  it('accepts a well-formed spec', () => {
    expect(validateSpec(spec())).toEqual([])
  })

  it.each([
    ['a hyphenated id', { id: 'my-app' }, /JavaScript identifier/],
    ['the reserved id', { id: 'cyweb' }, /reserved/],
    ['a non-canonical version', { version: '1.0' }, /canonical SemVer/],
    ['an unknown template', { template: 'nope' as never }, /not one of/],
    ['a privileged port', { port: 80 }, /1024\.\.65535/],
    ['an out-of-range port', { port: 70000 }, /1024\.\.65535/],
    ['an invalid package name', { packageName: 'Bad Name' }, /npm package name/],
    ['an empty display name', { displayName: '  ' }, /display-name/],
  ])('rejects %s', (_label, over, pattern) => {
    expect(validateSpec(spec(over)).join(' ')).toMatch(pattern)
  })

  it('reports every problem at once', () => {
    // One per run, when the whole list was knowable on the first, costs an
    // agent a round trip per mistake.
    expect(validateSpec(spec({ id: 'no-good', version: 'x', port: 1 }))).toHaveLength(3)
  })

  it('rejects a non-empty target', () => {
    const dir = join(tmp(), 'occupied')
    mkdirSync(dir)
    writeFileSync(join(dir, 'keep.me'), '')
    expect(validateSpec(spec({ targetDir: dir })).join(' ')).toMatch(/not empty/)
  })

  it('accepts an existing EMPTY target', () => {
    const dir = join(tmp(), 'empty')
    mkdirSync(dir)
    expect(validateSpec(spec({ targetDir: dir }))).toEqual([])
  })

  it('refuses to write through a symlink', () => {
    // lstat, not stat: a symlink to a directory otherwise passes and the
    // generator writes into somewhere the caller did not name.
    const root = tmp()
    const real = join(root, 'real')
    const link = join(root, 'link')
    mkdirSync(real)
    symlinkSync(real, link)
    expect(validateSpec(spec({ targetDir: link })).join(' ')).toMatch(/symlink/)
  })
})

describe('scaffold', () => {
  const templatesRoot = new URL('../templates', import.meta.url).pathname

  it.each(TEMPLATES)('writes a complete %s project', (template) => {
    const s = spec({ template })
    const files = scaffold(s, templatesRoot)

    expect(files).toContain('package.json')
    expect(files).toContain('vite.config.ts')
    expect(files).toContain('index.html')
    expect(files).toContain('AGENTS.md')
    expect(files).toContain('README.md')
    expect(files).toContain('.gitignore')
    expect(files.some((f) => f.startsWith('src/index.'))).toBe(true)
    expect(files.some((f) => f.startsWith('test/'))).toBe(true)
  })

  it('leaves no TODO marker behind', () => {
    // Everything the template's TODOs pointed at is now filled in by the
    // generator, so shipping one would be an instruction to edit something
    // that is already correct.
    const s = spec({ template: 'full' })
    for (const file of scaffold(s, templatesRoot)) {
      if (!/\.(ts|tsx|json|md|html)$/.test(file)) continue
      expect(readFileSync(join(s.targetDir, file), 'utf8')).not.toMatch(/TODO:/)
    }
  })

  it('writes identity ONCE, into package.json', () => {
    const s = spec({ id: 'degreeColorizer', displayName: 'Degree Colorizer', port: 6123 })
    scaffold(s, templatesRoot)
    const pkg = JSON.parse(readFileSync(join(s.targetDir, 'package.json'), 'utf8'))

    expect(pkg.cyweb).toEqual({ id: 'degreeColorizer', displayName: 'Degree Colorizer', port: 6123 })
    // Nothing in src/ repeats it: the app reads virtual:cyweb-app-meta.
    expect(readFileSync(join(s.targetDir, 'src/MyApp.tsx'), 'utf8')).not.toContain('degreeColorizer')
  })

  it('pins api-types exactly, not as a range', () => {
    // A caret floats across betas, which is how the examples ended up a version
    // behind the declarations they were written against.
    const s = spec()
    scaffold(s, templatesRoot)
    const pkg = JSON.parse(readFileSync(join(s.targetDir, 'package.json'), 'utf8'))
    expect(pkg.devDependencies['@cytoscape-web/api-types']).toBe(API_TYPES_VERSION)
    expect(API_TYPES_VERSION).not.toMatch(/^[\^~]/)
  })

  it('writes peerDependencies from the SDK, not from whatever npm resolves', () => {
    // `npm install @emotion/react@^11.10.4` records ^11.14.0 — the version it
    // RESOLVED — and cyweb-app verify then fails on a project nobody touched.
    const s = spec()
    scaffold(s, templatesRoot)
    const pkg = JSON.parse(readFileSync(join(s.targetDir, 'package.json'), 'utf8'))
    expect(pkg.peerDependencies).toEqual(HOST_SINGLETONS)
  })

  it('gives a non-React app no peers and no React plugin dependency', () => {
    const s = spec({ template: 'non-react' })
    scaffold(s, templatesRoot)
    const pkg = JSON.parse(readFileSync(join(s.targetDir, 'package.json'), 'utf8'))
    expect(pkg.peerDependencies).toBeUndefined()
    expect(pkg.devDependencies['@vitejs/plugin-react']).toBeUndefined()
  })

  it('ships .gitignore under its real name', () => {
    // npm silently renames .gitignore inside a published package, so it travels
    // as a template file and is written out here.
    const s = spec()
    scaffold(s, templatesRoot)
    expect(existsSync(join(s.targetDir, '.gitignore'))).toBe(true)
  })
})

describe('port defaults', () => {
  it('reserves the ports the examples and the host already bind', () => {
    expect(RESERVED_PORTS).toContain(5500)
    for (const p of [2222, 3333, 5555, 6100, 7000]) expect(RESERVED_PORTS).toContain(p)
  })
})

describe('SDK_VERSION', () => {
  const runtimeVersion = JSON.parse(
    readFileSync(join(__dirname, '../../app-runtime/package.json'), 'utf8'),
  ).version as string

  // The failure this guards against is silent and was shipped once: the docs
  // described CYWEB_DEV_HOST while scaffolded apps still resolved a runtime
  // that ignored it. No error, no warning — only a dev-server banner naming
  // the wrong host, which nobody compares against a document.
  it('admits the app-runtime in this workspace', () => {
    const range = SDK_VERSION.match(/^\^(\d+)\.(\d+)\.(\d+)$/)
    expect(range, `SDK_VERSION must look like ^x.y.z, got ${SDK_VERSION}`).not.toBeNull()
    const actual = runtimeVersion.match(/^(\d+)\.(\d+)\.(\d+)/)
    expect(actual).not.toBeNull()

    const [, rMajor, rMinor, rPatch] = range as RegExpMatchArray
    const [, aMajor, aMinor, aPatch] = actual as RegExpMatchArray
    expect(aMajor).toBe(rMajor)

    // A 0.x caret pins the MINOR: ^0.1.0 is >=0.1.0 <0.2.0, so publishing
    // 0.2.0 without raising this leaves every new project on the old runtime.
    if (rMajor === '0') {
      expect(
        aMinor,
        `app-runtime is ${runtimeVersion} but scaffolds pin ${SDK_VERSION}, ` +
          `which cannot resolve it — raise SDK_VERSION in the same change`,
      ).toBe(rMinor)
    }

    const admitsPatch =
      Number(aMinor) > Number(rMinor) ||
      (aMinor === rMinor && Number(aPatch) >= Number(rPatch))
    expect(admitsPatch).toBe(true)
  })
})

describe('build:zip', () => {
  const templatesRoot = new URL('../templates', import.meta.url).pathname
  const generated = (): any => {
    const s = spec()
    scaffold(s, templatesRoot)
    return JSON.parse(readFileSync(join(s.targetDir, 'package.json'), 'utf8'))
  }

  // The App Store zip is off by default, so producing one has to be reachable
  // without editing vite.config.ts. `npm run` lists this; a variable name does
  // not appear anywhere until you already know it.
  it('is a script the generated project ships', () => {
    const pkg = generated()
    expect(pkg.scripts['build:zip']).toContain('CYWEB_APP_ZIP=1')
    expect(pkg.scripts['build:zip']).toContain('vite build')
  })

  // `VAR=1 cmd` is not valid in cmd.exe. Without cross-env the script would
  // work on two platforms of three, which is worse than not shipping it.
  it('brings the dependency that makes it work on Windows', () => {
    expect(generated().devDependencies['cross-env']).toBe(CROSS_ENV_VERSION)
  })

  it('leaves the plain build alone', () => {
    expect(generated().scripts.build).toBe('vite build')
  })
})
