/**
 * Which Cytoscape Web host a dev session develops against.
 *
 * Two things decide it: the app's own `defineCyWebApp` options, and an
 * environment variable that overrides them for one session. The variable exists
 * because the host is a property of the *session*, not of the app — a developer
 * pointing at a shared staging host for an afternoon should not have to edit,
 * and then remember to un-edit, a committed config file.
 */

/** Redirects a dev session at a different host for the life of that session. */
export const DEV_HOST_ENV = 'CYWEB_DEV_HOST'

/** Where a local host serves its UI during development. */
export const DEFAULT_DEV_HOST_PAGE_URL = 'http://localhost:5500/'

export interface DevHostOptions {
  readonly devHostPageUrl?: string
  readonly devHostRemoteEntryUrl?: string
}

export interface ResolvedDevHost {
  /**
   * The host page an install link points at. Always ends in a slash — it is a
   * base URL, and see {@link withTrailingSlash} for why that matters twice.
   */
  readonly pageUrl: string
  /** The host's `remoteEntry.js`, which the app's federation config loads. */
  readonly remoteEntryUrl: string
  /** True when {@link DEV_HOST_ENV} chose the host rather than the config. */
  readonly fromEnv: boolean
  /**
   * True when the host is not on loopback, and the browser will therefore ask
   * permission before it may reach this app.
   *
   * A page on a public origin loading a subresource from `localhost` is a
   * public-to-loopback request, which Chrome refuses until the user allows it.
   * A host that is itself on localhost never crosses that boundary, so the
   * warning would be noise.
   */
  readonly needsLocalNetworkPermission: boolean
}

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/**
 * Normalize a host base URL to exactly one trailing slash.
 *
 * Both directions are load-bearing. Too many, and the derived entry doubles:
 * `new URL('remoteEntry.js', 'https://host/cytoscape//')` resolves to
 * `.../cytoscape//remoteEntry.js`, and a URL copied out of an address bar
 * usually carries a trailing slash. Too few, and the install link becomes
 * `https://host/cytoscape?installApp=…`, which dev1 answers with a 301 to the
 * slashed form — harmless there, since Apache preserves the query, but this is
 * the link an app developer is told to open, and not every server preserves a
 * query string across a directory redirect.
 */
const withTrailingSlash = (url: string): string => `${url.replace(/\/+$/, '')}/`

const parseHostUrl = (value: string, source: string): URL => {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(
      `[cyweb] ${source} is not a valid URL: "${value}".\n` +
        `  It must be the absolute URL of a running Cytoscape Web host, ` +
        `for example https://dev1.ndexbio.org/cytoscape`,
    )
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `[cyweb] ${source} must be an http(s) URL, got "${parsed.protocol}" ` +
        `in "${value}".`,
    )
  }
  return parsed
}

/**
 * Resolve the dev host from options and the environment.
 *
 * With the variable unset this is exactly the previous behaviour, which is the
 * property worth keeping: an app that does not opt in must not change.
 */
export const resolveDevHost = (
  options: DevHostOptions = {},
  env: Record<string, string | undefined> = process.env,
): ResolvedDevHost => {
  const fromEnvRaw = env[DEV_HOST_ENV]?.trim()
  const fromEnv = fromEnvRaw !== undefined && fromEnvRaw !== ''

  // Refused rather than resolved by precedence. The two would name different
  // hosts, so the app would load its code from one and print an install link
  // for the other — the class of silent mismatch this package exists to catch.
  if (fromEnv && options.devHostRemoteEntryUrl !== undefined) {
    throw new Error(
      `[cyweb] ${DEV_HOST_ENV} is set to "${fromEnvRaw}" while this app also ` +
        `sets "devHostRemoteEntryUrl" (${options.devHostRemoteEntryUrl}).\n` +
        `  They would point at different hosts. Unset one of them.`,
    )
  }

  const pageUrlRaw = fromEnv
    ? (fromEnvRaw as string)
    : (options.devHostPageUrl ?? DEFAULT_DEV_HOST_PAGE_URL)

  const source = fromEnv ? DEV_HOST_ENV : 'devHostPageUrl'
  const parsed = parseHostUrl(pageUrlRaw, source)
  const pageUrl = withTrailingSlash(pageUrlRaw)

  // Built with the URL API, not concatenation: a host served under a base path
  // keeps its entry inside that path, and string joining loses or doubles it.
  const remoteEntryUrl =
    options.devHostRemoteEntryUrl ?? new URL('remoteEntry.js', pageUrl).href

  return {
    pageUrl,
    remoteEntryUrl,
    fromEnv,
    needsLocalNetworkPermission: !LOOPBACK_HOSTNAMES.has(parsed.hostname),
  }
}
