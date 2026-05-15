// Per-review admin operations: PATCH + DELETE.
// Auth-gated by x-admin-password header.

import { NextRequest, NextResponse } from 'next/server';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { validateReviewPatch, type ReviewPatch } from '@/app/lib/reviews';
import { SUPPORTED_LANGS, type Lang } from '@/app/lib/i18n/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

// Mirror of the helper in the collection route. Re-declared here to keep
// each endpoint file self-contained — adding a /lib helper for 20 lines
// of sanitisation isn't worth the indirection.
function sanitizeTranslations(raw: unknown): Partial<Record<Lang, string>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Partial<Record<Lang, string>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!(SUPPORTED_LANGS as readonly string[]).includes(k)) continue;
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed.length === 0 || trimmed.length > 2000) continue;
    out[k as Lang] = trimmed;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

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
  if (body.lang !== undefined) {
    patch.lang = typeof body.lang === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(body.lang)
      ? (body.lang as Lang)
      : undefined;
  }
  if (body.translations !== undefined) {
    // null or empty object explicitly clears existing translations; a
    // valid object replaces the previous map wholesale (not merged) so
    // the admin can both add and remove translations from one PATCH.
    patch.translations = sanitizeTranslations(body.translations);
  }

  const err = validateReviewPatch(patch);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // If the patch changes `lang` to a code that already exists as a key
  // in the stored row's translations map, we need to drop that key from
  // the merged result — otherwise the stored row ends up with a
  // translation that duplicates `quote`, which violates the same
  // invariant the create-time validator enforces. Easiest fix: fetch
  // the existing row, compute the merged translations, and rewrite
  // patch.translations to the cleaned map. If the caller already passed
  // translations in this PATCH, we operate on that map; otherwise we
  // operate on the stored map.
  if (patch.lang !== undefined) {
    const existing = await reviewsRepo.list().then((rows) => rows.find((r) => r.id === id));
    if (existing) {
      const source = patch.translations !== undefined
        ? patch.translations
        : existing.translations;
      if (source && patch.lang in source) {
        const cleaned: Partial<Record<Lang, string>> = { ...source };
        delete cleaned[patch.lang];
        patch.translations = Object.keys(cleaned).length === 0 ? undefined : cleaned;
      }
    }
  }

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
