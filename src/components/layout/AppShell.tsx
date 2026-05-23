import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Settings, LogOut, Clock, User, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/use-toast'
import UpdateBanner from '../UpdateBanner'
import { useState, useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
}

type MenuEntry = MenuItem | 'separator'

interface MenuSection {
  key: string
  label: string
  items: MenuEntry[]
}

export default function AppShell() {
  const { session, subscriptionStatus, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(() => localStorage.getItem('echo-user-avatar'))
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [hamOpen, setHamOpen] = useState(false)
  const hamRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!hamOpen) return
    function handler(e: MouseEvent) {
      if (hamRef.current && !hamRef.current.contains(e.target as Node)) setHamOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [hamOpen])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === 'n') {
        e.preventDefault()
        navigate('/')
        window.dispatchEvent(new CustomEvent('menu:newProject'))
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('menu:newFinding'))
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        navigate('/settings')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [navigate])

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

  const isOnProject = /^\/project\/[^/]+$/.test(location.pathname)

  const MENUS: MenuSection[] = [
    {
      key: 'file',
      label: 'File',
      items: [
        { label: 'New Project', shortcut: 'Ctrl+N', action: () => { navigate('/'); window.dispatchEvent(new CustomEvent('menu:newProject')) } },
        { label: 'New Finding', shortcut: 'Ctrl+Shift+N', action: () => window.dispatchEvent(new CustomEvent('menu:newFinding')), disabled: !isOnProject },
        'separator',
        { label: 'Projects', action: () => navigate('/') },
        { label: 'Templates', action: () => navigate('/templates') },
        'separator',
        { label: 'Settings', shortcut: 'Ctrl+,', action: () => navigate('/settings') },
        'separator',
        { label: 'Exit', action: () => window.api.system.quit() },
      ],
    },
    {
      key: 'edit',
      label: 'Edit',
      items: [
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
        'separator',
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') },
      ],
    },
    {
      key: 'view',
      label: 'View',
      items: [
        { label: 'Projects', action: () => navigate('/') },
        { label: 'Templates', action: () => navigate('/templates') },
        'separator',
        { label: 'Settings', action: () => navigate('/settings') },
      ],
    },
    {
      key: 'help',
      label: 'Help',
      items: [
        { label: 'About manuA11y', action: () => {} },
      ],
    },
  ]

  return (
    <div
      className="flex flex-col h-screen overflow-hidden transition-opacity duration-300"
      style={{ background: '#fcf9f8', opacity: ready ? 1 : 0 }}
    >
      <header
        className="flex-shrink-0 flex items-center px-2 titlebar-drag"
        style={{ background: '#ffffff', borderBottom: '1px solid #ebe7e7', height: '40px' }}
        aria-label="Main navigation"
      >
        {/* Left: hamburger + back/forward */}
        <div className="flex items-center gap-1 titlebar-no-drag">
          <div ref={hamRef} className="relative">
            <button
              onClick={() => setHamOpen((p) => !p)}
              className="flex items-center justify-center transition-colors hover:bg-[#f6f3f2]"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                color: hamOpen ? '#1a1a1a' : '#5f5e5e',
                background: hamOpen ? '#f0ede9' : 'transparent',
              }}
              aria-label="Menu"
              aria-expanded={hamOpen}
              aria-haspopup="true"
            >
              <Menu className="h-4 w-4" />
            </button>

            {hamOpen && (
              <div
                className="absolute left-0 top-full mt-0.5 z-50 py-1"
                style={{
                  minWidth: '240px',
                  background: '#fff',
                  border: '1px solid #e0dbd9',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  borderRadius: '4px',
                }}
              >
                {MENUS.map((menu, mIdx) => (
                  <div key={menu.key}>
                    {mIdx > 0 && (
                      <div style={{ height: '1px', background: '#e0dbd9', margin: '4px 0' }} />
                    )}
                    <div className="px-3 pt-1.5 pb-0.5">
                      <p
                        className="font-sans text-xs font-bold uppercase tracking-widest"
                        style={{ color: '#9a9897', letterSpacing: '0.1em' }}
                      >
                        {menu.label}
                      </p>
                    </div>
                    {menu.items.map((item, i) => {
                      if (item === 'separator') {
                        return (
                          <div key={i} style={{ height: '1px', background: '#e0dbd9', margin: '2px 0' }} />
                        )
                      }
                      return (
                        <button
                          key={i}
                          onClick={() => { setHamOpen(false); item.action?.() }}
                          disabled={item.disabled}
                          className="w-full text-left flex items-center justify-between px-3 py-1.5 font-sans text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f6f3f2]"
                          style={{ color: '#1a1a1a' }}
                        >
                          <span>{item.label}</span>
                          {item.shortcut && (
                            <span className="font-sans text-xs ml-8 flex-shrink-0" style={{ color: '#9a9897' }}>
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back / Forward */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center transition-colors hover:bg-[#f6f3f2]"
            style={{ width: '28px', height: '28px', borderRadius: '4px', color: '#9a9897' }}
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="flex items-center justify-center transition-colors hover:bg-[#f6f3f2]"
            style={{ width: '28px', height: '28px', borderRadius: '4px', color: '#9a9897' }}
            aria-label="Go forward"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Center: draggable region */}
        <div className="flex-1 titlebar-drag" />

        {/* Right: trial badge + avatar */}
        <div className="flex items-center gap-1 flex-shrink-0 titlebar-no-drag" style={{ paddingRight: '140px' }}>
          {trialBanner && (
            <div className="px-2 py-0.5 mr-1" style={{ background: '#f6f3f2' }} role="status" aria-live="polite">
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
          <div ref={dropdownRef} className="relative ml-1">
            <button
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center justify-center w-7 h-7 font-sans text-xs font-bold text-white overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ borderRadius: '9999px', background: '#1d4ed8' }}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" aria-hidden="true" />
              ) : (
                session?.user?.email?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />
              )}
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
                  style={{ color: '#1d4ed8' }}
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
