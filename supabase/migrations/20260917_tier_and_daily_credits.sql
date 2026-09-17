-- ==============================================================================
-- CREATOR SIGNAL: 3-TIER DAILY ALLOWANCE & MIDNIGHT RESET MIGRATION
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Add plan_tier to the subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free' 
CHECK (plan_tier IN ('free', 'creator_199', 'pro_299'));

-- 2. Add daily_allowance to the credits table
ALTER TABLE public.credits 
ADD COLUMN IF NOT EXISTS daily_allowance INTEGER NOT NULL DEFAULT 20;

-- 3. Update the handle_new_user_signup trigger to grant 20 daily credits for new Free users
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Initialize 20 starter daily credits
    INSERT INTO public.credits (user_id, balance, daily_allowance, updated_at)
    VALUES (NEW.id, 20, 20, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    -- Audit log
    INSERT INTO public.credit_transactions (user_id, amount, action, created_at)
    VALUES (NEW.id, 20, 'signup_bonus', NOW());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PostgreSQL Stored Procedure: Reset Daily Credits at Midnight IST
-- Resets every user's balance to their plan's daily limit (20, 50, or 100).
-- Unused credits do NOT carry over.
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS JSONB AS $$
DECLARE
    users_updated INTEGER := 0;
BEGIN
    -- Step A: Determine each user's active tier and reset balance to daily limit
    WITH user_tiers AS (
        SELECT 
            c.user_id,
            CASE 
                WHEN s.status = 'active' AND s.plan_tier = 'pro_299' THEN 100
                WHEN s.status = 'active' AND s.plan_tier = 'creator_199' THEN 50
                ELSE 20 -- Free Starter allowance
            END AS target_allowance
        FROM public.credits c
        LEFT JOIN public.subscriptions s ON c.user_id = s.user_id
    ),
    updated_credits AS (
        UPDATE public.credits c
        SET 
            balance = ut.target_allowance,
            daily_allowance = ut.target_allowance,
            updated_at = NOW()
        FROM user_tiers ut
        WHERE c.user_id = ut.user_id
        RETURNING c.user_id, ut.target_allowance
    )
    -- Step B: Insert audit transactions for each reset
    INSERT INTO public.credit_transactions (user_id, amount, action, created_at)
    SELECT 
        user_id, 
        target_allowance, 
        'daily_reset', 
        NOW()
    FROM updated_credits;

    GET DIAGNOSTICS users_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'users_reset', users_updated,
        'reset_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. pg_cron Schedule (Runs daily at Midnight IST = 18:30 UTC)
-- Note: Midnight IST is UTC 18:30 (5 hours 30 mins ahead of UTC).
-- The cron expression '30 18 * * *' executes at 18:30 UTC every single day.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Remove existing schedule if present
        PERFORM cron.unschedule('daily-credit-reset-midnight-ist')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'daily-credit-reset-midnight-ist'
        );

        -- Schedule new daily reset
        PERFORM cron.schedule(
            'daily-credit-reset-midnight-ist',
            '30 18 * * *',
            'SELECT public.reset_daily_credits();'
        );
    END IF;
END $$;
