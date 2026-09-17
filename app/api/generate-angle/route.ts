import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import { serverEnv } from '@/lib/env';

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

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { videoTitle } = body;

    if (!videoTitle || typeof videoTitle !== 'string' || !videoTitle.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid YouTube video title to analyze.' },
        { status: 400 }
      );
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
        const prompt = `You are an elite YouTube strategist. Analyze this successful competitor YouTube video title: "${videoTitle.trim()}".
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

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            angles = JSON.parse(rawText);
          }
        }
      } catch (aiErr) {
        console.warn('[AnglePivot] Gemini API call failed, using intelligent fallback:', aiErr);
      }
    }

    // Fallback if no API key or AI parsing failed
    if (angles.length === 0) {
      angles = generateFallbackAngles(videoTitle.trim());
    }

    return NextResponse.json({
      success: true,
      remainingCredits: deduction.remainingBalance,
      originalTitle: videoTitle.trim(),
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
