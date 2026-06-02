import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '../../../../lib/stripe'
import { prisma } from '../../../../lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const stripeSubscription = await getStripe().subscriptions.retrieve(
            session.subscription as string
          )
          const customerId = session.customer as string

          await prisma.subscription.update({
            where: { stripeCustomerId: customerId },
            data: {
              stripeSubscriptionId: stripeSubscription.id,
              status: stripeSubscription.status,
              plan: (session.metadata?.plan as 'monthly' | 'yearly') || null,
              currentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : null,
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false
            }
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const periodEnd = (subscription as unknown as Record<string, unknown>).current_period_end
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: typeof periodEnd === 'number' ? new Date(periodEnd * 1000) : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false
          }
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status: 'canceled',
            stripeSubscriptionId: null,
            currentPeriodEnd: null
          }
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: 'past_due' }
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId, status: 'past_due' },
          data: { status: 'active' }
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 })
  }
}
