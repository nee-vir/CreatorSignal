import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Authenticated API Fetch Helper
 * 
 * Automatically attaches the logged-in user's Supabase access token
 * (`Authorization: Bearer <token>`) to every outgoing API call.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  // Ensure JSON content type by default for requests with bodies
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Retrieve active session token from Supabase client in browser
  if (typeof window !== 'undefined') {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        headers.set('Authorization', `Bearer ${session.access_token}`);
      } else {
        // Check localStorage as fallback
        const localKey = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (localKey) {
          try {
            const raw = localStorage.getItem(localKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              const token = parsed?.access_token || parsed?.[0];
              if (token) headers.set('Authorization', `Bearer ${token}`);
            }
          } catch {
            // Ignore parse error
          }
        }

        // Check stored user ID as dev fallback
        const storedUserId = localStorage.getItem('creator_signal_user_id');
        if (storedUserId && !headers.has('x-user-id')) {
          headers.set('x-user-id', storedUserId);
        }
      }
    } catch (e) {
      console.warn('[apiFetch] Could not retrieve session token:', e);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
