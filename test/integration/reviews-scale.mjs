// Integration test: list rendering survives many reviews. POSTs 60 reviews,
// fetches /reviews + /, asserts:
//   * the API list returns all 60
//   * the /reviews HTML renders >= the visible-cap count
//   * the home page strip caps at 3 (regardless of how many featured)
//   * the HTML payload stays under a generous size budget
//   * the page response stays under a sane time budget
//
// Snapshot+restore data/reviews.json in finally.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const N_TOTAL = 60;       // total seed rows
const N_FEATURED = 12;    // of those, mark this many featured (home strip caps at 3)
const HOME_STRIP_CAP = 3;
const SIZE_BUDGET_MB = 2;
const TIME_BUDGET_MS = 5000;

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
async function getHTML(path) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  const html = await r.text();
  return { status: r.status, html, ms: Date.now() - t0, bytes: html.length };
}

const before = existsSync('data/reviews.json')
  ? readFileSync('data/reviews.json', 'utf8')
  : '[]\n';
const createdIds = [];

try {
  // ── 1. Bulk-create rows ───────────────────────────────────────────────────
  log(`=== 1. Seed ${N_TOTAL} rows (${N_FEATURED} featured) ===`);
  const t0 = Date.now();
  for (let i = 0; i < N_TOTAL; i++) {
    const r = await api('POST', '/api/admin/reviews', {
      author: `ScaleProbe-${String(i).padStart(3, '0')}`,
      source: i % 2 === 0 ? 'Airbnb' : 'Booking.com',
      rating: ((i % 5) + 1),                  // 1..5 distribution
      quote: `Scale test quote number ${i}.`,
      date: '2025-08-' + String((i % 28) + 1).padStart(2, '0'),
      featured: i < N_FEATURED,
      sortOrder: 1000 - i,
    });
    if (r.status === 200 && r.body.review?.id) createdIds.push(r.body.review.id);
  }
  ok(createdIds.length === N_TOTAL, `1a: created ${createdIds.length}/${N_TOTAL} rows in ${Date.now() - t0}ms`);

  // ── 2. Admin list returns all rows ────────────────────────────────────────
  log('\n=== 2. /api/admin/reviews returns all ===');
  const list = await api('GET', '/api/admin/reviews');
  const ourCount = (list.body.reviews || []).filter((r) => r.author.startsWith('ScaleProbe-')).length;
  ok(ourCount === N_TOTAL, `2a: admin list contains all ${N_TOTAL} (got ${ourCount})`);

  // ── 3. /reviews page renders the whole catalog within budget ──────────────
  log('\n=== 3. /reviews scales ===');
  const r1 = await getHTML('/reviews');
  ok(r1.status === 200, `3a: GET /reviews → 200`);
  // Page should contain every author (rendered into a card)
  const renderedRows = (r1.html.match(/ScaleProbe-\d{3}/g) || []).length;
  // Each author appears at least once in the rendered card; some surrounding
  // markup may include the same name in alt text etc., so we check >= N_TOTAL.
  ok(renderedRows >= N_TOTAL, `3b: every row appears in HTML (>=${N_TOTAL}, got ${renderedRows})`);
  ok(r1.ms <= TIME_BUDGET_MS, `3c: /reviews rendered in ${r1.ms}ms (budget ${TIME_BUDGET_MS}ms)`);
  const mb = r1.bytes / 1024 / 1024;
  ok(mb <= SIZE_BUDGET_MB, `3d: /reviews payload ${mb.toFixed(2)}MB (budget ${SIZE_BUDGET_MB}MB)`);

  // ── 4. Home page strip caps at HOME_STRIP_CAP ─────────────────────────────
  log('\n=== 4. Home page strip caps at 3 ===');
  const h = await getHTML('/');
  ok(h.status === 200, `4a: GET / → 200`);
  // Count distinct ScaleProbe-NNN appearances in the home page's CARD markup.
  // We're picky: only those inside a <blockquote …italic"> block count.
  // The featured strip renders 3 cards max regardless of how many featured.
  const cardAuthors = new Set();
  for (const m of h.html.matchAll(/<blockquote[^>]*italic[^>]*>[\s\S]{0,200}?<\/blockquote>[\s\S]{0,400}?(ScaleProbe-\d{3})/g)) {
    cardAuthors.add(m[1]);
  }
  ok(cardAuthors.size <= HOME_STRIP_CAP, `4b: home page strip caps at ${HOME_STRIP_CAP} (got ${cardAuthors.size})`);
  ok(h.ms <= TIME_BUDGET_MS, `4c: home rendered in ${h.ms}ms (budget ${TIME_BUDGET_MS}ms)`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Bulk cleanup.
  for (const id of createdIds) {
    try { await api('DELETE', `/api/admin/reviews/${id}`); } catch {}
  }
  writeFileSync('data/reviews.json', before);
  log(`\n  (rolled back data/reviews.json + deleted ${createdIds.length} scale-probe rows)`);
}

log('');
log(failures === 0 ? `PASS — list scales to ${N_TOTAL} reviews under budget ✓` : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
