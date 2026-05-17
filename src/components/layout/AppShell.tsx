import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Settings, LogOut, Clock, User, LayoutGrid, Layers } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
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

      {/* Top navigation bar — minimal icon-based design */}
      <header
        className="flex-shrink-0 flex items-center px-4 titlebar-drag"
        style={{ background: '#ffffff', borderBottom: '1px solid #ebe7e7', height: '40px' }}
        aria-label="Main navigation"
      >
        {/* Left: Navigation icon buttons */}
        <nav className="flex items-center gap-2 titlebar-no-drag" aria-label="App sections">
          {[
            { to: '/', icon: LayoutGrid, label: 'Projects', matchPrefix: ['/project/'] },
            { to: '/templates', icon: Layers, label: 'Templates', matchPrefix: [] },
            { to: '/settings', icon: Settings, label: 'Settings', matchPrefix: [] },
          ].map(({ to, icon: Icon, label, matchPrefix }) => {
            const isActive =
              (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)) ||
              matchPrefix.some((p) => location.pathname.startsWith(p))
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="flex items-center justify-center w-8 h-8 transition-colors"
                style={{
                  color: isActive ? '#1a1a1a' : '#9a9897',
                  borderRadius: '4px',
                  background: isActive ? '#f0ede9' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#1a1a1a'
                    ;(e.currentTarget as HTMLElement).style.background = '#f6f3f2'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#9a9897'
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
                title={label}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </NavLink>
            )
          })}
        </nav>

        {/* Center: App name (draggable) */}
        <div className="flex-1 flex items-center justify-center titlebar-drag" style={{ minWidth: 0 }}>
          <p className="font-sans text-xs font-medium text-[#9a9897]" style={{ pointerEvents: 'none' }}>
            Echo
          </p>
        </div>

        {/* Right: User controls + Windows controls placeholder */}
        <div className="flex items-center gap-1 flex-shrink-0 titlebar-no-drag" style={{ paddingRight: '140px' }}>
          {/* Trial badge */}
          {trialBanner && (
            <div className="px-2 py-0.5" style={{ background: '#f6f3f2' }} role="status" aria-live="polite">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary flex-shrink-0" aria-hidden="true" />
                <p className="font-sans text-xs font-medium text-foreground whitespace-nowrap">
                  {subscriptionStatus.daysRemaining === 0
                    ? 'Trial expires today'
                    : `${subscriptionStatus.daysRemaining}d left`}
                </p>
              </div>
            </div>
          )}

          {session?.user ? (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-7 h-7 font-sans text-xs font-bold text-white overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ borderRadius: '4px', background: '#610000' }}
              aria-label={`Sign out (${session.user.email})`}
              title={session.user.email}
            >
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" aria-hidden="true" />
                : (session.user.email?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />)
              }
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-7 h-7 text-[#9a9897] hover:text-primary transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
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
