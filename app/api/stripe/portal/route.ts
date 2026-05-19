import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

// Service role client to read stripe_customer_id
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    // Look up the Stripe customer ID stored when the user first subscribed
    const { data: member, error } = await supabaseAdmin
      .from('household_members')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!member?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Contact support@kidexpense.com.au' },
        { status: 404 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidexpense-mayur-shahs-projects-fe47d9df.vercel.app'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   member.stripe_customer_id,
      return_url: `${appUrl}/plan`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: any) {
    console.error('Stripe portal error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
