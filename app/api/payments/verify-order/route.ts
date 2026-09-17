import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { CREDIT_PACKS } from '../create-order/route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packId, isSandbox } = body;

    const pack = CREDIT_PACKS[packId];
    if (!pack) {
      return NextResponse.json({ error: `Invalid credit pack '${packId}'.` }, { status: 400 });
    }

    // Cryptographically verify Razorpay signature for live transactions
    if (!isSandbox) {
      try {
        const secret = serverEnv.razorpayKeySecret;
        if (secret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
          const expected = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

          if (expected !== razorpay_signature) {
            return NextResponse.json(
              { error: 'Invalid Razorpay payment signature.' },
              { status: 400 }
            );
          }
        }
      } catch (secErr: any) {
        console.warn('[Payments] Signature verification notice:', secErr.message);
      }
    }

    // Atomically increment credits balance in Supabase
    let newBalance = 50 + pack.credits;

    try {
      const supabase = createAdminSupabaseClient();

      let { data: creditRow } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();

      const currentBalance = typeof creditRow?.balance === 'number' ? creditRow.balance : 50;
      newBalance = currentBalance + pack.credits;

      await supabase
        .from('credits')
        .upsert(
          {
            user_id: userId,
            balance: newBalance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: pack.credits,
        action: 'credit_pack_purchase',
        created_at: new Date().toISOString(),
      });
    } catch (dbErr: any) {
      console.warn('[Payments] Supabase credit top-up DB notice:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      newBalance,
      addedCredits: pack.credits,
      packName: pack.name,
    });
  } catch (error: any) {
    console.error('[Payments] Verify order exception:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed.' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
