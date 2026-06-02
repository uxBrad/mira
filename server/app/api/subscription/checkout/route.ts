import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { getStripe, STRIPE_PRICES } from '../../../../lib/stripe'
import { getAuthenticatedUser } from '../../../../lib/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { plan } = await request.json()
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Must be "monthly" or "yearly".' }, { status: 400 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.user.id }
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription record not found.' }, { status: 404 })
    }

    let stripeCustomerId = subscription.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: auth.user.email,
        metadata: { userId: auth.user.id }
      })
      stripeCustomerId = customer.id
      await prisma.subscription.update({
        where: { userId: auth.user.id },
        data: { stripeCustomerId }
      })
    }

    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICES[plan as 'monthly' | 'yearly'],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/checkout-cancel`,
      metadata: {
        userId: auth.user.id,
        plan
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create checkout session.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
