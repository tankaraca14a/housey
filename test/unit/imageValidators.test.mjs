import { describe, it, expect } from 'vitest';
import { isImage, validateImageInput, validateImagePatch } from '../../app/lib/images.ts';

const validRow = {
  id: 'abc',
  url: 'https://x.blob.vercel-storage.com/housey/img.jpg',
  blobPathname: 'housey/img.jpg',
  alt: 'A photo',
  categories: ['aerial', 'coast'],
  featured: true,
  sortOrder: 1,
  width: 1200,
  height: 800,
  uploadedAt: '2026-05-13T12:00:00.000Z',
};

describe('isImage', () => {
  it('accepts a well-formed row', () => {
    expect(isImage(validRow)).toBe(true);
  });
  it('rejects null / undefined / non-objects', () => {
    expect(isImage(null)).toBe(false);
    expect(isImage(undefined)).toBe(false);
    expect(isImage('foo')).toBe(false);
    expect(isImage(42)).toBe(false);
  });
  it.each([
    ['id missing',       (r) => { delete r.id; }],
    ['url missing',      (r) => { delete r.url; }],
    ['pathname missing', (r) => { delete r.blobPathname; }],
    ['alt missing',      (r) => { delete r.alt; }],
    ['featured missing', (r) => { delete r.featured; }],
    ['sortOrder missing',(r) => { delete r.sortOrder; }],
    ['width missing',    (r) => { delete r.width; }],
    ['uploadedAt missing',(r) => { delete r.uploadedAt; }],
    ['categories missing',(r) => { delete r.categories; }],
  ])('rejects when %s', (_, mutate) => {
    const r = JSON.parse(JSON.stringify(validRow));
    mutate(r);
    expect(isImage(r)).toBe(false);
  });
  it('rejects categories with an invalid value', () => {
    expect(isImage({ ...validRow, categories: ['kitchen'] })).toBe(false);
    expect(isImage({ ...validRow, categories: ['aerial', 'bedroom'] })).toBe(false);
  });
  it('accepts an empty categories array', () => {
    expect(isImage({ ...validRow, categories: [] })).toBe(true);
  });
  it('rejects rows with wrong-type fields', () => {
    expect(isImage({ ...validRow, featured: 'yes' })).toBe(false);
    expect(isImage({ ...validRow, width: '1200' })).toBe(false);
    expect(isImage({ ...validRow, sortOrder: '1' })).toBe(false);
  });
});

describe('validateImageInput', () => {
  const input = {
    url: 'https://x.com/y.jpg',
    blobPathname: 'housey/y.jpg',
    alt: '',
    categories: [],
    featured: false,
    sortOrder: 0,
    width: 1,
    height: 1,
  };
  it('accepts a minimal valid input', () => {
    expect(validateImageInput(input)).toBeNull();
  });
  it.each([
    ['missing url',     { ...input, url: undefined },             'url required'],
    ['non-https url',   { ...input, url: 'ftp://x.com/y' },       'url required'],
    ['relative url',    { ...input, url: '/y.jpg' },              'url required'],
    ['missing pathname',{ ...input, blobPathname: undefined },    'blobPathname required'],
    ['non-string alt',  { ...input, alt: 42 },                    'alt must be a string'],
    ['null cats',       { ...input, categories: null },           'categories must be an array'],
    ['unknown cat',     { ...input, categories: ['bathroom'] },   /categories must be from/],
    ['bool featured?',  { ...input, featured: 1 },                'featured must be boolean'],
    ['neg width',       { ...input, width: -10 },                 'width must be positive number'],
    ['zero height',     { ...input, height: 0 },                  'height must be positive number'],
    ['non-num sortOrder',{ ...input, sortOrder: '1' },            'sortOrder must be number'],
    ['non-str caption', { ...input, caption: 42 },                'caption must be a string'],
  ])('rejects %s', (_, bad, want) => {
    const r = validateImageInput(bad);
    if (typeof want === 'string') expect(r).toBe(want);
    else expect(r).toMatch(want);
  });
});

describe('validateImagePatch', () => {
  it('accepts empty patch (no fields to validate)', () => {
    expect(validateImagePatch({})).toBeNull();
  });
  it.each([
    ['bad cats',        { categories: ['nope'] }, /categories must be from/],
    ['bad featured',    { featured: 'yes' },      'featured must be boolean'],
    ['bad sortOrder',   { sortOrder: 'x' },       'sortOrder must be number'],
    ['bad alt',         { alt: 99 },              'alt must be a string'],
    ['bad caption',     { caption: 99 },          'caption must be a string'],
    ['zero width',      { width: 0 },             'width must be positive number'],
    ['neg height',      { height: -1 },           'height must be positive number'],
  ])('rejects %s', (_, bad, want) => {
    const r = validateImagePatch(bad);
    if (typeof want === 'string') expect(r).toBe(want);
    else expect(r).toMatch(want);
  });
});
