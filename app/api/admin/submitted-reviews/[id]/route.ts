// Per-submission ops: DELETE removes from the queue without publishing
// (spam, duplicate, or an item Mihaela chose not to translate). PATCH
// is intentionally absent — submissions are append-only from Ivana's
// side; if a detail is wrong Mihaela edits it inside the publish flow.

import { NextRequest, NextResponse } from 'next/server';
import { submittedReviews as inboxRepo } from '@/app/lib/store-factory';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const removed = await inboxRepo.delete(id);
    if (!removed) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('admin submitted-reviews DELETE failed:', e);
    return NextResponse.json({ error: 'could not delete submission' }, { status: 503 });
  }
}
