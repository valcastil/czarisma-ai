import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not set')

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { planId, userId } = await req.json()

    if (!planId || !userId) {
      return new Response(
        JSON.stringify({ error: 'planId and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get price ID based on plan
    const priceId = planId === 'monthly'
      ? Deno.env.get('STRIPE_MONTHLY_PRICE_ID')
      : Deno.env.get('STRIPE_YEARLY_PRICE_ID')

    if (!priceId) {
      throw new Error(`Price ID not configured for plan: ${planId}`)
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check for existing Stripe customer
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId = existingSub?.stripe_customer_id

    if (!customerId) {
      // Get user email from Supabase auth
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { supabase_user_id: userId },
      })
      customerId = customer.id

      // Store the Stripe customer ID
      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        status: 'inactive',
      }, { onConflict: 'user_id' })
    }

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    )

    // Create subscription with 30-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 30,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['pending_setup_intent', 'latest_invoice.payment_intent'],
    })

    // Determine client secret: trial uses SetupIntent, no trial uses PaymentIntent
    let clientSecret: string
    let isSetupIntent = false

    if (
      subscription.pending_setup_intent &&
      typeof subscription.pending_setup_intent !== 'string'
    ) {
      clientSecret = subscription.pending_setup_intent.client_secret!
      isSetupIntent = true
    } else if (
      subscription.latest_invoice &&
      typeof subscription.latest_invoice !== 'string' &&
      subscription.latest_invoice.payment_intent &&
      typeof subscription.latest_invoice.payment_intent !== 'string'
    ) {
      clientSecret = subscription.latest_invoice.payment_intent.client_secret!
    } else {
      throw new Error('No client secret found on subscription')
    }

    // Update subscription record with Stripe subscription ID
    await supabase.from('subscriptions').update({
      stripe_subscription_id: subscription.id,
      plan_type: planId,
      store: 'stripe',
    }).eq('user_id', userId)

    return new Response(
      JSON.stringify({
        clientSecret,
        ephemeralKey: ephemeralKey.secret,
        customer: customerId,
        subscriptionId: subscription.id,
        isSetupIntent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('create-checkout-session error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
