import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The version of `@cytoscape-web/api-types` a generated project pins.
 *
 * EXACT, not a range. `^1.0.0-beta.3` floats across betas, which is how the
 * examples ended up on beta.3 while the host source was at beta.4 with a module
 * the published declarations did not have. A generated project gets the version
 * this SDK was tested against, and moves when someone decides to move it.
 */
export const API_TYPES_VERSION = '1.0.0-beta.3'

/**
 * peerDependencies for a React app, and the reason they are written rather than
 * installed.
 *
 * `npm install @emotion/react@^11.10.4` records `^11.14.0` — the version it
 * RESOLVED — so an app assembled by hand drifts from the ranges the SDK actually
 * builds with, and `cyweb-app verify` fails on a project nobody has touched.
 * These come from the SDK's CYWEB_SHARED and are written verbatim.
 */
export const HOST_SINGLETONS: Readonly<Record<string, string>> = {
  '@emotion/react': '^11.10.4',
  '@emotion/styled': '^11.10.4',
  '@mui/material': '^5.18.0',
  react: '^18.3.1',
  'react-dom': '^18.3.1',
}

/**
 * The app-runtime a scaffolded project depends on.
 *
 * Must be raised in the same change that publishes a runtime feature the
 * templates or the docs rely on. `^0.1.0` does not admit `0.2.0` — 0.x carets
 * pin the minor — so leaving it behind produces the worst failure this package
 * has: `CYWEB_DEV_HOST` was documented while scaffolded apps still resolved a
 * runtime that ignored it, with no error and only a banner naming the wrong
 * host to give it away.
 */
export const SDK_VERSION = '^0.2.0'

/**
 * Sets `CYWEB_APP_ZIP` for the `build:zip` script.
 *
 * The one dependency a generated project carries purely for ergonomics.
 * `VAR=1 cmd` is not valid in cmd.exe, so without it `build:zip` would work on
 * two of the three platforms — which is worse than not shipping the script.
 */
export const CROSS_ENV_VERSION = '^10.1.0'
export const TEMPLATES = ['panel', 'menu', 'context-menu', 'non-react', 'full'] as const
export type Template = (typeof TEMPLATES)[number]

/** Ports the example apps bind, plus the host's. A new app should avoid them. */
export const RESERVED_PORTS = [5500, 2222, 3333, 5555, 6100, 7000]

const JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
/** npm's rules, reduced to what a generated name can be. */
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

export interface ScaffoldSpec {
  readonly targetDir: string
  readonly packageName: string
  readonly id: string
  readonly displayName: string
  readonly description: string
  readonly version: string
  readonly port: number
  readonly template: Template
}

/** camelCase a directory name: `my-app` → `myApp`, `@you/my-app` → `myApp`. */
export const idFromDirectory = (dir: string): string => {
  const base = basename(dir).replace(/^@[^/]+\//, '')
  const camel = base
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c === undefined ? '' : c.toUpperCase()))
    .replace(/^[0-9]+/, '')
  return camel === '' ? 'myApp' : `${camel[0].toLowerCase()}${camel.slice(1)}`
}

/** `myApp` → `My App`. Good enough to be edited, not to be argued with. */
export const displayNameFromId = (id: string): string =>
  id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())

/**
 * Everything wrong with a request, all of it, before anything is written.
 *
 * Reporting one problem per run when the whole list was knowable on the first
 * one is a bad trade for whoever is waiting — and for an agent, which would
 * otherwise need a round trip per mistake.
 */
export const validateSpec = (spec: ScaffoldSpec): string[] => {
  const problems: string[] = []

  if (!PACKAGE_NAME.test(spec.packageName)) {
    problems.push(`--package-name "${spec.packageName}" is not a valid npm package name`)
  }
  if (!JS_IDENTIFIER.test(spec.id)) {
    problems.push(
      `--id "${spec.id}" must be a valid JavaScript identifier — it is the Module ` +
        `Federation container name, and the host rejects anything else on install`,
    )
  }
  if (spec.id === 'cyweb') {
    problems.push(`--id "cyweb" is reserved — it is the host's own federation name`)
  }
  if (spec.displayName.trim() === '') problems.push('--display-name must not be empty')
  if (!SEMVER.test(spec.version)) {
    problems.push(`--version "${spec.version}" is not canonical SemVer`)
  }
  if (!Number.isInteger(spec.port) || spec.port < 1024 || spec.port > 65535) {
    problems.push(`--port ${spec.port} must be an integer in 1024..65535`)
  }
  if (!TEMPLATES.includes(spec.template)) {
    problems.push(`--template "${spec.template}" is not one of ${TEMPLATES.join(', ')}`)
  }

  const target = resolve(spec.targetDir)
  if (existsSync(target)) {
    // lstat, not stat: a symlink pointing at a directory would otherwise pass
    // and the generator would write through it into somewhere else entirely.
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) {
      problems.push(`${target} is a symlink — refusing to write through it`)
    } else if (!stat.isDirectory()) {
      problems.push(`${target} exists and is not a directory`)
    } else if (readdirSync(target).length > 0) {
      problems.push(`${target} is not empty`)
    }
  }

  return problems
}

/** True if something is already listening on `port` at localhost. */
export const isPortFree = async (port: number): Promise<boolean> =>
  new Promise((resolvePromise) => {
    const socket = createConnection({ port, host: '127.0.0.1' })
    const done = (free: boolean): void => {
      socket.destroy()
      resolvePromise(free)
    }
    socket.setTimeout(300)
    socket.once('connect', () => done(false))
    socket.once('timeout', () => done(true))
    socket.once('error', () => done(true))
  })

/** First free port from 6000 that no example app has claimed. */
export const pickPort = async (start = 6000): Promise<number> => {
  for (let port = start; port < start + 200; port += 1) {
    if (RESERVED_PORTS.includes(port)) continue
    if (await isPortFree(port)) return port
  }
  return start
}

const packageJsonFor = (spec: ScaffoldSpec): string => {
  const react = spec.template !== 'non-react'
  return `${JSON.stringify(
    {
      name: spec.packageName,
      version: spec.version,
      description: spec.description,
      private: true,
      type: 'module',
      engines: { node: '>=24.0.0' },
      cyweb: {
        id: spec.id,
        displayName: spec.displayName,
        port: spec.port,
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        // Discoverable: `npm run` lists it, so producing a zip needs neither a
        // config field nor a remembered variable name. Sugar over
        // CYWEB_APP_ZIP, which stays available for CI and can also turn the
        // zip OFF for an app that has it on by default.
        'build:zip': 'cross-env CYWEB_APP_ZIP=1 vite build',
        verify: 'cyweb-app verify',
        typecheck:
          'tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.test.json',
        test: 'vitest run',
      },
      ...(react ? { peerDependencies: { ...HOST_SINGLETONS } } : {}),
      devDependencies: {
        '@cytoscape-web/api-types': API_TYPES_VERSION,
        '@cytoscape-web/app-runtime': SDK_VERSION,
        'cross-env': CROSS_ENV_VERSION,
        ...(react ? HOST_SINGLETONS : {}),
        '@module-federation/vite': '1.16.8',
        '@types/node': '^24.0.0',
        '@types/react': '^18.3.5',
        ...(react ? { '@types/react-dom': '^18.3.0', '@vitejs/plugin-react': '^5.0.0' } : {}),
        typescript: '^5.6.2',
        vite: '8.0.13',
        vitest: '^4.1.8',
      },
    },
    null,
    2,
  )}\n`
}

const READMEFor = (spec: ScaffoldSpec): string => `# ${spec.displayName}

A [Cytoscape Web](https://web.cytoscape.org) app.

## Develop

\`\`\`bash
npm run dev
\`\`\`

The dev server prints a link that installs this app into a running local host —
no file in the host repository has to be edited. Start the host separately
(\`npm run dev\` in a \`cytoscape-web\` checkout), open the link, and confirm.

## Identity

\`package.json\` holds it, once:

\`\`\`json
"cyweb": { "id": "${spec.id}", "displayName": "${spec.displayName}", "port": ${spec.port} }
\`\`\`

\`cyweb.id\` is the Module Federation container name, this app's \`CyApp.id\` and
the id the host registers, all at the same time. The code reads it from
\`virtual:cyweb-app-meta\`.

## Checks

\`\`\`bash
npm run typecheck
npm test
npm run build && npx cyweb-app verify
\`\`\`

\`cyweb-app verify\` reads the built output and asserts the federation contract —
the ESM remote shape, the production sentinel, the registered runtime plugin and
the shared singletons. Every one of them looks correct in a config file when it
is wrong, which is why it checks the artifact instead.

## Before you ask anyone to install this

This app runs in the host's own browser context: same origin, DOM, storage and
network identity. There is no sandbox and no signature verification, and an app
can read the user's credentials.

Installing it asks someone to trust it the way they trust Cytoscape Web itself.
Say what it does, and say where it sends anything it collects.
`

/**
 * Writes the project. Assumes `validateSpec` already returned nothing.
 *
 * No identity substitution happens in the template files, and that is not an
 * omission: the app reads id, displayName, version and description from
 * `virtual:cyweb-app-meta`, so package.json is the only file that differs
 * between two scaffolded apps.
 */
export const scaffold = (spec: ScaffoldSpec, templatesRoot?: string): string[] => {
  const target = resolve(spec.targetDir)
  const source = join(
    templatesRoot ?? fileURLToPath(new URL('../templates', import.meta.url)),
    spec.template,
  )

  mkdirSync(target, { recursive: true })
  cpSync(source, target, { recursive: true })

  writeFileSync(join(target, 'package.json'), packageJsonFor(spec))
  writeFileSync(join(target, 'README.md'), READMEFor(spec))
  // .gitignore, not "gitignore": npm refuses to publish a file named
  // .gitignore inside a package, so it ships under a safe name and is renamed
  // on the way out.
  writeFileSync(join(target, '.gitignore'), 'node_modules\ndist\n*.zip\n')

  const listing = (dir: string, prefix = ''): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      return entry.isDirectory() ? listing(join(dir, entry.name), rel) : [rel]
    })

  return listing(target).sort()
}
