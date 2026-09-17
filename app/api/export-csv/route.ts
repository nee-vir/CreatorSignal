import { getAuthenticatedUserId } from '@/lib/auth/server-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getUserPlanTier } from '@/lib/credits/deduct';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const planTier = await getUserPlanTier(userId);

    // Strict Security Guardrail: Pro Tier (pro_299) Only
    if (planTier !== 'pro_299') {
      return NextResponse.json(
        {
          error: 'Bulk CSV Export is strictly exclusive to Pro plan subscribers (₹299/month). Please upgrade to unlock offline data exports.',
          code: 'PRO_TIER_REQUIRED',
          currentTier: planTier,
        },
        { status: 403 } // 403 Forbidden
      );
    }

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'vph'; // 'vph' or 'cache'
    const supabase = createAdminSupabaseClient();

    let csvContent = '';
    const dateStr = new Date().toISOString().split('T')[0];

    if (exportType === 'vph') {
      // 1. Export Monitored Videos Data
      const { data: videos, error } = await supabase
        .from('monitored_videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const headers = [
        'Video ID',
        'Title',
        'Velocity (Views Per Hour)',
        'Latest Views',
        'Initial Views',
        'Monitoring Started',
        'Last Checked At',
        'YouTube Link',
      ];

      const rows = (videos || []).map((v) => [
        escapeCsvCell(v.video_id),
        escapeCsvCell(v.title),
        escapeCsvCell(v.current_vph),
        escapeCsvCell(v.latest_view_count),
        escapeCsvCell(v.initial_view_count),
        escapeCsvCell(new Date(v.initial_timestamp).toLocaleString()),
        escapeCsvCell(new Date(v.latest_timestamp).toLocaleString()),
        escapeCsvCell(`https://www.youtube.com/watch?v=${v.video_id}`),
      ]);

      csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');
    } else {
      // 2. Export Cached Topics & Keywords
      const { data: cacheRecords, error } = await supabase
        .from('cached_youtube_api')
        .select('query_type, query_key, created_at, expires_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const headers = ['Query Type', 'Search Term / Key', 'Cached Date', 'Expires At'];
      const rows = (cacheRecords || []).map((c) => [
        escapeCsvCell(c.query_type),
        escapeCsvCell(c.query_key),
        escapeCsvCell(new Date(c.created_at).toLocaleString()),
        escapeCsvCell(new Date(c.expires_at).toLocaleString()),
      ]);

      csvContent = [
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');
    }

    // Set HTTP attachment download headers
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="creator_signal_${exportType}_${dateStr}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[CsvExport] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate CSV export.' },
      { status: error.message?.includes('Authentication') ? 401 : 500 }
    );
  }
}
