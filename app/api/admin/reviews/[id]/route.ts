// Per-review admin operations: PATCH + DELETE.
// Auth-gated by x-admin-password header.

import { NextRequest, NextResponse } from 'next/server';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { validateReviewPatch, type ReviewPatch } from '@/app/lib/reviews';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  // Whitelist the patchable fields.
  const patch: ReviewPatch = {};
  if (typeof body.author === 'string') patch.author = body.author;
  if (typeof body.source === 'string') patch.source = body.source;
  if (typeof body.rating === 'number') patch.rating = body.rating as 1 | 2 | 3 | 4 | 5;
  if (typeof body.quote === 'string') patch.quote = body.quote;
  if (typeof body.date === 'string') patch.date = body.date;
  if (body.url !== undefined) patch.url = typeof body.url === 'string' && body.url ? body.url : undefined;
  if (typeof body.featured === 'boolean') patch.featured = body.featured;
  if (typeof body.sortOrder === 'number') patch.sortOrder = body.sortOrder;

  const err = validateReviewPatch(patch);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const updated = await reviewsRepo.patch(id, patch);
    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, review: updated });
  } catch (e) {
    console.error('admin reviews PATCH failed:', e);
    return NextResponse.json({ error: 'could not update review' }, { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const removed = await reviewsRepo.delete(id);
    if (!removed) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('admin reviews DELETE failed:', e);
    return NextResponse.json({ error: 'could not delete review' }, { status: 503 });
  }
}
