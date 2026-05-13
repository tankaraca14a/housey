// Hardcore concurrency + data-integrity tests.
// Runs against localhost:3457 (file backend OR KV — whichever is configured).
// Snapshots both data files at start and restores at end.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/integration/ → repo root
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BLOCKED  = join(REPO, 'data', 'blocked-dates.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const initialBookings = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
const initialBlocked  = JSON.parse(readFileSync(BLOCKED,  'utf-8'));

function valid(i = 0) {
  return {
    name: `Stress Guest #${i}`,
    email: `stress-${Date.now()}-${i}@x.invalid`,
    phone: '+12345',
    checkIn: '2099-04-10',
    checkOut: '2099-04-15',
    guests: '2',
    message: `concurrency probe ${i}`,
  };
}

try {
  // ── 1. 50 concurrent admin creates ─────────────────────────────────────────
  log('=== 1. 50 concurrent admin creates ===');
  const before1 = (await api('GET', '/api/admin/bookings')).body.bookings.length;
  const racers1 = Array.from({ length: 50 }, (_, i) =>
    api('POST', '/api/admin/bookings', valid(i))
  );
  const r1 = await Promise.all(racers1);
  const succ1 = r1.filter((r) => r.status === 200);
  ok(succ1.length === 50, `1a: 50/50 creates returned 200 (${succ1.length})`);
  const ids1 = new Set(succ1.map((r) => r.body.booking.id));
  ok(ids1.size === 50, `1b: all 50 ids unique (${ids1.size})`);
  const after1 = (await api('GET', '/api/admin/bookings')).body.bookings.length;
  ok(after1 === before1 + 50, `1c: bookings grew by exactly 50 (${before1} → ${after1}) — no lost updates`);

  // Cleanup
  for (const r of succ1) await api('DELETE', `/api/admin/bookings/${r.body.booking.id}`);

  // ── 2. 30 concurrent PATCHes on 30 separate rows ───────────────────────────
  log('\n=== 2. 30 concurrent PATCHes (different rows) ===');
  // Create 30 rows sequentially first
  const targets = [];
  for (let i = 0; i < 30; i++) {
    const r = await api('POST', '/api/admin/bookings', valid(i));
    targets.push(r.body.booking);
  }
  ok(targets.length === 30, `2a: 30 seed rows created`);
  // Now mass-PATCH
  const racers2 = targets.map((t, i) =>
    api('PATCH', `/api/admin/bookings/${t.id}`, { name: `Renamed #${i}`, status: 'declined' })
  );
  const r2 = await Promise.all(racers2);
  ok(r2.filter((x) => x.status === 200).length === 30, '2b: all 30 PATCHes returned 200');
  // Verify each
  const after2 = (await api('GET', '/api/admin/bookings')).body.bookings;
  const verified = targets.every((t, i) => {
    const row = after2.find((b) => b.id === t.id);
    return row && row.name === `Renamed #${i}` && row.status === 'declined';
  });
  ok(verified, '2c: every patched row has the correct name + status');

  // Cleanup
  for (const t of targets) await api('DELETE', `/api/admin/bookings/${t.id}`);

  // ── 3. 20 concurrent PATCHes on the SAME row → last-writer-wins ───────────
  log('\n=== 3. 20 concurrent PATCHes on the SAME row (last-write semantics) ===');
  const single = (await api('POST', '/api/admin/bookings', valid(99))).body.booking;
  const racers3 = Array.from({ length: 20 }, (_, i) =>
    api('PATCH', `/api/admin/bookings/${single.id}`, { name: `Conflict-${i}` })
  );
  const r3 = await Promise.all(racers3);
  const all200 = r3.every((x) => x.status === 200);
  ok(all200, `3a: all 20 PATCHes returned 200 (last-writer-wins, no 5xx)`);
  // The final row must have one of Conflict-0..19 — we don't care which
  const finalSingle = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === single.id);
  ok(/^Conflict-\d+$/.test(finalSingle?.name ?? ''), `3b: final name matches Conflict-\\d+ (${finalSingle?.name})`);
  await api('DELETE', `/api/admin/bookings/${single.id}`);

  // ── 4. Delete-during-write race ────────────────────────────────────────────
  log('\n=== 4. Delete-during-write race ===');
  const victim = (await api('POST', '/api/admin/bookings', valid(0))).body.booking;
  // Fire delete + patch simultaneously
  const [delRes, patchRes] = await Promise.all([
    api('DELETE', `/api/admin/bookings/${victim.id}`),
    api('PATCH', `/api/admin/bookings/${victim.id}`, { name: 'ShouldNotPersist' }),
  ]);
  // One of them wins. If delete wins, patch returns 404. If patch wins, the
  // row exists with the new name until the delete catches up — which it does
  // because delete is a single SREM+DEL atomic pair. Either outcome is valid;
  // we just verify the row ends up gone.
  const checkVictim = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === victim.id);
  ok(checkVictim === undefined, `4a: row gone after delete+patch race (delete=${delRes.status}, patch=${patchRes.status})`);

  // ── 5. Big payload ─────────────────────────────────────────────────────────
  log('\n=== 5. Long message (10 KB) ===');
  const longMsg = 'A'.repeat(10_000);
  const r5 = await api('POST', '/api/admin/bookings', { ...valid(0), name: 'Big Payload', message: longMsg });
  ok(r5.status === 200, `5a: 10KB message accepted (${r5.status})`);
  ok(r5.body.booking?.message?.length === 10_000, `5b: full message round-trips`);
  await api('DELETE', `/api/admin/bookings/${r5.body.booking.id}`);

  // ── 6. Unicode ─────────────────────────────────────────────────────────────
  log('\n=== 6. Unicode preservation (HR + emoji + RTL) ===');
  const uni = await api('POST', '/api/admin/bookings', {
    ...valid(0),
    name: 'Šžćčđ čžešć 🇭🇷',
    message: 'مرحبا بالعالم — שלום עולם — 中文测试',
  });
  ok(uni.status === 200, '6a: unicode payload accepted');
  ok(uni.body.booking?.name === 'Šžćčđ čžešć 🇭🇷', `6b: HR diacritics + emoji round-trip`);
  ok(uni.body.booking?.message.includes('中文'), '6c: CJK + RTL round-trip');
  await api('DELETE', `/api/admin/bookings/${uni.body.booking.id}`);

  // ── 7. Index integrity: 100 cycles of create+delete ────────────────────────
  log('\n=== 7. 100 create+delete cycles (index integrity) ===');
  const before7 = (await api('GET', '/api/admin/bookings')).body.bookings.length;
  for (let i = 0; i < 100; i++) {
    const c = await api('POST', '/api/admin/bookings', valid(i));
    if (c.status !== 200) { failures++; log(`  ✗ cycle ${i} create failed`); break; }
    const d = await api('DELETE', `/api/admin/bookings/${c.body.booking.id}`);
    if (d.status !== 200) { failures++; log(`  ✗ cycle ${i} delete failed`); break; }
  }
  const after7 = (await api('GET', '/api/admin/bookings')).body.bookings.length;
  ok(after7 === before7, `7a: 100 cycles complete, count unchanged (${before7} → ${after7})`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Hard-reset the data files to what we found
  writeFileSync(BOOKINGS, JSON.stringify(initialBookings, null, 2));
  writeFileSync(BLOCKED,  JSON.stringify(initialBlocked,  null, 2));
}

log('');
log(failures === 0
  ? 'PASS — stress + integrity suite green ✓'
  : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
