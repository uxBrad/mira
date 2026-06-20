import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { EchoButton } from '../../components/ui/echo-button'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'
import logoSrc from '../../assets/logo.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [needsVerification, setNeedsVerification] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNeedsVerification(false)
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.'
      if (message.toLowerCase().includes('verify your email')) {
        setNeedsVerification(true)
        setVerifyCode('')
        setVerifyError(null)
        setResendSent(false)
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifyError(null)
    if (verifyCode.length !== 6 || !/^\d+$/.test(verifyCode)) {
      setVerifyError('Enter the 6-digit code from your email.')
      return
    }
    setIsVerifying(true)
    try {
      await window.api.auth.verifyEmail(email, verifyCode)
      await login(email, password)
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed.'
      setVerifyError(message)
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    setResendSent(false)
    setVerifyError(null)
    try {
      await window.api.auth.resendVerification(email)
      setResendSent(true)
      toast({ title: 'Verification code sent', description: `Check ${email} for the 6-digit code.` })
    } catch {
      setVerifyError('Could not send a new code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const inputClass = 'w-full h-10 px-3 font-sans text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1d4ed8] transition-colors'
  const inputStyle = { border: '1px solid #d0cac8' }

  return (
    <div className="min-h-screen flex" style={{ background: '#fcf9f8' }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex w-2/5 flex-col justify-between px-12 py-12"
        style={{ background: '#f6f3f2' }}
      >
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="" aria-hidden="true" style={{ width: '32px', height: '32px' }} />
          <span className="font-display text-xl font-bold text-foreground">Mira</span>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold leading-snug text-foreground mb-4">
            The professional tool for accessibility auditing.
          </p>
          <p className="font-data text-sm text-muted-foreground">
            Document, classify, and report WCAG findings with precision.
          </p>
        </div>
        <p className="font-data text-xs text-muted-foreground">
          © {new Date().getFullYear()} Mira
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt="" aria-hidden="true" style={{ width: '32px', height: '32px' }} />
              <span className="font-display text-xl font-bold">Mira</span>
            </div>
          </div>

          {needsVerification ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Verify your email</h1>
              <p className="font-data text-sm text-muted-foreground mb-8">
                We sent a 6-digit code to <strong>{email}</strong>. Enter it below to complete sign-in.
              </p>

              <form onSubmit={handleVerify} noValidate aria-label="Email verification form">
                {verifyError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-6 px-4 py-3 font-data text-sm text-primary"
                    style={{ background: '#ebe7e7' }}
                  >
                    {verifyError}
                  </div>
                )}
                {resendSent && (
                  <div className="mb-6 px-3 py-2 font-sans text-sm" style={{ background: '#eaf6ee', color: '#2d7a4f', border: '1px solid #c3e6d0' }}>
                    New code sent — check your inbox.
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label htmlFor="code" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Verification code
                    </Label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      disabled={isVerifying}
                      autoFocus
                      className={`${inputClass} text-center text-2xl tracking-[0.3em] font-mono`}
                      style={inputStyle}
                    />
                  </div>

                  <EchoButton
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={isVerifying || verifyCode.length !== 6}
                    style={{ justifyContent: 'center' }}
                  >
                    {isVerifying ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        Verifying…
                      </span>
                    ) : 'Verify and sign in'}
                  </EchoButton>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setNeedsVerification(false); setError(null) }}
                      className="font-data text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                      Back to sign in
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="font-data text-primary hover:underline underline-offset-4"
                    >
                      {isResending ? 'Sending…' : 'Resend code'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 hidden lg:block">
                <img src={logoSrc} alt="Mira" style={{ width: '56px', height: '56px' }} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
              <p className="font-data text-sm text-muted-foreground mb-8">Sign in to your account</p>

              <form onSubmit={handleSubmit} noValidate aria-label="Sign in form">
                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-6 px-4 py-3 font-sans text-sm"
                    style={{ background: '#ebe7e7', color: '#1d4ed8' }}
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Email
                    </Label>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                        Password
                      </Label>
                      <Link to="/forgot-password" className="font-data text-xs text-primary hover:underline underline-offset-4">
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <EchoButton
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={isLoading || !email || !password}
                    style={{ justifyContent: 'center' }}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        Signing in…
                      </span>
                    ) : 'Sign in'}
                  </EchoButton>
                </div>
              </form>

              <p className="font-data text-center text-sm text-muted-foreground mt-8">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-primary hover:underline underline-offset-4 font-medium">
                  Create one
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
