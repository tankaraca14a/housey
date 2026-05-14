// End-to-end tests for the booking-overlap detection added with the
// rangesOverlap / findConflict helpers. Drives /api/booking,
// /api/admin/bookings, and /api/admin/bookings/[id] PATCH.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initial = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

async function guestPost(body) {
  const r = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function adminPost(body, { force = false } = {}) {
  const r = await fetch(`${BASE}/api/admin/bookings${force ? '?force=1' : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function adminPatch(id, body, { force = false } = {}) {
  const r = await fetch(`${BASE}/api/admin/bookings/${id}${force ? '?force=1' : ''}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function adminDelete(id) {
  await fetch(`${BASE}/api/admin/bookings/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': PASS },
  });
}

const baseGuest = {
  name: 'Conflict Test',
  phone: '+12345',
  guests: '2',
};

try {
  // ── 1. Guest: two with same dates → second 409 ────────────────────────────
  log('=== 1. Two guests, same dates ===');
  const a1 = await guestPost({ ...baseGuest, email: 'a@x.com', checkIn: '2099-08-01', checkOut: '2099-08-06' });
  ok(a1.status === 200, `1a: first guest → 200 (got ${a1.status})`);
  const a2 = await guestPost({ ...baseGuest, email: 'b@x.com', checkIn: '2099-08-01', checkOut: '2099-08-06' });
  ok(a2.status === 409, `1b: second guest same dates → 409 (got ${a2.status})`);
  ok(typeof a2.body.error === 'string' && /overlap/i.test(a2.body.error), `1c: 409 carries overlap message`);
  ok(a2.body.conflict?.checkIn === '2099-08-01', `1d: response carries the conflicting dates`);

  // ── 2. Guest: back-to-back → both 200 ────────────────────────────────────
  log('\n=== 2. Back-to-back guests (checkout = next check-in) ===');
  const b1 = await guestPost({ ...baseGuest, email: 'c@x.com', checkIn: '2099-09-01', checkOut: '2099-09-06' });
  ok(b1.status === 200, `2a: first guest → 200`);
  const b2 = await guestPost({ ...baseGuest, email: 'd@x.com', checkIn: '2099-09-06', checkOut: '2099-09-11' });
  ok(b2.status === 200, `2b: back-to-back guest → 200 (got ${b2.status})`);

  // ── 3. Guest: overlap with CONFIRMED is also rejected ────────────────────
  log('\n=== 3. Overlap with confirmed booking ===');
  // First promote a1 to confirmed (via PATCH; not the legacy /confirm shortcut
  // because we want to control side effects)
  await adminPatch(a1.body.id, { status: 'confirmed' });
  const c3 = await guestPost({ ...baseGuest, email: 'e@x.com', checkIn: '2099-08-03', checkOut: '2099-08-09' });
  ok(c3.status === 409, `3a: overlapping a CONFIRMED row → 409 (got ${c3.status})`);

  // ── 4. Overlap with DECLINED is allowed ──────────────────────────────────
  log('\n=== 4. Overlap with declined booking ===');
  await adminPatch(a1.body.id, { status: 'declined' });
  const c4 = await guestPost({ ...baseGuest, email: 'f@x.com', checkIn: '2099-08-01', checkOut: '2099-08-06' });
  ok(c4.status === 200, `4a: overlapping a DECLINED row → 200 (got ${c4.status})`);
  if (c4.body.id) await adminDelete(c4.body.id);

  // Restore a1 to declined to keep things clean
  // ── 5. Admin manual create conflict → 409 ────────────────────────────────
  log('\n=== 5. Admin manual create conflict ===');
  const adm5 = await adminPost({
    ...baseGuest, email: 'admin1@x.com',
    checkIn: '2099-09-01', checkOut: '2099-09-06',  // overlaps b1
  });
  ok(adm5.status === 409, `5a: admin POST overlap → 409 (got ${adm5.status})`);

  // ── 6. Admin force override → 200 ────────────────────────────────────────
  log('\n=== 6. Admin force=1 overrides conflict ===');
  const adm6 = await adminPost({
    ...baseGuest, email: 'admin2@x.com',
    checkIn: '2099-09-01', checkOut: '2099-09-06',
  }, { force: true });
  ok(adm6.status === 200, `6a: admin POST with ?force=1 → 200 (got ${adm6.status})`);
  if (adm6.body.booking?.id) await adminDelete(adm6.body.booking.id);

  // ── 7. PATCH to overlapping dates → 409 ─────────────────────────────────
  log('\n=== 7. PATCH dates → conflict ===');
  // b1 is at 09-01..09-06. b2 is at 09-06..09-11. Try to shift b2 back to overlap.
  const p7 = await adminPatch(b2.body.id, { checkIn: '2099-09-04', checkOut: '2099-09-08' });
  ok(p7.status === 409, `7a: PATCH dates causing overlap → 409 (got ${p7.status})`);

  // ── 8. PATCH to overlapping dates with force=1 → 200 ─────────────────────
  log('\n=== 8. PATCH dates with force=1 ===');
  const p8 = await adminPatch(b2.body.id, { checkIn: '2099-09-04', checkOut: '2099-09-08' }, { force: true });
  ok(p8.status === 200, `8a: PATCH dates + ?force=1 → 200 (got ${p8.status})`);

  // ── 9. PATCH non-date field → no conflict check ─────────────────────────
  log('\n=== 9. PATCH non-date field skips conflict check ===');
  const p9 = await adminPatch(b1.body.id, { name: 'Renamed' });
  ok(p9.status === 200, `9a: PATCH name only → 200 (got ${p9.status})`);

  // ── 10. PATCH dates that don't actually overlap → 200 ───────────────────
  log('\n=== 10. PATCH dates to non-overlapping range ===');
  const p10 = await adminPatch(b1.body.id, { checkIn: '2099-10-01', checkOut: '2099-10-06' });
  ok(p10.status === 200, `10a: PATCH to non-overlapping range → 200 (got ${p10.status})`);
} finally {
  writeFileSync(BOOKINGS, JSON.stringify(initial, null, 2));
}

log('');
log(failures === 0 ? 'PASS — booking conflict / overlap detection verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
