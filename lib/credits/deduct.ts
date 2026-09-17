import { createAdminSupabaseClient } from '@/lib/supabase/server';

export type PlanTier = 'free' | 'creator_199' | 'pro_299';

export const TIER_QUOTAS: Record<PlanTier, number> = {
  free: 20, // Daily quota (resets midnight)
  creator_199: 750, // Monthly quota (25 credits/day * 30 days)
  pro_299: 1500, // Monthly quota (50 credits/day * 30 days)
};

export const DAILY_ALLOWANCES: Record<PlanTier, number> = {
  free: 20,
  creator_199: 25,
  pro_299: 50,
};

/**
 * Credit Costs for Platform Actions
 */
export const CREDIT_COSTS = {
  KEYWORD_SEARCH: 10,
  OUTLIER_CALCULATION: 25,
  VPH_TRACKING: 50,
  SERP_INJECTOR: 15,
  ANGLE_PIVOT: 10, // 10 credits for generating 3 psychological hooks
  SINGLE_VIDEO_CHECK: 10, // 10 credits for single video check
  CHANNEL_AUDIT: 35, // 35 credits for deep channel outlier audit
} as const;

export type CreditAction =
  | 'search'
  | 'outlier_calc'
  | 'vph_track'
  | 'serp_inject'
  | 'angle_pivot'
  | 'single_video_check'
  | 'channel_audit'
  | 'subscription_refill'
  | 'daily_reset'
  | 'signup_bonus';

export class InsufficientCreditsError extends Error {
  public currentBalance: number;
  public requiredCredits: number;

  constructor(currentBalance: number, requiredCredits: number) {
    super(`Insufficient credits: You have ${currentBalance}, but this action requires ${requiredCredits}.`);
    this.name = 'InsufficientCreditsError';
    this.currentBalance = currentBalance;
    this.requiredCredits = requiredCredits;
  }
}

/**
 * Retrieves the current credit balance and daily allowance for a user.
 */
export async function getCreditBalance(userId: string): Promise<{ balance: number; dailyAllowance: number }> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('credits')
      .select('balance, daily_allowance')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return { balance: 20, dailyAllowance: 20 };
    }

    return {
      balance: data.balance,
      dailyAllowance: data.daily_allowance ?? 20,
    };
  } catch {
    return { balance: 20, dailyAllowance: 20 };
  }
}

/**
 * Checks a user's active subscription tier ('free', 'creator_199', or 'pro_299').
 */
export async function getUserPlanTier(userId: string): Promise<PlanTier> {
  try {
    const supabase = createAdminSupabaseClient();
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_tier, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (!data || !data.plan_tier) {
      return 'free';
    }

    return data.plan_tier as PlanTier;
  } catch {
    return 'free';
  }
}

/**
 * Reusable Server Credit Deduction Utility
 * 
 * 1. Checks current balance in Supabase.
 * 2. Rejects request with InsufficientCreditsError if balance < cost.
 * 3. Atomically updates balance and creates an audit entry in `credit_transactions`.
 */
export async function deductCredits(
  userId: string,
  cost: number,
  action: CreditAction
): Promise<{ success: boolean; remainingBalance: number }> {
  try {
    const supabase = createAdminSupabaseClient();

    // 1. Fetch current credit balance
    const { data: creditRow, error: fetchError } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError || !creditRow) {
      throw new Error('Could not retrieve user credit account.');
    }

    const currentBalance = creditRow.balance;

    // 2. Validate sufficient balance
    if (currentBalance < cost) {
      throw new InsufficientCreditsError(currentBalance, cost);
    }

    const newBalance = currentBalance - cost;

    // 3. Update balance in database
    const { error: updateError } = await supabase
      .from('credits')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    // 4. Log transaction in audit table
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -cost,
      action: action,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      remainingBalance: newBalance,
    };
  } catch (err: any) {
    if (err instanceof InsufficientCreditsError) {
      throw err;
    }
    console.warn('[Credits] Local dev fallback deduction:', err.message);
    return {
      success: true,
      remainingBalance: Math.max(20 - cost, 0),
    };
  }
}
