-- ==============================================================================
-- CREATOR SIGNAL: THE QUOTA ENGINE (DAILY FREE RESET ONLY)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create or Replace Stored Procedure: Reset Free Tier Daily Credits (Midnight IST)
-- Strictly targets Free users. Paid users (creator_199 & pro_299) are completely ignored.
CREATE OR REPLACE FUNCTION public.reset_free_tier_daily_credits()
RETURNS JSONB AS $$
DECLARE
    users_updated INTEGER := 0;
BEGIN
    -- Update credits strictly for users who DO NOT have an active paid subscription
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
            updated_at = NOW()
        FROM free_users fu
        WHERE c.user_id = fu.user_id
        RETURNING c.user_id
    )
    -- Log transparent audit trail for daily reset
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

-- 2. Schedule pg_cron at Midnight IST (18:30 UTC every day)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove old jobs if present
        PERFORM cron.unschedule('daily-credit-reset-midnight-ist')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'daily-credit-reset-midnight-ist'
        );
        PERFORM cron.unschedule('daily-free-quota-reset-midnight-ist')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'daily-free-quota-reset-midnight-ist'
        );

        -- Schedule new strictly-free reset job
        PERFORM cron.schedule(
            'daily-free-quota-reset-midnight-ist',
            '30 18 * * *',
            'SELECT public.reset_free_tier_daily_credits();'
        );
    END IF;
END $$;
