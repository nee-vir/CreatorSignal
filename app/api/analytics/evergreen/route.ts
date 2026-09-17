import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import { findEvergreenOpportunities } from '@/lib/analytics/evergreen';
import { generateWithGeminiFallback } from '@/lib/gemini';

import { parseYouTubeInput } from '@/lib/youtube-parser';
import { resolveChannelIdentifier } from '@/lib/youtube/resolve-channel';
import { getVideoDetails } from '@/lib/youtube/cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { channelId } = body;

    if (!channelId || typeof channelId !== 'string' || !channelId.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid YouTube channel link, handle (@creator), or channel ID.' },
        { status: 400 }
      );
    }

    // 1. Deduct 25 credits for evergreen competitor analysis
    const deduction = await deductCredits(
      userId,
      CREDIT_COSTS.OUTLIER_CALCULATION, // 25 credits
      'outlier_calc'
    );

    // 2. Resolve YouTube handle/URL to canonical channel ID
    const rawChannel = channelId.trim();
    const parsed = parseYouTubeInput(rawChannel);

    let resolvedChannelId = rawChannel;
    let displayChannelName = rawChannel;

    if (parsed.type === 'channel') {
      try {
        const channel = await resolveChannelIdentifier(parsed.identifier, parsed.identifierType);
        resolvedChannelId = channel.channelId;
        displayChannelName = channel.title || `@${parsed.identifier}`;
      } catch (err) {
        console.warn('[Evergreen] resolveChannelIdentifier failed:', err);
      }
    } else if (parsed.type === 'video') {
      try {
        const vidDetails = await getVideoDetails([parsed.id]);
        const chId = vidDetails.data.items?.[0]?.snippet?.channelId;
        if (chId) {
          resolvedChannelId = chId;
          displayChannelName = vidDetails.data.items?.[0]?.snippet?.channelTitle || chId;
        }
      } catch (err) {
        console.warn('[Evergreen] getVideoDetails channel extraction failed:', err);
      }
    } else {
      try {
        const channel = await resolveChannelIdentifier(rawChannel.replace(/^@/, ''), 'handle');
        resolvedChannelId = channel.channelId;
        displayChannelName = channel.title || `@${rawChannel}`;
      } catch (err) {
        console.warn('[Evergreen] handle fallback failed:', err);
      }
    }

    // 3. Scan channel for evergreen winners
    const opportunities = await findEvergreenOpportunities(resolvedChannelId);

    // 3. Live Gemini AI Evergreen Remake Synthesis
    let aiSynthesis: any = null;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && opportunities.length > 0) {
      try {
        const topTitles = opportunities
          .slice(0, 3)
          .map((op) => `"${op.title}" (${op.totalViews.toLocaleString()} views, published ${op.daysAgo} days ago)`)
          .join('\n');

        const prompt = `You are a YouTube search & evergreen content strategist.
A creator found these older videos from a competitor that are STILL actively pulling views every single day:
${topTitles}

Analyze why these topics have perennial demand and provide structured JSON with:
1. "coreSearchIntent": 1-2 sentences on what fundamental problem or curiosity viewers are continuously searching for.
2. "modernizationPlaybook": 2 sentences on how a creator can remake and modernize this topic for 2026 to steal search traffic.
3. "recommendedTitleHook": 1 punchy modernized title formula.

Return raw JSON only.`;

        const rawText = await generateWithGeminiFallback({
          prompt,
          responseJson: true,
          temperature: 0.4,
          maxOutputTokens: 1500,
        });

        aiSynthesis = JSON.parse(rawText);
      } catch (err) {
        console.warn('[EvergreenAI] Gemini fallback cascade exhausted:', err);
      }
    }

    if (!aiSynthesis && opportunities.length > 0) {
      aiSynthesis = {
        coreSearchIntent: `Viewers are searching for durable, fundamental solutions that do not change over time, resulting in consistent year-round traffic.`,
        modernizationPlaybook: `Produce an updated 2026 version with sharper pacing, cleaner 4K visuals, and modern workflows to instantly outrank these aging uploads.`,
        recommendedTitleHook: `The Complete 2026 Guide to ${opportunities[0].title.slice(0, 30)} (Step-by-Step)`,
      };
    }

    return NextResponse.json({
      success: true,
      remainingCredits: deduction.remainingBalance,
      channelId,
      count: opportunities.length,
      opportunities,
      aiSynthesis,
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
      { error: error.message || 'Failed to scan channel for evergreen opportunities.' },
      { status: 500 }
    );
  }
}
