import { getChannelUploads, getVideoDetails } from '@/lib/youtube/cache';

export interface EvergreenVideoOpportunity {
  videoId: string;
  title: string;
  publishedAt: string;
  daysAgo: number;
  totalViews: number;
  estimatedVph: number;
  thumbnailUrl: string;
  opportunityScore: string; // High, Very High, Exceptional
  recommendation: string;
}

/**
 * Evergreen Competitor Gap Engine
 * 
 * 1. Queries a target channel's catalog.
 * 2. Filters for videos published > 180 days ago.
 * 3. Checks view velocity to find older videos sustaining > 20 views/hour.
 * 4. Highlights these as evergreen topics primed for a modernized video remake.
 */
export async function findEvergreenOpportunities(
  channelId: string,
  minVphThreshold = 20
): Promise<EvergreenVideoOpportunity[]> {
  // 1. Fetch channel's uploads (up to 50 videos)
  const uploadsRes = await getChannelUploads(channelId, 50);
  const items = uploadsRes.data.items || [];

  const now = new Date();
  const ONE_EIGHTY_DAYS_MS = 180 * 24 * 60 * 60 * 1000;

  // 2. Identify candidates published > 180 days ago
  const olderCandidates: Array<{
    videoId: string;
    publishedAt: string;
    daysAgo: number;
  }> = [];

  for (const item of items) {
    const videoId = typeof item.id === 'string' ? item.id : item.id.videoId;
    if (!videoId) continue;

    const publishedDate = new Date(item.snippet.publishedAt);
    const ageMs = now.getTime() - publishedDate.getTime();

    if (ageMs >= ONE_EIGHTY_DAYS_MS) {
      olderCandidates.push({
        videoId,
        publishedAt: item.snippet.publishedAt,
        daysAgo: Math.floor(ageMs / (1000 * 60 * 60 * 24)),
      });
    }
  }

  if (olderCandidates.length === 0) {
    return [];
  }

  // 3. Query stats for older candidates
  const videoIds = olderCandidates.map((c) => c.videoId);
  const statsRes = await getVideoDetails(videoIds);
  const statsMap = new Map(
    (statsRes.data.items || []).map((item) => [item.id as string, item])
  );

  const opportunities: EvergreenVideoOpportunity[] = [];

  for (const candidate of olderCandidates) {
    const detail = statsMap.get(candidate.videoId);
    if (!detail) continue;

    const totalViews = parseInt(detail.statistics?.viewCount || '0', 10);
    const totalHours = candidate.daysAgo * 24;
    
    // Sustained velocity = totalViews / totalHours
    const sustainedVph = parseFloat((totalViews / Math.max(totalHours, 1)).toFixed(2));

    if (sustainedVph >= minVphThreshold) {
      let score = 'High';
      if (sustainedVph >= 100) score = 'Exceptional';
      else if (sustainedVph >= 50) score = 'Very High';

      const thumb =
        detail.snippet.thumbnails.maxres?.url ||
        detail.snippet.thumbnails.high?.url ||
        detail.snippet.thumbnails.medium?.url ||
        detail.snippet.thumbnails.default?.url ||
        '';

      opportunities.push({
        videoId: candidate.videoId,
        title: detail.snippet.title,
        publishedAt: candidate.publishedAt,
        daysAgo: candidate.daysAgo,
        totalViews,
        estimatedVph: sustainedVph,
        thumbnailUrl: thumb,
        opportunityScore: score,
        recommendation: `Published ${candidate.daysAgo} days ago and still drawing ~${sustainedVph} views/hr. Remake this topic with updated modern tools, cleaner visuals, and a 2026 perspective to capture this search traffic.`,
      });
    }
  }

  // Sort opportunities by highest velocity
  return opportunities.sort((a, b) => b.estimatedVph - a.estimatedVph);
}
