/**
 * Shared dispatcher — single page.evaluate() per API call.
 *
 * Dispatches claude:command before and claude:result/claude:error after.
 * See design/apps/claude-bridge/README.md § Dispatcher Pattern.
 */
import type { Page } from 'playwright'
import type { BridgeResult } from './types.js'

let callCounter = 0

/**
 * Execute a CyWebApi method via CDP page.evaluate() and dispatch
 * claude:* events for the observer panel.
 *
 * @param page - Playwright Page connected via CDP
 * @param method - Dot-notated method name, e.g. 'workspace.getCurrentNetworkId'
 * @param args - Positional arguments to spread into the API call
 * @returns BridgeResult with unwrapped host data on success
 */
export async function callApi(
  page: Page,
  method: string,
  args: unknown[] = [],
): Promise<BridgeResult<unknown>> {
  const id = ++callCounter

  try {
    return await page.evaluate(
      async ({ id, method, args }: { id: number; method: string; args: unknown[] }) => {
        const [domain, fn] = method.split('.')
        const api = (window as any).CyWebApi

        // Guard: method must exist
        if (!api?.[domain]?.[fn]) {
          const error = {
            code: 'METHOD_NOT_FOUND' as const,
            message: `${method} not found on CyWebApi`,
          }
          window.dispatchEvent(
            new CustomEvent('claude:error', { detail: { id, method, error } }),
          )
          return { success: false as const, error }
        }

        // 1. Notify panel: command incoming
        window.dispatchEvent(
          new CustomEvent('claude:command', {
            detail: { id, method, params: args },
          }),
        )

        // 2. Execute the API call (spread positional args; await for async APIs)
        const result = await Promise.resolve(api[domain][fn](...args))

        // 3. Check host result and normalise to BridgeResult
        if (result?.success === false) {
          const error = {
            code: 'API_ERROR' as const,
            message: result.error?.message ?? 'Host API call failed',
            originalError: result.error
              ? { code: result.error.code, message: result.error.message }
              : undefined,
          }
          window.dispatchEvent(
            new CustomEvent('claude:error', { detail: { id, method, error } }),
          )
          return { success: false as const, error }
        }

        // 4. Notify panel: success (unwrap host ApiSuccess envelope)
        const payload = result?.success === true ? result.data : result
        window.dispatchEvent(
          new CustomEvent('claude:result', {
            detail: { id, method, result: payload },
          }),
        )

        return { success: true as const, data: payload }
      },
      { id, method, args },
    )
  } catch (e) {
    // CDP / transport failure — page.evaluate() itself rejected
    const error = {
      code: 'TRANSPORT_ERROR' as const,
      message: String(e),
    }
    try {
      await page.evaluate(
        ({ id, method, error }) =>
          window.dispatchEvent(
            new CustomEvent('claude:error', { detail: { id, method, error } }),
          ),
        { id, method, error },
      )
    } catch {
      // Page already gone — panel notification is best-effort
    }
    return { success: false, error }
  }
}
