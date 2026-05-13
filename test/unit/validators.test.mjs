import { describe, it, expect } from 'vitest';
import { validateBookingInput, validateBookingPatch, isBooking } from '../../app/lib/bookings.ts';

const valid = {
  name: 'Sample Guest',
  email: 'sample@example.com',
  phone: '+385 91 555 1234',
  checkIn: '2099-04-10',
  checkOut: '2099-04-15',
  guests: '2',
};

describe('validateBookingInput', () => {
  it('accepts a fully-valid payload', () => {
    expect(validateBookingInput(valid)).toBeNull();
  });
  it.each([
    ['missing name',           { ...valid, name: '' },                 'name required'],
    ['short name',             { ...valid, name: 'a' },                'name required'],
    ['bad email',              { ...valid, email: 'nope' },            'valid email required'],
    ['short phone',            { ...valid, phone: '1' },               'phone required'],
    ['bad checkIn format',     { ...valid, checkIn: '10/10/2099' },    'checkIn must be YYYY-MM-DD'],
    ['bad checkOut format',    { ...valid, checkOut: 'soon' },         'checkOut must be YYYY-MM-DD'],
    ['checkOut before checkIn',{ ...valid, checkOut: '2099-04-09' },   'checkOut must be after checkIn'],
    ['checkOut == checkIn',    { ...valid, checkOut: valid.checkIn },  'checkOut must be after checkIn'],
    ['missing guests',         { ...valid, guests: '' },               'guests required'],
    ['bogus status',           { ...valid, status: 'maybe' },          'status must be pending | confirmed | declined'],
  ])('rejects %s', (_, bad, expected) => {
    expect(validateBookingInput(bad)).toBe(expected);
  });
});

describe('validateBookingPatch', () => {
  it('empty patch is allowed at validator level (rejection happens in the route)', () => {
    expect(validateBookingPatch({})).toBeNull();
  });
  it.each([
    ['short name',     { name: 'a' },               'name must be at least 2 characters'],
    ['bad email',      { email: 'no' },             'email must be valid'],
    ['short phone',    { phone: '1' },              'phone must be at least 5 characters'],
    ['bad checkIn',    { checkIn: 'soon' },         'checkIn must be YYYY-MM-DD'],
    ['bad checkOut',   { checkOut: 'later' },       'checkOut must be YYYY-MM-DD'],
    ['bogus status',   { status: 'bogus' },         'status must be pending | confirmed | declined'],
    ['empty guests',   { guests: '' },              'guests must be a non-empty string'],
  ])('rejects %s', (_, bad, expected) => {
    expect(validateBookingPatch(bad)).toBe(expected);
  });
});

describe('isBooking', () => {
  const rowOk = {
    id: 'abc', name: 'X', email: 'x@y.z', phone: '12345',
    checkIn: '2099-01-01', checkOut: '2099-01-05', guests: '2',
    message: '', status: 'pending', createdAt: '2026-01-01T00:00:00.000Z',
  };
  it('accepts a well-formed booking', () => {
    expect(isBooking(rowOk)).toBe(true);
  });
  it('rejects nulls', () => {
    expect(isBooking(null)).toBe(false);
    expect(isBooking(undefined)).toBe(false);
  });
  it('rejects rows with the wrong status', () => {
    expect(isBooking({ ...rowOk, status: 'maybe' })).toBe(false);
  });
  it('rejects rows missing required string fields', () => {
    expect(isBooking({ ...rowOk, email: undefined })).toBe(false);
    expect(isBooking({ ...rowOk, name: 42 })).toBe(false);
  });
});
