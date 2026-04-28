import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string | null
}

interface Session {
  token: string
  refreshToken: string
  user: User
}

interface SubscriptionStatus {
  access: 'trialing' | 'active' | 'expired' | 'past_due' | 'offline' | 'unauthenticated'
  daysRemaining?: number
  cached?: boolean
}

interface AuthContextValue {
  session: Session | null
  subscriptionStatus: SubscriptionStatus | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<{ devAutoVerified?: boolean }>
  logout: () => Promise<void>
  refreshSubscriptionStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSubscriptionStatus = useCallback(async () => {
    try {
      const status = await window.api.auth.getSubscriptionStatus()
      setSubscriptionStatus(status)
    } catch {
      setSubscriptionStatus({ access: 'offline', cached: true })
    }
  }, [])

  useEffect(() => {
    async function initAuth() {
      try {
        const storedSession = await window.api.auth.getSession()
        if (storedSession) {
          setSession(storedSession)
          // Check subscription status in background
          refreshSubscriptionStatus()
        }
      } catch {
        // No session
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [refreshSubscriptionStatus])

  // Refresh subscription status every hour
  useEffect(() => {
    if (!session) return
    const interval = setInterval(refreshSubscriptionStatus, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [session, refreshSubscriptionStatus])

  const login = useCallback(async (email: string, password: string) => {
    const result = await window.api.auth.login({ email, password })
    setSession({ token: result.token, refreshToken: result.refreshToken, user: result.user })
    // Get subscription status after login
    const status = await window.api.auth.getSubscriptionStatus()
    setSubscriptionStatus(status)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    return await window.api.auth.register({ name, email, password })
  }, [])

  const logout = useCallback(async () => {
    await window.api.auth.logout()
    setSession(null)
    setSubscriptionStatus(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, subscriptionStatus, isLoading, login, register, logout, refreshSubscriptionStatus }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
