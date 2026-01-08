/**
 * Authenticated fetch utility that uses HttpOnly cookies for auth
 * and includes CSRF tokens for state-changing requests.
 *
 * This replaces the pattern of getting token from authStore and
 * passing it in Authorization header.
 */

// Helper to get CSRF token from cookie
function getCSRFToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Wrapper around fetch that handles authentication via cookies
 * and CSRF protection automatically.
 *
 * @param url - The URL to fetch
 * @param options - Standard RequestInit options
 * @returns Promise<Response>
 */
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const method = options?.method?.toUpperCase() || 'GET'

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  }

  // Add CSRF token for state-changing requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCSRFToken()
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with request
  })
}

/**
 * Helper to make authenticated JSON API calls
 * Returns the parsed JSON response or throws on error
 */
export async function authFetchJSON<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const response = await authFetch(url, options)

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`)
  }

  return response.json()
}
