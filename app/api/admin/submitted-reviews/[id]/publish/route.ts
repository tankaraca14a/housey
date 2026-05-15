// Atomically promote a submission to a live Review with the
// translations Mihaela has filled in locally, then delete the inbox
// row. Atomic in the soft sense: we create the live row first; if that
// fails the submission is preserved so we can retry. If the live
// create succeeds but the inbox delete fails, the worst case is a
// stale inbox entry — easy to clean up with the DELETE endpoint.

import { NextRequest, NextResponse } from 'next/server';
import {
  reviews as reviewsRepo,
  submittedReviews as inboxRepo,
} from '@/app/lib/store-factory';
import { validateReviewInput, type ReviewInput } from '@/app/lib/reviews';
import { SUPPORTED_LANGS, type Lang } from '@/app/lib/i18n/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

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

export async function POST(
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

  const submission = await inboxRepo.get(id);
  if (!submission) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Build the live Review from the submission + the editable fields
  // Mihaela sent. She can override author/source/rating/quote on
  // publish (in case Ivana typoed something), but the original lang
  // stays whatever was submitted unless she explicitly changes it.
  const rawRating = typeof body.rating === 'number' ? body.rating : Number(body.rating ?? submission.rating);
  const lang = typeof body.lang === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(body.lang)
    ? (body.lang as Lang)
    : submission.lang;
  const translations = sanitizeTranslations(body.translations);

  const input: ReviewInput = {
    author: typeof body.author === 'string' ? body.author.trim() : submission.author,
    source: typeof body.source === 'string' ? body.source.trim() : submission.source,
    rating: Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
      ? (rawRating as 1 | 2 | 3 | 4 | 5)
      : submission.rating,
    quote: typeof body.quote === 'string' ? body.quote.trim() : submission.quote,
    date: typeof body.date === 'string' ? body.date : submission.date,
    url: typeof body.url === 'string' && body.url ? body.url : undefined,
    featured: body.featured === true,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : Date.now(),
    lang,
    // Strip a translation that duplicates the original (validator
    // catches this too, but doing it here gives a nicer error than
    // a 400 — we silently drop the conflicting key).
    translations: translations && lang in translations
      ? Object.fromEntries(Object.entries(translations).filter(([k]) => k !== lang)) as Partial<Record<Lang, string>>
      : translations,
  };

  const err = validateReviewInput(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const created = await reviewsRepo.create(input);
    // Best-effort cleanup. If this fails the live row is still good;
    // Mihaela just sees the stale inbox row and can DELETE it manually.
    try { await inboxRepo.delete(id); }
    catch (e) { console.error('publish: inbox cleanup failed', e); }
    return NextResponse.json({ success: true, review: created });
  } catch (e) {
    console.error('publish: live review create failed:', e);
    return NextResponse.json({ error: 'could not publish' }, { status: 503 });
  }
}
