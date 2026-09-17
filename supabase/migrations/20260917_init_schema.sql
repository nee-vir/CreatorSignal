-- ==============================================================================
-- CREATOR SIGNAL DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Profiles Table
-- Stores user account info linked directly to Supabase Auth.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Subscriptions Table
-- Stores monthly recurring ₹199 Razorpay subscription state.
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    razorpay_subscription_id TEXT UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled')),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Credits Table
-- Tracks current usable credit balance (Default 50 on signup, 1,000 for subscribers).
CREATE TABLE IF NOT EXISTS public.credits (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 50 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Credit Transactions Table
-- Full audit log of every credit spend or refill.
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Negative for deductions, positive for refills
    action TEXT NOT NULL,    -- e.g. 'signup_bonus', 'search', 'outlier_calc', 'vph_track', 'serp_inject', 'subscription_refill'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Cached YouTube API Table
-- Quota-shielding cache. Stores responses for 6 hours to protect the 10,000/day limit.
CREATE TABLE IF NOT EXISTS public.cached_youtube_api (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type TEXT NOT NULL CHECK (query_type IN ('search', 'video_stats', 'channel_uploads')),
    query_key TEXT NOT NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Index for instant lookup by query and expiration
CREATE INDEX IF NOT EXISTS idx_cached_youtube_query 
ON public.cached_youtube_api(query_type, query_key, expires_at);

-- 6. Monitored Videos Table
-- Tracks YouTube videos over time for Views Per Hour (VPH) momentum.
CREATE TABLE IF NOT EXISTS public.monitored_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    initial_view_count BIGINT NOT NULL,
    initial_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latest_view_count BIGINT NOT NULL,
    latest_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_vph NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitored_user ON public.monitored_videos(user_id);

-- ==============================================================================
-- AUTOMATIC SIGNUP PROVISIONING TRIGGER
-- When a user signs up via Supabase Auth (Email or Google OAuth), automatically:
-- 1. Creates their profile record
-- 2. Grants 50 free credits
-- 3. Records the welcome transaction
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Initialize 50 credits
    INSERT INTO public.credits (user_id, balance, updated_at)
    VALUES (NEW.id, 50, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- Audit log
    INSERT INTO public.credit_transactions (user_id, amount, action, created_at)
    VALUES (NEW.id, 50, 'signup_bonus', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires after any new auth.users record is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures each user can only read and interact with their own data.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_youtube_api ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_videos ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Subscriptions: Users can only view their own subscription
CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Credits: Users can only view their own credit balance
CREATE POLICY "Users can view own credits"
    ON public.credits FOR SELECT
    USING (auth.uid() = user_id);

-- Credit Transactions: Users can view their own transaction history
CREATE POLICY "Users can view own credit transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Monitored Videos: Users have full control over their own monitored videos
CREATE POLICY "Users can view own monitored videos"
    ON public.monitored_videos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monitored videos"
    ON public.monitored_videos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monitored videos"
    ON public.monitored_videos FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monitored videos"
    ON public.monitored_videos FOR DELETE
    USING (auth.uid() = user_id);

-- Cached YouTube API:
-- Reading cached API results is safe for authenticated users
CREATE POLICY "Authenticated users can read cached YouTube API"
    ON public.cached_youtube_api FOR SELECT
    TO authenticated
    USING (true);

-- Writes and updates to the cache are handled server-side via service role
