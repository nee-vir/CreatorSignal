import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const supabase = createAdminSupabaseClient();
    const nowIso = new Date().toISOString();

    // 1. Check if user already has a credits record
    const { data: existingCredit } = await supabase
      .from('credits')
      .select('balance, user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCredit) {
      return NextResponse.json({
        success: true,
        balance: existingCredit.balance,
        message: 'Account already initialized.',
      });
    }

    // 2. Insert 50 initial starter credits
    const { error: creditError } = await supabase
      .from('credits')
      .upsert({
        user_id: userId,
        balance: 50,
        daily_allowance: 20,
        updated_at: nowIso,
      });

    if (creditError) {
      throw new Error(`Failed to initialize 50 credits: ${creditError.message}`);
    }

    // 3. Ensure free subscription record exists
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_tier: 'free',
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });

    // 4. Record welcome bonus transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 50,
        action: 'signup_bonus',
        created_at: nowIso,
      });

    return NextResponse.json({
      success: true,
      balance: 50,
      message: '50 free starter credits successfully credited!',
    });
  } catch (error: any) {
    console.error('[SignupCreditSync] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync initial credits' },
      { status: 500 }
    );
  }
}
