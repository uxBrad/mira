import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import { ExternalLink, Clock, CheckCircle, AlertTriangle, Upload, X } from 'lucide-react'

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

  // ─── Branding ────────────────────────────────────────────────────────────
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCompanyLogo(localStorage.getItem('echo-company-logo'))
    setUserAvatar(localStorage.getItem('echo-user-avatar'))
  }, [])

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      localStorage.setItem('echo-company-logo', dataUrl)
      setCompanyLogo(dataUrl)
      toast({ title: 'Company logo saved' })
    }
    reader.readAsDataURL(file)
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      localStorage.setItem('echo-user-avatar', dataUrl)
      setUserAvatar(dataUrl)
      window.dispatchEvent(new Event('echo-avatar-changed'))
      toast({ title: 'Avatar saved' })
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    localStorage.removeItem('echo-company-logo')
    setCompanyLogo(null)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  function removeAvatar() {
    localStorage.removeItem('echo-user-avatar')
    setUserAvatar(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
    window.dispatchEvent(new Event('echo-avatar-changed'))
  }

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

      {/* ── Branding section ─────────────────────────────────────────────────── */}
      <section aria-labelledby="branding-heading" className="mb-8">
        <h2 id="branding-heading" className="font-serif font-bold text-xl mb-4" style={{ letterSpacing: '-0.01em' }}>
          Branding
        </h2>
        <p className="font-sans text-sm mb-5" style={{ color: '#5f5e5e' }}>
          Your logo and avatar appear in exported PDF reports.
        </p>

        <div className="grid grid-cols-2 gap-5">
          {/* Company Logo */}
          <div
            className="p-5"
            style={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.06)' }}
          >
            <p className="font-sans text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
              Company Logo
            </p>
            {companyLogo ? (
              <div className="mb-3">
                <div
                  className="flex items-center justify-center p-3 mb-2"
                  style={{ background: '#f6f3f2', borderRadius: '4px', minHeight: '80px' }}
                >
                  <img src={companyLogo} alt="Company logo preview" className="max-h-16 max-w-full object-contain" />
                </div>
                <button
                  onClick={removeLogo}
                  className="flex items-center gap-1.5 font-sans text-xs font-medium transition-colors hover:bg-red-50"
                  style={{ color: '#c0392b', border: '1px solid #d0cac8', borderRadius: '4px', padding: '4px 10px' }}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center p-6 mb-3"
                style={{ background: '#f6f3f2', borderRadius: '4px', border: '1px dashed #d0cac8', minHeight: '80px' }}
              >
                <p className="font-sans text-xs text-center" style={{ color: '#5f5e5e' }}>No logo uploaded</p>
              </div>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id="logo-upload"
              aria-label="Upload company logo"
              onChange={handleLogoUpload}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 px-3 py-2 font-sans text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent', letterSpacing: '0.08em', borderRadius: '4px' }}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {companyLogo ? 'Replace Logo' : 'Upload Logo'}
            </button>
          </div>

          {/* User Avatar */}
          <div
            className="p-5"
            style={{ background: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.06)' }}
          >
            <p className="font-sans text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
              Your Avatar
            </p>
            {userAvatar ? (
              <div className="mb-3">
                <div className="flex items-center justify-center mb-2">
                  <img
                    src={userAvatar}
                    alt="User avatar preview"
                    className="w-16 h-16 object-cover"
                    style={{ borderRadius: '9999px' }}
                  />
                </div>
                <button
                  onClick={removeAvatar}
                  className="flex items-center gap-1.5 font-sans text-xs font-medium transition-colors hover:bg-red-50 mx-auto"
                  style={{ color: '#c0392b', border: '1px solid #d0cac8', borderRadius: '4px', padding: '4px 10px' }}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center mb-3" style={{ minHeight: '80px' }}>
                <div
                  className="flex items-center justify-center w-16 h-16 font-serif font-bold text-2xl text-white"
                  style={{ background: '#610000', borderRadius: '9999px' }}
                >
                  {session?.user.email?.[0]?.toUpperCase() ?? '?'}
                </div>
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              id="avatar-upload"
              aria-label="Upload user avatar"
              onChange={handleAvatarUpload}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 px-3 py-2 font-sans text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#ede9e7]"
              style={{ border: '1px solid #d0cac8', color: '#2b2c2c', background: 'transparent', letterSpacing: '0.08em', borderRadius: '4px' }}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              {userAvatar ? 'Replace Avatar' : 'Upload Avatar'}
            </button>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mb-8" style={{ height: '1px', background: '#e0dbd9' }} aria-hidden="true" />

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
