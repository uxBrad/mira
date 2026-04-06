import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { useToast } from '../ui/use-toast'
import UpdateBanner from '../UpdateBanner'

export default function AppShell() {
  const { session, subscriptionStatus, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#fcf9f8' }}>

      {/* Top navigation bar */}
      <header
        className="flex-shrink-0 flex items-center px-4 titlebar-drag"
        style={{ background: '#f6f3f2', borderBottom: '1px solid #ebe7e7', height: '52px' }}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <span className="font-display text-lg font-bold tracking-tight text-foreground w-36 flex-shrink-0">
          Echo
        </span>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1" aria-label="App sections">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm font-medium font-data transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-high hover:text-foreground'
              )
            }
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Dashboard
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm font-medium font-data transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-high hover:text-foreground'
              )
            }
          >
            <Settings className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Settings
          </NavLink>
        </nav>

        {/* Trial banner */}
        {trialBanner && (
          <div className="mr-3 px-3 py-1.5" style={{ background: '#ebe7e7' }} role="status" aria-live="polite">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary flex-shrink-0" aria-hidden="true" />
              <p className="font-data text-xs font-medium text-foreground whitespace-nowrap">
                {subscriptionStatus.daysRemaining === 0
                  ? 'Trial expires today'
                  : `${subscriptionStatus.daysRemaining}d remaining`}
              </p>
            </div>
          </div>
        )}

        {/* User / logout */}
        <div className="flex items-center gap-1 flex-shrink-0" style={{ borderLeft: '1px solid #ebe7e7', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
          {session?.user && (
            <span className="font-data text-xs text-muted-foreground truncate max-w-[160px]" title={session.user.email}>
              {session.user.email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-data text-muted-foreground hover:text-primary transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
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
