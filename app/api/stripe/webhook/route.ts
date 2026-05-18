import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-04-22.dahlia' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Helper: update plan + stripe_customer_id for a user
  async function setPlan(userId: string, plan: 'premium' | 'free', customerId?: string) {
    const update: Record<string,string> = { plan }
    if (customerId) update.stripe_customer_id = customerId
    await supabaseAdmin
      .from('household_members')
      .update(update)
      .eq('user_id', userId)
  }

  // Helper: get user_id from subscription metadata
  async function userFromSub(sub: Stripe.Subscription): Promise<string | null> {
    return sub.metadata?.user_id ?? null
  }

  switch (event.type) {

    // Payment succeeded — activate Premium
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.user_id
      if (!userId) break
      await setPlan(userId, 'premium', session.customer as string)
      console.log(`Premium activated for user ${userId}`)
      break
    }

    // Subscription renewed — keep active
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = (invoice as any).subscription as string; if (!subId) break; const sub = await stripe.subscriptions.retrieve(subId)
      const userId = await userFromSub(sub)
      if (!userId) break
      await setPlan(userId, 'premium', sub.customer as string)
      break
    }

    // Payment failed — downgrade
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = (invoice as any).subscription as string; if (!subId) break; const sub = await stripe.subscriptions.retrieve(subId)
      const userId = await userFromSub(sub)
      if (!userId) break
      await setPlan(userId, 'free')
      console.log(`Payment failed — downgraded user ${userId}`)
      break
    }

    // Subscription cancelled — downgrade at end of period
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = await userFromSub(sub)
      if (!userId) break
      await setPlan(userId, 'free')
      console.log(`Subscription cancelled — downgraded user ${userId}`)
      break
    }

    default:
      // Ignore other events
      break
  }

  return NextResponse.json({ received: true })
}
