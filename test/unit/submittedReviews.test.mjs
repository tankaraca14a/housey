import { describe, it, expect } from 'vitest';
import {
  isSubmittedReview,
  validateSubmittedReviewInput,
} from '../../app/lib/submitted-reviews.ts';

const valid = {
  id: 's-1',
  author: 'Ivana',
  source: 'Airbnb',
  rating: 5,
  quote: 'A guest left this lovely note.',
  date: '2025-08-15',
  lang: 'hr',
  createdAt: '2026-05-15T00:00:00Z',
};

describe('isSubmittedReview', () => {
  it('accepts a valid shape', () => {
    expect(isSubmittedReview(valid)).toBe(true);
  });
  it('accepts each of the 5 supported langs', () => {
    for (const code of ['en', 'hr', 'de', 'it', 'fr']) {
      expect(isSubmittedReview({ ...valid, lang: code })).toBe(true);
    }
  });
  it('rejects missing lang (unlike Review, lang is required here)', () => {
    const { lang: _omit, ...noLang } = valid;
    expect(isSubmittedReview(noLang)).toBe(false);
  });
  it('rejects unsupported lang', () => {
    expect(isSubmittedReview({ ...valid, lang: 'es' })).toBe(false);
  });
  it('rejects rating out of range', () => {
    expect(isSubmittedReview({ ...valid, rating: 0 })).toBe(false);
    expect(isSubmittedReview({ ...valid, rating: 6 })).toBe(false);
  });
  it('rejects non-integer rating', () => {
    expect(isSubmittedReview({ ...valid, rating: 4.5 })).toBe(false);
  });
  it('rejects malformed date', () => {
    expect(isSubmittedReview({ ...valid, date: '15/08/2025' })).toBe(false);
  });
  it('accepts optional notes', () => {
    expect(isSubmittedReview({ ...valid, notes: 'special guest' })).toBe(true);
  });
  it('rejects non-string notes', () => {
    expect(isSubmittedReview({ ...valid, notes: 42 })).toBe(false);
  });
});

describe('validateSubmittedReviewInput', () => {
  const base = {
    author: 'Ivana',
    source: 'Airbnb',
    rating: 5,
    quote: 'q',
    date: '2025-08-15',
    lang: 'hr',
  };
  it('accepts valid input', () => {
    expect(validateSubmittedReviewInput(base)).toBeNull();
  });
  it('accepts each of the 5 supported langs', () => {
    for (const code of ['en', 'hr', 'de', 'it', 'fr']) {
      expect(validateSubmittedReviewInput({ ...base, lang: code })).toBeNull();
    }
  });
  it('rejects empty author', () => {
    expect(validateSubmittedReviewInput({ ...base, author: '   ' })).toMatch(/author/);
  });
  it('rejects too-long author', () => {
    expect(validateSubmittedReviewInput({ ...base, author: 'x'.repeat(121) })).toMatch(/author/);
  });
  it('rejects empty source', () => {
    expect(validateSubmittedReviewInput({ ...base, source: '' })).toMatch(/source/);
  });
  it('rejects rating=0', () => {
    expect(validateSubmittedReviewInput({ ...base, rating: 0 })).toMatch(/rating/);
  });
  it('rejects rating=6', () => {
    expect(validateSubmittedReviewInput({ ...base, rating: 6 })).toMatch(/rating/);
  });
  it('rejects empty quote', () => {
    expect(validateSubmittedReviewInput({ ...base, quote: '' })).toMatch(/quote/);
  });
  it('rejects too-long quote', () => {
    expect(validateSubmittedReviewInput({ ...base, quote: 'x'.repeat(2001) })).toMatch(/quote/);
  });
  it('rejects bad date format', () => {
    expect(validateSubmittedReviewInput({ ...base, date: '2025/08/15' })).toMatch(/date/);
  });
  it('rejects missing lang', () => {
    const { lang: _omit, ...noLang } = base;
    expect(validateSubmittedReviewInput(noLang)).toMatch(/lang/);
  });
  it('rejects unsupported lang code', () => {
    expect(validateSubmittedReviewInput({ ...base, lang: 'es' })).toMatch(/lang/);
    expect(validateSubmittedReviewInput({ ...base, lang: 'EN' })).toMatch(/lang/);
  });
  it('accepts optional notes', () => {
    expect(validateSubmittedReviewInput({ ...base, notes: 'special guest' })).toBeNull();
  });
  it('rejects too-long notes', () => {
    expect(validateSubmittedReviewInput({ ...base, notes: 'x'.repeat(501) })).toMatch(/notes/);
  });
  it('rejects non-string notes', () => {
    expect(validateSubmittedReviewInput({ ...base, notes: 42 })).toMatch(/notes/);
  });
});
