import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import { serverEnv } from '@/lib/env';
import { generateWithGeminiFallback } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export interface AngleHook {
  type: 'Contrarian' | 'Resource' | 'Mistake';
  title: string;
  trigger: string;
  openingScript: string;
}

/**
 * Fallback AI angle generator when external LLM API keys are not yet configured in local dev.
 */
function generateFallbackAngles(originalTitle: string): AngleHook[] {
  const cleanTitle = originalTitle.replace(/[^\w\s-]/gi, '').trim();

  return [
    {
      type: 'Contrarian',
      title: `Why Everything You Know About "${cleanTitle}" Is Completely Wrong`,
      trigger: 'Curiosity Gap & Belief Disruption',
      openingScript: `Stop doing what every other creator tells you about "${cleanTitle}". In the next 8 minutes, I will show you why the conventional advice is quietly hurting your results—and what actually works in 2026.`,
    },
    {
      type: 'Resource',
      title: `The Only "${cleanTitle}" Checklist You Need (Step-by-Step Blueprint)`,
      trigger: 'High Perceived Utility & Actionability',
      openingScript: `I spent over 50 hours testing every framework for "${cleanTitle}" so you don't have to. Here is the exact 5-step blueprint you can copy right now.`,
    },
    {
      type: 'Mistake',
      title: `3 Costly "${cleanTitle}" Mistakes That Are Wasting Your Time`,
      trigger: 'Loss Aversion & Pain Relief',
      openingScript: `If you are trying to succeed with "${cleanTitle}", you are almost certainly making this #1 critical mistake without even realizing it. Here is how to fix it immediately.`,
    },
  ];
}

import { parseYouTubeInput } from '@/lib/youtube-parser';
import { getVideoDetails } from '@/lib/youtube/cache';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { videoTitle } = body;

    if (!videoTitle || typeof videoTitle !== 'string' || !videoTitle.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid YouTube video title or link to analyze.' },
        { status: 400 }
      );
    }

    // Resolve URL to real title if user pasted a YouTube video link
    let resolvedTitle = videoTitle.trim();
    const parsedInput = parseYouTubeInput(resolvedTitle);
    if (parsedInput.type === 'video') {
      try {
        const vidDetails = await getVideoDetails([parsedInput.id]);
        const fetchedTitle = vidDetails.data.items?.[0]?.snippet?.title;
        if (fetchedTitle) {
          resolvedTitle = fetchedTitle;
        }
      } catch (err) {
        console.warn('[AnglePivot] Could not fetch video title from URL:', err);
      }
    }

    // 1. Deduct 10 credits using the existing deduction utility
    const deduction = await deductCredits(
      userId,
      CREDIT_COSTS.ANGLE_PIVOT,
      'angle_pivot'
    );

    let angles: AngleHook[] = [];
    const apiKey = serverEnv.geminiApiKey;

    // 2. Call Google Gemini API if key is available
    if (apiKey) {
      try {
        const prompt = `You are an elite YouTube strategist. Analyze this successful competitor YouTube video title: "${resolvedTitle}".
Generate exactly 3 unique psychological video hooks/angles for a creator to remake this topic from a fresh, non-copycat perspective.
You must provide exactly these 3 angles:
1. "Contrarian" (Challenges common assumptions or conventional wisdom)
2. "Resource" (Presents a definitive system, checklist, or template)
3. "Mistake" (Warns of painful pitfalls or errors to avoid)

Format strictly as a valid JSON array of 3 objects with these exact keys:
[
  {
    "type": "Contrarian",
    "title": "Engaging title here",
    "trigger": "Psychological trigger explanation",
    "openingScript": "Word-for-word first 30 seconds hook script"
  },
  {
    "type": "Resource",
    "title": "Engaging title here",
    "trigger": "Psychological trigger explanation",
    "openingScript": "Word-for-word first 30 seconds hook script"
  },
  {
    "type": "Mistake",
    "title": "Engaging title here",
    "trigger": "Psychological trigger explanation",
    "openingScript": "Word-for-word first 30 seconds hook script"
  }
]
Do not wrap in markdown quotes or extra commentary, return ONLY the raw JSON array.`;

        const rawText = await generateWithGeminiFallback({
          prompt,
          responseJson: true,
          temperature: 0.5,
          maxOutputTokens: 2000,
        });

        try {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            angles = parsed;
          } else if (Array.isArray(parsed.angles)) {
            angles = parsed.angles;
          } else if (Array.isArray(parsed.hooks)) {
            angles = parsed.hooks;
          } else if (Array.isArray(parsed.data)) {
            angles = parsed.data;
          }
        } catch (parseErr) {
          console.warn('[AnglePivot] JSON parse warning on Gemini output:', parseErr);
        }
      } catch (aiErr) {
        console.warn('[AnglePivot] Gemini fallback cascade exhausted, using intelligent fallback:', aiErr);
      }
    }

    // Fallback if no API key or AI parsing failed
    if (angles.length === 0) {
      angles = generateFallbackAngles(resolvedTitle);
    }

    return NextResponse.json({
      success: true,
      remainingCredits: deduction.remainingBalance,
      originalTitle: resolvedTitle,
      angles,
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
        { status: 402 } // Payment Required
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate psychological angles.' },
      { status: 500 }
    );
  }
}
