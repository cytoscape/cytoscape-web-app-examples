#!/usr/bin/env node

/**
 * `npm create cytoscape-app my-app`
 *
 * Every prompt has a flag equivalent, and `--yes` accepts every default without
 * asking. That is a hard requirement rather than a convenience: a large share of
 * the people this exists for are driving it through an LLM, and an interactive
 * prompt with no flag makes the whole path unusable to them.
 */

import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { basename, resolve } from 'node:path'

import {
  TEMPLATES,
  type ScaffoldSpec,
  type Template,
  displayNameFromId,
  idFromDirectory,
  isPortFree,
  pickPort,
  scaffold,
  validateSpec,
} from './scaffold.js'

const USAGE = `create-cytoscape-app — scaffold a Cytoscape Web app

  npm create cytoscape-app <directory> [options]

Options
  --id <name>             Module Federation container name and CyApp.id.
                          A JavaScript identifier. Default: from the directory
  --package-name <name>   npm package name.        Default: the directory name
  --display-name <text>   Shown in App Settings.   Default: from --id
  --description <text>    One line, shown with it. Default: a placeholder
  --version <semver>      Default: 0.1.0
  --port <number>         Dev server port. Default: the first free one from 6000
  --template <name>       ${TEMPLATES.join(' | ')}
                          Default: panel
  --pm <npm|pnpm>         Package manager for the install. Default: npm
  --no-install            Skip dependency installation
  --yes, -y               Accept every default; never prompt
  --help, -h              This text

Directory name, package name, display name and app id are four different
things. Set them separately or let them default from one another.
`

const KNOWN_FLAGS = new Set([
  '--id',
  '--package-name',
  '--display-name',
  '--description',
  '--version',
  '--port',
  '--template',
  '--pm',
  '--no-install',
  '--yes',
  '-y',
  '--help',
  '-h',
])

const die = (message: string): never => {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const argv = process.argv.slice(2)

if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE)
  process.exit(0)
}

// Unknown flags are rejected, not ignored. A misspelled --prot would otherwise
// scaffold silently onto a port the developer did not choose.
const unknown = argv.filter((a) => a.startsWith('-') && !KNOWN_FLAGS.has(a))
if (unknown.length > 0) {
  die(`create-cytoscape-app: unknown option ${unknown.join(', ')}\n\n${USAGE}`)
}

const valueFlags = new Set([
  '--id',
  '--package-name',
  '--display-name',
  '--description',
  '--version',
  '--port',
  '--template',
  '--pm',
])
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}
const positionals = argv.filter(
  (a, i) => !a.startsWith('-') && !(i > 0 && valueFlags.has(argv[i - 1])),
)

const yes = argv.includes('--yes') || argv.includes('-y')
const noInstall = argv.includes('--no-install')
const pm = flag('--pm') ?? 'npm'
if (pm !== 'npm' && pm !== 'pnpm') die(`create-cytoscape-app: --pm must be npm or pnpm`)

const rl = yes ? undefined : createInterface({ input: process.stdin, output: process.stdout })
const ask = async (question: string, fallback: string): Promise<string> => {
  if (rl === undefined) return fallback
  const answer = (await rl.question(`${question} (${fallback}) `)).trim()
  return answer === '' ? fallback : answer
}

const targetDir = positionals[0] ?? (await ask('Directory', 'my-cytoscape-app'))
const defaultId = idFromDirectory(targetDir)

const id = flag('--id') ?? (await ask('App id (JavaScript identifier)', defaultId))
const packageName =
  flag('--package-name') ?? (await ask('Package name', basename(resolve(targetDir))))
const displayName =
  flag('--display-name') ?? (await ask('Display name', displayNameFromId(id)))
const description =
  flag('--description') ??
  (await ask('Description', `A Cytoscape Web app`))
const version = flag('--version') ?? (await ask('Version', '0.1.0'))
const template = (flag('--template') ?? (await ask(`Template (${TEMPLATES.join('|')})`, 'panel'))) as Template

const portFlag = flag('--port')
const port =
  portFlag === undefined
    ? Number(await ask('Dev server port', String(await pickPort())))
    : Number(portFlag)

rl?.close()

const spec: ScaffoldSpec = {
  targetDir,
  packageName,
  id,
  displayName,
  description,
  version,
  port,
  template,
}

// ── Validate EVERYTHING before touching the filesystem ─────────────────────
const problems = validateSpec(spec)
if (Number.isInteger(port) && port >= 1024 && port <= 65535 && !(await isPortFree(port))) {
  problems.push(
    `--port ${port} is already in use. The dev server binds it with strictPort, ` +
      `so it would fail to start rather than quietly move`,
  )
}
if (problems.length > 0) {
  process.stderr.write(
    `create-cytoscape-app: ${problems.length} problem(s), nothing was written:\n` +
      problems.map((p) => `  ✗ ${p}\n`).join(''),
  )
  process.exit(1)
}

const files = scaffold(spec)
process.stdout.write(`\nCreated ${resolve(targetDir)} — ${files.length} files\n`)

if (!noInstall) {
  process.stdout.write(`\nInstalling with ${pm}…\n`)
  const { status } = spawnSync(pm, ['install'], { cwd: resolve(targetDir), stdio: 'inherit' })
  if (status !== 0) {
    process.stderr.write(
      `\n${pm} install failed. The project is written; run it again yourself.\n`,
    )
    process.exit(1)
  }
}

process.stdout.write(`
Next:

  cd ${targetDir}${noInstall ? `\n  ${pm} install` : ''}
  ${pm} run dev

The dev server prints a link that installs this app into a running local host.
Nothing in the host repository needs editing.
`)
