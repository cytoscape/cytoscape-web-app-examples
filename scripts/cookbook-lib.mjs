// Shared by the cookbook's generator (scripts/cookbook-index.mjs) and its
// runner (cookbook/runner/run.mjs): where things are, what counts as the
// cookbook's sources, and what the verification record must say.
//
// Design: design/specifications/cookbook/cookbook-design.md §4.6 and §4.7.

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

/**
 * The api-types version the type check resolves, and whether npm took it from
 * the registry. A version installed from a local tarball (CLAUDE.md,
 * "Developing against an unpublished api-types") is recorded as `local`, and
 * nothing is published from such a record.
 */
export const readApiTypes = (repoRoot = REPO_ROOT) => {
  const packagePath = join(repoRoot, 'node_modules', API_TYPES, 'package.json')
  if (!existsSync(packagePath)) {
    throw new Error(`${API_TYPES} is not installed: run npm install`)
  }
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8'))

  let source = 'unknown'
  const lockPath = join(repoRoot, 'node_modules', '.package-lock.json')
  if (existsSync(lockPath)) {
    const entry = JSON.parse(readFileSync(lockPath, 'utf8')).packages?.[
      `node_modules/${API_TYPES}`
    ]
    const resolved = entry?.resolved ?? ''
    source = resolved.startsWith('https://registry.npmjs.org/')
      ? 'registry'
      : 'local'
  }
  return { version, source }
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

/** The recipes' cases: `runner/cases/<name>.ts`. */
export const listCases = (cookbookDir = COOKBOOK_DIR) =>
  listFiles(join(cookbookDir, 'runner', 'cases')).filter((path) =>
    /^[^/]+\.ts$/.test(path),
  )

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

  const caseCount = listCases(cookbookDir).length
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
