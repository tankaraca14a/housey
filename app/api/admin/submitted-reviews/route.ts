// "Translation inbox" — Ivana POSTs raw reviews here (gated by the
// same admin password since /submit-review is a bookmarked owner page,
// not a public endpoint). Mihaela GETs the queue from /admin.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { submittedReviews as inboxRepo } from '@/app/lib/store-factory';
import {
  validateSubmittedReviewInput,
  type SubmittedReviewInput,
} from '@/app/lib/submitted-reviews';
import { SUPPORTED_LANGS, type Lang } from '@/app/lib/i18n/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ivana2026';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fire-and-forget email to Mihaela so a new submission doesn't slip by
// unnoticed. We don't fail the POST if the email send fails — the row
// is already persisted, the admin queue is the source of truth.
async function notifyMihaela(submission: SubmittedReviewInput & { id: string }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[submit-review] RESEND_API_KEY not set — skipping notification email');
      return;
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const langLabel: Record<Lang, string> = {
      en: 'English',
      hr: 'Croatian',
      de: 'German',
      it: 'Italian',
      fr: 'French',
    };
    await resend.emails.send({
      from: 'Housey Inbox <noreply@tankaraca.com>',
      to: ['mihaelamj@gmail.com'],
      subject: `New review submission: ${submission.author} (${submission.source})`,
      html: `
        <h2>Ivana submitted a review to translate</h2>
        <p><strong>Author:</strong> ${escapeHtml(submission.author)}</p>
        <p><strong>Source:</strong> ${escapeHtml(submission.source)}</p>
        <p><strong>Rating:</strong> ${submission.rating}/5</p>
        <p><strong>Date:</strong> ${escapeHtml(submission.date)}</p>
        <p><strong>Original language:</strong> ${langLabel[submission.lang]}</p>
        <hr/>
        <p><strong>Quote:</strong></p>
        <blockquote dir="auto" style="border-left:3px solid #ccc;padding-left:12px;color:#333">
          ${escapeHtml(submission.quote).replace(/\n/g, '<br>')}
        </blockquote>
        ${submission.notes ? `<p><strong>Notes from Ivana:</strong> ${escapeHtml(submission.notes).replace(/\n/g, '<br>')}</p>` : ''}
        <hr/>
        <p>Open <a href="https://www.tankaraca.com/admin">tankaraca.com/admin</a>, scroll to the <strong>Translation inbox</strong> section, click <em>Publish with translations</em>.</p>
      `,
    });
  } catch (e) {
    console.error('[submit-review] notification email failed:', e);
  }
}

export async function GET(request: NextRequest) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ submissions: await inboxRepo.list() });
  } catch (e) {
    console.error('admin submitted-reviews GET failed:', e);
    return NextResponse.json({ error: 'Failed to read inbox' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Same password as the live reviews CRUD — /submit-review is a
  // bookmarked owner page, not a public endpoint, so no separate
  // role/key. Reusing the existing password keeps the surface tight.
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 }); }

  const rawRating = typeof body.rating === 'number' ? body.rating : Number(body.rating);
  const input: Partial<SubmittedReviewInput> = {
    author: typeof body.author === 'string' ? body.author.trim() : '',
    source: typeof body.source === 'string' ? body.source.trim() : '',
    rating: Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5
      ? (rawRating as 1 | 2 | 3 | 4 | 5)
      : undefined,
    quote: typeof body.quote === 'string' ? body.quote.trim() : '',
    date: typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10),
    lang: typeof body.lang === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(body.lang)
      ? (body.lang as Lang)
      : ('en' as Lang),
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined,
  };

  const err = validateSubmittedReviewInput(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  try {
    const created = await inboxRepo.create(input as SubmittedReviewInput);
    // Fire-and-forget; don't await — Resend can take ~1s and we want
    // the POST to return quickly. The row is already persisted.
    notifyMihaela(created);
    return NextResponse.json({ success: true, submission: created });
  } catch (e) {
    console.error('admin submitted-reviews POST failed:', e);
    return NextResponse.json({ error: 'could not save submission' }, { status: 503 });
  }
}
