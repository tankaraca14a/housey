// Validation + duplicate-submit + concurrency guards for /api/booking.
// These exist BECAUSE the booking now saves before the email step — bad
// payloads or accidental double-clicks must NOT bloat bookings.json.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/<layer>/ → repo root
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BASE = 'http://localhost:3457';

const before = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
function rollback() { writeFileSync(BOOKINGS, JSON.stringify(before, null, 2)); }

async function post(body) {
  const r = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const valid = {
  name: 'Guard Test Guest',
  email: 'guard@example.invalid',
  phone: '+385 91 555 9999',
  checkIn: '2026-10-10',
  checkOut: '2026-10-15',
  guests: '2',
  message: '',
};

// ── 1. Validation guards ──────────────────────────────────────────────────────
log('=== Validation guards ===');

for (const [label, mutate] of [
  ['missing name',         (b) => { delete b.name; }],
  ['short name',           (b) => { b.name = 'a'; }],
  ['bad email',            (b) => { b.email = 'not-an-email'; }],
  ['short phone',          (b) => { b.phone = '12'; }],
  ['bad checkIn format',   (b) => { b.checkIn = '10/10/2026'; }],
  ['bad checkOut format',  (b) => { b.checkOut = 'tomorrow'; }],
  ['checkOut before checkIn', (b) => { b.checkOut = '2026-10-09'; }],
  ['checkOut equals checkIn', (b) => { b.checkOut = b.checkIn; }],
  ['missing guests',       (b) => { delete b.guests; }],
]) {
  const payload = { ...valid };
  mutate(payload);
  const { status, body } = await post(payload);
  ok(status === 400, `${label} → 400 (got ${status}, body=${JSON.stringify(body)})`);
}

const afterValidation = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(afterValidation.length === before.length, 'no junk rows written by failed validations');

// ── 2. Happy path then duplicate ──────────────────────────────────────────────
log('\n=== Duplicate guard ===');

const r1 = await post(valid);
ok(r1.status === 200, `first POST → 200 (got ${r1.status})`);
ok(r1.body.success === true, 'first POST body.success === true');
ok(typeof r1.body.id === 'string' && r1.body.id.length > 8, 'first POST returns a booking id');
ok(r1.body.duplicate !== true, 'first POST is NOT flagged duplicate');

const mid = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(mid.length === before.length + 1, `bookings.json grew by 1 (${before.length} → ${mid.length})`);

// Same email + same dates, immediately → duplicate path
const r2 = await post(valid);
ok(r2.status === 200, `duplicate POST → 200 (got ${r2.status})`);
ok(r2.body.duplicate === true, 'duplicate POST flagged duplicate:true');

const afterDup = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(afterDup.length === mid.length, `duplicate did NOT write a second row (still ${afterDup.length})`);

// Different email + SAME dates → no longer "not duplicate"; the new overlap
// detection (covered fully in test/integration/booking-conflict.mjs) returns 409.
const r3 = await post({ ...valid, email: 'different@example.invalid' });
ok(r3.status === 409, `different-email-same-dates → 409 conflict (got ${r3.status})`);
ok(typeof r3.body.error === 'string' && r3.body.error.includes('overlap'),
  `409 carries an overlap message`);
const afterDiff = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(afterDiff.length === mid.length, `conflict did NOT write a row (count ${afterDiff.length})`);

// Different dates → not duplicate, no overlap, should write
const r4 = await post({ ...valid, checkIn: '2026-11-01', checkOut: '2026-11-06' });
ok(r4.status === 200 && r4.body.duplicate !== true, 'different dates are NOT duplicate');
const afterDates = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(afterDates.length === afterDiff.length + 1, 'different dates DID write a row');

// ── 3. Cleanup ────────────────────────────────────────────────────────────────
rollback();
const final = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(final.length === before.length, `bookings.json rolled back (final ${final.length} === pre ${before.length})`);

log('');
log(failures === 0 ? 'PASS — all guards behave correctly' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
