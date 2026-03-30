import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        // Map Stripe status to app status
        let status = 'inactive'
        switch (subscription.status) {
          case 'active': status = 'active'; break
          case 'trialing': status = 'trialing'; break
          case 'past_due': status = 'grace_period'; break
          case 'canceled': status = 'cancelled'; break
          case 'unpaid': status = 'expired'; break
          case 'paused': status = 'paused'; break
          default: status = 'inactive'
        }

        // Determine plan type from price
        const monthlyPriceId = Deno.env.get('STRIPE_MONTHLY_PRICE_ID')
        const priceId = subscription.items.data[0]?.price?.id
        const planType = priceId === monthlyPriceId ? 'monthly' : 'yearly'

        await supabase.from('subscriptions').update({
          status,
          plan_type: planType,
          store: 'stripe',
          stripe_subscription_id: subscription.id,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          will_renew: !subscription.cancel_at_period_end,
        }).eq('stripe_customer_id', customerId)

        console.log(`Subscription ${subscription.id} updated: ${status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        await supabase.from('subscriptions').update({
          status: 'expired',
          will_renew: false,
          expiration_date: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)

        console.log(`Subscription ${subscription.id} deleted/expired`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

        if (customerId) {
          await supabase.from('subscriptions').update({
            status: 'active',
            latest_purchase_date: new Date().toISOString(),
            billing_issue_detected_at: null,
          }).eq('stripe_customer_id', customerId)
        }
        console.log(`Payment succeeded for customer ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

        if (customerId) {
          await supabase.from('subscriptions').update({
            status: 'grace_period',
            billing_issue_detected_at: new Date().toISOString(),
          }).eq('stripe_customer_id', customerId)
        }
        console.log(`Payment failed for customer ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
