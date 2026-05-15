// Integration test: prove the review repo doesn't corrupt under
// concurrent writes. The file backend uses an atomic-write mutex
// (data-store.ts); KV uses Redis ops. Either way, simultaneous
// PATCHes of the same row must result in: both calls return 200,
// the row exists, and its final state matches ONE of the two
// PATCH payloads exactly — never a half-merged hybrid.
//
// Snapshot+restore data/reviews.json in finally.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': PASS };
  const r = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const before = existsSync('data/reviews.json')
  ? readFileSync('data/reviews.json', 'utf8')
  : '[]\n';

const createdIds = [];

try {
  // ── 1. Create a row to mutate concurrently ────────────────────────────────
  log('=== 1. Seed one review ===');
  const seed = await api('POST', '/api/admin/reviews', {
    author: 'ConcurrentProbe',
    source: 'Airbnb',
    rating: 3,
    quote: 'Initial state.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 100,
  });
  ok(seed.status === 200 && seed.body.review?.id, `1a: created`);
  const id = seed.body.review.id;
  createdIds.push(id);

  // ── 2. Fire two PATCHes simultaneously ────────────────────────────────────
  log('\n=== 2. Two simultaneous PATCHes ===');
  // PATCH A: rating=5, quote="A wins"
  // PATCH B: rating=1, quote="B wins"
  // Both should return 200 and the final row should be EXACTLY one of them.
  const [a, b] = await Promise.all([
    api('PATCH', `/api/admin/reviews/${id}`, { rating: 5, quote: 'A wins' }),
    api('PATCH', `/api/admin/reviews/${id}`, { rating: 1, quote: 'B wins' }),
  ]);
  ok(a.status === 200, `2a: PATCH A → 200 (got ${a.status})`);
  ok(b.status === 200, `2b: PATCH B → 200 (got ${b.status})`);

  // Read the final state
  const final = await api('GET', '/api/admin/reviews');
  const row = (final.body.reviews || []).find((r) => r.id === id);
  ok(!!row, `2c: row still exists`);

  // The final state must be ONE of (A) or (B) — never a half-merge.
  const isPureA = row?.rating === 5 && row?.quote === 'A wins';
  const isPureB = row?.rating === 1 && row?.quote === 'B wins';
  ok(isPureA || isPureB,
    `2d: final state is purely A or purely B (got rating=${row?.rating} quote="${row?.quote}")`);

  // ── 3. Storm test: 20 simultaneous PATCHes with distinct sortOrders ───────
  log('\n=== 3. Storm: 20 simultaneous PATCHes ===');
  const ops = Array.from({ length: 20 }, (_, i) =>
    api('PATCH', `/api/admin/reviews/${id}`, { sortOrder: 1000 + i }),
  );
  const results = await Promise.all(ops);
  const okCount = results.filter((r) => r.status === 200).length;
  ok(okCount === 20, `3a: all 20 PATCHes returned 200 (got ${okCount})`);

  const final2 = await api('GET', '/api/admin/reviews');
  const row2 = (final2.body.reviews || []).find((r) => r.id === id);
  // sortOrder must be one of the 20 values we sent
  ok(row2?.sortOrder >= 1000 && row2?.sortOrder <= 1019,
    `3b: sortOrder is one of the storm values (got ${row2?.sortOrder})`);
  ok(typeof row2?.author === 'string' && row2.author.length > 0,
    `3c: row's other fields not corrupted (author="${row2?.author}")`);

  // ── 4. Concurrent DELETE + PATCH ──────────────────────────────────────────
  log('\n=== 4. Concurrent DELETE + PATCH ===');
  const seed2 = await api('POST', '/api/admin/reviews', {
    author: 'ConcurrentDelProbe',
    source: 'Airbnb',
    rating: 3,
    quote: 'Will be deleted under fire.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 200,
  });
  const id2 = seed2.body.review.id;
  createdIds.push(id2);

  const [d, p] = await Promise.all([
    api('DELETE', `/api/admin/reviews/${id2}`),
    api('PATCH', `/api/admin/reviews/${id2}`, { rating: 5 }),
  ]);
  // Outcomes are racy but bounded:
  //   * One of DELETE or PATCH wins first
  //   * The other returns either 200 (operated before peer) or 404 (peer removed first)
  ok([200, 404].includes(d.status), `4a: DELETE → 200|404 (got ${d.status})`);
  ok([200, 404].includes(p.status), `4b: PATCH → 200|404 (got ${p.status})`);
  // After both, the row is either gone OR has the patched rating; never corrupt.
  const final3 = await api('GET', '/api/admin/reviews');
  const row3 = (final3.body.reviews || []).find((r) => r.id === id2);
  if (row3) {
    ok(row3.rating === 5, `4c: if row survived, rating reflects PATCH (got ${row3.rating})`);
  } else {
    ok(true, `4c: row removed; final state coherent`);
  }
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  for (const id of createdIds) {
    try { await api('DELETE', `/api/admin/reviews/${id}`); } catch {}
  }
  writeFileSync('data/reviews.json', before);
  log('\n  (rolled back data/reviews.json)');
}

log('');
log(failures === 0 ? 'PASS — concurrent review writes never corrupt state ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
