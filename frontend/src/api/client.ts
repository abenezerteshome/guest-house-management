import axios from 'axios'

export const TOKEN_KEY = 'haven_house_access_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getApiError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!axios.isAxiosError(error)) return fallback
  if (!error.response) return 'Unable to reach the server. Check that the backend is running.'
  if (error.response.status === 401) {
    if (error.config?.url?.includes('/auth/login')) {
      return error.response.data?.detail || 'Invalid username or password.'
    }
    return 'Your session has expired. Please sign in again.'
  }
  if (error.response.status === 403) return 'You do not have permission to perform this action.'
  if (error.response.status === 404) return 'The requested resource could not be found.'
  if (error.response.status === 409) return error.response.data?.detail || 'This action conflicts with existing data.'
  if (error.response.status === 422) return 'Please check the highlighted information and try again.'
  if (error.response.status >= 500) return 'Something went wrong. Please try again.'
  return error.response.data?.detail || fallback
}

api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
    clearSession()
  }
  return Promise.reject(error)
})