import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getVideoDetails } from '@/lib/youtube/cache';
import { extractVideoId } from './outlier';

export interface MonitoredVideoRecord {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  initial_view_count: number;
  initial_timestamp: string;
  latest_view_count: number;
  latest_timestamp: string;
  current_vph: number;
  created_at: string;
}

/**
 * Calculates Views Per Hour (VPH) based on view counts and timestamps.
 */
export function calculateVph(
  initialViews: number,
  latestViews: number,
  initialTimestamp: Date | string,
  latestTimestamp: Date | string
): number {
  const start = new Date(initialTimestamp).getTime();
  const end = new Date(latestTimestamp).getTime();
  const elapsedMs = Math.max(end - start, 1000); // Minimum 1 second to avoid divide by zero
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const viewDiff = Math.max(latestViews - initialViews, 0);
  const vph = viewDiff / elapsedHours;

  return parseFloat(vph.toFixed(2));
}

/**
 * Adds a new video to a user's monitored videos list.
 */
export async function addVideoToMonitoring(
  userId: string,
  videoInput: string
): Promise<MonitoredVideoRecord> {
  const videoId = extractVideoId(videoInput);
  if (!videoId) {
    throw new Error('Invalid YouTube video link or ID.');
  }

  const supabase = createAdminSupabaseClient();

  // Check if video is already monitored by this user
  const { data: existing } = await supabase
    .from('monitored_videos')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', videoId)
    .maybeSingle();

  if (existing) {
    return existing as MonitoredVideoRecord;
  }

  // Fetch current live video stats
  const detailsRes = await getVideoDetails([videoId]);
  const item = detailsRes.data.items?.[0];

  if (!item) {
    throw new Error('YouTube video could not be found.');
  }

  const views = parseInt(item.statistics?.viewCount || '0', 10);
  const title = item.snippet.title;
  const thumbnailUrl =
    item.snippet.thumbnails.maxres?.url ||
    item.snippet.thumbnails.high?.url ||
    item.snippet.thumbnails.medium?.url ||
    null;
  const nowIso = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from('monitored_videos')
    .insert({
      user_id: userId,
      video_id: videoId,
      title: title,
      thumbnail_url: thumbnailUrl,
      initial_view_count: views,
      initial_timestamp: nowIso,
      latest_view_count: views,
      latest_timestamp: nowIso,
      current_vph: 0.0,
      created_at: nowIso,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    throw new Error(`Failed to monitor video: ${error?.message}`);
  }

  return inserted as MonitoredVideoRecord;
}

/**
 * Refreshes VPH momentum for a user's monitored video by querying YouTube stats.
 */
export async function refreshVideoVph(
  userId: string,
  recordId: string
): Promise<MonitoredVideoRecord> {
  const supabase = createAdminSupabaseClient();

  const { data: record, error } = await supabase
    .from('monitored_videos')
    .select('*')
    .eq('id', recordId)
    .eq('user_id', userId)
    .single();

  if (error || !record) {
    throw new Error('Monitored video record not found.');
  }

  // Fetch fresh stats from YouTube
  const detailsRes = await getVideoDetails([record.video_id]);
  const item = detailsRes.data.items?.[0];

  if (!item) {
    return record as MonitoredVideoRecord;
  }

  const freshViews = parseInt(item.statistics?.viewCount || '0', 10);
  const nowIso = new Date().toISOString();
  const updatedVph = calculateVph(
    record.initial_view_count,
    freshViews,
    record.initial_timestamp,
    nowIso
  );

  const { data: updated, error: updateErr } = await supabase
    .from('monitored_videos')
    .update({
      latest_view_count: freshViews,
      latest_timestamp: nowIso,
      current_vph: updatedVph,
    })
    .eq('id', recordId)
    .select('*')
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to update VPH: ${updateErr?.message}`);
  }

  return updated as MonitoredVideoRecord;
}

/**
 * Returns all monitored videos for a user.
 */
export async function getUserMonitoredVideos(userId: string): Promise<MonitoredVideoRecord[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('monitored_videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch monitored videos: ${error.message}`);
  }

  return (data || []) as MonitoredVideoRecord[];
}
