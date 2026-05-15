// Integration test: /api/reviews + /api/admin/reviews CRUD against a
// running local server. Snapshot+restore data/reviews.json in finally.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['x-admin-password'] = PASS;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const before = existsSync('data/reviews.json')
  ? readFileSync('data/reviews.json', 'utf8')
  : '[]\n';

try {
  // ── 1. Auth ─────────────────────────────────────────────────────────────────
  log('=== 1. Auth ===');
  for (const [m, p, hasBody] of [
    ['GET',    '/api/admin/reviews', false],
    ['POST',   '/api/admin/reviews', true],
    ['PATCH',  '/api/admin/reviews/anything', true],
    ['DELETE', '/api/admin/reviews/anything', false],
  ]) {
    const r = await api(m, p, hasBody ? {} : undefined, false);
    ok(r.status === 401, `1-${m} ${p} without password → 401 (got ${r.status})`);
  }
  // Public GET works without auth
  const pub = await api('GET', '/api/reviews', undefined, false);
  ok(pub.status === 200 && Array.isArray(pub.body.reviews), `1-public GET /api/reviews → 200 + array`);

  // ── 2. Validation ───────────────────────────────────────────────────────────
  log('\n=== 2. Validation ===');
  const bad = await api('POST', '/api/admin/reviews', { author: '', source: 'x', rating: 5, quote: 'q', date: '2025-08-15', featured: false, sortOrder: 1 });
  ok(bad.status === 400 && /author/.test(bad.body.error || ''), `2a: empty author → 400 (${bad.body.error})`);

  const bad2 = await api('POST', '/api/admin/reviews', { author: 'A', source: 'x', rating: 6, quote: 'q', date: '2025-08-15', featured: false, sortOrder: 1 });
  ok(bad2.status === 400 && /rating/.test(bad2.body.error || ''), `2b: rating=6 → 400`);

  // ── 3. Create + read ───────────────────────────────────────────────────────
  log('\n=== 3. Create + read ===');
  const c = await api('POST', '/api/admin/reviews', {
    author: 'Test Anna',
    source: 'Airbnb',
    rating: 5,
    quote: 'Integration test review',
    date: '2025-08-15',
    featured: true,
    sortOrder: 100,
  });
  ok(c.status === 200, `3a: create → 200`);
  const id = c.body.review?.id;
  ok(typeof id === 'string' && id.length > 0, `3b: returned id (${id})`);

  const list = await api('GET', '/api/admin/reviews');
  const found = list.body.reviews?.find((r) => r.id === id);
  ok(!!found, `3c: created row appears in admin list`);
  ok(found?.featured === true, `3d: featured flag persisted`);

  const pub2 = await api('GET', '/api/reviews', undefined, false);
  const pubFound = pub2.body.reviews?.find((r) => r.id === id);
  ok(!!pubFound, `3e: created row appears in public list`);

  // ── 4. Patch ────────────────────────────────────────────────────────────────
  log('\n=== 4. PATCH ===');
  const p1 = await api('PATCH', `/api/admin/reviews/${id}`, { rating: 4, featured: false });
  ok(p1.status === 200 && p1.body.review?.rating === 4, `4a: rating updated to 4`);
  ok(p1.body.review?.featured === false, `4b: featured updated to false`);

  const p2 = await api('PATCH', `/api/admin/reviews/${id}`, { rating: 99 });
  ok(p2.status === 400, `4c: bad rating in patch → 400`);

  const p3 = await api('PATCH', '/api/admin/reviews/nope-no-id', { rating: 4 });
  ok(p3.status === 404, `4d: unknown id → 404`);

  // ── 5. Delete ───────────────────────────────────────────────────────────────
  log('\n=== 5. DELETE ===');
  const d = await api('DELETE', `/api/admin/reviews/${id}`);
  ok(d.status === 200, `5a: delete → 200`);

  const after = await api('GET', '/api/admin/reviews');
  ok(!after.body.reviews?.some((r) => r.id === id), `5b: row gone from list`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  writeFileSync('data/reviews.json', before);
  log('\n  (rolled back data/reviews.json)');
}

log('');
log(failures === 0 ? 'PASS — reviews API verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
