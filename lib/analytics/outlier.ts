import { getVideoDetails, getChannelUploads } from '@/lib/youtube/cache';

export interface OutlierResult {
  videoId: string;
  videoTitle: string;
  channelId: string;
  channelTitle: string;
  targetViews: number;
  channelMedianViews: number;
  outlierMultiplier: number;
  isOutlier: boolean; // True if multiplier >= 5x
  recentUploadCount: number;
  recentViewsSample: number[];
}

/**
 * Extracts a YouTube Video ID from standard URLs, Shorts, or raw IDs.
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * Computes the statistical numerical median of an array of numbers.
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The Outlier Engine
 * 
 * 1. Retrieves target video's view count and uploading channel ID.
 * 2. Retrieves the uploading channel's last 10 public uploads (excluding the target video).
 * 3. Calculates the numerical median view count across those videos.
 * 4. Formula: Outlier Multiplier = Target Video Views / Channel Median Views.
 * 5. Returns whether multiplier >= 5x for visual badging.
 */
export async function calculateOutlierMultiplier(videoInput: string): Promise<OutlierResult> {
  const videoId = extractVideoId(videoInput);
  if (!videoId) {
    throw new Error('Invalid YouTube video link or ID. Please provide a valid YouTube URL.');
  }

  // 1. Retrieve the target video's statistics
  const targetVideoRes = await getVideoDetails([videoId]);
  const targetItem = targetVideoRes.data.items?.[0];

  if (!targetItem) {
    throw new Error('Target YouTube video not found. It may be private or unlisted.');
  }

  const targetViews = parseInt(targetItem.statistics?.viewCount || '0', 10);
  const channelId = targetItem.snippet.channelId;
  const channelTitle = targetItem.snippet.channelTitle;
  const videoTitle = targetItem.snippet.title;

  // 2. Retrieve the uploading channel's recent uploads (up to 15 to allow excluding target)
  const channelUploadsRes = await getChannelUploads(channelId, 15);
  const uploadItems = channelUploadsRes.data.items || [];

  // Filter out the target video ID and pick the last 10
  const otherVideoIds: string[] = [];
  for (const item of uploadItems) {
    const id = typeof item.id === 'string' ? item.id : item.id.videoId;
    if (id && id !== videoId && otherVideoIds.length < 10) {
      otherVideoIds.push(id);
    }
  }

  let channelMedianViews = 0;
  let recentViewsSample: number[] = [];

  if (otherVideoIds.length > 0) {
    // Fetch view counts for the channel's other recent uploads
    const statsRes = await getVideoDetails(otherVideoIds);
    recentViewsSample = (statsRes.data.items || []).map((v) =>
      parseInt(v.statistics?.viewCount || '0', 10)
    );

    channelMedianViews = calculateMedian(recentViewsSample);
  }

  // Prevent division by zero if channel median is zero
  const effectiveMedian = channelMedianViews > 0 ? channelMedianViews : 1;
  const multiplier = parseFloat((targetViews / effectiveMedian).toFixed(2));
  const isOutlier = multiplier >= 5.0;

  return {
    videoId,
    videoTitle,
    channelId,
    channelTitle,
    targetViews,
    channelMedianViews,
    outlierMultiplier: multiplier,
    isOutlier,
    recentUploadCount: recentViewsSample.length,
    recentViewsSample,
  };
}
