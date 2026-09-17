import crypto from 'crypto';
import Razorpay from 'razorpay';
import { serverEnv } from '@/lib/env';

let razorpayInstance: Razorpay | null = null;

/**
 * Returns a singleton instance of the official Razorpay Node SDK.
 */
export function getRazorpayClient(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: serverEnv.razorpayKeyId,
      key_secret: serverEnv.razorpayKeySecret,
    });
  }
  return razorpayInstance;
}

/**
 * Cryptographically verifies Razorpay Webhook Signatures using HMAC SHA-256.
 * 
 * Never trust client-side confirmations! Razorpay signs the exact payload with
 * your shared RAZORPAY_WEBHOOK_SECRET so we can mathematically guarantee it
 * has not been tampered with.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe equality check to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    );
  } catch (err) {
    console.error('[RazorpaySecurity] Signature verification error:', err);
    return false;
  }
}
