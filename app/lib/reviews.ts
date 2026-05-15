// Review citation model + validators. Reviews are admin-curated quotes
// from past guests with star ratings, copied in from Airbnb / Booking.com
// / private guests so the owner controls which ones show on the site.

import { SUPPORTED_LANGS, type Lang } from './i18n/types';

export interface Review {
  id: string;          // uuid
  author: string;      // guest's display name ("Anna S." / "Marco" / "Tomás García")
  source: string;      // free text: "Airbnb" | "Booking.com" | "Direct" | "Email" | ...
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;       // the review text
  date: string;        // ISO date (YYYY-MM-DD)
  url?: string;        // optional link back to the original review
  featured: boolean;   // shown in the homepage "Featured reviews" strip
  sortOrder: number;   // integer; lower = first
  createdAt: string;   // ISO timestamp
  // The language the quote is *originally* in. We don't translate review
  // bodies — that would lose the guest's voice — but knowing the original
  // language lets ReviewCard show a small "in Croatian" / "auf Englisch"
  // badge to visitors whose current language differs, so they don't think
  // the site is broken when they hit a quote they can't read.
  //
  // Optional for backwards compatibility: reviews entered before this
  // field existed have no lang and render with no badge.
  lang?: Lang;
  // Hand-curated translations of the quote into other site languages.
  // The site never machine-translates reviews — the owner enters these
  // manually (or imports them, see future enhancement in memory). When a
  // visitor's language has a translation here, ReviewCard prefers it
  // over the original quote and offers a "Show original" toggle.
  //
  // Shape: { hr: "Divno mjesto…", de: "Wunderschöner Ort…" }. Keys must
  // be one of the 5 supported lang codes; the value is the translated
  // quote text (plain string, no markup). The original-language key is
  // *not* expected to be set — the original lives in the `quote` field.
  translations?: Partial<Record<Lang, string>>;
}

function isLangValue(v: unknown): v is Lang {
  return typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v);
}

// Translations must be a plain object whose keys are a subset of the 5
// supported langs and whose values are non-empty strings. Empty / null
// translations should be omitted by the caller before validation — we
// reject them here so the data file doesn't pile up dead keys.
const MAX_TRANSLATION_LEN = 2000;
function isTranslationsMap(v: unknown): v is Partial<Record<Lang, string>> {
  if (!v || typeof v !== 'object') return false;
  if (Array.isArray(v)) return false;
  for (const [k, val] of Object.entries(v)) {
    if (!isLangValue(k)) return false;
    if (typeof val !== 'string') return false;
    if (val.length === 0 || val.length > MAX_TRANSLATION_LEN) return false;
  }
  return true;
}

export function isReview(x: unknown): x is Review {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.author === 'string' &&
    typeof r.source === 'string' &&
    typeof r.rating === 'number' &&
    r.rating >= 1 && r.rating <= 5 && Number.isInteger(r.rating) &&
    typeof r.quote === 'string' &&
    typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    (r.url === undefined || typeof r.url === 'string') &&
    typeof r.featured === 'boolean' &&
    typeof r.sortOrder === 'number' &&
    typeof r.createdAt === 'string' &&
    (r.lang === undefined || isLangValue(r.lang)) &&
    (r.translations === undefined || isTranslationsMap(r.translations))
  );
}

export type ReviewInput = Omit<Review, 'id' | 'createdAt'>;
export type ReviewPatch = Partial<Omit<Review, 'id' | 'createdAt'>>;

export function validateReviewInput(input: Partial<ReviewInput>): string | null {
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
  if (input.url !== undefined) {
    if (typeof input.url !== 'string') return 'url must be a string';
    if (input.url && !input.url.startsWith('http')) return 'url must start with http';
  }
  if (typeof input.featured !== 'boolean') return 'featured must be boolean';
  if (typeof input.sortOrder !== 'number') return 'sortOrder must be number';
  if (input.lang !== undefined && !isLangValue(input.lang)) {
    return 'lang must be one of: en, hr, de, it, fr';
  }
  if (input.translations !== undefined && !isTranslationsMap(input.translations)) {
    return 'translations must be an object of lang → quote string (≤2000 chars)';
  }
  if (input.translations && input.lang && input.lang in input.translations) {
    // A "translation" into the original language would be a duplicate of
    // `quote` and would confuse the ReviewCard fallback logic. Reject.
    return 'translations cannot include the original language';
  }
  return null;
}

export function validateReviewPatch(patch: ReviewPatch): string | null {
  if (patch.author !== undefined) {
    if (typeof patch.author !== 'string' || patch.author.trim().length === 0) return 'author required';
    if (patch.author.length > 120) return 'author too long';
  }
  if (patch.source !== undefined) {
    if (typeof patch.source !== 'string' || patch.source.trim().length === 0) return 'source required';
    if (patch.source.length > 80) return 'source too long';
  }
  if (patch.rating !== undefined) {
    if (typeof patch.rating !== 'number' || !Number.isInteger(patch.rating) || patch.rating < 1 || patch.rating > 5) {
      return 'rating must be integer 1-5';
    }
  }
  if (patch.quote !== undefined) {
    if (typeof patch.quote !== 'string' || patch.quote.trim().length === 0) return 'quote required';
    if (patch.quote.length > 2000) return 'quote too long';
  }
  if (patch.date !== undefined && (typeof patch.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(patch.date))) {
    return 'date must be YYYY-MM-DD';
  }
  if (patch.url !== undefined) {
    if (typeof patch.url !== 'string') return 'url must be a string';
    if (patch.url && !patch.url.startsWith('http')) return 'url must start with http';
  }
  if (patch.featured !== undefined && typeof patch.featured !== 'boolean') return 'featured must be boolean';
  if (patch.sortOrder !== undefined && typeof patch.sortOrder !== 'number') return 'sortOrder must be number';
  if (patch.lang !== undefined && !isLangValue(patch.lang)) {
    return 'lang must be one of: en, hr, de, it, fr';
  }
  if (patch.translations !== undefined && !isTranslationsMap(patch.translations)) {
    return 'translations must be an object of lang → quote string (≤2000 chars)';
  }
  return null;
}
