import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Daily Midnight IST Credit Reset & Stacking Endpoint
 * 
 * Free Users: Hard reset to 20 credits ("Use it or lose it")
 * Paid Users: Adds daily allowance to existing balance (Credit Stacking)
 * - Creator: +50 credits / day
 * - Pro: +100 credits / day
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verify cron secret if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }

    const supabase = createAdminSupabaseClient();

    // 1. Try invoking the database stored procedure directly
    const { data: rpcData, error: rpcError } = await supabase.rpc('reset_free_tier_daily_credits');

    if (!rpcError) {
      return NextResponse.json({
        success: true,
        method: 'postgres_rpc',
        result: rpcData,
      });
    }

    console.warn('[CronReset] RPC invocation failed, executing direct fallback targeting only free users:', rpcError.message);

    // 2. Direct Table Fallback: Safely target ONLY free users (paid subscribers ignored)
    const { data: credits, error: fetchErr } = await supabase
      .from('credits')
      .select('user_id, balance');

    if (fetchErr || !credits) {
      throw new Error(`Failed to fetch credit records: ${fetchErr?.message}`);
    }

    let resetCount = 0;
    const nowIso = new Date().toISOString();

    for (const record of credits) {
      // Check active subscription status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_tier, status')
        .eq('user_id', record.user_id)
        .eq('status', 'active')
        .maybeSingle();

      const isPaidSubscriber = sub?.status === 'active' && (sub?.plan_tier === 'creator_199' || sub?.plan_tier === 'pro_299');

      // CRITICAL: Paid users get a monthly lump sum refreshed by webhook. DO NOT touch their balance here.
      if (isPaidSubscriber) {
        continue;
      }

      // Free user: Hard reset to 20 daily credits
      await supabase
        .from('credits')
        .update({
          balance: 20,
          updated_at: nowIso,
        })
        .eq('user_id', record.user_id);

      await supabase.from('credit_transactions').insert({
        user_id: record.user_id,
        amount: 20,
        action: 'daily_free_reset',
        created_at: nowIso,
      });

      resetCount++;
    }

    return NextResponse.json({
      success: true,
      method: 'direct_fallback',
      users_updated: resetCount,
      reset_at: nowIso,
    });
  } catch (error: any) {
    console.error('[CronReset] Execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute daily credit reset.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
