import { describe, it, expect } from 'vitest';
import { isReview, validateReviewInput, validateReviewPatch } from '../../app/lib/reviews.ts';

const valid = {
  id: 'r-1',
  author: 'Anna',
  source: 'Airbnb',
  rating: 5,
  quote: 'Lovely',
  date: '2025-08-15',
  featured: true,
  sortOrder: 1,
  createdAt: '2026-05-15T00:00:00Z',
};

describe('isReview', () => {
  it('accepts a valid shape', () => {
    expect(isReview(valid)).toBe(true);
  });
  it('rejects missing author', () => {
    expect(isReview({ ...valid, author: undefined })).toBe(false);
  });
  it('rejects rating > 5', () => {
    expect(isReview({ ...valid, rating: 6 })).toBe(false);
  });
  it('rejects rating < 1', () => {
    expect(isReview({ ...valid, rating: 0 })).toBe(false);
  });
  it('rejects non-integer rating', () => {
    expect(isReview({ ...valid, rating: 4.5 })).toBe(false);
  });
  it('rejects malformed date', () => {
    expect(isReview({ ...valid, date: '15/08/2025' })).toBe(false);
  });
  it('accepts optional url', () => {
    expect(isReview({ ...valid, url: 'https://airbnb.com/x' })).toBe(true);
  });
  it('rejects non-string url', () => {
    expect(isReview({ ...valid, url: 42 })).toBe(false);
  });
});

describe('validateReviewInput', () => {
  const validInput = {
    author: 'Anna',
    source: 'Airbnb',
    rating: 5,
    quote: 'Lovely',
    date: '2025-08-15',
    featured: true,
    sortOrder: 1,
  };
  it('accepts valid input', () => {
    expect(validateReviewInput(validInput)).toBeNull();
  });
  it('rejects empty author', () => {
    expect(validateReviewInput({ ...validInput, author: '   ' })).toMatch(/author/);
  });
  it('rejects empty source', () => {
    expect(validateReviewInput({ ...validInput, source: '' })).toMatch(/source/);
  });
  it('rejects rating=6', () => {
    expect(validateReviewInput({ ...validInput, rating: 6 })).toMatch(/rating/);
  });
  it('rejects rating=0', () => {
    expect(validateReviewInput({ ...validInput, rating: 0 })).toMatch(/rating/);
  });
  it('rejects non-integer rating', () => {
    expect(validateReviewInput({ ...validInput, rating: 4.5 })).toMatch(/rating/);
  });
  it('rejects empty quote', () => {
    expect(validateReviewInput({ ...validInput, quote: '' })).toMatch(/quote/);
  });
  it('rejects too-long quote', () => {
    expect(validateReviewInput({ ...validInput, quote: 'x'.repeat(2001) })).toMatch(/quote/);
  });
  it('rejects malformed date', () => {
    expect(validateReviewInput({ ...validInput, date: '2025/08/15' })).toMatch(/date/);
  });
  it('rejects non-http url', () => {
    expect(validateReviewInput({ ...validInput, url: 'ftp://x' })).toMatch(/url/);
  });
  it('accepts empty url as undefined', () => {
    expect(validateReviewInput({ ...validInput, url: undefined })).toBeNull();
  });
});

describe('validateReviewPatch', () => {
  it('allows empty patch', () => {
    expect(validateReviewPatch({})).toBeNull();
  });
  it('rejects bad rating in patch', () => {
    expect(validateReviewPatch({ rating: 10 })).toMatch(/rating/);
  });
  it('accepts partial valid patch', () => {
    expect(validateReviewPatch({ featured: false, sortOrder: 5 })).toBeNull();
  });
});
