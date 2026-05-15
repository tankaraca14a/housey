// Admin reviews collection: GET (list) + POST (create).
// Auth-gated by x-admin-password header, same pattern as bookings/images.

import { NextRequest, NextResponse } from 'next/server';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { validateReviewInput, type ReviewInput } from '@/app/lib/reviews';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

export async function GET(request: NextRequest) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ reviews: await reviewsRepo.list() });
  } catch (e) {
    console.error('admin reviews GET failed:', e);
    return NextResponse.json({ error: 'Failed to read reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  // Defaults for optional fields so the admin form can submit a partial
  // shape without ceremony.
  const rawRating = typeof body.rating === 'number' ? body.rating : Number(body.rating);
  const input: Partial<ReviewInput> = {
    author: typeof body.author === 'string' ? body.author : '',
    source: typeof body.source === 'string' ? body.source : '',
    rating: Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
      ? (rawRating as 1 | 2 | 3 | 4 | 5)
      : undefined,
    quote: typeof body.quote === 'string' ? body.quote : '',
    date: typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10),
    url: typeof body.url === 'string' && body.url ? body.url : undefined,
    featured: body.featured === true,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : Date.now(),
  };

  const err = validateReviewInput(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const created = await reviewsRepo.create(input as ReviewInput);
    return NextResponse.json({ success: true, review: created });
  } catch (e) {
    console.error('admin reviews POST failed:', e);
    return NextResponse.json({ error: 'could not create review' }, { status: 503 });
  }
}
