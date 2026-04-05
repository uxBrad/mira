import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../components/ui/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.'
      setError(message)
      toast({ variant: 'destructive', title: 'Login failed', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#fcf9f8' }}>
      {/* Left brand panel */}
      <div
        className="hidden lg:flex w-2/5 flex-col justify-between px-12 py-12"
        style={{ background: '#f6f3f2' }}
      >
        <span className="font-display text-xl font-bold text-foreground">
          Grounds<br />
          <span className="text-primary">for Access</span>
        </span>
        <div>
          <p className="font-display text-3xl font-semibold leading-snug text-foreground mb-4">
            The professional tool for accessibility auditing.
          </p>
          <p className="font-data text-sm text-muted-foreground">
            Document, classify, and report WCAG findings with precision.
          </p>
        </div>
        <p className="font-data text-xs text-muted-foreground">
          © {new Date().getFullYear()} Grounds for Access
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <span className="font-display text-xl font-bold">
              Grounds <span className="text-primary">for Access</span>
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
          <p className="font-data text-sm text-muted-foreground mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} noValidate aria-label="Sign in form">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-6 px-4 py-3 font-data text-sm text-primary"
                style={{ background: '#ebe7e7' }}
              >
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-1">
                <Label htmlFor="email" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                  Email
                </Label>
                <Input id="email" type="email" autoComplete="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" disabled={isLoading} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-data text-xs font-medium tracking-widest uppercase text-muted-foreground">
                    Password
                  </Label>
                  <Link to="/forgot-password" className="font-data text-xs text-primary hover:underline underline-offset-4">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
                {isLoading ? (
                  <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />Signing in…</>
                ) : 'Sign in'}
              </Button>
            </div>
          </form>

          <p className="font-data text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-primary hover:underline underline-offset-4 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
