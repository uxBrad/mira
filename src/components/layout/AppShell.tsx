import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Settings, LogOut, Clock, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { useToast } from '../ui/use-toast'
import UpdateBanner from '../UpdateBanner'
import { useState, useEffect } from 'react'

export default function AppShell() {
  const { session, subscriptionStatus, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem('echo-user-avatar'))

  useEffect(() => { const t = setTimeout(() => setReady(true), 30); return () => clearTimeout(t) }, [])

  // Keep avatar in sync when updated in Settings (same tab or another tab)
  useEffect(() => {
    function sync() { setAvatar(localStorage.getItem('echo-user-avatar')) }
    window.addEventListener('echo-avatar-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('echo-avatar-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (subscriptionStatus?.access === 'expired') {
    navigate('/paywall', { replace: true })
    return null
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
    toast({ title: 'Signed out' })
  }

  const trialBanner =
    subscriptionStatus?.access === 'trialing' &&
    typeof subscriptionStatus.daysRemaining === 'number'

  return (
    <div
      className="flex flex-col h-screen overflow-hidden transition-opacity duration-300"
      style={{ background: '#fcf9f8', opacity: ready ? 1 : 0 }}
    >

      {/* Top navigation bar */}
      <header
        className="flex-shrink-0 flex items-center px-6 titlebar-drag"
        style={{ background: '#ffffff', borderBottom: '1px solid #ebe7e7', height: '56px' }}
        aria-label="Main navigation"
      >
        {/* Nav links — centered pill switcher */}
        <nav className="flex items-center justify-center flex-1 titlebar-no-drag" aria-label="App sections">
          <div
            className="flex items-center p-1 gap-0.5"
            style={{ background: '#ede9e7', borderRadius: '9999px' }}
          >
            {[
              { to: '/', label: 'Projects', matchPrefix: ['/project/'] },
              { to: '/templates', label: 'Templates', matchPrefix: [] },
              { to: '/settings', label: 'Settings', matchPrefix: [] },
            ].map(({ to, label, matchPrefix }) => {
              const isActive =
                (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)) ||
                matchPrefix.some((p) => location.pathname.startsWith(p))
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={cn(
                    'px-4 py-1.5 font-sans text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'text-foreground'
                      : 'text-[#7a7877] hover:text-foreground'
                  )}
                  style={{
                    borderRadius: '9999px',
                    background: isActive ? '#ffffff' : 'transparent',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-1 flex-shrink-0 titlebar-no-drag">
          {/* Trial badge */}
          {trialBanner && (
            <div className="mr-2 px-2.5 py-1" style={{ background: '#f6f3f2' }} role="status" aria-live="polite">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary flex-shrink-0" aria-hidden="true" />
                <p className="font-sans text-xs font-medium text-foreground whitespace-nowrap">
                  {subscriptionStatus.daysRemaining === 0
                    ? 'Trial expires today'
                    : `${subscriptionStatus.daysRemaining}d left`}
                </p>
              </div>
            </div>
          )}

          <button
            className="flex items-center justify-center w-9 h-9 text-[#5f5e5e] hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>

          <NavLink
            to="/settings"
            className="flex items-center justify-center w-9 h-9 text-[#5f5e5e] hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </NavLink>

          {session?.user ? (
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center justify-center w-9 h-9 font-sans text-xs font-bold text-white overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ borderRadius: '9999px', background: '#610000' }}
              aria-label={`Sign out (${session.user.email})`}
              title={session.user.email}
            >
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" aria-hidden="true" />
                : (session.user.email?.[0]?.toUpperCase() ?? <User className="h-5 w-5" />)
              }
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-9 h-9 text-[#5f5e5e] hover:text-primary transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 flex flex-col overflow-hidden focus:outline-none"
        tabIndex={-1}
        style={{ background: '#fcf9f8' }}
      >
        <UpdateBanner />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
