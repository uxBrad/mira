import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EchoButton } from '../../components/ui/echo-button'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import logoSrc from '../../assets/logo.png'

type Step = 'email' | 'reset' | 'done'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      // The server returns success even when no account matches this email
      // (to avoid email enumeration) — it only throws on a genuine send failure.
      await window.api.auth.forgotPassword(email)
      setStep('reset')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the reset code. Please try again.'
      setError(message)
      toast({ variant: 'destructive', title: 'Failed to send reset code', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      await window.api.auth.resetPassword({ email, code, password })
      setStep('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed. Please try again.'
      setError(message)
      toast({ variant: 'destructive', title: 'Reset failed', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = 'w-full h-10 px-3 font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] transition-colors'
  const inputStyle = { border: '1px solid #d0cac8' }

  const Logo = () => (
    <div className="flex items-center gap-3 mb-8 justify-center">
      <img src={logoSrc} alt="" aria-hidden="true" style={{ width: '32px', height: '32px' }} />
      <span className="font-display font-bold text-xl">Mira</span>
    </div>
  )

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <div className="border rounded-xl p-6 shadow-sm bg-card">
            <h1 className="text-xl font-semibold mb-2">Password reset</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <EchoButton variant="primary" fullWidth onClick={() => navigate('/login')} style={{ justifyContent: 'center' }}>
              Sign in
            </EchoButton>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="border rounded-xl p-6 shadow-sm bg-card">
            <h1 className="text-xl font-semibold mb-1">Enter reset code</h1>
            <p className="text-sm text-muted-foreground mb-6">
              If an account exists for <strong>{email}</strong>, we sent a 6-digit reset code.
              Enter it below with your new password.
            </p>

            <form onSubmit={handleResetSubmit} noValidate aria-label="Password reset form">
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Reset code</Label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    disabled={isLoading}
                    autoFocus
                    className={`${inputClass} text-center text-2xl tracking-[0.3em] font-mono`}
                    style={inputStyle}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">New password</Label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby="new-password-hint"
                    disabled={isLoading}
                    className={inputClass}
                    style={inputStyle}
                  />
                  <p id="new-password-hint" className="text-xs text-muted-foreground">
                    At least 8 characters
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-new-password" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Confirm new password</Label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <EchoButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading || code.length !== 6 || !password || !confirmPassword}
                  style={{ justifyContent: 'center' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      Resetting…
                    </span>
                  ) : (
                    'Reset password'
                  )}
                </EchoButton>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(''); setError(null) }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                >
                  Use a different email
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <Logo />
        <div className="border rounded-xl p-6 shadow-sm bg-card">
          <h1 className="text-xl font-semibold mb-1">Reset your password</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter your email and we&apos;ll send you a 6-digit reset code.
          </p>

          <form onSubmit={handleEmailSubmit} noValidate aria-label="Forgot password form">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Email address</Label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <EchoButton type="submit" variant="primary" fullWidth disabled={isLoading || !email} style={{ justifyContent: 'center' }}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Sending…
                  </span>
                ) : (
                  'Send reset code'
                )}
              </EchoButton>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link to="/login" className="text-primary hover:underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
