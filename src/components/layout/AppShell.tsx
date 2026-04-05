import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
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
    <div className="flex h-screen overflow-hidden" style={{ background: '#fcf9f8' }}>

      {/* Left navigation column — surface-low, no border */}
      <aside
        className="w-52 flex-shrink-0 flex flex-col"
        style={{ background: '#f6f3f2' }}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="px-5 py-5 titlebar-drag">
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Grounds<br />
            <span className="text-primary">for Access</span>
          </span>
        </div>

        {/* Trial banner — tonal, no border */}
        {trialBanner && (
          <div className="mx-4 mb-3 px-3 py-2" style={{ background: '#ebe7e7' }} role="status" aria-live="polite">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary flex-shrink-0" aria-hidden="true" />
              <p className="font-data text-xs font-medium text-foreground">
                {subscriptionStatus.daysRemaining === 0
                  ? 'Trial expires today'
                  : `${subscriptionStatus.daysRemaining}d remaining`}
              </p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="App sections">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium font-data transition-colors',
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
                'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium font-data transition-colors',
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

        {/* User / logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid #ebe7e7' }}>
          {session?.user && (
            <p className="px-3 pb-2 font-data text-xs text-muted-foreground truncate" title={session.user.email}>
              {session.user.email}
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-data text-muted-foreground hover:text-primary transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — surface */}
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
