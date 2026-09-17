import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { serverEnv } from '@/lib/env';
import { fetchWithYouTubeCache } from './cache';

export interface ResolvedChannel {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  avatarUrl: string;
  uploadsPlaylistId: string;
  subscriberCount: number;
  videoCount: number;
}

/**
 * Resolves a channel handle (@name), custom username, or direct UC... channel ID
 * into canonical channel metadata and uploads playlist ID using YouTube Data API v3.
 */
export async function resolveChannelIdentifier(
  identifier: string,
  identifierType: 'handle' | 'id' | 'custom'
): Promise<ResolvedChannel> {
  const cleanIdentifier = identifier.replace(/^@/, '').trim();
  const cacheKey = `resolve_channel:${identifierType}:${cleanIdentifier.toLowerCase()}`;

  const { data } = await fetchWithYouTubeCache<ResolvedChannel>(
    'search',
    cacheKey,
    async () => {
      const apiKey = serverEnv.youtubeApiKey;
      let url = new URL('https://www.googleapis.com/youtube/v3/channels');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('part', 'snippet,contentDetails,statistics');

      if (identifierType === 'id') {
        url.searchParams.set('id', cleanIdentifier);
      } else if (identifierType === 'handle') {
        url.searchParams.set('forHandle', cleanIdentifier);
      } else {
        url.searchParams.set('forUsername', cleanIdentifier);
      }

      let response = await fetch(url.toString(), { cache: 'no-store' });
      let json = await response.json();

      // If handle or custom username was not found via direct parameter, fallback to search.list
      if (!json.items || json.items.length === 0) {
        const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
        searchUrl.searchParams.set('key', apiKey);
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('q', cleanIdentifier);
        searchUrl.searchParams.set('type', 'channel');
        searchUrl.searchParams.set('maxResults', '1');

        const searchRes = await fetch(searchUrl.toString(), { cache: 'no-store' });
        const searchJson = await searchRes.json();

        if (searchJson.items && searchJson.items.length > 0) {
          const foundChannelId = searchJson.items[0].snippet?.channelId || searchJson.items[0].id?.channelId;
          if (foundChannelId) {
            url = new URL('https://www.googleapis.com/youtube/v3/channels');
            url.searchParams.set('key', apiKey);
            url.searchParams.set('part', 'snippet,contentDetails,statistics');
            url.searchParams.set('id', foundChannelId);
            response = await fetch(url.toString(), { cache: 'no-store' });
            json = await response.json();
          }
        }
      }

      if (!json.items || json.items.length === 0) {
        throw new Error(`Could not find a YouTube channel matching "${identifier}". Please check the spelling or channel link.`);
      }

      const item = json.items[0];
      const channelId = item.id;
      const snippet = item.snippet || {};
      const contentDetails = item.contentDetails || {};
      const stats = item.statistics || {};

      // In YouTube API, the uploads playlist is always the channel ID with 'UU' instead of 'UC'
      const uploadsPlaylistId =
        contentDetails.relatedPlaylists?.uploads ||
        (channelId.startsWith('UC') ? 'UU' + channelId.substring(2) : channelId);

      return {
        channelId: channelId,
        title: snippet.title || cleanIdentifier,
        description: snippet.description || '',
        customUrl: snippet.customUrl || `@${cleanIdentifier}`,
        avatarUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
        uploadsPlaylistId: uploadsPlaylistId,
        subscriberCount: parseInt(stats.subscriberCount || '0', 10),
        videoCount: parseInt(stats.videoCount || '0', 10),
      };
    }
  );

  return data;
}
