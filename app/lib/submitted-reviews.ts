// "Inbox" for raw reviews Ivana submits but doesn't publish — meant for
// Mihaela to translate locally on her Mac and then publish into the
// regular reviews list with translations attached. Submitted reviews
// are NOT visible on the public site; they live in their own store and
// surface only inside /admin as a queue.

import { SUPPORTED_LANGS, type Lang } from './i18n/types';

export interface SubmittedReview {
  id: string;
  author: string;       // who left the review (free text)
  source: string;       // "Airbnb" | "Booking.com" | "Direct" | "Email" | ...
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;        // raw review body, in whatever language Ivana received it
  date: string;         // ISO date YYYY-MM-DD (when the guest left it)
  lang: Lang;           // what language the quote is in — required so Mihaela
                        // knows which slot to put it in when she publishes
  notes?: string;       // optional free-form note from Ivana ("special guest", etc.)
  createdAt: string;    // ISO timestamp of when Ivana hit Submit
}

export type SubmittedReviewInput = Omit<SubmittedReview, 'id' | 'createdAt'>;

function isLangValue(v: unknown): v is Lang {
  return typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v);
}

export function isSubmittedReview(x: unknown): x is SubmittedReview {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.author === 'string' &&
    typeof r.source === 'string' &&
    typeof r.rating === 'number' &&
    Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5 &&
    typeof r.quote === 'string' &&
    typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    isLangValue(r.lang) &&
    (r.notes === undefined || typeof r.notes === 'string') &&
    typeof r.createdAt === 'string'
  );
}

export function validateSubmittedReviewInput(input: Partial<SubmittedReviewInput>): string | null {
  if (!input.author || typeof input.author !== 'string' || input.author.trim().length === 0) {
    return 'author required';
  }
  if (input.author.length > 120) return 'author too long (max 120)';
  if (!input.source || typeof input.source !== 'string' || input.source.trim().length === 0) {
    return 'source required';
  }
  if (input.source.length > 80) return 'source too long (max 80)';
  if (typeof input.rating !== 'number' || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return 'rating must be integer 1-5';
  }
  if (!input.quote || typeof input.quote !== 'string' || input.quote.trim().length === 0) {
    return 'quote required';
  }
  if (input.quote.length > 2000) return 'quote too long (max 2000)';
  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return 'date must be YYYY-MM-DD';
  }
  if (!isLangValue(input.lang)) {
    return 'lang must be one of: en, hr, de, it, fr';
  }
  if (input.notes !== undefined) {
    if (typeof input.notes !== 'string') return 'notes must be a string';
    if (input.notes.length > 500) return 'notes too long (max 500)';
  }
  return null;
}
