import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/button'
import { useToast } from '../ui/use-toast'

export default function AppShell() {
  const { session, subscriptionStatus, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Redirect to paywall if access is expired
  if (subscriptionStatus?.access === 'expired') {
    navigate('/paywall', { replace: true })
    return null
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
    toast({ title: 'Signed out', description: 'You have been signed out successfully.' })
  }

  const trialBanner =
    subscriptionStatus?.access === 'trialing' &&
    typeof subscriptionStatus.daysRemaining === 'number'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r bg-background"
        aria-label="Main navigation"
      >
        {/* Logo / App name */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b titlebar-drag">
          <div
            className="w-7 h-7 bg-primary rounded flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
          <span className="font-semibold text-sm leading-tight">Grounds for Access</span>
        </div>

        {/* Trial banner */}
        {trialBanner && (
          <div
            className="mx-3 mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" aria-hidden="true" />
              <p className="text-xs font-medium text-amber-800">
                {subscriptionStatus.daysRemaining === 0
                  ? 'Trial expires today'
                  : `${subscriptionStatus.daysRemaining}d left in trial`}
              </p>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-2 py-4 space-y-1" aria-label="App sections">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
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
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <Settings className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Settings
          </NavLink>
        </nav>

        {/* User / Logout */}
        <div className="border-t px-2 py-3">
          {session?.user && (
            <p
              className="px-2.5 pb-2 text-xs text-muted-foreground truncate"
              title={session.user.email}
            >
              {session.user.email}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto focus:outline-none"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
