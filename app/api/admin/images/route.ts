import { NextRequest, NextResponse } from 'next/server';
import { images as imagesRepo } from '@/app/lib/store-factory';
import { validateImageInput, type Image } from '@/app/lib/images';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const rows = await imagesRepo.list();
    return NextResponse.json({ images: rows });
  } catch (e) {
    console.error('list images failed:', e);
    return NextResponse.json({ error: 'could not list images' }, { status: 503 });
  }
}

// Called by the admin page AFTER the client has uploaded the bytes to
// Vercel Blob via /api/admin/images/upload. The body carries the
// resulting URL + metadata; we persist the row.
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  // Strict pass-through (no coercion) so the validator catches wrong types
  // instead of silently converting them.
  const input = {
    url: body.url as Image['url'],
    blobPathname: body.blobPathname as Image['blobPathname'],
    alt: (body.alt as Image['alt']) ?? '',
    categories: (body.categories ?? []) as Image['categories'],
    featured: body.featured as Image['featured'],
    sortOrder: typeof body.sortOrder === 'number' ? (body.sortOrder as number) : Date.now(),
    width: body.width as Image['width'],
    height: body.height as Image['height'],
    caption: body.caption as string | undefined,
  };

  const err = validateImageInput(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const image = await imagesRepo.create(input);
    return NextResponse.json({ success: true, image });
  } catch (e) {
    console.error('image create failed:', e);
    return NextResponse.json({ error: 'could not save image' }, { status: 503 });
  }
}
