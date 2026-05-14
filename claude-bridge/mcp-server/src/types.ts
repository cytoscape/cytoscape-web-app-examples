/**
 * Bridge-specific types — distinct from host ApiResult/ApiError.
 *
 * These model transport and dispatch failures, not domain-specific errors.
 * See design/apps/claude-bridge/README.md § Bridge-Specific Types.
 */

export type BridgeErrorCode =
  | 'METHOD_NOT_FOUND'
  | 'API_ERROR'
  | 'TRANSPORT_ERROR'
  | 'SHAPING_ERROR'

export interface BridgeError {
  code: BridgeErrorCode
  message: string
  /** Present only when code === 'API_ERROR'. Contains the host ApiFailure. */
  originalError?: { code: string; message: string }
}

export interface BridgeSuccess<T> {
  success: true
  data: T
}

export interface BridgeFailure {
  success: false
  error: BridgeError
}

export type BridgeResult<T> = BridgeSuccess<T> | BridgeFailure
