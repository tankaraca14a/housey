// Public read endpoint for the gallery. Returns the list of admin-uploaded
// images, with metadata. The /gallery page merges this with the
// hardcoded committed-image array for backwards compatibility.

import { NextResponse } from 'next/server';
import { images as imagesRepo } from '@/app/lib/store-factory';

export async function GET() {
  try {
    const rows = await imagesRepo.list();
    return NextResponse.json({ images: rows });
  } catch (e) {
    console.error('public list images failed:', e);
    return NextResponse.json({ images: [] }, { status: 200 });
  }
}
