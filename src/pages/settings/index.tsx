import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import { ExternalLink, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

function SubscriptionBadge({ access, daysRemaining }: { access: string; daysRemaining?: number }) {
  if (access === 'trialing') {
    return (
      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
        <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">
          {daysRemaining === 0
            ? 'Trial expires today'
            : `Trial — ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
        </span>
      </div>
    )
  }
  if (access === 'active') {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
        <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">Active subscription</span>
      </div>
    )
  }
  if (access === 'past_due') {
    return (
      <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">Payment past due — please update your billing info</span>
      </div>
    )
  }
  if (access === 'expired') {
    return (
      <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">Trial expired — subscription required</span>
      </div>
    )
  }
  return null
}

export default function SettingsPage() {
  const { session, subscriptionStatus } = useAuth()
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isBillingLoading, setIsBillingLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    setIsChangingPassword(true)
    try {
      await window.api.auth.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({ title: 'Password changed', description: 'Your password has been updated.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password.'
      setPasswordError(message)
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleBillingPortal() {
    setIsBillingLoading(true)
    try {
      await window.api.auth.openBillingPortal()
      toast({ title: 'Billing portal opened', description: 'Manage your subscription in your browser.' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to open billing portal',
        description: err instanceof Error ? err.message : 'Please try again.'
      })
    } finally {
      setIsBillingLoading(false)
    }
  }

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    try {
      await window.api.auth.createCheckout(plan)
      toast({
        title: 'Checkout opened',
        description: 'Complete your subscription in the browser window that opened.'
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Please try again.'
      })
    }
  }

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Account section */}
      <section aria-labelledby="account-heading" className="mb-8">
        <h2 id="account-heading" className="text-base font-semibold mb-4">
          Account
        </h2>
        <div className="border rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Name</p>
            <p className="text-sm font-medium">{session?.user.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
            <p className="text-sm font-medium">{session?.user.email}</p>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section aria-labelledby="billing-heading" className="mb-8">
        <h2 id="billing-heading" className="text-base font-semibold mb-4">
          Subscription
        </h2>
        <div className="border rounded-xl p-4 space-y-4">
          {subscriptionStatus && (
            <SubscriptionBadge
              access={subscriptionStatus.access}
              daysRemaining={subscriptionStatus.daysRemaining}
            />
          )}

          {subscriptionStatus?.access === 'active' || subscriptionStatus?.access === 'past_due' ? (
            <Button
              variant="outline"
              onClick={handleBillingPortal}
              disabled={isBillingLoading}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {isBillingLoading ? 'Opening…' : 'Manage billing'}
            </Button>
          ) : subscriptionStatus?.access === 'trialing' || subscriptionStatus?.access === 'expired' ? (
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => handleSubscribe('monthly')}>
                Subscribe monthly — $19/mo
              </Button>
              <Button onClick={() => handleSubscribe('yearly')}>
                Subscribe yearly — $190/yr
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Change password section */}
      <section aria-labelledby="password-heading" className="mb-8">
        <h2 id="password-heading" className="text-base font-semibold mb-4">
          Change password
        </h2>
        <div className="border rounded-xl p-4">
          <form onSubmit={handleChangePassword} noValidate aria-label="Change password form">
            {passwordError && (
              <div role="alert" className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {passwordError}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isChangingPassword}
                />
              </div>
              <Button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {isChangingPassword ? 'Saving…' : 'Change password'}
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}
