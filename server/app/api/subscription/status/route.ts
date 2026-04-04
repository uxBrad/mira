import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getAuthenticatedUser } from '../../../../lib/auth-middleware'

const TRIAL_DAYS = 7

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ access: 'unauthenticated' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      include: { subscription: true }
    })

    if (!user) {
      return NextResponse.json({ access: 'unauthenticated' }, { status: 401 })
    }

    const sub = user.subscription

    // Active subscription
    if (sub?.status === 'active') {
      return NextResponse.json({ access: 'active', plan: sub.plan })
    }

    // Past due
    if (sub?.status === 'past_due') {
      return NextResponse.json({ access: 'past_due', plan: sub.plan })
    }

    // Trial
    if (sub?.status === 'trialing' || !sub?.status) {
      const trialStart = user.trialStartedAt
      if (!trialStart) {
        // Email not yet verified / trial not yet started
        return NextResponse.json({ access: 'trialing', daysRemaining: TRIAL_DAYS })
      }

      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      const now = new Date()

      if (now > trialEnd) {
        return NextResponse.json({ access: 'expired' })
      }

      const daysRemaining = Math.max(
        0,
        Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      )

      return NextResponse.json({ access: 'trialing', daysRemaining })
    }

    // Canceled or expired
    return NextResponse.json({ access: 'expired' })
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json({ error: 'Failed to get subscription status.' }, { status: 500 })
  }
}
