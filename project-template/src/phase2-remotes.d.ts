// Temporary module declarations for Phase 2 APIs not yet in published
// @cytoscape-web/api-types. Remove once api-types is bumped to include these.

declare module 'cyweb/AppIdContext' {
  export function useAppContext(): {
    readonly appId: string
    readonly apis: any
  } | null
  export const AppIdProvider: import('react').Provider<{
    readonly appId: string
    readonly apis: any
  } | null>
}
