-- Create subscriptions table for RevenueCat integration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Create the subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- RevenueCat fields
    revenuecat_customer_id TEXT,
    entitlement_id TEXT DEFAULT 'pro',
    product_identifier TEXT,
    
    -- Subscription status
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'trialing', 'expired', 'cancelled', 'inactive', 'paused', 'grace_period')),
    
    -- Subscription details
    plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly', 'lifetime', NULL)),
    store TEXT CHECK (store IN ('app_store', 'play_store', 'stripe', 'promotional', NULL)),
    is_sandbox BOOLEAN DEFAULT false,
    
    -- Dates
    original_purchase_date TIMESTAMPTZ,
    latest_purchase_date TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    unsubscribe_detected_at TIMESTAMPTZ,
    billing_issue_detected_at TIMESTAMPTZ,
    
    -- Renewal info
    will_renew BOOLEAN DEFAULT true,
    auto_resume_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one subscription per user (can be modified if you want multiple)
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_customer_id ON public.subscriptions(revenuecat_customer_id);

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial creation)
CREATE POLICY "Users can create own subscription"
    ON public.subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription"
    ON public.subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role has full access"
    ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- Comment on table
COMMENT ON TABLE public.subscriptions IS 'User subscription data synced from RevenueCat';
COMMENT ON COLUMN public.subscriptions.status IS 'active, trialing, expired, cancelled, inactive, paused, grace_period';
COMMENT ON COLUMN public.subscriptions.entitlement_id IS 'RevenueCat entitlement identifier (e.g., pro)';
COMMENT ON COLUMN public.subscriptions.product_identifier IS 'Product ID (e.g., monthly, yearly)';
