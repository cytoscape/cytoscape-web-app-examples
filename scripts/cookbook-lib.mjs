// Shared by the cookbook's generator (scripts/cookbook-index.mjs) and its
// runner (cookbook/runner/run.mjs): where things are, what counts as the
// cookbook's sources, and what the verification record must say.
//
// Design: design/specifications/cookbook/cookbook-design.md §4.6 and §4.7.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const COOKBOOK_DIR = join(REPO_ROOT, 'cookbook')

const API_TYPES = '@cytoscape-web/api-types'

/** Every file under `dir`, as sorted POSIX paths relative to `dir`. */
export const listFiles = (dir) => {
  if (!existsSync(dir)) return []
  const found = []
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      if (name === 'node_modules' || name === 'dist') continue
      const path = join(current, name)
      if (statSync(path).isDirectory()) walk(path)
      else found.push(relative(dir, path).split(sep).join('/'))
    }
  }
  walk(dir)
  return found
}

/**
 * The recipes of a cookbook tree: `recipes/<category>/<name>.ts` (`.tsx` for a
 * component recipe). The id is `<category>/<name>`.
 */
export const listRecipes = (cookbookDir = COOKBOOK_DIR) =>
  listFiles(join(cookbookDir, 'recipes'))
    .filter((path) => /^[^/]+\/[^/]+\.tsx?$/.test(path))
    .map((path) => {
      const [category, fileName] = path.split('/')
      return {
        id: `${category}/${fileName.replace(/\.tsx?$/, '')}`,
        category,
        path: `recipes/${path}`,
        isComponent: fileName.endsWith('.tsx'),
      }
    })

/**
 * A hash of everything that can change a verification result: the recipes,
 * the wiring, the whole runner (cases, the verification app, the runner's own
 * code and its list of hosts) and the cookbook's tsconfig.
 *
 * Markdown is left out. A README cannot change what a case does, and
 * including it would demand a new run on two hosts for a spelling fix.
 */
export const computeDigest = (cookbookDir = COOKBOOK_DIR) => {
  const paths = [
    ...['recipes', 'wiring', 'runner'].flatMap((dir) =>
      listFiles(join(cookbookDir, dir)).map((path) => `${dir}/${path}`),
    ),
    'tsconfig.json',
  ].filter((path) => !path.endsWith('.md'))

  const hash = createHash('sha256')
  for (const path of paths.sort()) {
    hash.update(`${path}\0`)
    // Line endings do not change a result, and Git may check them out as
    // CRLF on Windows.
    hash.update(
      readFileSync(join(cookbookDir, path), 'utf8').replace(/\r\n/g, '\n'),
    )
    hash.update('\0')
  }
  return `sha256:${hash.digest('hex')}`
}

const readLockEntry = (lockPath) =>
  existsSync(lockPath)
    ? JSON.parse(readFileSync(lockPath, 'utf8')).packages?.[
        `node_modules/${API_TYPES}`
      ]
    : undefined

/**
 * The api-types version the type check resolves, and where it came from.
 *
 * `registry` means: the installed package is byte for byte the registry
 * package the committed lockfile pins (same integrity). Anything else is
 * `local`. The version alone proves nothing: a tarball installed from a host
 * checkout (CLAUDE.md, "Developing against an unpublished api-types") can
 * carry a published version and other declarations. On 2026-11-17 the host's
 * `development` packed beta.6 declarations as `1.0.0-beta.5`.
 */
export const readApiTypes = (repoRoot = REPO_ROOT) => {
  const packagePath = join(repoRoot, 'node_modules', API_TYPES, 'package.json')
  if (!existsSync(packagePath)) {
    throw new Error(`${API_TYPES} is not installed: run npm install`)
  }
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8'))

  // npm's own record of what it installed, and what the repository pins.
  const installed = readLockEntry(
    join(repoRoot, 'node_modules', '.package-lock.json'),
  )
  const pinned = readLockEntry(join(repoRoot, 'package-lock.json'))
  const fromRegistry =
    typeof pinned?.integrity === 'string' &&
    (pinned.resolved ?? '').startsWith('https://registry.npmjs.org/') &&
    installed?.integrity === pinned.integrity &&
    installed?.version === version
  return { version, source: fromRegistry ? 'registry' : 'local' }
}

/** The host releases the cookbook supports, with their tag commits. */
export const readHosts = (cookbookDir = COOKBOOK_DIR) =>
  JSON.parse(readFileSync(join(cookbookDir, 'runner', 'hosts.json'), 'utf8'))

/**
 * Whether a host build is the release `host` names. A host reports
 * `git rev-parse --short HEAD`, so the comparison is by prefix. The version
 * alone is not enough: `development` and pre-release builds report the same
 * version as the release that follows them.
 */
export const isRelease = (host, build) =>
  typeof build?.commit === 'string' &&
  build.commit.length >= 7 &&
  host.commit.startsWith(build.commit) &&
  build.version === host.version

export const recordPath = (cookbookDir = COOKBOOK_DIR) =>
  join(cookbookDir, 'verified.json')

export const readRecord = (cookbookDir = COOKBOOK_DIR) => {
  const path = recordPath(cookbookDir)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}

/**
 * Where cases live, as paths relative to the cookbook. A host-wide recipe's
 * case runs in the runner's bundle; an owner-bound or component recipe's, in
 * the verification app, which has the app's own API object and React.
 */
export const CASE_DIRS = {
  core: 'runner/cases',
  app: 'runner/app/cases',
  behavior: 'runner/app/behaviors',
}

const casesIn = (cookbookDir, dir, pattern) =>
  listFiles(join(cookbookDir, ...dir.split('/')))
    .filter((path) => pattern.test(path))
    .map((path) => `${dir}/${path}`)

/** The recipes' cases: `runner/cases/<name>.ts` and `runner/app/cases/<name>.ts(x)`. */
export const listCases = (cookbookDir = COOKBOOK_DIR) => [
  ...casesIn(cookbookDir, CASE_DIRS.core, /^[^/]+\.ts$/),
  ...casesIn(cookbookDir, CASE_DIRS.app, /^[^/]+\.tsx?$/),
]

/** The verification app's behavior cases, which belong to no recipe. */
export const listBehaviors = (cookbookDir = COOKBOOK_DIR) =>
  casesIn(cookbookDir, CASE_DIRS.behavior, /^[^/]+\.ts$/)

/** How many cases a full run runs: every recipe's, and every behavior's. */
export const countCases = (cookbookDir = COOKBOOK_DIR) =>
  listCases(cookbookDir).length + listBehaviors(cookbookDir).length

/**
 * Everything that makes the record unfit to merge or publish from. An empty
 * list means: these sources, with this api-types version, passed every case
 * on every supported host release.
 */
export const checkRecord = ({
  cookbookDir = COOKBOOK_DIR,
  repoRoot = REPO_ROOT,
} = {}) => {
  const record = readRecord(cookbookDir)
  if (record === null) {
    return ['cookbook/verified.json does not exist: run the runner']
  }
  const problems = []

  const digest = computeDigest(cookbookDir)
  if (record.digest !== digest) {
    problems.push(
      `the cookbook's sources changed since they were verified ` +
        `(recorded ${record.digest}, now ${digest}): run the runner again`,
    )
  }

  const apiTypes = readApiTypes(repoRoot)
  if (record.apiTypes?.version !== apiTypes.version) {
    problems.push(
      `the record was made with api-types ${record.apiTypes?.version}, ` +
        `and the type check resolves ${apiTypes.version}`,
    )
  }
  // Equal versions are not equal declarations: see readApiTypes.
  if (record.apiTypes?.source !== 'registry') {
    problems.push(
      `the record was made with api-types from a ${record.apiTypes?.source} ` +
        `install, not the registry package the lockfile pins: run npm ci, ` +
        `then the runner`,
    )
  }
  if (apiTypes.source !== 'registry') {
    problems.push(
      `the installed api-types is not the registry package the lockfile ` +
        `pins, so the type check proves nothing about it: run npm ci`,
    )
  }

  const caseCount = countCases(cookbookDir)
  for (const host of readHosts(cookbookDir)) {
    const entry = (record.hosts ?? []).find((h) => h.version === host.version)
    if (entry === undefined) {
      problems.push(
        `no entry for Cytoscape Web ${host.version} (${host.role}): ` +
          `run the runner against a checkout of ${host.tag}`,
      )
    } else if (!host.commit.startsWith(entry.commit)) {
      problems.push(
        `the entry for ${host.version} names commit ${entry.commit}, ` +
          `not the tag ${host.tag} (${host.commit.slice(0, 8)})`,
      )
    } else if (entry.cases !== caseCount) {
      problems.push(
        `the entry for ${host.version} covers ${entry.cases} cases, ` +
          `and there are ${caseCount}`,
      )
    }
  }
  return problems
}

// ── Git: the commit llms.txt pins ───────────────────────────────────────────

/** The sources llms.txt links to. Changing any of them moves the pin. */
export const LINKED_SOURCES = ['cookbook', 'guides']

export const git = (args, repoRoot = REPO_ROOT) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()

/**
 * The last commit that changed a linked source, reachable from `ref`. A file
 * cannot name the commit that adds it, so llms.txt names this one instead;
 * the commit that adds the regenerated llms.txt changes no linked source, and
 * leaves the pin where it was.
 */
export const pinnedCommit = (ref = 'HEAD', repoRoot = REPO_ROOT) =>
  git(['log', '-1', '--format=%H', ref, '--', ...LINKED_SOURCES], repoRoot)

/** Uncommitted changes to linked sources, which the pin would not describe. */
export const uncommittedSources = (repoRoot = REPO_ROOT) =>
  git(['status', '--porcelain', '--', ...LINKED_SOURCES], repoRoot)
    .split('\n')
    .filter((line) => line.trim() !== '')

/** Whether `path` exists at `commit`. */
export const existsAt = (commit, path, repoRoot = REPO_ROOT) => {
  try {
    git(['cat-file', '-e', `${commit}:${path}`], repoRoot)
    return true
  } catch {
    return false
  }
}
