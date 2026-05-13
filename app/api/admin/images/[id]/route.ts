import { NextRequest, NextResponse } from 'next/server';
import { del as blobDelete } from '@vercel/blob';
import { images as imagesRepo } from '@/app/lib/store-factory';
import { validateImagePatch, type ImagePatch } from '@/app/lib/images';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';
const ALLOWED_FIELDS: Array<keyof ImagePatch> = ['alt', 'categories', 'featured', 'sortOrder', 'caption', 'width', 'height'];

function requireAdmin(request: NextRequest): NextResponse | null {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const patch: ImagePatch = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) (patch as Record<string, unknown>)[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no patchable fields in body' }, { status: 400 });
  }

  const err = validateImagePatch(patch);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const result = await imagesRepo.patch(id, patch);
    if (!result) return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    return NextResponse.json({ success: true, image: result });
  } catch (e) {
    console.error('patch image failed:', e);
    return NextResponse.json({ error: 'could not save image' }, { status: 503 });
  }
}

// Removes the image row from KV AND deletes the underlying Blob.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  try {
    const deleted = await imagesRepo.delete(id);
    if (!deleted) return NextResponse.json({ error: 'Image not found' }, { status: 404 });

    // Best-effort blob delete. If the blob is already gone (or never
    // existed because this is a dev row), the KV side is still cleaned up.
    try {
      await blobDelete(deleted.url);
    } catch (e) {
      console.warn('blob delete failed (KV row still removed):', e);
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (e) {
    console.error('delete image failed:', e);
    return NextResponse.json({ error: 'could not delete image' }, { status: 503 });
  }
}
