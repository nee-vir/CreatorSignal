import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { getRazorpayClient } from '@/lib/razorpay/server';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json().catch(() => ({}));
    const planTier = body.planTier === 'pro_299' ? 'pro_299' : 'creator_199';

    const razorpay = getRazorpayClient();

    // Select Razorpay Plan ID and amount based on chosen tier
    const isPro = planTier === 'pro_299';
    const selectedPlanId = isPro
      ? serverEnv.razorpayPlanIdPro
      : serverEnv.razorpayPlanIdCreator;

    const amountInPaise = isPro ? 29900 : 19900; // ₹299 or ₹199
    const planName = isPro
      ? 'Creator Pro (100 Daily Credits + CSV Export)'
      : 'Creator Tier (50 Daily Credits)';

    // Create 12-month recurring subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: selectedPlanId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: userId,
        planTier: planTier,
        appName: 'Creator Signal',
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      keyId: serverEnv.razorpayKeyId,
      amount: amountInPaise,
      currency: 'INR',
      planTier: planTier,
      planName: planName,
    });
  } catch (error: any) {
    console.error('[RazorpayCreateSubscription] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize subscription checkout.' },
      { status: 500 }
    );
  }
}
