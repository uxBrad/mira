import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { useToast } from '../../components/ui/use-toast'
import { Check, LogOut } from 'lucide-react'

const FEATURES = [
  'Unlimited audit projects',
  'Unlimited findings per project',
  'Full branded PDF reports',
  'CSV export of all findings',
  'WCAG 2.2 & ADA criteria library',
  'Screenshot attachments'
]

export default function PaywallPage() {
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false)
  const [isLoadingYearly, setIsLoadingYearly] = useState(false)
  const { logout, refreshSubscriptionStatus } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  async function handleCheckout(plan: 'monthly' | 'yearly') {
    const setLoading = plan === 'monthly' ? setIsLoadingMonthly : setIsLoadingYearly
    setLoading(true)
    try {
      await window.api.auth.createCheckout(plan)
      toast({
        title: 'Checkout opened',
        description: 'Complete your subscription in the browser window that just opened.'
      })
      // Poll for subscription activation
      const pollInterval = setInterval(async () => {
        await refreshSubscriptionStatus()
      }, 5000)
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000) // Stop after 5min
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not open checkout.'
      toast({ variant: 'destructive', title: 'Checkout failed', description: message })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <span className="text-primary-foreground font-bold text-xl">E</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Your trial has ended</h1>
          <p className="text-muted-foreground text-lg">
            Subscribe to continue using Echo.
          </p>
        </div>

        {/* Features list */}
        <div className="bg-muted/50 rounded-xl p-6 mb-8">
          <h2 className="font-semibold mb-4 text-center">Everything included in Pro</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Monthly */}
          <div className="border rounded-xl p-6">
            <h3 className="font-semibold mb-1">Monthly</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$4.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleCheckout('monthly')}
              disabled={isLoadingMonthly || isLoadingYearly}
              aria-busy={isLoadingMonthly}
            >
              {isLoadingMonthly ? 'Opening checkout…' : 'Subscribe monthly'}
            </Button>
          </div>

          {/* Yearly — highlighted */}
          <div className="border-2 border-primary rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Save 17%
              </span>
            </div>
            <h3 className="font-semibold mb-1">Yearly</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold">$49.99</span>
              <span className="text-muted-foreground">/year</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">~$4.17/month</p>
            <Button
              className="w-full"
              onClick={() => handleCheckout('yearly')}
              disabled={isLoadingMonthly || isLoadingYearly}
              aria-busy={isLoadingYearly}
            >
              {isLoadingYearly ? 'Opening checkout…' : 'Subscribe yearly'}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Secure payment via Stripe. Cancel anytime from account settings.
        </p>

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
