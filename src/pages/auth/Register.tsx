import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { EchoButton } from '../../components/ui/echo-button'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import logoSrc from '../../assets/logo.png'

type Step = 'register' | 'verify'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsLoading(true)
    try {
      const result = await register(name, email, password)
      if ((result as unknown as { devAutoVerified?: boolean })?.devAutoVerified) {
        await login(email, password)
        navigate('/')
      } else {
        setStep('verify')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.'
      setError(message)
      toast({ variant: 'destructive', title: 'Registration failed', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setIsLoading(true)
    try {
      await window.api.auth.verifyEmail(email, code)
      // Auto-login after verification
      await login(email, password)
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.'
      setError(message)
      toast({ variant: 'destructive', title: 'Verification failed', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = 'w-full h-10 px-3 font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] transition-colors'
  const inputStyle = { border: '1px solid #d0cac8' }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <img src={logoSrc} alt="" aria-hidden="true" style={{ width: '32px', height: '32px' }} />
            <span className="font-display font-bold text-xl">Mira</span>
          </div>

          <div className="border rounded-xl p-6 shadow-sm bg-card">
            <h1 className="text-xl font-semibold mb-1">Check your email</h1>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below to verify your
              account and start your free trial.
            </p>

            <form onSubmit={handleVerify} noValidate aria-label="Email verification form">
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
                  <Label htmlFor="code" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Verification code</Label>
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

                <EchoButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading || code.length !== 6}
                  style={{ justifyContent: 'center' }}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      Verifying…
                    </span>
                  ) : 'Verify email'}
                </EchoButton>

                <button
                  type="button"
                  onClick={() => { setStep('register'); setCode(''); setError(null) }}
                  className="w-full flex items-center justify-center gap-1.5 font-data text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to registration
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M5.5 3L9.5 7L5.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={logoSrc} alt="" aria-hidden="true" style={{ width: '32px', height: '32px' }} />
          <span className="font-display font-bold text-xl">Mira</span>
        </div>

        <div className="border rounded-xl p-6 shadow-sm bg-card">
          <h1 className="text-xl font-semibold mb-1">Create an account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Start your 7-day free trial. No credit card required.
          </p>

          <form onSubmit={handleRegister} noValidate aria-label="Create account form">
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
                <Label htmlFor="name" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Full name</Label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Chen"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

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

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Password</Label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="password-hint"
                  disabled={isLoading}
                  className={inputClass}
                  style={inputStyle}
                />
                <p id="password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">Confirm password</Label>
                <input
                  id="confirm-password"
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
                disabled={isLoading || !name || !email || !password || !confirmPassword}
                style={{ justifyContent: 'center' }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                    Creating account…
                  </span>
                ) : 'Create account'}
              </EchoButton>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline underline-offset-4 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
