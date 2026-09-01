import type { CyWebAppMeta } from '../meta/index.js'
import type { CyWebSubmissionMeta } from './appMeta.js'
import {
  codePoints,
  foldAsciiCase,
  hasLoneSurrogate,
  isEmailLike,
  isReservedId,
  isUrlLike,
  isValidIdShape,
  normalizeAuthor,
  normalizeHomepage,
  normalizeOptionalString,
  normalizeRepositoryDirectory,
  normalizeRepositoryUrl,
  normalizeTags,
  PREDICATES,
  versionProfileFailure,
  type FieldOutcome,
} from './manifestPredicates.js'

/**
 * The App Store submission manifest: build it, and serialize it.
 *
 * Pure — no filesystem, no Vite, no logging. The packaging plugin and
 * `cyweb-app manifest` both call this, which is what makes the archive copy and
 * the CLI copy byte-identical rather than merely equivalent.
 *
 * Two contracts run through here and they are not the same one:
 *
 *   [source]  package.json forms this SDK accepts and normalizes — an author
 *             object, a repository shorthand, an SSH URL.
 *   [wire]    the canonical strings that result. The App Store implements ONLY
 *             these, and rejects every source form rather than running a second
 *             npm normalizer over an upload.
 */

export const CY_MANIFEST_FILENAME = 'cy-manifest.json'
export const CY_MANIFEST_FORMAT_VERSION = 1

/** The one entry point v1 describes, relative to the archive root. */
const ENTRY = 'remoteEntry.js'
/** v1 describes client-side apps only. */
const TYPE = 'client'

export interface CyManifestV1 {
  readonly formatVersion: 1
  readonly id: string
  readonly name: string
  readonly version: string
  readonly type: 'client'
  readonly entry: 'remoteEntry.js'
  readonly description?: string
  readonly author?: string
  readonly license?: string
  readonly repository?: string
  readonly repositoryDirectory?: string
  readonly homepage?: string
  readonly tags?: readonly string[]
  readonly compatibleHostVersions?: string
  readonly generator: string
}

/**
 * Serialization order. FIXED, because the archive copy and the CLI copy are
 * compared byte for byte and `JSON.stringify` follows insertion order.
 */
const FIELD_ORDER: readonly (keyof CyManifestV1)[] = [
  'formatVersion',
  'id',
  'name',
  'version',
  'type',
  'entry',
  'description',
  'author',
  'license',
  'repository',
  'repositoryDirectory',
  'homepage',
  'tags',
  'compatibleHostVersions',
  'generator',
]

export interface BuildCyManifestResult {
  readonly manifest: CyManifestV1
  /**
   * Submission-readiness notes for the packaging and CLI paths.
   *
   * "Recommended" and "policy pending", never "the Store requires this": the
   * publication profile that decides which fields are mandatory is owned and
   * versioned by the App Store, and a warning cannot cite a decision that has
   * not been made.
   */
  readonly warnings: readonly string[]
}

const fail = (problems: readonly string[]): never => {
  throw new Error(
    `[cyweb] ${CY_MANIFEST_FILENAME} cannot be generated from package.json:\n` +
      problems.map((p) => `    - ${p}`).join('\n'),
  )
}

/**
 * Build the manifest from one package snapshot's two halves.
 *
 * Collects every problem before throwing. Reporting them one per run would make
 * fixing four fields take four builds.
 */
export const buildCyManifest = (
  appMeta: CyWebAppMeta,
  submission: CyWebSubmissionMeta,
  sdkVersion: string,
): BuildCyManifestResult => {
  const problems: string[] = []
  const warnings: string[] = []

  // ── identity ───────────────────────────────────────────────────────────────
  // Already grammar-checked by the runtime reader. What is added here is the
  // submission profile: bounded length, no reserved key, no build metadata, no
  // numeric identifier a comparator cannot order.
  if (!isValidIdShape(appMeta.id)) {
    problems.push(
      `cyweb.id "${appMeta.id}" is longer than ${PREDICATES.id.maxCodePoints} characters or is not a JavaScript identifier`,
    )
  }
  if (isReservedId(appMeta.id)) {
    problems.push(
      `cyweb.id "${appMeta.id}" is reserved — the host indexes apps in ordinary objects, where this name collides with an inherited property`,
    )
  }

  const versionFailure = versionProfileFailure(appMeta.version)
  if (versionFailure !== undefined) {
    problems.push(`package.json "version" ${versionFailure}`)
  }

  const name = normalizeOptionalString(
    'cyweb.displayName',
    appMeta.displayName,
    PREDICATES.limits.name,
  )
  if (name.kind === 'invalid') problems.push(name.message)
  else if (name.kind === 'absent')
    problems.push(`cyweb.displayName is empty after trimming`)

  // ── optional publication metadata ──────────────────────────────────────────
  const take = <T>(outcome: FieldOutcome<T>): T | undefined => {
    if (outcome.kind === 'invalid') {
      problems.push(outcome.message)
      return undefined
    }
    if (outcome.warning !== undefined) warnings.push(outcome.warning)
    return outcome.kind === 'value' ? outcome.value : undefined
  }

  const description = take(
    normalizeOptionalString(
      'description',
      submission.description,
      PREDICATES.limits.description,
    ),
  )
  const author = take(normalizeAuthor(submission.author))
  const license = take(
    normalizeOptionalString(
      'license',
      submission.license,
      PREDICATES.limits.license,
    ),
  )

  // The object form carries `directory` too, so both come out of one read of it.
  let repository: string | undefined
  let repositoryDirectory: string | undefined
  const rawRepository = submission.repository
  if (rawRepository !== undefined && rawRepository !== null) {
    if (typeof rawRepository === 'string') {
      repository = take(normalizeRepositoryUrl(rawRepository))
    } else if (
      typeof rawRepository === 'object' &&
      !Array.isArray(rawRepository)
    ) {
      const object = rawRepository as {
        type?: unknown
        url?: unknown
        directory?: unknown
      }
      if (object.type !== undefined && object.type !== 'git') {
        problems.push(
          `repository.type must be absent or exactly "git" (got ${JSON.stringify(object.type)})`,
        )
      }
      if (typeof object.url !== 'string') {
        problems.push(
          `repository.url must be a string (got ${JSON.stringify(object.url)})`,
        )
      } else {
        // A supplied composite whose required member trims away is invalid —
        // unlike a direct string, which is simply absent.
        const outcome = normalizeRepositoryUrl(object.url)
        repository =
          outcome.kind === 'absent'
            ? (problems.push(`repository.url is empty`), undefined)
            : take(outcome)
      }
      repositoryDirectory = take(normalizeRepositoryDirectory(object.directory))
    } else {
      problems.push(
        `repository must be a string or an object (got ${JSON.stringify(rawRepository)})`,
      )
    }
  }

  const homepage = take(normalizeHomepage(submission.homepage))
  const tags = take(normalizeTags(submission.keywords))
  const compatibleHostVersions = take(
    normalizeOptionalString(
      'cyweb.compatibleHostVersions',
      submission.compatibleHostVersions,
      PREDICATES.limits.compatibleHostVersions,
    ),
  )

  const generator = `@cytoscape-web/app-runtime@${sdkVersion}`
  if (codePoints(generator) > PREDICATES.limits.generator) {
    problems.push(
      `generator is longer than ${PREDICATES.limits.generator} characters`,
    )
  }
  if (hasLoneSurrogate(appMeta.id) || hasLoneSurrogate(appMeta.version)) {
    problems.push(`identity contains an unpaired surrogate`)
  }

  if (problems.length > 0) fail(problems)

  for (const field of PREDICATES.readinessWarnings.fields) {
    const missing =
      (field === 'author' && author === undefined) ||
      (field === 'license' && license === undefined) ||
      (field === 'repository' && repository === undefined) ||
      (field === 'homepage' && homepage === undefined) ||
      (field === 'compatibleHostVersions' &&
        compatibleHostVersions === undefined)
    if (missing) {
      warnings.push(
        `${field} is not declared in package.json — recommended for an App Store submission (the required set is policy-pending)`,
      )
    }
  }

  const manifest: CyManifestV1 = {
    formatVersion: CY_MANIFEST_FORMAT_VERSION,
    id: appMeta.id,
    name: (name as { value: string }).value,
    version: appMeta.version,
    type: TYPE,
    entry: ENTRY,
    ...(description !== undefined && { description }),
    ...(author !== undefined && { author }),
    ...(license !== undefined && { license }),
    ...(repository !== undefined && { repository }),
    ...(repositoryDirectory !== undefined && { repositoryDirectory }),
    ...(homepage !== undefined && { homepage }),
    ...(tags !== undefined && { tags }),
    ...(compatibleHostVersions !== undefined && { compatibleHostVersions }),
    generator,
  }

  // The producer must never emit what the agreed wire rules reject.
  //
  // Every `[source]` normalizer above returns a `[wire]` value, and nothing
  // checked that claim until three separate bugs made it false at once: an SSH
  // password dropped rather than refused, `…/repo.git/` keeping its suffix
  // because `.git$` does not match a trailing slash, and a homepage growing
  // past its limit when the URL parser percent-encoded it. Each was a different
  // mistake; all three produced the same class of defect, so the invariant is
  // asserted here rather than trusted three times.
  //
  // Reaching this is a defect in THIS file, not in the developer's package.json,
  // and the message says so — anything caused by their input was already
  // collected above.
  const contradictions = validateCyManifestWire(manifest)
  if (contradictions.length > 0) {
    throw new Error(
      `[cyweb] internal: generated a ${CY_MANIFEST_FILENAME} that canonical wire ` +
        `validation rejects. This is an SDK bug — please report it with your ` +
        `package.json.\n` +
        contradictions.map((c) => `    - ${c}`).join('\n'),
    )
  }

  return { manifest, warnings }
}

/**
 * The only place manifest bytes are produced.
 *
 * UTF-8, no BOM, two-space indent, the fixed field order above, one trailing
 * newline. The archive copy and `cyweb-app manifest` are compared byte for byte,
 * so "the same object" is not enough — two callers of `JSON.stringify` with
 * different spacing would pass an object comparison and fail a real one.
 *
 * The document octet limit is enforced here because JSON Schema cannot express
 * it: `maxLength` counts code points of a decoded string, not bytes of a file.
 */
export const serializeCyManifest = (manifest: CyManifestV1): string => {
  const ordered: Record<string, unknown> = {}
  for (const field of FIELD_ORDER) {
    if (manifest[field] !== undefined) ordered[field] = manifest[field]
  }

  const text = `${JSON.stringify(ordered, null, 2)}\n`
  const octets = Buffer.byteLength(text, 'utf8')
  if (octets > PREDICATES.limits.documentMaxUtf8Octets) {
    throw new Error(
      `[cyweb] ${CY_MANIFEST_FILENAME} would be ${octets} bytes, over the ` +
        `${PREDICATES.limits.documentMaxUtf8Octets}-byte limit the App Store parses within`,
    )
  }
  return text
}

/**
 * `[wire]` Canonical validation of a manifest document.
 *
 * The App Store implements exactly this half — it never runs the `[source]`
 * normalizers over an upload, because rewriting a submitted manifest is how a
 * Store ends up with an identity the developer did not declare. Every source
 * form is rejected here: an author object, a repository shorthand or SSH URL, a
 * `.git` suffix, an untrimmed or present-but-empty value.
 *
 * Returns the problems, most structural first, or an empty array. It is a
 * function of the parsed value only: the raw-byte rules — size, BOM, duplicate
 * member names, nesting depth — belong to whoever holds the bytes, and JSON
 * Schema cannot see them either.
 */
export const validateCyManifestWire = (document: unknown): string[] => {
  const problems: string[] = []
  if (
    typeof document !== 'object' ||
    document === null ||
    Array.isArray(document)
  ) {
    return ['the manifest must be a single JSON object']
  }
  const doc = document as Record<string, unknown>

  // Before anything else is interpreted, per the format's own rule.
  if (doc.formatVersion !== CY_MANIFEST_FORMAT_VERSION) {
    return [`unsupported formatVersion ${JSON.stringify(doc.formatVersion)}`]
  }

  const scalars = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      if (hasLoneSurrogate(node))
        problems.push(`${path} contains an unpaired surrogate`)
    } else if (Array.isArray(node)) {
      node.forEach((item, i) => scalars(item, `${path}[${i}]`))
    } else if (typeof node === 'object' && node !== null) {
      for (const [key, item] of Object.entries(node)) {
        if (hasLoneSurrogate(key))
          problems.push(`a property name contains an unpaired surrogate`)
        scalars(item, `${path}.${key}`)
      }
    }
  }
  scalars(doc, 'manifest')

  const requiredString = (
    field: string,
    limit: number,
    trimmed = true,
  ): string | undefined => {
    const raw = doc[field]
    if (typeof raw !== 'string') {
      problems.push(`${field} must be a string`)
      return undefined
    }
    if (raw === '') problems.push(`${field} must not be empty`)
    if (trimmed && raw !== raw.trim()) problems.push(`${field} is not trimmed`)
    if (codePoints(raw) > limit)
      problems.push(`${field} is longer than ${limit} characters`)
    return raw
  }

  const id = requiredString('id', PREDICATES.id.maxCodePoints, false)
  if (id !== undefined) {
    if (!isValidIdShape(id))
      problems.push(`id is not a JavaScript identifier within the limit`)
    if (isReservedId(id)) problems.push(`id "${id}" is reserved`)
    if (id !== id.trim())
      problems.push(
        `id is not trimmed — whitespace makes it invalid, not trimmable`,
      )
  }
  requiredString('name', PREDICATES.limits.name)
  const version = requiredString(
    'version',
    PREDICATES.version.maxCodePoints,
    false,
  )
  if (version !== undefined) {
    if (version !== version.trim()) {
      problems.push(
        `version is not trimmed — whitespace makes it invalid, not trimmable`,
      )
    }
    const failure = versionProfileFailure(version.trim())
    if (failure !== undefined) problems.push(`version ${failure}`)
  }
  requiredString('generator', PREDICATES.limits.generator)

  if (doc.type !== TYPE) problems.push(`type must be "${TYPE}"`)
  if (doc.entry !== ENTRY) problems.push(`entry must be "${ENTRY}"`)

  const optionalString = (field: string, limit: number): string | undefined => {
    const raw = doc[field]
    if (raw === undefined) return undefined
    if (typeof raw !== 'string') {
      problems.push(
        `${field} must be a string — an object or array is a package.json form, not a wire form`,
      )
      return undefined
    }
    if (raw === '')
      problems.push(`${field} is present but empty — omit it instead`)
    if (raw !== raw.trim()) problems.push(`${field} is not trimmed`)
    if (codePoints(raw) > limit)
      problems.push(`${field} is longer than ${limit} characters`)
    return raw
  }

  optionalString('description', PREDICATES.limits.description)
  optionalString('license', PREDICATES.limits.license)
  optionalString(
    'compatibleHostVersions',
    PREDICATES.limits.compatibleHostVersions,
  )

  const author = optionalString('author', PREDICATES.limits.author)
  if (author !== undefined && (isEmailLike(author) || isUrlLike(author))) {
    problems.push(
      `author "${author}" looks like an email address or a URL, not a display name`,
    )
  }

  const repository = optionalString('repository', PREDICATES.limits.repository)
  if (repository !== undefined) {
    // Canonical means "renormalizing changes nothing". A shorthand, an SSH URL
    // or a .git suffix all normalize to something else, so they fail here.
    const renormalized = normalizeRepositoryUrl(repository)
    if (renormalized.kind !== 'value' || renormalized.value !== repository) {
      problems.push(
        `repository "${repository}" is not the canonical https form — the Store rejects source forms rather than rewriting them`,
      )
    }
  }

  const directory = optionalString(
    'repositoryDirectory',
    PREDICATES.limits.repositoryDirectory,
  )
  if (directory !== undefined) {
    const outcome = normalizeRepositoryDirectory(directory)
    if (outcome.kind !== 'value' || outcome.value !== directory) {
      problems.push(
        `repositoryDirectory "${directory}" is not a canonical relative POSIX path`,
      )
    }
  }

  const homepage = optionalString('homepage', PREDICATES.limits.homepage)
  if (homepage !== undefined) {
    const outcome = normalizeHomepage(homepage)
    if (outcome.kind !== 'value' || outcome.value !== homepage) {
      problems.push(
        `homepage "${homepage}" is not a canonical credential-free http(s) URL`,
      )
    }
  }

  const tags = doc.tags
  if (tags !== undefined) {
    if (!Array.isArray(tags)) problems.push(`tags must be an array`)
    else {
      if (tags.length === 0)
        problems.push(`tags is present but empty — omit it instead`)
      if (tags.length > PREDICATES.limits.tagsMaxEntries) {
        problems.push(
          `tags has more than ${PREDICATES.limits.tagsMaxEntries} entries`,
        )
      }
      const seen = new Set<string>()
      for (const tag of tags) {
        if (typeof tag !== 'string') {
          problems.push(`every tag must be a string`)
          continue
        }
        if (tag === '' || tag !== tag.trim())
          problems.push(`tag ${JSON.stringify(tag)} is empty or untrimmed`)
        if (codePoints(tag) > PREDICATES.limits.tagMaxCodePoints) {
          problems.push(
            `tag "${tag}" is longer than ${PREDICATES.limits.tagMaxCodePoints} characters`,
          )
        }
        const key = foldAsciiCase(tag)
        if (seen.has(key))
          problems.push(`tag "${tag}" duplicates an earlier tag`)
        seen.add(key)
      }
    }
  }

  return problems
}
