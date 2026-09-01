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
// EXACT during the preview, `^x.y.z` once a stable version exists. A caret over
// a prerelease admits only prereleases of the same major.minor.patch — neither
// the stability an exact pin gives nor the breadth a caret suggests — so a
// preview says what it means. `SDK_VERSION`'s test enforces whichever rule the
// runtime's own version calls for.
export const SDK_VERSION = '0.4.0-next.1'

/**
 * Sets `CYWEB_APP_ZIP` for the `build:zip` script.
 *
 * The one dependency a generated project carries purely for ergonomics.
 * `VAR=1 cmd` is not valid in cmd.exe, so without it `build:zip` would work on
 * two of the three platforms — which is worse than not shipping the script.
 */
export const CROSS_ENV_VERSION = '^10.1.0'

/**
 * `adm-zip` is declared by generated projects, not left to chance.
 *
 * It is an OPTIONAL peer of the SDK, so the SDK does not install it — and in
 * this monorepo `build:zip` works anyway, because the Module Federation plugin
 * happens to bring adm-zip in transitively. A standalone project that relied on
 * that would break the day that plugin stopped needing it, so the script's own
 * dependency is declared where the script lives.
 */
export const ADM_ZIP_VERSION = '^0.5.10'
export const TEMPLATES = ['panel', 'menu', 'context-menu', 'non-react', 'full'] as const
export type Template = (typeof TEMPLATES)[number]

/** Ports the example apps bind, plus the host's. A new app should avoid them. */
export const RESERVED_PORTS = [5500, 2222, 3333, 5555, 6100, 7000]

/**
 * Ports Chrome and Firefox refuse to load over http, whatever is listening.
 *
 * A dev server on one of these is not merely awkward to open — the **host**
 * cannot fetch from it either. The request dies as `net::ERR_UNSAFE_PORT`
 * before it leaves the browser, and what the developer sees is
 * `Failed to install app from …: Failed to fetch`, which is the same message a
 * denied local-network permission produces. Two unrelated causes, one sentence.
 *
 * 6000 is the one that mattered: it is X11, it was where the port search
 * started, and it is therefore what a developer taking the defaults got.
 *
 * From Chromium's `net/base/port_util.cc` restricted list.
 */
export const BROWSER_BLOCKED_PORTS = [
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79,
  87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137,
  138, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531,
  532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720,
  1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668,
  6669, 6679, 6697, 10080,
]

const JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
// The SAME grammar the runtime reader applies, not a looser one that lets a
// project scaffold and then fail its first build. The canonical source is
// `cy-manifest-v1.predicates.json` in @cytoscape-web/app-runtime; a test asserts
// this copy still matches it, because the scaffolder cannot import from a
// package it does not depend on.
export const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

/**
 * `cyweb`, plus every own key of `Object.prototype`.
 *
 * A legal JavaScript identifier is not automatically a safe object key: the host
 * indexes installed apps in ordinary prototype-bearing records, so an app called
 * `toString` reads as already installed and one called `__proto__` mutates a
 * record's prototype. Scaffolding such a project would produce something that
 * cannot be published — better to say so at `npm create` time.
 */
export const RESERVED_APP_IDS = [
  'cyweb',
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  'hasOwnProperty',
  '__lookupGetter__',
  '__lookupSetter__',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
]
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
/**
 * Reasons a version is legal SemVer but cannot be SUBMITTED.
 *
 * A warning, never a failure. The grammar is what the runtime reader enforces
 * and what a project needs to build at all; the submission profile is about a
 * ZIP filename and a URL path segment, and refusing to scaffold over it would
 * block someone who is not submitting anything today.
 *
 * The canonical source is `cy-manifest-v1.predicates.json` in
 * `@cytoscape-web/app-runtime`; a test asserts this copy still agrees with it,
 * because the scaffolder cannot import from a package it does not depend on.
 */
const submissionProfileWarning = (version: string): string | undefined => {
  if (version.includes('+')) {
    return `--version "${version}" carries build metadata, which an App Store ` +
      `submission rejects — SemVer excludes it from precedence, so two such ` +
      `versions tie for a "latest" endpoint`
  }
  if ([...version].length > 128) {
    return `--version "${version}" is longer than 128 characters, which an App ` +
      `Store submission rejects — it becomes a ZIP filename and a URL path segment`
  }
  // From the SemVer capture groups, not a split on every separator: a prerelease
  // identifier may CONTAIN hyphens, so `1.0.0-alpha-9007199254740992` has one
  // alphanumeric identifier rather than a numeric one — and splitting on `-`
  // would warn about a version the runtime profile accepts.
  const match = SEMVER.exec(version)
  if (match === null) return undefined
  const numeric = [match[1], match[2], match[3]].concat(
    (match[4] ?? '').split('.').filter((part) => part !== '' && /^\d+$/.test(part)),
  )
  for (const identifier of numeric) {
    if (Number(identifier) > Number.MAX_SAFE_INTEGER) {
      return `--version "${version}" has a numeric identifier above ` +
        `Number.MAX_SAFE_INTEGER, which an App Store submission rejects — ` +
        `node-semver compares two such values as equal`
    }
  }
  return undefined
}

/**
 * Things worth saying that are not reasons to refuse.
 *
 * Kept apart from `validateSpec` on purpose: a warning that exits non-zero is a
 * failure with a friendly message, and a project that scaffolds, builds and
 * runs should not exit non-zero because of a rule about submitting it.
 */
export const warnSpec = (spec: ScaffoldSpec): string[] => {
  const warnings: string[] = []
  if (SEMVER.test(spec.version)) {
    const profile = submissionProfileWarning(spec.version)
    if (profile !== undefined) warnings.push(profile)
  }
  return warnings
}

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
  if (RESERVED_APP_IDS.includes(spec.id)) {
    problems.push(
      `--id "${spec.id}" is reserved — the host indexes apps in ordinary objects, ` +
        `where this name collides with an inherited property or with the host's ` +
        `own federation name`,
    )
  }
  if (spec.displayName.trim() === '') problems.push('--display-name must not be empty')
  if (!SEMVER.test(spec.version)) {
    problems.push(`--version "${spec.version}" is not canonical SemVer`)
  }
  if (!Number.isInteger(spec.port) || spec.port < 1024 || spec.port > 65535) {
    problems.push(`--port ${spec.port} must be an integer in 1024..65535`)
  } else if (BROWSER_BLOCKED_PORTS.includes(spec.port)) {
    // Refused rather than warned about: the host fetches the app over http from
    // the browser, and a blocked port fails that fetch as ERR_UNSAFE_PORT with
    // a "Failed to fetch" the developer has no way to trace back to a port.
    problems.push(
      `--port ${spec.port} is on the browsers' blocked list, so the host cannot ` +
        `load an app from it — the install fails with "Failed to fetch". ` +
        `Pick another port.`,
    )
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

/**
 * First usable port from 6000: free, unclaimed by an example app, and one a
 * browser will actually load (see {@link BROWSER_BLOCKED_PORTS}).
 *
 * The fallback skips blocked ports too. Returning one because nothing was free
 * would hand back the very port that cannot work.
 */
export const pickPort = async (start = 6000): Promise<number> => {
  const usable = (port: number): boolean =>
    !RESERVED_PORTS.includes(port) && !BROWSER_BLOCKED_PORTS.includes(port)
  for (let port = start; port < start + 200; port += 1) {
    if (!usable(port)) continue
    if (await isPortFree(port)) return port
  }
  for (let port = start; port < start + 200; port += 1) {
    if (usable(port)) return port
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
        'adm-zip': ADM_ZIP_VERSION,
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

## Before you submit to the App Store

\`\`\`bash
npm run build:zip
\`\`\`

writes \`${spec.id}-<version>.zip\` next to \`package.json\`, with a generated
\`cy-manifest.json\` at its root carrying this app's identity and publication
metadata. That file is derived from \`package.json\` — never edit it, and never
commit one.

The Store reads what \`package.json\` declares, so fill these in before you
submit. Packaging warns about each one it does not find, and none of them is
required to build or run:

| \`package.json\` field | Becomes |
| --- | --- |
| \`author\` | the public author name — a display name only, never an email |
| \`license\` | the licence shown on the listing |
| \`repository\` | the source link; the object form's \`directory\` is kept for monorepos |
| \`homepage\` | the project's own page |
| \`cyweb.compatibleHostVersions\` | the host versions this app declares itself compatible with |

\`npx cyweb-app manifest\` prints the same manifest without building an archive,
if you want to see what the Store will read.

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
  // cy-manifest.json is GENERATED — from package.json, into the archive, or by
  // `cyweb-app manifest --out`. A copy committed next to the source it is
  // derived from becomes a second source of truth that nothing keeps in step.
  writeFileSync(
    join(target, '.gitignore'),
    'node_modules\ndist\n*.zip\ncy-manifest.json\n',
  )

  const listing = (dir: string, prefix = ''): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      return entry.isDirectory() ? listing(join(dir, entry.name), rel) : [rel]
    })

  return listing(target).sort()
}
