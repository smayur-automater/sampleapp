import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

// Must use service role key to bypass RLS and update any user's plan
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: set a user's plan in household_members
async function setPlan(
  userId: string,
  plan: 'premium' | 'free',
  stripeCustomerId?: string
) {
  const update: Record<string, string> = {
    plan,
    plan_assigned_at: new Date().toISOString(),
  }
  if (stripeCustomerId) {
    update.stripe_customer_id = stripeCustomerId
  }

  const { error } = await supabaseAdmin
    .from('household_members')
    .update(update)
    .eq('user_id', userId)

  if (error) {
    console.error(`setPlan error for ${userId}:`, error.message)
  } else {
    console.log(`Plan set to ${plan} for user ${userId}`)
  }
}

// Helper: get user_id from Stripe subscription metadata
function getUserId(sub: Stripe.Subscription): string | null {
  return sub.metadata?.user_id ?? null
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''
  const secret    = process.env.STRIPE_WEBHOOK_SECRET!

  // Verify the webhook came from Stripe
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('Stripe webhook event:', event.type)

  switch (event.type) {

    // ── Payment succeeded on first checkout ─────────────────────────────────
    case 'checkout.session.completed': {
      const session  = event.data.object as Stripe.Checkout.Session
      const userId   = session.metadata?.user_id
      const custId   = session.customer as string

      if (!userId) {
        console.error('checkout.session.completed: no user_id in metadata')
        break
      }

      await setPlan(userId, 'premium', custId)
      break
    }

    // ── Subscription renewed (monthly charge succeeded) ──────────────────────
    case 'invoice.payment_succeeded': {
      const invoice   = event.data.object as any
      const subId     = invoice.subscription as string
      if (!subId) break

      const sub    = await stripe.subscriptions.retrieve(subId)
      const userId = getUserId(sub)
      if (!userId) break

      await setPlan(userId, 'premium', sub.customer as string)
      break
    }

    // ── Payment failed ───────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any
      const subId   = invoice.subscription as string
      if (!subId) break

      const sub    = await stripe.subscriptions.retrieve(subId)
      const userId = getUserId(sub)
      if (!userId) break

      // Only downgrade if subscription is actually cancelled/past_due
      // Don't downgrade on first retry — Stripe retries 3 times
      if (sub.status === 'past_due' || sub.status === 'unpaid') {
        await setPlan(userId, 'free')
        console.log(`Downgraded user ${userId} due to payment failure (${sub.status})`)
      }
      break
    }

    // ── Subscription cancelled or expired ────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = getUserId(sub)
      if (!userId) break

      await setPlan(userId, 'free')
      console.log(`Subscription cancelled — downgraded user ${userId}`)
      break
    }

    // ── Subscription updated (e.g. plan change) ──────────────────────────────
    case 'customer.subscription.updated': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = getUserId(sub)
      if (!userId) break

      if (sub.status === 'active') {
        await setPlan(userId, 'premium', sub.customer as string)
      } else if (sub.status === 'canceled') {
        await setPlan(userId, 'free')
      }
      break
    }

    default:
      // Ignore other events — no action needed
      break
  }

  // Always return 200 so Stripe doesn't retry
  return NextResponse.json({ received: true })
}
