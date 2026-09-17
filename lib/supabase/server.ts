import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Server-Side Administrative Supabase Client (Service Role)
 * 
 * NEVER expose this to the browser!
 * Used exclusively inside Next.js server route handlers for:
 * 1. Managing and reading the YouTube API cache
 * 2. Deducting and adding user credits securely
 * 3. Processing Razorpay payment webhooks
 */
export const createAdminSupabaseClient = () => {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
