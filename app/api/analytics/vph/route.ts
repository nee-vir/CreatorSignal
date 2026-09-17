import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { deductCredits, CREDIT_COSTS, InsufficientCreditsError } from '@/lib/credits/deduct';
import {
  addVideoToMonitoring,
  refreshVideoVph,
  getUserMonitoredVideos,
} from '@/lib/analytics/vph';

export const dynamic = 'force-dynamic';

// GET: List all monitored videos for current user
export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const videos = await getUserMonitoredVideos(userId);
    return NextResponse.json({ videos });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve monitored videos.' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}

// POST: Add video to 48-hour monitoring (costs 50 credits)
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

    // 1. Deduct 50 credits
    const deduction = await deductCredits(
      userId,
      CREDIT_COSTS.VPH_TRACKING,
      'vph_track'
    );

    // 2. Add video to database
    const record = await addVideoToMonitoring(userId, videoUrl);

    return NextResponse.json({
      success: true,
      remainingCredits: deduction.remainingBalance,
      data: record,
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
      { error: error.message || 'Failed to start video monitoring.' },
      { status: 500 }
    );
  }
}

// PATCH: Refresh VPH momentum for a monitored video
export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = await request.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 });
    }

    const updated = await refreshVideoVph(userId, recordId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to refresh video VPH.' },
      { status: 500 }
    );
  }
}
