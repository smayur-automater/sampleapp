import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-04-22.dahlia' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)

export async function POST(req: NextRequest) {
  try {
    const { user_id, email } = await req.json()
    if (!user_id || !email) return NextResponse.json({ error: 'Missing user_id or email' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sampleapp-taupe.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'CoParent Pay Premium',
            description: 'Unlimited expenses, statements, analytics, and more.',
          },
          unit_amount: 700, // $7.00 AUD in cents
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { user_id },
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url:  `${appUrl}/plan?upgrade=cancelled`,
      subscription_data: {
        metadata: { user_id },
        trial_period_days: 0,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
