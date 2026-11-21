// Ambient declaration for the module `defineCyWebApp` synthesizes at build time.
//
// A GLOBAL declaration file — no top-level import or export — because
// `declare module 'x'` for a specifier that resolves to nothing is only an
// ambient module declaration in a global file. In a module file it would be
// read as an augmentation of an existing module and fail to compile.
//
// Reached from an app through its tsconfig:
//   "types": ["@cytoscape-web/api-types", "@cytoscape-web/app-runtime/meta"]
// which is the same mechanism `vite/client` uses.

declare module 'virtual:cyweb-app-meta' {
  /**
   * The app's Module Federation container name, and its `CyApp.id`. Comes from
   * `cyweb.id` in package.json — the one place it is written.
   */
  export const id: string

  /** Human-readable name shown in the host's App Settings. `cyweb.displayName`. */
  export const displayName: string

  /** The app's own version. The standard package.json `version` field. */
  export const version: string

  /** One-line summary. The standard package.json `description` field. */
  export const description: string
}
