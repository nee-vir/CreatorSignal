import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import { calculateOutlierMultiplier } from '@/lib/analytics/outlier';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl || typeof videoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a valid YouTube video URL or ID.' },
        { status: 400 }
      );
    }

    // 1. Deduct 25 credits
    const deduction = await deductCredits(
      userId,
      CREDIT_COSTS.OUTLIER_CALCULATION,
      'outlier_calc'
    );

    // 2. Execute Outlier calculation
    const result = await calculateOutlierMultiplier(videoUrl);

    // 3. Automated AI Outlier Deconstruction
    let aiAnalysis: any = null;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const prompt = `You are a YouTube viral topic and packaging analyst.
Analyze this video outlier performance:
Title: "${result.videoTitle}"
Channel: "${result.channelTitle}"
Target Views: ${result.targetViews.toLocaleString()}
Channel Typical Median Views: ${result.channelMedianViews.toLocaleString()}
Multiplier: ${result.outlierMultiplier}x (${result.isOutlier ? 'Confirmed Viral Outlier' : 'Standard Baseline'})

Provide a structured AI analysis in raw JSON format with the following keys:
1. "verdict": Short punchy summary (e.g., "Explosive Search Magnet", "Breakout Packaging", or "Steady Baseline").
2. "whyItWorked": 2 concise sentences explaining why this topic broke through the channel's usual viewership.
3. "audienceAppeal": 1 sentence identifying which broad audience this captured.
4. "actionableAngle": 1 concrete title or angle other creators can use to cover this trend safely.

Return raw JSON only.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
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
          const gData = await geminiRes.json();
          const raw = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) aiAnalysis = JSON.parse(raw);
        }
      } catch (err) {
        console.warn('[OutlierEngineAI] Error calling Gemini:', err);
      }
    }

    if (!aiAnalysis) {
      aiAnalysis = {
        verdict: result.isOutlier ? 'High-Demand Viral Outlier' : 'Channel Standard Performance',
        whyItWorked: result.isOutlier
          ? `This video tapped into broad viewer curiosity that far exceeded the channel's standard subscriber base, delivering ${result.outlierMultiplier}x baseline views.`
          : `This video stayed within the channel's core audience baseline without triggering external algorithm recommendation spikes.`,
        audienceAppeal: result.isOutlier ? 'Broad discovery audience interested in high-stakes resolution.' : 'Core subscribed audience.',
        actionableAngle: `The Truth About ${result.videoTitle.slice(0, 35)}: What Nobody Tells You`,
      };
    }

    return NextResponse.json({
      success: true,
      remainingCredits: deduction.remainingBalance,
      data: {
        ...result,
        aiAnalysis,
      },
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
      { error: error.message || 'An error occurred during Outlier calculation.' },
      { status: 500 }
    );
  }
}
