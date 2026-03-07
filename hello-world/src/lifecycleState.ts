/**
 * lifecycleState.ts — External store bridging app lifecycle and React components.
 *
 * ## Why this module exists
 *
 * `HelloApp.mount()` and `unmount()` are plain-object callbacks that run outside
 * React's rendering context, so they cannot call hooks or access React state
 * directly. This module holds state in a module-scoped variable and lets React
 * components subscribe to it via `useSyncExternalStore`.
 *
 * ## Data flow
 *
 *   HelloApp.mount()   ── setLifecycleState() ──→ _state updated
 *   HelloApp.unmount() ── setLifecycleState() ──→ listeners notified
 *                                                       ↓
 *   LifecycleSection ←── useSyncExternalStore() ── React re-renders
 *
 * ## useSyncExternalStore contract
 *
 * The hook requires two stable function references:
 *   1. subscribe(callback)  — registers a change listener; returns unsubscribe
 *   2. getSnapshot()        — returns the current state snapshot
 *
 * Both are exported as module-level constants, so they are always stable
 * references and never need to be wrapped in useCallback / useMemo.
 */

/** Shape of the shared lifecycle state. */
export interface LifecycleState {
  /** true while mount() has been called and unmount() has not yet been called */
  mounted: boolean

  /**
   * Number of 'network:switched' events received since mount().
   * Incremented by the app-level listener registered in mount().
   */
  networkSwitchCount: number

  /**
   * ID of the most recently active network.
   * Initialised from context.apis in mount(); updated on each network switch.
   * null when no network is open yet.
   */
  lastNetworkId: string | null
}

// Internal mutable state — only mutated by setLifecycleState().
let _state: LifecycleState = {
  mounted: false,
  networkSwitchCount: 0,
  lastNetworkId: null,
}

// Callbacks registered by useSyncExternalStore — notified on every state change.
// Using a Set prevents duplicate registrations.
const _listeners = new Set<() => void>()

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the current state snapshot.
 *
 * Pass this as the `getSnapshot` argument to useSyncExternalStore.
 * React calls this on every render; it re-renders only when the returned
 * reference differs from the previous call.
 *
 * setLifecycleState() always produces a new object reference, so React
 * detects changes correctly without extra memoisation.
 */
export const getLifecycleSnapshot = (): LifecycleState => _state

/**
 * Applies a partial update to the state and notifies all subscribers.
 *
 * @param patch - Object containing only the fields to update
 *
 * Examples:
 *   setLifecycleState({ mounted: true })
 *   setLifecycleState({ lastNetworkId: networkId, networkSwitchCount: 3 })
 */
export const setLifecycleState = (patch: Partial<LifecycleState>): void => {
  // Spread into a new object so useSyncExternalStore detects the reference change.
  // Mutating the existing object would make React think nothing changed.
  _state = { ..._state, ...patch }
  _listeners.forEach((listener) => listener())
}

/**
 * Subscribes to state changes.
 *
 * Pass this as the `subscribe` argument to useSyncExternalStore.
 * React calls it once on mount and calls the returned cleanup on unmount.
 *
 * @param listener - callback React will invoke when state changes
 * @returns unsubscribe function
 */
export const subscribeLifecycleState = (listener: () => void): (() => void) => {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}
