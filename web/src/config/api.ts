// API Configuration
// Centralized API URL configuration using Vite environment variables
// Default to empty string for relative paths (nginx proxy)

export const API_BASE_URL = import.meta.env.VITE_API_URL || ''
export const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || ''

// Helper to build API endpoints
export const getApiUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  // Remove /api/v1 prefix if it exists in API_BASE_URL and path
  const baseUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
  return `${baseUrl}/api/v1${normalizedPath}`
}

export const getAiServiceUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = AI_SERVICE_URL.replace(/\/api\/v1\/?$/, '')
  return `${baseUrl}/api/v1${normalizedPath}`
}
