import { NextRequest, NextResponse } from 'next/server'

// Force dynamic — prevents Next.js static analysis at build time
export const dynamic = 'force-dynamic'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-04-22.dahlia' as any,
  })
  try {
    const { user_id, email } = await req.json()

    if (!user_id || !email) {
      return NextResponse.json({ error: 'Missing user_id or email' }, { status: 400 })
    }

    // Use env var, or derive from request origin so redirects always work
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? req.headers.get('origin')
      ?? req.headers.get('referer')?.split('/').slice(0,3).join('/')
      ?? 'https://kidexpense-mayur-shahs-projects-fe47d9df.vercel.app'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'KidExpense Premium',
              description: 'Unlimited expenses, statements, analytics, split rules and more.',
              images: [],
            },
            unit_amount: 700, // $7.00 AUD in cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id,
      },
      subscription_data: {
        metadata: {
          user_id,
        },
      },
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url:  `${appUrl}/plan?upgrade=cancelled`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
