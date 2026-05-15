// Public list endpoint for reviews. Returns every review (no draft state
// — reviews are owner-curated, every row in the repo is publishable).
// Sorted: explicit sortOrder first, then most recent by `date`.

import { NextResponse } from 'next/server';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';

export async function GET() {
  try {
    const list = await reviewsRepo.list();
    return NextResponse.json({ reviews: list });
  } catch (e) {
    console.error('reviews GET failed:', e);
    return NextResponse.json({ error: 'Failed to read reviews' }, { status: 500 });
  }
}
