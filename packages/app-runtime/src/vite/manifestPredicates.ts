import { readFileSync } from 'node:fs'

/**
 * The named semantic predicates, loaded from the artifact that defines them.
 *
 * Canonical wire validity is three things: strict raw-JSON validation, the
 * pinned JSON Schema, and these. JSON Schema receives an already-decoded value
 * and cannot express email-like author detection, canonical URL serialization,
 * inspection of encoded path components BEFORE a URL parser normalizes them, or
 * SemVer semantics — and finite fixtures cannot define an answer for every
 * input, which is why the algorithms below are normative and the corpora are
 * conformance examples.
 *
 * The constants are READ from `schema/cy-manifest-v1.predicates.json` rather
 * than restated here. A parallel copy is a copy that drifts, and the artifact is
 * what the App Store pins by digest — so it has to be the source, not a
 * description of one.
 */

const ARTIFACT_URL = new URL(
  '../../schema/cy-manifest-v1.predicates.json',
  import.meta.url,
)

export interface PredicateArtifact {
  readonly $id: string
  readonly formatVersion: number
  readonly status: string
  readonly reservedIds: { readonly values: readonly string[] }
  readonly id: { readonly pattern: string; readonly maxCodePoints: number }
  readonly version: {
    readonly grammarPattern: string
    readonly submissionPattern: string
    readonly maxCodePoints: number
    readonly maxNumericIdentifier: number
  }
  readonly limits: Readonly<Record<string, number>>
  readonly author: {
    readonly emailLikePattern: string
    readonly urlLikePattern: string
  }
  readonly repository: {
    readonly shorthandHosts: Readonly<Record<string, string>>
  }
  readonly homepage: { readonly schemes: readonly string[] }
  readonly readinessWarnings: { readonly fields: readonly string[] }
}

export const PREDICATES: PredicateArtifact = JSON.parse(
  readFileSync(ARTIFACT_URL, 'utf8'),
) as PredicateArtifact

const RESERVED_IDS: ReadonlySet<string> = new Set(PREDICATES.reservedIds.values)
const ID_PATTERN = new RegExp(PREDICATES.id.pattern)
const VERSION_SUBMISSION = new RegExp(PREDICATES.version.submissionPattern)
const AUTHOR_EMAIL_LIKE = new RegExp(PREDICATES.author.emailLikePattern)
const AUTHOR_URL_LIKE = new RegExp(PREDICATES.author.urlLikePattern, 'i')

/** `cyweb`, plus every own key of `Object.prototype`. See the artifact for why. */
export const isReservedId = (id: string): boolean => RESERVED_IDS.has(id)

/**
 * Length in Unicode code points, which is what JSON Schema's `maxLength`
 * counts. `String.length` counts UTF-16 code units, so the two disagree on any
 * non-BMP character — an emoji in a display name is enough.
 */
export const codePoints = (value: string): number => [...value].length

/**
 * True if the string contains an unpaired surrogate.
 *
 * Strict UTF-8 validation of the raw bytes does not catch this: the bytes of
 * `"\uDEAD"` are plain ASCII. RFC 8259 §8.2 permits the escape and warns that
 * consumer behaviour is unpredictable, so the check has to run after parsing.
 */
export const hasLoneSurrogate = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(i + 1)
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return true
      i += 1
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true
    }
  }
  return false
}

/**
 * A-Z folded to a-z, every other code point left exactly as it is.
 *
 * Portable on purpose: locale-aware case folding is not something a TypeScript
 * producer and a Python consumer can be relied on to agree about, and tag
 * equality has to be the same relation on both sides.
 */
export const foldAsciiCase = (value: string): string =>
  value.replace(/[A-Z]/g, (c) => c.toLowerCase())

export const isEmailLike = (value: string): boolean =>
  AUTHOR_EMAIL_LIKE.test(value)
export const isUrlLike = (value: string): boolean => AUTHOR_URL_LIKE.test(value)

export const isValidIdShape = (id: string): boolean =>
  ID_PATTERN.test(id) && codePoints(id) <= PREDICATES.id.maxCodePoints

/**
 * The submission version profile: canonical SemVer, bounded length, no build
 * metadata, numeric identifiers within `Number.MAX_SAFE_INTEGER`.
 *
 * Returns the reason it failed, or `undefined`. The GRAMMAR is checked earlier
 * and everywhere; this is the part that applies only where a manifest is built,
 * because a version that is legal SemVer must not fail an ordinary `vite dev`
 * over a rule that exists for a filename and a URL path.
 */
export const versionProfileFailure = (version: string): string | undefined => {
  if (codePoints(version) > PREDICATES.version.maxCodePoints) {
    return `is longer than ${PREDICATES.version.maxCodePoints} characters — it becomes a ZIP filename and a URL path segment`
  }
  if (version.includes('+')) {
    return `carries build metadata — SemVer excludes it from precedence, so "1.0.0+a" and "1.0.0+b" are distinct identities that tie for a latest endpoint`
  }
  const match = VERSION_SUBMISSION.exec(version)
  if (match === null) return `is not canonical SemVer`

  const numeric = [match[1], match[2], match[3]]
  for (const identifier of (match[4] ?? '').split('.')) {
    if (identifier !== '' && /^\d+$/.test(identifier)) numeric.push(identifier)
  }
  for (const identifier of numeric) {
    if (Number(identifier) > PREDICATES.version.maxNumericIdentifier) {
      return `has a numeric identifier above Number.MAX_SAFE_INTEGER (${identifier}) — node-semver compares two such values as equal, so they would tie for a latest endpoint with no defined order`
    }
  }
  return undefined
}

/** What a normalizer concluded about one optional field. */
export type FieldOutcome<T> =
  | { readonly kind: 'absent'; readonly warning?: string }
  | { readonly kind: 'value'; readonly value: T; readonly warning?: string }
  | { readonly kind: 'invalid'; readonly message: string }

const absent = <T>(warning?: string): FieldOutcome<T> => ({
  kind: 'absent',
  warning,
})
const value = <T>(v: T, warning?: string): FieldOutcome<T> => ({
  kind: 'value',
  value: v,
  warning,
})
const invalid = <T>(message: string): FieldOutcome<T> => ({
  kind: 'invalid',
  message,
})

/**
 * A plain optional string: trimmed, bounded, and absent when it trims away.
 *
 * `[source]` — a direct string that is empty after trimming is absent and
 * omitted. `[wire]` — a present empty or untrimmed value is noncanonical and the
 * Store rejects it rather than trimming it here.
 */
export const normalizeOptionalString = (
  field: string,
  raw: unknown,
  limit: number,
): FieldOutcome<string> => {
  if (raw === undefined || raw === null) return absent()
  if (typeof raw !== 'string') {
    return invalid(`${field} must be a string (got ${JSON.stringify(raw)})`)
  }
  const trimmed = raw.trim()
  if (trimmed === '') return absent()
  if (hasLoneSurrogate(trimmed))
    return invalid(`${field} contains an unpaired surrogate`)
  if (codePoints(trimmed) > limit) {
    return invalid(`${field} is longer than ${limit} characters`)
  }
  return value(trimmed)
}

interface AuthorObject {
  name?: unknown
}

/**
 * `[source]` The author's public display name, and nothing else.
 *
 * Accepts a plain string, npm's `"Name <email> (url)"`, and `{ name, email, url }`
 * — and takes the name only. The extracted name is then re-checked, because
 * taking `name` out of `{"name": "jane@example.org"}` and publishing it would
 * break the promise that an author never carries an email address.
 */
export const normalizeAuthor = (raw: unknown): FieldOutcome<string> => {
  let candidate: unknown = raw

  if (raw !== undefined && raw !== null && typeof raw === 'object') {
    if (Array.isArray(raw))
      return invalid(`author must be a string or an object`)
    const named = (raw as AuthorObject).name
    if (named === undefined) {
      return absent(
        `author has no name — only contact details, which are never published`,
      )
    }
    if (typeof named !== 'string') {
      return invalid(
        `author.name must be a string (got ${JSON.stringify(named)})`,
      )
    }
    candidate = named
  } else if (typeof candidate === 'string') {
    // npm's "Name <email> (url)": the name is everything before either bracket.
    const cut = candidate.search(/[<(]/)
    candidate = cut === -1 ? candidate : candidate.slice(0, cut)
  }

  const outcome = normalizeOptionalString(
    'author',
    candidate,
    PREDICATES.limits.author,
  )
  if (outcome.kind !== 'value') return outcome

  if (isEmailLike(outcome.value) || isUrlLike(outcome.value)) {
    return absent(
      `author "${outcome.value}" looks like an email address or a URL, not a display name — omitted rather than published`,
    )
  }
  return outcome
}

const SSH_SCP = /^git@([^:/\s]+):(.+)$/
const SHORTHAND = /^(github|gitlab|bitbucket):(.+)$/i
const AUTHORITY = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i

/**
 * True if the authority names a port, read off the RAW string.
 *
 * The URL parser cannot answer this: it drops a DEFAULT port silently, so
 * `new URL('https://host:443/x').port` is `''`. Silently dropping it is exactly
 * what this rule exists to prevent, so the question is asked before parsing.
 */
const authorityHasPort = (candidate: string): boolean => {
  const match = AUTHORITY.exec(candidate)
  if (match === null) return false
  const authority = match[1]
  const host = authority.slice(authority.lastIndexOf('@') + 1)
  // An IPv6 literal is bracketed; a port would follow the closing bracket.
  return host.startsWith('[') ? /\]:\d*$/.test(host) : host.includes(':')
}

/**
 * `[source]` Every accepted repository form, canonicalized to one https URL.
 *
 * An explicit port, query or fragment is REJECTED rather than silently
 * stripped: dropping part of a URL changes what it addresses. Percent escapes
 * are rejected on the raw string, before any URL parser can normalize them.
 */
export const normalizeRepositoryUrl = (raw: string): FieldOutcome<string> => {
  const source = raw.trim()
  if (source === '') return absent()
  if (source.includes('%')) {
    return invalid(
      `repository "${source}" contains a percent escape — write the plain https URL instead`,
    )
  }

  let candidate = source
  const shorthand = SHORTHAND.exec(source)
  if (shorthand !== null) {
    const host =
      PREDICATES.repository.shorthandHosts[shorthand[1].toLowerCase()]
    candidate = `https://${host}/${shorthand[2]}`
  } else {
    candidate = candidate.replace(/^git\+/, '')
    const scp = SSH_SCP.exec(candidate)
    if (scp !== null) candidate = `https://${scp[1]}/${scp[2]}`
  }

  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    return invalid(
      `repository "${source}" is not a URL this SDK accepts — write a plain https URL such as https://github.com/owner/repo`,
    )
  }

  const scheme = url.protocol.replace(/:$/, '')
  if (scheme === 'ssh') {
    // The conventional `git` USER is transport syntax. A password never is —
    // and dropping one silently is how a credential committed to package.json
    // reaches a public manifest as if it had never been there.
    if (
      (url.username !== '' && url.username !== 'git') ||
      url.password !== ''
    ) {
      return invalid(`repository "${source}" carries credentials`)
    }
  } else if (scheme !== 'https' && scheme !== 'http') {
    return invalid(
      `repository "${source}" uses the "${scheme}" scheme — write a plain https URL instead`,
    )
  } else if (url.username !== '' || url.password !== '') {
    return invalid(`repository "${source}" carries credentials`)
  }

  if (url.port !== '' || authorityHasPort(candidate)) {
    return invalid(`repository "${source}" names an explicit port`)
  }
  if (url.search !== '')
    return invalid(`repository "${source}" carries a query string`)
  if (url.hash !== '')
    return invalid(`repository "${source}" carries a fragment`)

  // Trailing slashes FIRST: `…/repo.git/` would otherwise keep its suffix,
  // because `.git$` does not match a path that ends in a slash — and the result
  // is a value this SDK's own wire rules reject.
  const path = url.pathname
    .replace(/\/+$/, '')
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
  if (path === '')
    return invalid(`repository "${source}" names no repository path`)

  const canonical = `https://${url.hostname}${path}`
  // The raw check above catches an escape the developer wrote. This one catches
  // an escape the URL PARSER introduced: a space or a non-ASCII character in the
  // path comes back percent-encoded, and canonical repository paths have no `%`.
  if (canonical.includes('%')) {
    return invalid(
      `repository "${source}" contains a character that must be percent-encoded in a URL — write a plain https URL with an unencoded path`,
    )
  }
  if (codePoints(canonical) > PREDICATES.limits.repository) {
    return invalid(
      `repository is longer than ${PREDICATES.limits.repository} characters`,
    )
  }
  return value(canonical)
}

/** `[source]` A relative POSIX path inside the repository. `%` is banned outright. */
export const normalizeRepositoryDirectory = (
  raw: unknown,
): FieldOutcome<string> => {
  const outcome = normalizeOptionalString(
    'repository.directory',
    raw,
    PREDICATES.limits.repositoryDirectory,
  )
  if (outcome.kind !== 'value') return outcome

  const path = outcome.value
  const reason = path.includes('%')
    ? 'contains a percent escape'
    : path.includes('\\')
      ? 'contains a backslash'
      : path.includes('\0')
        ? 'contains NUL'
        : /^[a-zA-Z]:/.test(path)
          ? 'names a drive letter'
          : path.startsWith('/')
            ? 'is absolute'
            : path.split('/').some((s) => s === '' || s === '.' || s === '..')
              ? 'has an empty, "." or ".." segment'
              : undefined
  return reason === undefined
    ? outcome
    : invalid(
        `repository.directory "${path}" ${reason} — it must be a relative POSIX path`,
      )
}

/** `[source]` Credential-free http(s), with path, query and fragment preserved. */
export const normalizeHomepage = (raw: unknown): FieldOutcome<string> => {
  const outcome = normalizeOptionalString(
    'homepage',
    raw,
    PREDICATES.limits.homepage,
  )
  if (outcome.kind !== 'value') return outcome

  let url: URL
  try {
    url = new URL(outcome.value)
  } catch {
    return invalid(`homepage "${outcome.value}" is not an absolute URL`)
  }
  const scheme = url.protocol.replace(/:$/, '')
  if (!PREDICATES.homepage.schemes.includes(scheme)) {
    return invalid(
      `homepage "${outcome.value}" uses the "${scheme}" scheme — only ${PREDICATES.homepage.schemes.join(' and ')} are accepted`,
    )
  }
  if (url.username !== '' || url.password !== '') {
    return invalid(`homepage "${outcome.value}" carries credentials`)
  }
  // Re-checked on what is actually emitted: `URL` percent-encodes a non-ASCII
  // path, so a value inside the limit going in can be well outside it coming
  // out — and the producer would emit something its own wire rules reject.
  if (codePoints(url.href) > PREDICATES.limits.homepage) {
    return invalid(
      `homepage "${outcome.value}" is ${codePoints(url.href)} characters once percent-encoded, over the ${PREDICATES.limits.homepage}-character limit`,
    )
  }
  return value(url.href)
}

/**
 * `[source]` Keywords become tags: trimmed, de-duplicated, bounded, and omitted
 * rather than emitted empty.
 */
export const normalizeTags = (
  raw: unknown,
): FieldOutcome<readonly string[]> => {
  if (raw === undefined || raw === null) return absent()
  if (!Array.isArray(raw)) {
    return invalid(
      `keywords must be an array of strings (got ${JSON.stringify(raw)})`,
    )
  }

  const tags: string[] = []
  const seen = new Set<string>()
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      return invalid(
        `every keyword must be a string (got ${JSON.stringify(entry)})`,
      )
    }
    const trimmed = entry.trim()
    if (trimmed === '') continue
    if (hasLoneSurrogate(trimmed))
      return invalid(`a keyword contains an unpaired surrogate`)
    if (codePoints(trimmed) > PREDICATES.limits.tagMaxCodePoints) {
      return invalid(
        `keyword "${trimmed}" is longer than ${PREDICATES.limits.tagMaxCodePoints} characters`,
      )
    }
    const key = foldAsciiCase(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(trimmed)
  }

  if (tags.length === 0) return absent()
  if (tags.length > PREDICATES.limits.tagsMaxEntries) {
    return invalid(`more than ${PREDICATES.limits.tagsMaxEntries} keywords`)
  }
  return value(tags)
}
