import { describe, it, expect } from 'vitest';
import { rangesOverlap, findConflict } from '../../app/lib/bookings.ts';

describe('rangesOverlap (checkout exclusive)', () => {
  it('overlapping ranges return true', () => {
    expect(rangesOverlap('2099-06-10', '2099-06-15', '2099-06-12', '2099-06-18')).toBe(true);
    expect(rangesOverlap('2099-06-12', '2099-06-18', '2099-06-10', '2099-06-15')).toBe(true);
  });
  it('identical ranges return true', () => {
    expect(rangesOverlap('2099-06-10', '2099-06-15', '2099-06-10', '2099-06-15')).toBe(true);
  });
  it('one range fully inside another return true', () => {
    expect(rangesOverlap('2099-06-10', '2099-06-20', '2099-06-12', '2099-06-15')).toBe(true);
  });
  it('back-to-back (checkout = next checkIn) does NOT overlap', () => {
    expect(rangesOverlap('2099-06-10', '2099-06-15', '2099-06-15', '2099-06-20')).toBe(false);
    expect(rangesOverlap('2099-06-15', '2099-06-20', '2099-06-10', '2099-06-15')).toBe(false);
  });
  it('completely separate ranges return false', () => {
    expect(rangesOverlap('2099-06-10', '2099-06-15', '2099-07-01', '2099-07-05')).toBe(false);
    expect(rangesOverlap('2099-01-01', '2099-01-05', '2099-12-25', '2099-12-30')).toBe(false);
  });
  it('one-day overlap (last night of A = first night of B) is real overlap', () => {
    // A: stays 10, 11, 12 (out 13). B: stays 12, 13 (in 12, out 14).
    // night 12 is shared → overlap.
    expect(rangesOverlap('2099-06-10', '2099-06-13', '2099-06-12', '2099-06-14')).toBe(true);
  });
});

const row = (id, checkIn, checkOut, status = 'pending') => ({
  id,
  name: 'X', email: 'x@x.com', phone: '5550000',
  checkIn, checkOut, guests: '2', message: '', status,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('findConflict', () => {
  it('returns null on empty list', () => {
    expect(findConflict([], '2099-06-10', '2099-06-15')).toBeNull();
  });
  it('finds an overlapping pending row', () => {
    const list = [row('A', '2099-06-12', '2099-06-18')];
    expect(findConflict(list, '2099-06-10', '2099-06-15')?.id).toBe('A');
  });
  it('finds an overlapping CONFIRMED row', () => {
    const list = [row('A', '2099-06-12', '2099-06-18', 'confirmed')];
    expect(findConflict(list, '2099-06-10', '2099-06-15')?.id).toBe('A');
  });
  it('IGNORES declined rows', () => {
    const list = [row('A', '2099-06-12', '2099-06-18', 'declined')];
    expect(findConflict(list, '2099-06-10', '2099-06-15')).toBeNull();
  });
  it('returns null for back-to-back', () => {
    const list = [row('A', '2099-06-15', '2099-06-20')];
    expect(findConflict(list, '2099-06-10', '2099-06-15')).toBeNull();
  });
  it('skips the excluded id (for PATCH self-check)', () => {
    const list = [row('A', '2099-06-10', '2099-06-20')];
    // Without exclude → conflicts with itself
    expect(findConflict(list, '2099-06-10', '2099-06-20')?.id).toBe('A');
    // With exclude → no conflict
    expect(findConflict(list, '2099-06-10', '2099-06-20', 'A')).toBeNull();
  });
  it('returns the FIRST conflicting row when multiple overlap', () => {
    const list = [
      row('A', '2099-06-10', '2099-06-15'),
      row('B', '2099-06-13', '2099-06-18'),
    ];
    const c = findConflict(list, '2099-06-14', '2099-06-20');
    expect(c?.id === 'A' || c?.id === 'B').toBe(true);
  });
  it('returns null when proposed dates are entirely between two confirmed bookings', () => {
    const list = [
      row('A', '2099-06-01', '2099-06-05', 'confirmed'),
      row('B', '2099-07-01', '2099-07-05', 'confirmed'),
    ];
    expect(findConflict(list, '2099-06-10', '2099-06-15')).toBeNull();
  });
});
