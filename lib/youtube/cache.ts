import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import {
  YouTubeSearchResponse,
  YouTubeVideoListResponse,
  YouTubeChannelListResponse,
} from './types';

export type YouTubeQueryType = 'search' | 'video_stats' | 'channel_uploads';

const CACHE_DURATION_HOURS = 6;

/**
 * Quota-Shielding Cache Wrapper
 * 
 * 1. Checks Supabase `cached_youtube_api` for unexpired records.
 * 2. If valid cached data exists, returns it immediately (saving quota).
 * 3. If cache miss, executes the live fetcherFn against YouTube Data API v3.
 * 4. Saves fresh payload to Supabase with a 6-hour expiration timestamp.
 */
export async function fetchWithYouTubeCache<T>(
  queryType: YouTubeQueryType,
  queryKey: string,
  fetcherFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const supabase = createAdminSupabaseClient();
  const normalizedKey = queryKey.trim().toLowerCase();

  try {
    // 1. Search database cache for matching query created within last 6 hours
    const { data: cachedRecord, error: cacheError } = await supabase
      .from('cached_youtube_api')
      .select('response_payload, expires_at')
      .eq('query_type', queryType)
      .eq('query_key', normalizedKey)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cacheError && cachedRecord?.response_payload) {
      return {
        data: cachedRecord.response_payload as T,
        cached: true,
      };
    }
  } catch (err) {
    // Log cache read error but continue to live API so app doesn't break if DB is momentarily unreachable
    console.warn('[YouTubeCache] Cache check failed, proceeding to live API:', err);
  }

  // 2. Fetch live data from official YouTube Data API v3
  const freshData = await fetcherFn();

  // 3. Write fresh response to database with 6-hour expiration
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    await supabase.from('cached_youtube_api').insert({
      query_type: queryType,
      query_key: normalizedKey,
      response_payload: freshData,
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.warn('[YouTubeCache] Failed to write cache record:', err);
  }

  return {
    data: freshData,
    cached: false,
  };
}

/**
 * Helper to execute an official YouTube Data API v3 HTTP request
 * with comprehensive error decoding for quota, auth, and network errors.
 */
async function callYouTubeApi<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = serverEnv.youtubeApiKey;
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  
  url.searchParams.set('key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    // Next.js fetch caching disabled here because we manage granular DB caching in Supabase
    cache: 'no-store',
  });

  if (!response.ok) {
    let errorDetails = '';
    try {
      const errorJson = await response.json();
      const firstError = errorJson.error?.errors?.[0];
      const reason = firstError?.reason || '';
      const message = errorJson.error?.message || response.statusText;

      if (reason === 'quotaExceeded' || response.status === 403) {
        errorDetails = `YouTube API daily quota (10,000 units) exceeded or key restricted: ${message}`;
      } else if (reason === 'keyInvalid' || response.status === 400) {
        errorDetails = `Invalid Google YouTube API Key: ${message}`;
      } else {
        errorDetails = `YouTube API Error (${response.status}): ${message}`;
      }
    } catch {
      errorDetails = `YouTube API HTTP request failed with status ${response.status} ${response.statusText}`;
    }

    throw new Error(errorDetails);
  }

  return (await response.json()) as T;
}

/**
 * 1. Search YouTube for videos by keyword
 */
export async function searchYouTubeVideos(
  keyword: string,
  maxResults = 10
): Promise<{ data: YouTubeSearchResponse; cached: boolean }> {
  return fetchWithYouTubeCache<YouTubeSearchResponse>(
    'search',
    `search:${keyword}:${maxResults}`,
    async () => {
      return callYouTubeApi<YouTubeSearchResponse>('search', {
        part: 'snippet',
        q: keyword,
        type: 'video',
        maxResults: maxResults.toString(),
      });
    }
  );
}

/**
 * 2. Get statistics (viewCount, likeCount, etc.) and snippets for specific videos
 */
export async function getVideoDetails(
  videoIds: string[]
): Promise<{ data: YouTubeVideoListResponse; cached: boolean }> {
  const joinedIds = videoIds.join(',');
  return fetchWithYouTubeCache<YouTubeVideoListResponse>(
    'video_stats',
    `videos:${joinedIds}`,
    async () => {
      return callYouTubeApi<YouTubeVideoListResponse>('videos', {
        part: 'snippet,statistics',
        id: joinedIds,
      });
    }
  );
}

/**
 * 3. Get a channel's recent uploads playlist ID and videos
 */
export async function getChannelUploads(
  channelId: string,
  limit = 10
): Promise<{ data: YouTubeSearchResponse; cached: boolean }> {
  return fetchWithYouTubeCache<YouTubeSearchResponse>(
    'channel_uploads',
    `uploads:${channelId}:${limit}`,
    async () => {
      return callYouTubeApi<YouTubeSearchResponse>('search', {
        part: 'snippet',
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: limit.toString(),
      });
    }
  );
}
