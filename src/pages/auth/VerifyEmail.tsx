import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    // The verification happens server-side when the user clicks the link
    // This page just shows the result
    setStatus('success')
  }, [token])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Verifying…" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-semibold mb-2">Verification failed</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The link may have expired. Try registering again.
          </p>
          <Button variant="outline" asChild>
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-xl font-semibold mb-2">Email verified</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your account is active. Your 7-day free trial has started — sign in to get started.
        </p>
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  )
}
