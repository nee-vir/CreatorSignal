/**
 * Environment Variables Validator & Accessor
 * 
 * Provides type-safe access to server and client environment variables
 * with clear, friendly error messages if any required keys are missing.
 */

export const serverEnv = {
  // Application URL
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  },

  // Supabase Credentials
  get supabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL in .env.local. Please copy from your Supabase Dashboard.'
      );
    }
    return url;
  },

  get supabaseAnonKey(): string {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. Please copy from your Supabase Dashboard.'
      );
    }
    return key;
  },

  get supabaseServiceRoleKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. This is needed for server operations and credit updates.'
      );
    }
    return key;
  },

  // YouTube Data API v3 Key
  get youtubeApiKey(): string {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      throw new Error(
        'Missing YOUTUBE_API_KEY in .env.local. Please generate one in Google Cloud Console with YouTube Data API v3 enabled.'
      );
    }
    return key;
  },

  // Razorpay Credentials
  get razorpayKeyId(): string {
    const id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!id) {
      throw new Error(
        'Missing NEXT_PUBLIC_RAZORPAY_KEY_ID in .env.local. Please copy your Test Key ID from Razorpay Dashboard.'
      );
    }
    return id;
  },

  get razorpayKeySecret(): string {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error(
        'Missing RAZORPAY_KEY_SECRET in .env.local. Please copy your Key Secret from Razorpay Dashboard.'
      );
    }
    return secret;
  },

  get razorpayWebhookSecret(): string {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error(
        'Missing RAZORPAY_WEBHOOK_SECRET in .env.local. This is needed to cryptographically verify payment notifications.'
      );
    }
    return secret;
  },

  // ₹199/month Creator Plan (50 daily credits)
  get razorpayPlanIdCreator(): string {
    return (
      process.env.RAZORPAY_PLAN_ID_CREATOR ||
      process.env.RAZORPAY_PLAN_ID ||
      'plan_creator_199_default'
    );
  },

  // ₹299/month Pro Plan (100 daily credits + CSV Export)
  get razorpayPlanIdPro(): string {
    return (
      process.env.RAZORPAY_PLAN_ID_PRO ||
      'plan_pro_299_default'
    );
  },

  // Legacy single plan fallback
  get razorpayPlanId(): string {
    return this.razorpayPlanIdCreator;
  },

  // AI API Key (Gemini or Claude)
  get geminiApiKey(): string | null {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null;
  },
};
