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
  it('accepts each of the 5 supported langs', () => {
    for (const code of ['en', 'hr', 'de', 'it', 'fr']) {
      expect(validateReviewInput({ ...validInput, lang: code })).toBeNull();
    }
  });
  it('accepts input with no lang (backwards compatibility)', () => {
    const { lang: _omit, ...noLang } = { ...validInput };
    expect(validateReviewInput(noLang)).toBeNull();
  });
  it('rejects unsupported lang code', () => {
    expect(validateReviewInput({ ...validInput, lang: 'es' })).toMatch(/lang/);
  });
  it('rejects non-string lang', () => {
    expect(validateReviewInput({ ...validInput, lang: 42 })).toMatch(/lang/);
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
  it('accepts lang patch for each supported lang', () => {
    for (const code of ['en', 'hr', 'de', 'it', 'fr']) {
      expect(validateReviewPatch({ lang: code })).toBeNull();
    }
  });
  it('rejects bad lang in patch', () => {
    expect(validateReviewPatch({ lang: 'es' })).toMatch(/lang/);
    expect(validateReviewPatch({ lang: 'EN' })).toMatch(/lang/);
    expect(validateReviewPatch({ lang: '' })).toMatch(/lang/);
  });
});

describe('isReview accepts lang field', () => {
  it('accepts each of the 5 supported langs', () => {
    for (const code of ['en', 'hr', 'de', 'it', 'fr']) {
      expect(isReview({ ...valid, lang: code })).toBe(true);
    }
  });
  it('accepts no lang (legacy row)', () => {
    expect(isReview(valid)).toBe(true);
  });
  it('rejects unsupported lang code in stored row', () => {
    expect(isReview({ ...valid, lang: 'es' })).toBe(false);
    expect(isReview({ ...valid, lang: 'ZZ' })).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Translations map (hand-curated per-language quotes)
// ───────────────────────────────────────────────────────────────────────────

describe('isReview accepts translations map', () => {
  it('accepts a single-key translations map', () => {
    expect(isReview({ ...valid, translations: { hr: 'Divno' } })).toBe(true);
  });
  it('accepts a 4-key translations map', () => {
    expect(isReview({ ...valid, translations: { en: 'A', hr: 'B', de: 'C', it: 'D' } })).toBe(true);
  });
  it('accepts no translations (legacy row)', () => {
    expect(isReview(valid)).toBe(true);
  });
  it('rejects translations with unsupported lang key', () => {
    expect(isReview({ ...valid, translations: { es: 'Hola' } })).toBe(false);
  });
  it('rejects translations whose value is not a string', () => {
    expect(isReview({ ...valid, translations: { hr: 42 } })).toBe(false);
    expect(isReview({ ...valid, translations: { hr: null } })).toBe(false);
  });
  it('rejects translations whose value is empty string', () => {
    expect(isReview({ ...valid, translations: { hr: '' } })).toBe(false);
  });
  it('rejects translations array (must be plain object)', () => {
    expect(isReview({ ...valid, translations: ['Divno'] })).toBe(false);
  });
  it('rejects translations whose value is too long', () => {
    expect(isReview({ ...valid, translations: { hr: 'x'.repeat(2001) } })).toBe(false);
  });
});

describe('validateReviewInput accepts translations', () => {
  const base = {
    author: 'Anna',
    source: 'Airbnb',
    rating: 5,
    quote: 'Lovely',
    date: '2025-08-15',
    featured: true,
    sortOrder: 1,
  };
  it('accepts a valid translations map (no original-lang collision)', () => {
    expect(validateReviewInput({ ...base, lang: 'en', translations: { hr: 'Divno' } })).toBeNull();
  });
  it('rejects a translation in the original language', () => {
    expect(validateReviewInput({
      ...base,
      lang: 'en',
      translations: { en: 'Lovely', hr: 'Divno' },
    })).toMatch(/translations cannot include the original/);
  });
  it('rejects translations with bad shape', () => {
    expect(validateReviewInput({ ...base, translations: { es: 'Hola' } })).toMatch(/translations/);
    expect(validateReviewInput({ ...base, translations: 'not an object' })).toMatch(/translations/);
    expect(validateReviewInput({ ...base, translations: ['array'] })).toMatch(/translations/);
  });
  it('accepts input with no translations field at all', () => {
    expect(validateReviewInput({ ...base, lang: 'en' })).toBeNull();
  });
});

describe('validateReviewPatch accepts translations', () => {
  it('accepts a translations patch', () => {
    expect(validateReviewPatch({ translations: { hr: 'Divno' } })).toBeNull();
  });
  it('accepts an empty translations patch (clears the map)', () => {
    // Empty {} is a valid translations object (zero keys to validate).
    expect(validateReviewPatch({ translations: {} })).toBeNull();
  });
  it('rejects bad shape', () => {
    expect(validateReviewPatch({ translations: { es: 'x' } })).toMatch(/translations/);
    expect(validateReviewPatch({ translations: 42 })).toMatch(/translations/);
  });
});
