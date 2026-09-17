-- ==============================================================================
-- CREATOR SIGNAL: PAID CREDIT STACKING & SPLIT-LOGIC CRON JOB MIGRATION
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Updated Stored Procedure: Split-Logic Daily Midnight Top-Up (Midnight IST)
-- Free Users: "Use it or lose it" -> Hard reset to 20 credits.
-- Paid Users (Creator & Pro): "Daily Stacking" -> Adds daily allowance to existing balance.
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS JSONB AS $$
DECLARE
    users_updated INTEGER := 0;
BEGIN
    WITH user_tiers AS (
        SELECT 
            c.user_id,
            COALESCE(s.status, 'inactive') AS sub_status,
            COALESCE(s.plan_tier, 'free') AS plan_tier,
            c.balance AS current_balance
        FROM public.credits c
        LEFT JOIN public.subscriptions s ON c.user_id = s.user_id
    ),
    calculated_credits AS (
        SELECT 
            user_id,
            CASE 
                -- Pro Tier: Stacks +100 credits on top of current balance
                WHEN sub_status = 'active' AND plan_tier = 'pro_299' THEN current_balance + 100
                -- Creator Tier: Stacks +50 credits on top of current balance
                WHEN sub_status = 'active' AND plan_tier = 'creator_199' THEN current_balance + 50
                -- Free Starter Tier: Hard reset to 20 credits (Use it or lose it)
                ELSE 20
            END AS new_balance,
            CASE 
                WHEN sub_status = 'active' AND plan_tier = 'pro_299' THEN 100
                WHEN sub_status = 'active' AND plan_tier = 'creator_199' THEN 50
                ELSE 20
            END AS daily_allowance,
            CASE 
                WHEN sub_status = 'active' AND plan_tier = 'pro_299' THEN 100
                WHEN sub_status = 'active' AND plan_tier = 'creator_199' THEN 50
                ELSE 20
            END AS credit_added
        FROM user_tiers
    ),
    updated_credits AS (
        UPDATE public.credits c
        SET 
            balance = cc.new_balance,
            daily_allowance = cc.daily_allowance,
            updated_at = NOW()
        FROM calculated_credits cc
        WHERE c.user_id = cc.user_id
        RETURNING c.user_id, cc.credit_added, cc.new_balance
    )
    -- Record audit transactions
    INSERT INTO public.credit_transactions (user_id, amount, action, created_at)
    SELECT 
        user_id, 
        credit_added, 
        'daily_topup', 
        NOW()
    FROM updated_credits;

    GET DIAGNOSTICS users_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'users_updated', users_updated,
        'reset_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure pg_cron schedule is configured for Midnight IST (18:30 UTC)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule('daily-credit-reset-midnight-ist')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'daily-credit-reset-midnight-ist'
        );

        PERFORM cron.schedule(
            'daily-credit-reset-midnight-ist',
            '30 18 * * *',
            'SELECT public.reset_daily_credits();'
        );
    END IF;
END $$;
