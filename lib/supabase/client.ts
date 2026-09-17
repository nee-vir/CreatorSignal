import { createClient } from '@supabase/supabase-js';

/**
 * Client-Safe Supabase Instance
 * Used in browser-rendered React components.
 * Strictly uses NEXT_PUBLIC_ keys and enforces Row Level Security.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const createBrowserSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};
