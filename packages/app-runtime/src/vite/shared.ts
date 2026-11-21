/**
 * THE single definition of the shared singleton set.
 *
 * Passed to `federation()` AND embedded into mf-manifest.json, so the verifier
 * compares against exactly what the plugin received. Before this package it was
 * copied into five app configs, where nothing could notice them diverging from
 * each other or from the host.
 *
 * Keys are EXACT (no trailing slash) and match the host's
 * FEDERATION_SHARED_SINGLETONS. This only works because app sources import the
 * MUI ROOT module: `import { Box } from '@mui/material'`. A `@mui/material/Box`
 * subpath import silently bundles MUI locally instead — the plugin matches
 * share keys exactly, and MUI is not in its COMMON_SHARED_SUBPATHS list. The
 * trailing-slash key is NOT the fix: it materializes a share entry per subpath
 * actually referenced, and the runtime looks providers up by exact key, so a
 * subpath resolves only if the HOST imports it too. `check:imports` bans the
 * subpath form; `noSharedPayload` catches it if the lint is bypassed.
 * `@mui/icons-material` is banned outright — the host does not share it, and one
 * icon pulls in SvgIcon plus the Emotion engine behind it.
 *
 * `import: false` — do NOT bundle a local fallback. Those fallbacks are
 * STATICALLY imported by the exposed module, so they cost transfer and parse
 * time on every load even when the host's singleton is the instance used.
 * Measured at 8.7x during the Vite migration: 800,753 B of browser JS with
 * fallbacks against 92,325 B without.
 *
 * requiredVersion is declared compatibility metadata, not enforcement: the
 * runtime takes the first registered provider with no semver comparison.
 *
 * WHEN THE HOST BUMPS A MAJOR, this file is what changes, and a new release of
 * this package is how apps find out. Until then `preflight:apps` asserts these
 * records against the host's live share scope, so the divergence surfaces as a
 * red CI run rather than as broken apps in the field.
 */
export const CYWEB_SHARED = {
  react: {
    singleton: true,
    import: false as const,
    requiredVersion: '^18.3.1',
  },
  'react-dom': {
    singleton: true,
    import: false as const,
    requiredVersion: '^18.3.1',
  },
  '@mui/material': {
    singleton: true,
    import: false as const,
    requiredVersion: '^5.18.0',
  },
  '@emotion/react': {
    singleton: true,
    import: false as const,
    requiredVersion: '^11.10.4',
  },
  '@emotion/styled': {
    singleton: true,
    import: false as const,
    requiredVersion: '^11.10.4',
  },
} as const

/** The names only — for callers that need the set without the records. */
export const CYWEB_SHARED_PACKAGES = Object.keys(CYWEB_SHARED)
