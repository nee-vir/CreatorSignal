import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import { searchYouTubeVideos, getVideoDetails } from '@/lib/youtube/cache';
import { generateWithGeminiFallback } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export interface SerpCompetitorVideo {
  rank: number;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { keyword } = body;

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a search keyword.' },
        { status: 400 }
      );
    }

    // 1. Deduct 15 credits for SERP simulation
    const deduction = await deductCredits(
      userId,
      CREDIT_COSTS.SERP_INJECTOR,
      'serp_inject'
    );

    // 2. Fetch top 5 ranking search results from YouTube (Cache-First)
    const searchRes = await searchYouTubeVideos(keyword.trim(), 5);
    const items = searchRes.data.items || [];

    const videoIds: string[] = [];
    items.forEach((item) => {
      const id = typeof item.id === 'string' ? item.id : item.id.videoId;
      if (id) videoIds.push(id);
    });

    // 3. Fetch view counts for the top 5 videos
    let statsMap = new Map<string, number>();
    if (videoIds.length > 0) {
      const statsRes = await getVideoDetails(videoIds);
      (statsRes.data.items || []).forEach((v) => {
        statsMap.set(v.id as string, parseInt(v.statistics?.viewCount || '0', 10));
      });
    }

    const competitors: SerpCompetitorVideo[] = items.map((item, index) => {
      const vid = typeof item.id === 'string' ? item.id : item.id.videoId || '';
      return {
        rank: index + 1,
        videoId: vid,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl:
          item.snippet.thumbnails.maxres?.url ||
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          '',
        publishedAt: item.snippet.publishedAt,
        viewCount: statsMap.get(vid) || 0,
      };
    });

    // 4. Live Gemini AI SERP Competitive Landscape Analysis
    let aiLandscape: any = null;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && competitors.length > 0) {
      try {
        const compList = competitors
          .map((c) => `#${c.rank}: "${c.title}" by ${c.channelTitle} (${c.viewCount.toLocaleString()} views)`)
          .join('\n');

        const prompt = `You are an elite YouTube CTR & visual packaging strategist.
A creator wants to rank for keyword "${keyword.trim()}". Here are the top ranking competitors:
${compList}

Analyze the competitive landscape and provide structured JSON with:
1. "visualLandscape": 2 sentences describing the dominant thumbnail/title themes in this search feed.
2. "contrastOpportunity": 2 sentences on how a creator can visually or conceptually stand out from these existing results.
3. "unmetNeed": 1 sentence describing what searchers for "${keyword.trim()}" are looking for that these top results might not be delivering.

Return raw JSON only.`;

        const rawText = await generateWithGeminiFallback({
          prompt,
          responseJson: true,
          temperature: 0.4,
          maxOutputTokens: 1500,
        });

        aiLandscape = JSON.parse(rawText);
      } catch (err) {
        console.warn('[SerpAI] Gemini fallback cascade exhausted:', err);
      }
    }

    if (!aiLandscape && competitors.length > 0) {
      aiLandscape = {
        visualLandscape: `The search results for "${keyword.trim()}" are dominated by tutorial style framings with high-contrast text and centered subject matter.`,
        contrastOpportunity: `Use an inverted color palette (e.g. minimalist dark theme with bright neon accents) to create visual tension against the busy competitor thumbnails.`,
        unmetNeed: `Viewers searching for "${keyword.trim()}" want immediate, zero-fluff answers without lengthy intro fluff.`,
      };
    }

    return NextResponse.json({
      success: true,
      remainingCredits: deduction.remainingBalance,
      keyword: keyword.trim(),
      cached: searchRes.cached,
      competitors,
      aiLandscape,
    });
  } catch (error: any) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: error.currentBalance,
          requiredCredits: error.requiredCredits,
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch SERP competitors.' },
      { status: 500 }
    );
  }
}
