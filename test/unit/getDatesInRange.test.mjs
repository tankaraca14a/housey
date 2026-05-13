import { describe, it, expect } from 'vitest';

// Inline copy of the production function. If we extract it to app/lib/scheduling.ts
// later we'll import + drop this duplicate.
function getDatesInRange(checkIn, checkOut) {
  const dates = [];
  const end = new Date(checkOut);
  const current = new Date(checkIn);
  while (current < end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

describe('getDatesInRange (checkout exclusive)', () => {
  it('5-night Jun 10 → Jun 15: blocks 10..14, NOT 15', () => {
    expect(getDatesInRange('2026-06-10', '2026-06-15')).toEqual([
      '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14',
    ]);
  });

  it('back-to-back bookings have NO overlap', () => {
    const a = getDatesInRange('2026-06-10', '2026-06-15');
    const b = getDatesInRange('2026-06-15', '2026-06-20');
    expect(a.filter((d) => b.includes(d))).toEqual([]);
  });

  it('crosses month boundary correctly', () => {
    expect(getDatesInRange('2026-06-28', '2026-07-03')).toEqual([
      '2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02',
    ]);
  });

  it('handles leap-year February (2028)', () => {
    expect(getDatesInRange('2028-02-27', '2028-03-01')).toEqual([
      '2028-02-27', '2028-02-28', '2028-02-29',
    ]);
  });

  it('1-night stay → single date', () => {
    expect(getDatesInRange('2026-06-10', '2026-06-11')).toEqual(['2026-06-10']);
  });

  it('same-day (degenerate) → empty array', () => {
    expect(getDatesInRange('2026-06-10', '2026-06-10')).toEqual([]);
  });
});
