/**
 * Authenticated fetch utility that uses HttpOnly cookies for auth
 * and includes CSRF tokens for state-changing requests.
 *
 * This replaces the pattern of getting token from authStore and
 * passing it in Authorization header.
 */

import { useAuthStore } from '@/store/authStore'
import { logger } from './logger'

// Helper to get CSRF token from cookie
function getCSRFToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Track if we're already handling a session expiry to prevent multiple redirects
let isHandlingSessionExpiry = false

/**
 * Handle session expiry by clearing auth state and redirecting to login
 */
async function handleSessionExpiry(reason: string): Promise<void> {
  if (isHandlingSessionExpiry) return
  isHandlingSessionExpiry = true

  logger.warn(`[authFetch] Session expired: ${reason}`)

  // Clear auth state
  const authStore = useAuthStore.getState()
  authStore.logout().catch(() => {
    // Ignore errors during logout - we're already in an error state
  })

  // Redirect to login page
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login?expired=true'
  }

  // Reset flag after a delay to allow for page navigation
  setTimeout(() => {
    isHandlingSessionExpiry = false
  }, 2000)
}

/**
 * Wrapper around fetch that handles authentication via cookies
 * and CSRF protection automatically.
 *
 * Automatically handles session expiry (401/403) by logging out
 * and redirecting to the login page.
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

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send cookies with request
  })

  // Handle auth failures - redirect to login
  if (response.status === 401) {
    await handleSessionExpiry('Authentication required (401)')
  } else if (response.status === 403) {
    // Check if this is a CSRF error specifically
    const clonedResponse = response.clone()
    try {
      const data = await clonedResponse.json()
      if (
        data.error?.toLowerCase().includes('csrf') ||
        data.error?.toLowerCase().includes('token')
      ) {
        await handleSessionExpiry('Invalid or expired CSRF token (403)')
      }
    } catch {
      // If we can't parse the response, it might still be an auth issue
      // Only trigger expiry for non-GET requests where CSRF is required
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        await handleSessionExpiry('Forbidden (403)')
      }
    }
  }

  return response
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
