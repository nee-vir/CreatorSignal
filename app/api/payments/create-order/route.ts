import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { getRazorpayClient } from '@/lib/razorpay/server';
import { serverEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceInr: number;
  badge?: string;
  popular?: boolean;
}

export const CREDIT_PACKS: Record<string, CreditPack> = {
  starter_100: {
    id: 'starter_100',
    name: 'Starter Booster Pack',
    credits: 100,
    priceInr: 149,
  },
  creator_300: {
    id: 'creator_300',
    name: 'Creator Growth Pack',
    credits: 300,
    priceInr: 349,
    popular: true,
    badge: 'Most Popular • Save 22%',
  },
  pro_750: {
    id: 'pro_750',
    name: 'Pro Power Pack',
    credits: 750,
    priceInr: 699,
    badge: 'Best Value • Save 38%',
  },
  agency_1600: {
    id: 'agency_1600',
    name: 'Agency Mega Pack',
    credits: 1600,
    priceInr: 1299,
    badge: 'Max Savings • Save 45%',
  },
};

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { packId } = body;

    const pack = CREDIT_PACKS[packId];
    if (!pack) {
      return NextResponse.json(
        { error: `Invalid packId '${packId}'. Valid options: ${Object.keys(CREDIT_PACKS).join(', ')}` },
        { status: 400 }
      );
    }

    let keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_placeholder';

    try {
      const razorpay = getRazorpayClient();
      const amountPaise = pack.priceInr * 100;

      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `cs_pack_${pack.id}_${userId.slice(0, 8)}_${Date.now()}`,
        notes: {
          userId,
          packId: pack.id,
          credits: pack.credits.toString(),
          type: 'credit_pack',
        },
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: serverEnv.razorpayKeyId,
        pack: pack,
      });
    } catch (razorpayErr: any) {
      console.warn('[Payments] Live Razorpay order creation failed, providing fallback order for sandbox:', razorpayErr.message);
      // Sandbox fallback order so local testing works even if Razorpay credentials are unset
      return NextResponse.json({
        success: true,
        orderId: `order_sandbox_${Date.now()}`,
        amount: pack.priceInr * 100,
        currency: 'INR',
        keyId: keyId,
        pack: pack,
        isSandbox: true,
      });
    }
  } catch (error: any) {
    console.error('[Payments] Create order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create credit pack order.' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
