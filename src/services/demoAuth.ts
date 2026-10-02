import type { DemoUser } from '../domain/types'

const AUTH_KEY = 'sentinel.demo-auth.v1'
const AUTH_EVENT = 'sentinel:auth-updated'
export const DEMO_EMAIL = 'student@sentinel.demo'
export const DEMO_PASSWORD = 'sentinel123'
export const demoUser: DemoUser = { name: 'Demo User', email: DEMO_EMAIL }

function readAuth(): boolean {
  try {
    return window.localStorage.getItem(AUTH_KEY) === 'authenticated'
  } catch {
    return false
  }
}

export function isAuthenticated() {
  if (readAuth()) return true
  try {
    return window.sessionStorage.getItem(AUTH_KEY) === 'authenticated'
  } catch {
    return false
  }
}

export function signIn(email: string, password: string, remember = true): boolean {
  if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) return false
  try {
    const storage = remember ? window.localStorage : window.sessionStorage
    storage.setItem(AUTH_KEY, 'authenticated')
    if (remember) window.sessionStorage.removeItem(AUTH_KEY)
    else window.localStorage.removeItem(AUTH_KEY)
    window.dispatchEvent(new Event(AUTH_EVENT))
  } catch {
    // The UI still receives the successful result when browser storage is unavailable.
  }
  return true
}

export function signOut() {
  try {
    window.localStorage.removeItem(AUTH_KEY)
    window.sessionStorage.removeItem(AUTH_KEY)
    window.dispatchEvent(new Event(AUTH_EVENT))
  } catch {
    // Nothing else is required for this frontend-only session.
  }
}

export function subscribeToAuth(listener: () => void) {
  const handleUpdate = () => listener()
  window.addEventListener(AUTH_EVENT, handleUpdate)
  window.addEventListener('storage', handleUpdate)
  return () => {
    window.removeEventListener(AUTH_EVENT, handleUpdate)
    window.removeEventListener('storage', handleUpdate)
  }
}
