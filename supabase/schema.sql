-- ==============================================================================
-- CREATOR SIGNAL: MASTER DATABASE SCHEMA & SECURITY POLICIES
-- Paste and run this script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New query -> Paste -> Run
-- ==============================================================================

-- 1. Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Subscriptions Table (Tracks Free, Creator ₹199, and Pro ₹299 Plans)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    razorpay_subscription_id TEXT UNIQUE,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'creator_199', 'pro_299')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'free')),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Credits Table (Usable Balance: 50 on Signup, 20/day Free Reset, 25/day Creator, 50/day Pro)
CREATE TABLE IF NOT EXISTS public.credits (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 50 CHECK (balance >= 0),
    daily_allowance INTEGER NOT NULL DEFAULT 20,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Credit Transactions Table (Full Audit Trail)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Cached YouTube API Table (Quota Shielding: 6-Hour Cache)
CREATE TABLE IF NOT EXISTS public.cached_youtube_api (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_type TEXT NOT NULL CHECK (query_type IN ('search', 'video_stats', 'channel_uploads')),
    query_key TEXT NOT NULL,
    response_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cached_youtube_query 
ON public.cached_youtube_api(query_type, query_key, expires_at);

-- 6. Monitored Videos Table (Views Per Hour Velocity Speedometer)
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
-- When a user registers via Supabase Auth:
-- 1. Creates public.profiles record
-- 2. Grants 20 free daily starter credits
-- 3. Creates default free subscription record
-- 4. Logs welcome transaction
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Create default free subscription
    INSERT INTO public.subscriptions (user_id, plan_tier, status, created_at, updated_at)
    VALUES (NEW.id, 'free', 'active', NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- Initialize 50 starter credits
    INSERT INTO public.credits (user_id, balance, daily_allowance, updated_at)
    VALUES (NEW.id, 50, 20, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- Welcome bonus transaction log
    INSERT INTO public.credit_transactions (user_id, amount, action, created_at)
    VALUES (NEW.id, 50, 'signup_bonus', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ==============================================================================
-- STORED PROCEDURE: DAILY FREE TIER CREDIT RESET (MIDNIGHT IST)
-- Strictly resets Free users to 20 daily credits ("Use it or lose it")
-- Paid users (Creator ₹199 & Pro ₹299) are safely ignored.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reset_free_tier_daily_credits()
RETURNS JSONB AS $$
DECLARE
    users_updated INTEGER := 0;
BEGIN
    WITH free_users AS (
        SELECT c.user_id
        FROM public.credits c
        LEFT JOIN public.subscriptions s ON c.user_id = s.user_id
        WHERE s.status IS NULL 
           OR s.status != 'active'
           OR s.plan_tier = 'free'
    ),
    updated_rows AS (
        UPDATE public.credits c
        SET 
            balance = 20,
            daily_allowance = 20,
            updated_at = NOW()
        FROM free_users fu
        WHERE c.user_id = fu.user_id
        RETURNING c.user_id
    )
    INSERT INTO public.credit_transactions (user_id, amount, action, created_at)
    SELECT 
        user_id, 
        20, 
        'daily_free_reset', 
        NOW()
    FROM updated_rows;

    GET DIAGNOSTICS users_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'free_users_reset', users_updated,
        'reset_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_youtube_api ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitored_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credits"
    ON public.credits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credit transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

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

CREATE POLICY "Authenticated users can read cached YouTube API"
    ON public.cached_youtube_api FOR SELECT
    TO authenticated
    USING (true);
