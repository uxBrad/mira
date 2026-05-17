import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Settings, LogOut, Clock, User, LayoutGrid, Layers } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/use-toast'
import UpdateBanner from '../UpdateBanner'
import { useState, useEffect, useRef } from 'react'

export default function AppShell() {
  const { session, subscriptionStatus, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem('echo-user-avatar'))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const t = setTimeout(() => setReady(true), 30); return () => clearTimeout(t) }, [])

  useEffect(() => {
    function sync() { setAvatar(localStorage.getItem('echo-user-avatar')) }
    window.addEventListener('echo-avatar-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('echo-avatar-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (!dropdownOpen) return
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  if (subscriptionStatus?.access === 'expired') {
    navigate('/paywall', { replace: true })
    return null
  }

  async function handleLogout() {
    setDropdownOpen(false)
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

      <header
        className="flex-shrink-0 flex items-center px-4 titlebar-drag"
        style={{ background: '#ffffff', borderBottom: '1px solid #ebe7e7', height: '40px' }}
        aria-label="Main navigation"
      >
        {/* Left: Navigation */}
        <nav className="flex items-center gap-2 titlebar-no-drag" aria-label="App sections">
          {[
            { to: '/', icon: LayoutGrid, label: 'Projects', matchPrefix: ['/project/'] },
            { to: '/templates', icon: Layers, label: 'Templates', matchPrefix: [] },
          ].map(({ to, icon: Icon, label, matchPrefix }) => {
            const isActive =
              (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)) ||
              matchPrefix.some((p) => location.pathname.startsWith(p))
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="flex items-center gap-[6px] font-sans text-base font-medium transition-colors"
                style={{
                  padding: '5px',
                  borderRadius: '5px',
                  color: isActive ? '#1a1a1a' : '#9a9897',
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
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Center: draggable region (no text) */}
        <div className="flex-1 titlebar-drag" />

        {/* Right: trial badge + avatar dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0 titlebar-no-drag" style={{ paddingRight: '140px' }}>
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

          {/* Avatar + dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(p => !p)}
              className="flex items-center justify-center w-7 h-7 font-sans text-xs font-bold text-white overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ borderRadius: '4px', background: '#610000' }}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" aria-hidden="true" />
                : (session?.user?.email?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />)
              }
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-50 py-1"
                style={{
                  minWidth: '200px',
                  background: '#fff',
                  border: '1px solid #e0dbd9',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  borderRadius: '4px',
                }}
              >
                {session?.user?.email && (
                  <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #e0dbd9' }}>
                    <p className="font-sans text-xs" style={{ color: '#9a9897' }}>Signed in as</p>
                    <p className="font-sans text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
                      {session.user.email}
                    </p>
                  </div>
                )}
                <button
                  role="menuitem"
                  onClick={() => { setDropdownOpen(false); navigate('/settings') }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 font-sans text-sm transition-colors hover:bg-[#f6f3f2]"
                  style={{ color: '#1a1a1a' }}
                >
                  <Settings className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Settings
                </button>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 font-sans text-sm transition-colors hover:bg-[#f6f3f2]"
                  style={{ color: '#610000' }}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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
