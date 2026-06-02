import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { stripe } from '../../../../lib/stripe'
import { getAuthenticatedUser } from '../../../../lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.id }
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'No subscription found.' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.APP_URL}/billing-return`
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json({ error: 'Failed to open billing portal.' }, { status: 500 })
  }
}
