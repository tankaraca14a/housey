// Blocked-dates POST edge cases. Auth, validation, large sets, idempotency.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const FILE = join(REPO, 'data', 'blocked-dates.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initial = JSON.parse(readFileSync(FILE, 'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.auth !== false) headers['x-admin-password'] = PASS;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

try {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  log('=== 1. Auth on POST /api/admin/blocked-dates ===');
  const noAuth = await api('POST', '/api/admin/blocked-dates', { blockedDates: [] }, { auth: false });
  ok(noAuth.status === 401, `1a: no password → 401 (got ${noAuth.status})`);

  // ── 2. Validation ────────────────────────────────────────────────────────
  log('\n=== 2. Validation rejection paths ===');
  for (const [label, body, want] of [
    ['not an object',  'string-not-json', undefined],
    ['no blockedDates field', {}, 'must be an array'],
    ['non-array value', { blockedDates: 'oops' }, 'must be an array'],
    ['array with bad entry', { blockedDates: ['2026-01-01', 'badness'] }, 'YYYY-MM-DD'],
    ['array with number entry', { blockedDates: ['2026-01-01', 42] }, 'YYYY-MM-DD'],
    ['array with wrong date format', { blockedDates: ['01-01-2026'] }, 'YYYY-MM-DD'],
  ]) {
    const r = typeof body === 'string'
      ? await (await fetch(`${BASE}/api/admin/blocked-dates`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS }, body })).json().then((j) => ({ status: 400, body: j })).catch(() => ({ status: 400, body: {} }))
      : await api('POST', '/api/admin/blocked-dates', body);
    if (typeof body === 'string') {
      // raw garbage — check the actual response
      const raw = await fetch(`${BASE}/api/admin/blocked-dates`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS }, body });
      ok(raw.status === 400, `2-${label} → 400 (raw garbage)`);
    } else {
      const passes = r.status === 400 && (!want || (typeof r.body.error === 'string' && r.body.error.includes(want)));
      ok(passes, `2-${label} → 400 ${want ? `containing "${want}"` : ''} (got ${r.status} ${JSON.stringify(r.body)})`);
    }
  }

  // ── 3. Idempotency: write the same set twice ─────────────────────────────
  log('\n=== 3. Idempotency ===');
  const set1 = (await api('POST', '/api/admin/blocked-dates', { blockedDates: initial })).body;
  ok(set1.success === true, '3a: first POST succeeds');
  const set2 = (await api('POST', '/api/admin/blocked-dates', { blockedDates: initial })).body;
  ok(set2.success === true, '3b: second POST with same data succeeds');
  // Read and verify
  const after = (await (await fetch(`${BASE}/api/admin/blocked-dates`)).json()).blockedDates;
  ok(after.length === initial.length, `3c: count unchanged (${after.length})`);

  // ── 4. Empty array is valid (means "no dates blocked") ───────────────────
  log('\n=== 4. Empty array ===');
  const empty = (await api('POST', '/api/admin/blocked-dates', { blockedDates: [] })).body;
  ok(empty.success === true, '4a: setting to [] succeeds');
  const afterEmpty = (await (await fetch(`${BASE}/api/admin/blocked-dates`)).json()).blockedDates;
  ok(afterEmpty.length === 0, '4b: now empty');

  // ── 5. Restore baseline and verify GET ───────────────────────────────────
  log('\n=== 5. Restore + GET ===');
  const restore = (await api('POST', '/api/admin/blocked-dates', { blockedDates: initial })).body;
  ok(restore.success === true, '5a: restore baseline succeeds');
  const get1 = await (await fetch(`${BASE}/api/admin/blocked-dates`)).json();
  ok(Array.isArray(get1.blockedDates), '5b: GET returns array');
  ok(get1.blockedDates.length === initial.length, `5c: GET count matches restore (${get1.blockedDates.length} === ${initial.length})`);

  // ── 6. Large array ───────────────────────────────────────────────────────
  log('\n=== 6. Large dataset (1000 dates) ===');
  const many = [];
  for (let i = 0; i < 1000; i++) {
    const d = new Date(2030, 0, 1);
    d.setDate(d.getDate() + i);
    many.push(d.toISOString().split('T')[0]);
  }
  const big = (await api('POST', '/api/admin/blocked-dates', { blockedDates: many })).body;
  ok(big.success === true, '6a: 1000-entry POST succeeds');
  const bigGet = (await (await fetch(`${BASE}/api/admin/blocked-dates`)).json()).blockedDates;
  ok(bigGet.length === 1000, `6b: round-trip preserves 1000 dates (got ${bigGet.length})`);
} finally {
  writeFileSync(FILE, JSON.stringify(initial, null, 2));
  // Also reset via API since the test may have changed live values too
  await api('POST', '/api/admin/blocked-dates', { blockedDates: initial });
}

log('');
log(failures === 0 ? 'PASS — blocked-dates edge cases verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
