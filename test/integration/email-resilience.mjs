// Resend "hiccup" resilience: the booking lifecycle MUST complete fully
// even when the email-send step fails. The integration suite runs with
// .env.local moved aside, so RESEND_API_KEY is unset and every email
// attempt returns emailSent=false. We verify:
//
//   1. POST /admin/bookings/:id/confirm with NO Resend env →
//      booking status flips to 'confirmed' in storage,
//      dates auto-block in blocked-dates,
//      response includes emailSent=false + emailError.
//
//   2. POST /admin/bookings/:id/decline with NO Resend env →
//      status flips to 'declined',
//      no calendar mutation,
//      response includes emailSent=false + emailError.
//
//   3. POST /api/booking (guest form) → row STILL saves to storage,
//      response signals 'emailSent: false' but success: true.
//
// Each test snapshots + restores state in finally.

import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': PASS };
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const beforeBookings = readFileSync('data/bookings.json', 'utf8');
const beforeBlocked = readFileSync('data/blocked-dates.json', 'utf8');

try {
  // ── 1. Confirm without Resend ────────────────────────────────────────────
  log('=== 1. /confirm with RESEND_API_KEY missing ===');
  const seed1 = await api('POST', '/api/admin/bookings', {
    name: 'Resilience Confirm Probe',
    email: 'resilience-confirm@example.invalid',
    phone: '+385 91 555 1111',
    checkIn: '2099-10-10',
    checkOut: '2099-10-15',
    guests: '2',
    message: 'resilience test',
    status: 'pending',
  });
  ok(seed1.status === 200, '1a: seed booking returned 200');
  const id1 = seed1.body.booking.id;

  const blockedBefore = JSON.parse((await api('GET', '/api/admin/blocked-dates')).body.blockedDates ? '[]' : '[]');
  const blockedSetBefore = new Set((await api('GET', '/api/admin/blocked-dates')).body.blockedDates || []);

  const conf = await api('POST', `/api/admin/bookings/${id1}/confirm`);
  ok(conf.status === 200, `1b: /confirm returned 200 even without Resend (${conf.status})`);
  ok(conf.body.success === true, `1c: response success=true`);
  ok(conf.body.emailSent === false, `1d: response emailSent=false (got ${conf.body.emailSent})`);
  ok(typeof conf.body.emailError === 'string' && conf.body.emailError.length > 0,
     `1e: response emailError populated ("${conf.body.emailError}")`);

  // Booking row really flipped
  const after1 = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === id1);
  ok(after1?.status === 'confirmed', `1f: booking status flipped to confirmed in storage (${after1?.status})`);

  // Dates really got blocked despite no email
  ok(conf.body.datesBlocked === true, `1g: response datesBlocked=true`);
  const blockedSetAfter = new Set((await api('GET', '/api/admin/blocked-dates')).body.blockedDates || []);
  ok(blockedSetAfter.has('2099-10-10') && blockedSetAfter.has('2099-10-14'),
     `1h: blocked-dates includes all booking nights`);
  ok(!blockedSetAfter.has('2099-10-15'),
     `1i: checkout day NOT blocked (back-to-back allowed)`);

  // ── 2. Decline without Resend ────────────────────────────────────────────
  log('\n=== 2. /decline with RESEND_API_KEY missing ===');
  const seed2 = await api('POST', '/api/admin/bookings', {
    name: 'Resilience Decline Probe',
    email: 'resilience-decline@example.invalid',
    phone: '+385 91 555 2222',
    checkIn: '2099-11-10',
    checkOut: '2099-11-15',
    guests: '2',
    message: 'resilience test',
    status: 'pending',
  });
  const id2 = seed2.body.booking.id;
  const blockedBeforeDecline = new Set((await api('GET', '/api/admin/blocked-dates')).body.blockedDates || []);

  const dec = await api('POST', `/api/admin/bookings/${id2}/decline`);
  ok(dec.status === 200, `2a: /decline returned 200 (${dec.status})`);
  ok(dec.body.success === true, `2b: response success=true`);
  ok(dec.body.emailSent === false, `2c: response emailSent=false`);
  ok(typeof dec.body.emailError === 'string' && dec.body.emailError.length > 0,
     `2d: emailError populated`);

  const after2 = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === id2);
  ok(after2?.status === 'declined', `2e: booking status flipped to declined (${after2?.status})`);
  const blockedAfterDecline = new Set((await api('GET', '/api/admin/blocked-dates')).body.blockedDates || []);
  ok(blockedAfterDecline.size === blockedBeforeDecline.size,
     `2f: /decline did NOT touch blocked-dates (${blockedAfterDecline.size} === ${blockedBeforeDecline.size})`);

  // ── 3. Guest /api/booking with no Resend ─────────────────────────────────
  log('\n=== 3. /api/booking (guest form) with no Resend ===');
  const guestRes = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Resilience Guest Probe',
      email: 'resilience-guest@example.invalid',
      phone: '+385 91 555 3333',
      checkIn: '2099-12-10',
      checkOut: '2099-12-12',
      guests: '2',
      message: 'guest resilience',
    }),
  });
  const guestBody = await guestRes.json();
  ok(guestRes.status === 200, `3a: /api/booking returned 200 (${guestRes.status})`);
  ok(guestBody.success === true, `3b: success=true`);
  ok(guestBody.emailSent === false, `3c: emailSent=false`);
  // Row should be in storage
  const guestSaved = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.email === 'resilience-guest@example.invalid');
  ok(!!guestSaved, `3d: guest booking saved to storage despite email failure`);
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  writeFileSync('data/bookings.json', beforeBookings);
  writeFileSync('data/blocked-dates.json', beforeBlocked);
  log('\n  (rolled back data files)');
}

log('');
log(failures === 0 ? 'PASS — Confirm/Decline/booking survive Resend hiccups ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
