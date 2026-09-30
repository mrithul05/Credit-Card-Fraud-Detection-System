export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class BackendUnavailableError extends Error {
  constructor(message = 'Unable to connect to the fraud detection server.') {
    super(message)
    this.name = 'BackendUnavailableError'
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
      signal: controller.signal,
    })

    if (!response.ok) {
      let detail = ''
      try {
        const body = await response.json() as { detail?: string; message?: string }
        detail = body.detail || body.message || ''
      } catch {
        // Keep the response error useful when the server does not return JSON.
      }
      throw new ApiError(detail || `Request failed with status ${response.status}.`, response.status)
    }

    return await response.json() as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new BackendUnavailableError('The fraud detection server took too long to respond.')
    }
    throw new BackendUnavailableError()
  } finally {
    window.clearTimeout(timeout)
  }
}
