import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/razorpay/server';
import { serverEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { PlanTier, DAILY_ALLOWANCES, TIER_QUOTAS } from '@/lib/credits/deduct';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      console.warn('[RazorpayWebhook] Missing x-razorpay-signature header.');
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 });
    }

    // 1. Cryptographic HMAC SHA256 Signature Verification
    const isValid = verifyWebhookSignature(
      rawBody,
      signature,
      serverEnv.razorpayWebhookSecret
    );

    if (!isValid) {
      console.error('[RazorpayWebhook] Invalid signature detected. Rejected potentially forged request.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 2. Parse payload
    const event = JSON.parse(rawBody);
    const eventType = event.event;
    console.log(`[RazorpayWebhook] Processing genuine verified event: ${eventType}`);

    const supabase = createAdminSupabaseClient();

    // 3. Handle Subscription Charged (Monthly Renewal) & Activation
    if (
      eventType === 'subscription.charged' ||
      eventType === 'payment.captured' ||
      eventType === 'subscription.activated'
    ) {
      const subEntity = event.payload?.subscription?.entity;
      const paymentEntity = event.payload?.payment?.entity;

      const subscriptionId = subEntity?.id || paymentEntity?.subscription_id;
      const userId = subEntity?.notes?.userId || paymentEntity?.notes?.userId;

      if (!userId) {
        console.warn('[RazorpayWebhook] No userId found in webhook entity notes.');
        return NextResponse.json({ received: true, note: 'No userId found in notes' });
      }

      // Determine Plan Tier (pro_299 vs creator_199)
      const rawTier =
        subEntity?.notes?.planTier ||
        paymentEntity?.notes?.planTier;
      
      const paymentAmount = paymentEntity?.amount || subEntity?.plan_amount || 19900;
      let planTier: PlanTier = 'creator_199';

      if (rawTier === 'pro_299' || paymentAmount >= 29900) {
        planTier = 'pro_299';
      }

      const monthlyQuota = TIER_QUOTAS[planTier];

      // Calculate next billing period (30 days from current charge, or use Razorpay entity end date)
      const periodEnd = subEntity?.current_end 
        ? new Date(subEntity.current_end * 1000)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d;
          })();

      // A. Update subscription record with active status and new period end date
      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          razorpay_subscription_id: subscriptionId,
          status: 'active',
          plan_tier: planTier,
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // B. Monthly Refresh on Credit Ledger:
      // Hard reset balance to the full monthly lump-sum quota (1,000 for Creator, 1,500 for Pro)
      await supabase.from('credits').upsert(
        {
          user_id: userId,
          balance: monthlyQuota,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // C. Record transaction audit log
      const actionName = eventType === 'subscription.charged' ? 'monthly_quota_refill' : 'subscription_activated';
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: monthlyQuota,
        action: actionName,
        created_at: new Date().toISOString(),
      });

      console.log(`[RazorpayWebhook] Monthly quota granted to user ${userId}: ${monthlyQuota} credits for tier ${planTier}. Next refill: ${periodEnd.toISOString()}`);
    } else if (
      eventType === 'subscription.cancelled' ||
      eventType === 'subscription.paused'
    ) {
      const subEntity = event.payload?.subscription?.entity;
      const userId = subEntity?.notes?.userId;
      if (userId) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            plan_tier: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        // Reset to Free starter daily allowance (20)
        await supabase
          .from('credits')
          .update({
            daily_allowance: 20,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[RazorpayWebhook] Processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
