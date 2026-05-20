import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Settings, LogOut, Clock, User, LayoutGrid, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/use-toast'
import UpdateBanner from '../UpdateBanner'
import { useState, useEffect, useRef } from 'react'

type MenuKey = 'file' | 'edit' | 'view' | 'help'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
}

type MenuEntry = MenuItem | 'separator'

function MenuDropdown({
  label,
  items,
  isOpen,
  onToggle,
}: {
  label: string
  items: MenuEntry[]
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="font-sans text-xs font-medium px-2 py-1 transition-colors"
        style={{
          color: isOpen ? '#1a1a1a' : '#5f5e5e',
          background: isOpen ? '#f0ede9' : 'transparent',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            ;(e.currentTarget as HTMLElement).style.color = '#1a1a1a'
            ;(e.currentTarget as HTMLElement).style.background = '#f6f3f2'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            ;(e.currentTarget as HTMLElement).style.color = '#5f5e5e'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }
        }}
      >
        {label}
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-0.5 z-50 py-1"
          style={{
            minWidth: '220px',
            background: '#fff',
            border: '1px solid #e0dbd9',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            borderRadius: '4px',
          }}
        >
          {items.map((item, i) => {
            if (item === 'separator') {
              return <div key={i} style={{ height: '1px', background: '#e0dbd9', margin: '4px 0' }} />
            }
            return (
              <button
                key={i}
                onClick={() => {
                  onToggle()
                  item.action?.()
                }}
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
      )}
    </div>
  )
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
  const [menuOpen, setMenuOpen] = useState<MenuKey | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

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
    if (!menuOpen) return
    function handler(e: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

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

  const FILE_MENU: MenuEntry[] = [
    {
      label: 'New Project',
      shortcut: 'Ctrl+N',
      action: () => { navigate('/'); window.dispatchEvent(new CustomEvent('menu:newProject')) },
    },
    {
      label: 'New Finding',
      shortcut: 'Ctrl+Shift+N',
      action: () => window.dispatchEvent(new CustomEvent('menu:newFinding')),
      disabled: !isOnProject,
    },
    'separator',
    { label: 'Settings', shortcut: 'Ctrl+,', action: () => navigate('/settings') },
    'separator',
    { label: 'Exit', action: () => window.api.system.quit() },
  ]

  const EDIT_MENU: MenuEntry[] = [
    { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
    { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
    { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
    'separator',
    { label: 'Select All', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') },
  ]

  const VIEW_MENU: MenuEntry[] = [
    { label: 'Projects', action: () => navigate('/') },
    { label: 'Templates', action: () => navigate('/templates') },
    'separator',
    { label: 'Settings', action: () => navigate('/settings') },
  ]

  const HELP_MENU: MenuEntry[] = [
    { label: 'About manuA11y', action: () => {} },
  ]

  const MENUS: Array<{ key: MenuKey; label: string; items: MenuEntry[] }> = [
    { key: 'file', label: 'File', items: FILE_MENU },
    { key: 'edit', label: 'Edit', items: EDIT_MENU },
    { key: 'view', label: 'View', items: VIEW_MENU },
    { key: 'help', label: 'Help', items: HELP_MENU },
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
        {/* Left: app mark, back/forward, menus, nav */}
        <div className="flex items-center gap-1 titlebar-no-drag">
          {/* App mark */}
          <div
            className="flex items-center justify-center flex-shrink-0 font-sans font-bold text-white select-none"
            style={{
              width: '22px',
              height: '22px',
              background: '#1d4ed8',
              borderRadius: '4px',
              fontSize: '11px',
              marginRight: '2px',
            }}
            aria-hidden="true"
          >
            m
          </div>

          {/* Back / Forward */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center transition-colors hover:bg-[#f6f3f2]"
            style={{ width: '26px', height: '26px', borderRadius: '4px', color: '#9a9897' }}
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate(1)}
            className="flex items-center justify-center transition-colors hover:bg-[#f6f3f2]"
            style={{ width: '26px', height: '26px', borderRadius: '4px', color: '#9a9897' }}
            aria-label="Go forward"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Menu bar */}
          <div ref={menuBarRef} className="flex items-center gap-0.5 ml-1">
            {MENUS.map(({ key, label, items }) => (
              <MenuDropdown
                key={key}
                label={label}
                items={items}
                isOpen={menuOpen === key}
                onToggle={() => setMenuOpen(menuOpen === key ? null : key)}
              />
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '20px', background: '#e0dbd9', margin: '0 6px' }} aria-hidden="true" />

          {/* Nav links */}
          <nav className="flex items-center gap-1" aria-label="App sections">
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
                  className="flex items-center gap-[5px] font-sans text-sm font-medium transition-colors"
                  style={{
                    padding: '4px 7px',
                    borderRadius: '4px',
                    color: isActive ? '#1a1a1a' : '#9a9897',
                    background: isActive ? '#f0ede9' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLElement).style.color = '#1a1a1a'
                      ;(e.currentTarget as HTMLElement).style.background = '#f6f3f2'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLElement).style.color = '#9a9897'
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Center: draggable region */}
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
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center justify-center w-7 h-7 font-sans text-xs font-bold text-white overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ borderRadius: '4px', background: '#1d4ed8' }}
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
