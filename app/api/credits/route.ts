import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getUserPlanTier, PlanTier, TIER_QUOTAS } from '@/lib/credits/deduct';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    
    let supabase;
    try {
      supabase = createAdminSupabaseClient();
    } catch {
      return NextResponse.json({
        balance: 20,
        quota: 20,
        dailyAllowance: 20,
        planTier: 'free',
        currentPeriodEnd: null,
        transactions: [],
      });
    }

    // 1. Fetch balance & daily allowance (or auto-provision 50 starter credits)
    let { data: creditRow } = await supabase
      .from('credits')
      .select('balance, daily_allowance, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!creditRow) {
      const { data: createdRow } = await supabase
        .from('credits')
        .upsert(
          { user_id: userId, balance: 50, daily_allowance: 20, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select('balance, daily_allowance, updated_at')
        .maybeSingle();
      if (createdRow) {
        creditRow = createdRow;
      }
    }

    // 2. Fetch active subscription details (plan tier & billing period end)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_tier, status, current_period_end')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const planTier = (sub?.plan_tier as PlanTier) || 'free';
    const currentPeriodEnd = sub?.current_period_end ?? null;
    const tierQuota = TIER_QUOTAS[planTier] || 50;

    // 3. Fetch recent transactions
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('id, amount, action, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      balance: creditRow?.balance ?? 50,
      quota: tierQuota,
      dailyAllowance: creditRow?.daily_allowance ?? 20,
      planTier: planTier,
      currentPeriodEnd: currentPeriodEnd,
      transactions: transactions ?? [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve credit balance.' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
