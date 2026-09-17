import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request, false);
    if (userId === '00000000-0000-0000-0000-000000000001') {
      return NextResponse.json({ error: 'Cannot delete demo guest account.' }, { status: 400 });
    }
    const supabase = createAdminSupabaseClient();

    // 1. Delete associated data records
    await supabase.from('credit_transactions').delete().eq('user_id', userId);
    await supabase.from('credits').delete().eq('user_id', userId);
    await supabase.from('subscriptions').delete().eq('user_id', userId);
    await supabase.from('monitored_videos').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    // 2. Delete Supabase Auth User record
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.warn('[AccountDelete] Auth record cleanup warning:', authDeleteError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Your account and associated data have been permanently deleted.',
    });
  } catch (error: any) {
    console.error('[AccountDelete] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
