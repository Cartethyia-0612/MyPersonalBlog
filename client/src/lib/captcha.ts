import wasmUrl from '@cap.js/wasm/browser/cap_wasm_bg.wasm?url'
import hashwxUrl from '@cap.js/wasm/browser/hashwx.wasm?url'

import { getCsrfToken } from '@/lib/csrf'

let loadPromise: Promise<void> | null = null

async function setup(): Promise<void> {
  window.CAP_CUSTOM_WASM_URL = wasmUrl
  window.CAP_CUSTOM_HASHWX_URL = hashwxUrl
  window.CAP_CUSTOM_FETCH = ((input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    )
    const csrfToken = getCsrfToken()
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken)
    return fetch(input, { ...init, headers })
  }) as typeof fetch

  await import('cap-widget')
}

/**
 * Load the widget lazily so the login page chunk stays small. The WASM URLs
 * and the CSRF-aware fetch must be installed before cap-widget boots.
 */
export function loadCapWidget(): Promise<void> {
  if (!loadPromise) {
    loadPromise = setup().catch((error: unknown) => {
      loadPromise = null
      throw error
    })
  }
  return loadPromise
}
