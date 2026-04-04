import { IpcMain, shell } from 'electron'
import Store from 'electron-store'

interface SessionData {
  token: string
  refreshToken: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

const store = new Store<{ session: SessionData | null }>({
  name: 'grounds-session',
  encryptionKey: 'gfa-session-key-v1'
})

const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'

async function apiRequest(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return fetch(`${API_URL}${path}`, { ...options, headers })
}

async function refreshTokenIfNeeded(): Promise<string | null> {
  const session = store.get('session')
  if (!session) return null

  try {
    const res = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken })
    })
    if (res.ok) {
      const data = await res.json()
      store.set('session', { ...session, token: data.token })
      return data.token
    }
  } catch {
    // Network error — return existing token and let caller handle 401
  }
  return session.token
}

export function registerAuthHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('auth:register', async (_, data: { email: string; password: string; name: string }) => {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Registration failed')
    return json
  })

  ipcMain.handle('auth:verifyEmail', async (_, data: { email: string; code: string }) => {
    const res = await apiRequest('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Verification failed')
    return json
  })

  ipcMain.handle('auth:login', async (_, data: { email: string; password: string }) => {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Login failed')

    store.set('session', {
      token: json.token,
      refreshToken: json.refreshToken,
      user: json.user
    })
    return json
  })

  ipcMain.handle('auth:logout', async () => {
    const session = store.get('session')
    if (session?.token) {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' }, session.token)
      } catch {
        // Best-effort logout on server
      }
    }
    store.delete('session')
    return { success: true }
  })

  ipcMain.handle('auth:getSession', () => {
    return store.get('session') || null
  })

  ipcMain.handle('auth:forgotPassword', async (_, email: string) => {
    const res = await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to send reset code')
    return json
  })

  ipcMain.handle('auth:resetPassword', async (_, data: { email: string; code: string; password: string }) => {
    const res = await apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to reset password')
    return json
  })

  ipcMain.handle('auth:getSubscriptionStatus', async () => {
    const token = await refreshTokenIfNeeded()
    if (!token) return { access: 'unauthenticated' }

    try {
      const res = await apiRequest('/api/subscription/status', {}, token)
      if (res.status === 401) {
        store.delete('session')
        return { access: 'unauthenticated' }
      }
      return await res.json()
    } catch {
      // Network error — allow access with cached session (offline grace)
      const session = store.get('session')
      return session ? { access: 'offline', cached: true } : { access: 'unauthenticated' }
    }
  })

  ipcMain.handle('auth:createCheckout', async (_, plan: 'monthly' | 'yearly') => {
    const token = await refreshTokenIfNeeded()
    if (!token) throw new Error('Not authenticated')

    const res = await apiRequest('/api/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan })
    }, token)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to create checkout')

    shell.openExternal(json.url)
    return { success: true }
  })

  ipcMain.handle('auth:openBillingPortal', async () => {
    const token = await refreshTokenIfNeeded()
    if (!token) throw new Error('Not authenticated')

    const res = await apiRequest('/api/subscription/portal', {
      method: 'POST'
    }, token)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to open billing portal')

    shell.openExternal(json.url)
    return { success: true }
  })

  ipcMain.handle('auth:changePassword', async (_, data: { currentPassword: string; newPassword: string }) => {
    const token = await refreshTokenIfNeeded()
    if (!token) throw new Error('Not authenticated')

    const res = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }, token)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to change password')
    return json
  })
}
