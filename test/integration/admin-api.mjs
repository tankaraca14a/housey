// API-level resilience + capability tests for the admin booking surface.
// Exercises every endpoint and every error path. Idempotent: snapshots
// bookings.json at start and restores at the end no matter what happens.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/<layer>/ → repo root
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BLOCKED = join(REPO, 'data', 'blocked-dates.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initialBookings = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
const initialBlocked = JSON.parse(readFileSync(BLOCKED, 'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
async function api(method, path, { body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['x-admin-password'] = PASS;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}

function restore() {
  writeFileSync(BOOKINGS, JSON.stringify(initialBookings, null, 2));
  writeFileSync(BLOCKED, JSON.stringify(initialBlocked, null, 2));
}

const valid = {
  name: 'API Suite Guest',
  email: 'apisuite@example.invalid',
  phone: '+385 91 555 0000',
  checkIn: '2099-04-10',
  checkOut: '2099-04-15',
  guests: '2',
  message: 'API suite probe',
};

try {
  // ── 1. AUTH ─────────────────────────────────────────────────────────────────
  log('=== 1. Auth ===');
  for (const [m, p] of [
    ['GET',    '/api/admin/bookings'],
    ['POST',   '/api/admin/bookings'],
    ['POST',   '/api/admin/blocked-dates'],
    ['PATCH',  '/api/admin/bookings/anything'],
    ['DELETE', '/api/admin/bookings/anything'],
    ['POST',   '/api/admin/bookings/anything/confirm'],
    ['POST',   '/api/admin/bookings/anything/decline'],
  ]) {
    const r = await api(m, p, { auth: false, body: m !== 'GET' ? {} : undefined });
    ok(r.status === 401, `1-${m} ${p} without password → 401 (got ${r.status})`);
  }

  // ── 2. CREATE (admin) ──────────────────────────────────────────────────────
  log('\n=== 2. POST /api/admin/bookings (manual create) ===');
  const r2bad = await api('POST', '/api/admin/bookings', { body: { ...valid, name: '' } });
  ok(r2bad.status === 400 && r2bad.body.error === 'name required', '2a: empty name → 400 name required');

  const r2 = await api('POST', '/api/admin/bookings', { body: valid });
  ok(r2.status === 200 && r2.body.success === true && r2.body.booking?.id,
    `2b: valid POST → 200 with booking.id (${r2.body.booking?.id})`);
  const id1 = r2.body.booking.id;

  // Use different (non-overlapping) dates so the new conflict detection
  // doesn't reject this as colliding with r2's range.
  const r2c = await api('POST', '/api/admin/bookings', { body: { ...valid, status: 'confirmed', email: 'a@b.com', checkIn: '2099-05-10', checkOut: '2099-05-15' } });
  ok(r2c.status === 200 && r2c.body.booking.status === 'confirmed',
    `2c: status=confirmed on create persists (got ${r2c.status})`);
  const id2 = r2c.body.booking.id;

  const r2d = await api('POST', '/api/admin/bookings', { body: { ...valid, status: 'bogus' } });
  ok(r2d.status === 400, `2d: bogus status → 400 (got ${r2d.status} ${JSON.stringify(r2d.body)})`);

  // ── 3. LIST ────────────────────────────────────────────────────────────────
  log('\n=== 3. GET /api/admin/bookings ===');
  const list1 = await api('GET', '/api/admin/bookings');
  ok(list1.status === 200 && Array.isArray(list1.body.bookings), '3a: returns 200 with array');
  ok(list1.body.bookings.some((b) => b.id === id1) && list1.body.bookings.some((b) => b.id === id2),
    '3b: both created bookings present in list');

  // ── 4. PATCH (edit any field, free status) ─────────────────────────────────
  log('\n=== 4. PATCH /api/admin/bookings/[id] ===');
  const r4a = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { name: 'Renamed Guest' } });
  ok(r4a.status === 200 && r4a.body.booking?.name === 'Renamed Guest', '4a: rename → 200');

  const r4b = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { status: 'declined' } });
  ok(r4b.status === 200 && r4b.body.booking?.status === 'declined', '4b: status pending → declined');

  const r4c = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { status: 'pending' } });
  ok(r4c.status === 200 && r4c.body.booking?.status === 'pending', '4c: status declined → pending (reverse direction)');

  const r4d = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { checkIn: '2099-05-01', checkOut: '2099-05-08' } });
  ok(r4d.status === 200 && r4d.body.booking?.checkIn === '2099-05-01' && r4d.body.booking?.checkOut === '2099-05-08',
    '4d: shift dates atomically');

  const r4e = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { checkIn: '2099-12-01', checkOut: '2099-11-01' } });
  ok(r4e.status === 400 && /checkOut/i.test(r4e.body.error), `4e: checkOut < checkIn → 400 (${r4e.body.error})`);

  const r4f = await api('PATCH', `/api/admin/bookings/${id1}`, { body: {} });
  ok(r4f.status === 400, '4f: empty patch body → 400');

  const r4g = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { email: 'not-an-email' } });
  ok(r4g.status === 400, '4g: bad email → 400');

  const r4h = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { status: 'bogus' } });
  ok(r4h.status === 400, '4h: bogus status → 400');

  const r4i = await api('PATCH', '/api/admin/bookings/00000000-0000-0000-0000-000000000000', { body: { status: 'declined' } });
  ok(r4i.status === 404, '4i: unknown id → 404');

  // ── 5. CONFIRM (legacy shortcut: pending → confirmed + auto-block dates) ────
  log('\n=== 5. POST .../confirm ===');
  const blockedBefore = JSON.parse(readFileSync(BLOCKED, 'utf-8')).length;
  // Use id1 (currently pending after our PATCHes)
  const r5 = await api('POST', `/api/admin/bookings/${id1}/confirm`);
  ok(r5.status === 200, `5a: confirm → 200 (got ${r5.status})`);

  const after5 = await api('GET', '/api/admin/bookings');
  const conf = after5.body.bookings.find((b) => b.id === id1);
  ok(conf?.status === 'confirmed', `5b: status flipped to confirmed`);

  const blockedAfter = JSON.parse(readFileSync(BLOCKED, 'utf-8'));
  // Checkout exclusive: [2099-05-01, 2099-05-08) = 7 dates added
  const added = blockedAfter.length - blockedBefore;
  ok(added === 7, `5c: 7 blocked-dates added (checkout exclusive), got ${added}`);
  ok(blockedAfter.includes('2099-05-01') && blockedAfter.includes('2099-05-07') && !blockedAfter.includes('2099-05-08'),
    '5d: includes checkIn..checkOut-1, excludes checkOut day');

  // ── 6. DECLINE shortcut ────────────────────────────────────────────────────
  log('\n=== 6. POST .../decline ===');
  const r6 = await api('POST', `/api/admin/bookings/${id2}/decline`);
  ok(r6.status === 200, `6a: decline → 200`);
  const after6 = await api('GET', '/api/admin/bookings');
  const declined = after6.body.bookings.find((b) => b.id === id2);
  ok(declined?.status === 'declined', '6b: status flipped to declined');

  // ── 7. DELETE ──────────────────────────────────────────────────────────────
  log('\n=== 7. DELETE /api/admin/bookings/[id] ===');
  const r7a = await api('DELETE', `/api/admin/bookings/${id1}`);
  ok(r7a.status === 200 && r7a.body.deleted === id1, '7a: delete → 200');
  const r7b = await api('DELETE', `/api/admin/bookings/${id1}`);
  ok(r7b.status === 404, '7b: re-delete → 404');
  const r7c = await api('DELETE', `/api/admin/bookings/${id2}`);
  ok(r7c.status === 200, '7c: delete second test row');

  // ── 8. RACE CONDITION: 10 concurrent creates must all land ─────────────────
  log('\n=== 8. Concurrent create race (mutex test) ===');
  const beforeRace = (await api('GET', '/api/admin/bookings')).body.bookings.length;
  // Each iteration gets a UNIQUE date range so overlap detection can't
  // reject — this test is about concurrency, not conflict.
  const racers = Array.from({ length: 10 }, (_, i) =>
    api('POST', '/api/admin/bookings', {
      body: {
        ...valid,
        name: `Race #${i}`, email: `race-${i}@x.com`, message: `${i}`,
        checkIn: `2199-${String(1 + Math.floor(i / 3)).padStart(2, '0')}-${String(1 + (i % 3) * 10).padStart(2, '0')}`,
        checkOut: `2199-${String(1 + Math.floor(i / 3)).padStart(2, '0')}-${String(6 + (i % 3) * 10).padStart(2, '0')}`,
      },
    })
  );
  const raceResults = await Promise.all(racers);
  const successes = raceResults.filter((r) => r.status === 200);
  ok(successes.length === 10, `8a: all 10 concurrent creates returned 200 (${successes.length})`);
  const ids = new Set(successes.map((r) => r.body.booking.id));
  ok(ids.size === 10, `8b: all 10 ids are unique (${ids.size})`);
  const afterRace = (await api('GET', '/api/admin/bookings')).body.bookings.length;
  ok(afterRace === beforeRace + 10, `8c: bookings.json grew by exactly 10 (${beforeRace} → ${afterRace}) — no lost updates`);

  // Cleanup the race rows
  for (const r of successes) {
    await api('DELETE', `/api/admin/bookings/${r.body.booking.id}`);
  }

  // ── 9. DUPLICATE GUARD on /api/booking still works ─────────────────────────
  log('\n=== 9. Guest duplicate guard ===');
  const dup1 = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, name: 'Dup Test', email: 'dup@example.invalid' }),
  });
  const dup1Body = await dup1.json();
  ok(dup1.status === 200 && dup1Body.duplicate !== true, '9a: first guest POST → not duplicate');
  const dup2 = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...valid, name: 'Dup Test', email: 'dup@example.invalid' }),
  });
  const dup2Body = await dup2.json();
  ok(dup2.status === 200 && dup2Body.duplicate === true, '9b: duplicate POST → flagged');
  // Clean up the dup row
  await api('DELETE', `/api/admin/bookings/${dup1Body.id}`);
} finally {
  restore();
  const final = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
  const finalBlocked = JSON.parse(readFileSync(BLOCKED, 'utf-8'));
  ok(final.length === initialBookings.length, `restore: bookings ${final.length} === ${initialBookings.length}`);
  ok(finalBlocked.length === initialBlocked.length, `restore: blocked-dates ${finalBlocked.length} === ${initialBlocked.length}`);
}

log('');
log(failures === 0 ? 'PASS — admin API surface fully verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
