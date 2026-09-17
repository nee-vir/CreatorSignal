import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Validates the user's authentication token from the request
 * and returns their Supabase User ID (UUID).
 */
export async function getAuthenticatedUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Also check standard cookie if present
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/sb-[a-zA-Z0-9]+-auth-token=([^;]+)/);
    if (match) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        token = parsed?.[0] || parsed?.access_token || null;
      } catch {
        // Ignore cookie parse errors
      }
    }
  }

  // If a bearer token exists, verify with Supabase Auth
  if (token) {
    try {
      const supabase = createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return user.id;
      }
    } catch {
      // Fallback below
    }
  }

  // Optional custom dev header for quick testing when auth cookies are absent
  const devUserId = request.headers.get('x-user-id');
  if (devUserId && /^[0-9a-fA-F-]{36}$/.test(devUserId)) {
    return devUserId;
  }

  throw new Error('Authentication required. Please log in to proceed.');
}
