import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useProjects } from '../../hooks/useProjects'
import { EchoButton } from '../../components/ui/echo-button'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import { ProjectCard } from '../../components/projects/ProjectCard'
import {
  ExternalLink, Clock, CheckCircle, AlertTriangle, Upload, X,
  Eye, EyeOff, Save, Maximize2, Minimize2, FolderOpen, AlertCircle, Plus
} from 'lucide-react'
import type { Project } from '../../../db/schema'

interface ProjectWithCount extends Project {
  findingCount: number
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'archived', label: 'Archived' },
]

const tr = 'flex 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)'

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
  const navigate = useNavigate()
  const { session, subscriptionStatus, refreshSubscriptionStatus } = useAuth()
  const { projects, isLoading, error, updateProject } = useProjects()
  const { toast } = useToast()
  const [isWide, setIsWide] = useState(false)
  const [statusFilter, setStatusFilter] = useState('in_progress')

  // ─── Password ─────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isBillingLoading, setIsBillingLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ─── Branding ────────────────────────────────────────────────────────────
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // ─── Auditor ─────────────────────────────────────────────────────────────
  const [auditorName, setAuditorName] = useState('')
  const [auditorCredentials, setAuditorCredentials] = useState('')
  const [auditorEmail, setAuditorEmail] = useState('')

  useEffect(() => {
    setCompanyLogo(localStorage.getItem('echo-company-logo'))
    setUserAvatar(localStorage.getItem('echo-user-avatar'))
    setAuditorName(localStorage.getItem('echo-auditor-name') ?? '')
    setAuditorCredentials(localStorage.getItem('echo-auditor-credentials') ?? '')
    setAuditorEmail(localStorage.getItem('echo-auditor-email') ?? '')
  }, [])

  function handleSaveAuditor() {
    if (auditorName.trim()) localStorage.setItem('echo-auditor-name', auditorName.trim())
    else localStorage.removeItem('echo-auditor-name')
    if (auditorCredentials.trim()) localStorage.setItem('echo-auditor-credentials', auditorCredentials.trim())
    else localStorage.removeItem('echo-auditor-credentials')
    if (auditorEmail.trim()) localStorage.setItem('echo-auditor-email', auditorEmail.trim())
    else localStorage.removeItem('echo-auditor-email')
    toast({ title: 'Auditor info saved' })
  }

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
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters.'); return }
    setIsChangingPassword(true)
    try {
      await window.api.auth.changePassword({ currentPassword, newPassword })
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      toast({ title: 'Password changed', description: 'Your password has been updated.' })
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password.')
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
      toast({ variant: 'destructive', title: 'Failed to open billing portal', description: err instanceof Error ? err.message : 'Please try again.' })
    } finally {
      setIsBillingLoading(false)
    }
  }

  async function handleSubscribe(plan: 'monthly' | 'yearly') {
    try {
      await window.api.auth.createCheckout(plan)
      toast({ title: 'Checkout opened', description: 'Complete your subscription in the browser window that opened.' })
      const pollInterval = setInterval(async () => { await refreshSubscriptionStatus() }, 5000)
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Checkout failed', description: err instanceof Error ? err.message : 'Please try again.' })
    }
  }

  async function handleComplete(project: ProjectWithCount) {
    await updateProject(project.id, { status: 'complete' })
    toast({ title: 'Project completed', description: `"${project.name}" marked as complete.` })
  }

  const filtered = statusFilter === 'all' ? projects : projects.filter(p => p.status === statusFilter)
  const inputClass = 'w-full h-9 px-3 font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1d4ed8]'
  const inputStyle = { border: '1px solid #d0cac8' }

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: 'transparent', padding: '12px', gap: '12px' }}
    >
      {/* ── Left: Project list (exact dashboard pattern) ── */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          flex: isWide ? '0 0 0px' : '0 0 calc(50% - 6px)',
          borderRadius: '10px',
          background: '#fcf9f8',
          overflow: 'hidden',
          transition: tr,
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-10 pt-10 pb-5" style={{ background: '#fcf9f8' }}>
          <p className="font-sans text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}>
            Audit Management
          </p>
          <h1 className="font-serif font-bold leading-none" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
            Projects
          </h1>
        </div>

        {/* Filter bar */}
        <div
          className="flex-shrink-0 flex items-center gap-2 px-10 py-3"
          style={{ borderBottom: '1px solid #e0dbd9', background: '#fcf9f8' }}
        >
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              aria-pressed={statusFilter === f.key}
              className="font-sans text-xs font-semibold px-3 py-1.5 whitespace-nowrap transition-colors"
              style={{
                border: `1px solid ${statusFilter === f.key ? '#1d4ed8' : '#d0cac8'}`,
                background: statusFilter === f.key ? '#1d4ed8' : 'transparent',
                color: statusFilter === f.key ? '#fff' : '#2b2c2c',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-10 py-6">
          {error && (
            <div role="alert" className="flex items-center gap-2 text-primary px-4 py-3 mb-6" style={{ background: '#ebe7e7' }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p className="font-sans text-sm">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-px" aria-busy="true" aria-label="Loading projects">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse" style={{ background: '#ebe7e7' }} aria-hidden="true" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && !error && (
            <div className="py-24">
              <FolderOpen className="h-10 w-10 text-muted-foreground/30 mb-4" aria-hidden="true" />
              <h2 className="font-serif font-bold text-2xl mb-1">
                {statusFilter !== 'all' ? 'No projects in this category' : 'No projects yet'}
              </h2>
              <p className="font-sans text-sm mb-6 max-w-xs" style={{ color: '#5f5e5e' }}>
                {statusFilter !== 'all'
                  ? 'Try a different filter or create a new project.'
                  : 'Create your first accessibility audit project to get started.'}
              </p>
              <EchoButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                iconPosition="left"
                onClick={() => navigate('/')}
              >
                New project
              </EchoButton>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <ul className="space-y-0" role="list" aria-label="Audit projects">
              {filtered.map(project => (
                <li key={project.id} className="mb-4">
                  <ProjectCard
                    project={project}
                    onClick={() => navigate(`/project/${project.id}`)}
                    onEdit={(p) => navigate(`/project/${p.id}`)}
                    onArchive={() => {}}
                    onComplete={handleComplete}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Right: Settings panel ── */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          flex: isWide ? '1 1 0%' : '0 0 calc(50% - 6px)',
          borderRadius: '10px',
          background: '#ffffff',
          border: '1px solid #e0dbd9',
          transition: tr,
        }}
      >
        {/* Panel header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{ borderBottom: '1px solid #e0dbd9', background: '#f6f3f2', minHeight: '60px' }}
        >
          <span
            className="font-sans text-sm font-bold uppercase tracking-widest"
            style={{ color: '#1d4ed8', letterSpacing: '0.12em' }}
          >
            Settings
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsWide(w => !w)}
              className="flex items-center justify-center transition-colors hover:text-foreground"
              style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
              aria-label={isWide ? 'Exit wide mode' : 'Enter wide mode'}
            >
              {isWide ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center justify-center transition-colors hover:text-foreground"
              style={{ color: '#5f5e5e', width: '40px', height: '40px' }}
              aria-label="Close settings"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="px-8 py-8 max-w-xl">

            {/* ── Branding ── */}
            <section aria-labelledby="branding-heading" className="mb-8">
              <h2 id="branding-heading" className="font-serif font-bold text-xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                Branding
              </h2>
              <p className="font-sans text-sm mb-5" style={{ color: '#5f5e5e' }}>
                Your logo and avatar appear in exported PDF reports.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Company Logo */}
                <div className="p-4" style={{ background: '#f6f3f2', borderRadius: '8px' }}>
                  <p className="font-sans text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
                    Company Logo
                  </p>
                  {companyLogo ? (
                    <div className="mb-3">
                      <div className="flex items-center justify-center p-3 mb-2" style={{ background: '#ffffff', borderRadius: '4px', minHeight: '72px' }}>
                        <img src={companyLogo} alt="Company logo preview" className="max-h-14 max-w-full object-contain" />
                      </div>
                      <EchoButton icon={<X className="h-3.5 w-3.5" />} iconPosition="right" fullWidth onClick={removeLogo} style={{ justifyContent: 'center', color: '#c0392b' }}>
                        Remove
                      </EchoButton>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-5 mb-3" style={{ background: '#ffffff', borderRadius: '4px', border: '1px dashed #d0cac8', minHeight: '72px' }}>
                      <p className="font-sans text-xs text-center" style={{ color: '#5f5e5e' }}>No logo uploaded</p>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" id="logo-upload" aria-label="Upload company logo" onChange={handleLogoUpload} />
                  <EchoButton icon={<Upload className="h-3.5 w-3.5" />} iconPosition="right" fullWidth onClick={() => logoInputRef.current?.click()} style={{ justifyContent: 'center' }}>
                    {companyLogo ? 'Replace' : 'Upload Logo'}
                  </EchoButton>
                </div>

                {/* User Avatar */}
                <div className="p-4" style={{ background: '#f6f3f2', borderRadius: '8px' }}>
                  <p className="font-sans text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5f5e5e', letterSpacing: '0.1em' }}>
                    Your Avatar
                  </p>
                  {userAvatar ? (
                    <div className="mb-3">
                      <div className="flex items-center justify-center mb-2" style={{ minHeight: '72px' }}>
                        <img src={userAvatar} alt="User avatar preview" className="w-14 h-14 object-cover" style={{ borderRadius: '9999px' }} />
                      </div>
                      <EchoButton icon={<X className="h-3.5 w-3.5" />} iconPosition="right" fullWidth onClick={removeAvatar} style={{ justifyContent: 'center', color: '#c0392b' }}>
                        Remove
                      </EchoButton>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center mb-3" style={{ minHeight: '72px' }}>
                      <div className="flex items-center justify-center w-14 h-14 font-serif font-bold text-2xl text-white" style={{ background: '#1d4ed8', borderRadius: '9999px' }}>
                        {session?.user.email?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="sr-only" id="avatar-upload" aria-label="Upload user avatar" onChange={handleAvatarUpload} />
                  <EchoButton icon={<Upload className="h-3.5 w-3.5" />} iconPosition="right" fullWidth onClick={() => avatarInputRef.current?.click()} style={{ justifyContent: 'center' }}>
                    {userAvatar ? 'Replace' : 'Upload Avatar'}
                  </EchoButton>
                </div>
              </div>
            </section>

            <div className="mb-8" style={{ height: '1px', background: '#e0dbd9' }} aria-hidden="true" />

            {/* ── Auditor ── */}
            <section aria-labelledby="auditor-heading" className="mb-8">
              <h2 id="auditor-heading" className="font-serif font-bold text-xl mb-1" style={{ letterSpacing: '-0.01em' }}>
                Auditor
              </h2>
              <p className="font-sans text-sm mb-5" style={{ color: '#5f5e5e' }}>
                Appears in the Auditor section of exported VPAT reports.
              </p>
              <div className="border p-4 space-y-4" style={{ borderRadius: '8px', borderColor: '#e0dbd9' }}>
                <div className="space-y-1.5">
                  <Label htmlFor="auditor-name" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>Name</Label>
                  <input id="auditor-name" value={auditorName} onChange={e => setAuditorName(e.target.value)} placeholder="Jane Smith" className={inputClass} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auditor-credentials" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>Credentials</Label>
                  <input id="auditor-credentials" value={auditorCredentials} onChange={e => setAuditorCredentials(e.target.value)} placeholder="CPACC, DHS Trusted Tester" className={inputClass} style={inputStyle} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="auditor-email" className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: '#3a3a3a', letterSpacing: '0.1em' }}>Contact Email</Label>
                  <input id="auditor-email" type="email" value={auditorEmail} onChange={e => setAuditorEmail(e.target.value)} placeholder="jane@example.com" className={inputClass} style={inputStyle} />
                </div>
                <EchoButton variant="primary" icon={<Save className="h-3.5 w-3.5" />} iconPosition="left" onClick={handleSaveAuditor}>
                  Save auditor info
                </EchoButton>
              </div>
            </section>

            <div className="mb-8" style={{ height: '1px', background: '#e0dbd9' }} aria-hidden="true" />

            {/* ── Account ── */}
            <section aria-labelledby="account-heading" className="mb-8">
              <h2 id="account-heading" className="font-serif font-bold text-xl mb-4" style={{ letterSpacing: '-0.01em' }}>Account</h2>
              <div className="border p-4 space-y-3" style={{ borderRadius: '8px', borderColor: '#e0dbd9' }}>
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

            {/* ── Subscription ── */}
            <section aria-labelledby="billing-heading" className="mb-8">
              <h2 id="billing-heading" className="font-serif font-bold text-xl mb-4" style={{ letterSpacing: '-0.01em' }}>Subscription</h2>
              <div className="border p-4 space-y-4" style={{ borderRadius: '8px', borderColor: '#e0dbd9' }}>
                {subscriptionStatus && (
                  <SubscriptionBadge access={subscriptionStatus.access} daysRemaining={subscriptionStatus.daysRemaining} />
                )}
                {subscriptionStatus?.access === 'active' || subscriptionStatus?.access === 'past_due' ? (
                  <EchoButton icon={<ExternalLink className="h-4 w-4" />} iconPosition="left" onClick={handleBillingPortal} disabled={isBillingLoading}>
                    {isBillingLoading ? 'Opening…' : 'Manage billing'}
                  </EchoButton>
                ) : subscriptionStatus?.access === 'trialing' || subscriptionStatus?.access === 'expired' ? (
                  <div className="flex gap-3 flex-wrap">
                    <EchoButton onClick={() => handleSubscribe('monthly')}>Subscribe monthly — $4.99/mo</EchoButton>
                    <EchoButton variant="primary" onClick={() => handleSubscribe('yearly')}>Subscribe yearly — $49.99/yr</EchoButton>
                  </div>
                ) : null}
              </div>
            </section>

            {/* ── Change password ── */}
            <section aria-labelledby="password-heading" className="mb-8">
              <h2 id="password-heading" className="font-serif font-bold text-xl mb-4" style={{ letterSpacing: '-0.01em' }}>Change password</h2>
              <div className="border p-4" style={{ borderRadius: '8px', borderColor: '#e0dbd9' }}>
                <form onSubmit={handleChangePassword} noValidate aria-label="Change password form">
                  {passwordError && (
                    <div role="alert" className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                      {passwordError}
                    </div>
                  )}
                  <div className="space-y-4">
                    {[
                      { id: 'current-password', label: 'Current password', val: currentPassword, set: setCurrentPassword, show: showCurrentPassword, setShow: setShowCurrentPassword, autoComplete: 'current-password' },
                      { id: 'new-password', label: 'New password', val: newPassword, set: setNewPassword, show: showNewPassword, setShow: setShowNewPassword, autoComplete: 'new-password' },
                      { id: 'confirm-new-password', label: 'Confirm new password', val: confirmPassword, set: setConfirmPassword, show: showConfirmPassword, setShow: setShowConfirmPassword, autoComplete: 'new-password' },
                    ].map(({ id, label, val, set, show, setShow, autoComplete }) => (
                      <div key={id} className="space-y-1.5">
                        <Label htmlFor={id}>{label}</Label>
                        <div className="relative">
                          <input
                            id={id}
                            type={show ? 'text' : 'password'}
                            autoComplete={autoComplete}
                            required
                            value={val}
                            onChange={e => set(e.target.value)}
                            disabled={isChangingPassword}
                            className="w-full h-9 px-3 font-sans text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#1d4ed8] pr-10"
                            style={{ border: '1px solid #d0cac8' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShow((v: boolean) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9a9897] hover:text-foreground transition-colors"
                            aria-label={show ? 'Hide password' : 'Show password'}
                          >
                            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <EchoButton variant="primary" type="submit" disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}>
                      {isChangingPassword ? 'Saving…' : 'Change password'}
                    </EchoButton>
                  </div>
                </form>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
