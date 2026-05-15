// Admin reviews collection: GET (list) + POST (create).
// Auth-gated by x-admin-password header, same pattern as bookings/images.

import { NextRequest, NextResponse } from 'next/server';
import { reviews as reviewsRepo } from '@/app/lib/store-factory';
import { validateReviewInput, type ReviewInput } from '@/app/lib/reviews';
import { SUPPORTED_LANGS, type Lang } from '@/app/lib/i18n/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

// Strip a free-form `translations` blob from the request body down to the
// shape our store expects: keys are supported langs, values are
// non-empty strings ≤2000 chars. Returns undefined if the input isn't
// an object so the row simply has no translations. The validator
// downstream catches the original-lang-included-in-translations edge.
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
    // Narrow the lang field to the 5-language set; anything else (or
    // missing) becomes undefined so the row simply has no original-lang
    // badge on the public site. Legacy clients that don't send lang
    // continue to work.
    lang: typeof body.lang === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(body.lang)
      ? (body.lang as Lang)
      : undefined,
    // Translations map: { hr: "…", de: "…" }. We accept only objects
    // whose keys are supported langs and whose values are non-empty
    // strings, stripping anything else silently so a misbehaving client
    // can't pile garbage keys into the data file. The validator below
    // catches the original-lang-in-translations conflict.
    translations: sanitizeTranslations(body.translations),
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
