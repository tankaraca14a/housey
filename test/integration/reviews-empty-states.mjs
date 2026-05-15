// Integration test: with ZERO reviews in storage, every public + admin
// surface renders a coherent empty state — never a half-baked layout
// or a 500. This is what Ivana will see the very first time she opens
// the site, before adding anything.
//
// Snapshot the current data/reviews.json + write '[]' for the duration,
// then restore in finally.

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
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function getHTML(path) {
  const r = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  return { status: r.status, html: await r.text() };
}

const before = existsSync('data/reviews.json')
  ? readFileSync('data/reviews.json', 'utf8')
  : '[]\n';

try {
  // Force empty state (the snapshot above might be non-empty)
  writeFileSync('data/reviews.json', '[]\n');

  log('=== 1. Public APIs are coherent with 0 rows ===');
  const pub = await api('GET', '/api/reviews', undefined, false);
  ok(pub.status === 200, `1a: GET /api/reviews → 200 with empty repo (got ${pub.status})`);
  ok(Array.isArray(pub.body.reviews) && pub.body.reviews.length === 0, `1b: returns {reviews: []}`);

  const adm = await api('GET', '/api/admin/reviews');
  ok(adm.status === 200 && Array.isArray(adm.body.reviews) && adm.body.reviews.length === 0,
    `1c: admin GET → 200 with empty list`);

  log('\n=== 2. /reviews page renders a friendly empty message ===');
  const r = await getHTML('/reviews');
  ok(r.status === 200, `2a: GET /reviews → 200`);
  // The page shows "No reviews yet — check back soon." for empty repo
  ok(/No reviews yet/i.test(r.html), `2b: page contains friendly empty-state text`);
  // CRITICAL: no broken half-render — there must NOT be any leftover
  // <blockquote …italic"> markup (which would mean a card stub leaked).
  ok(!/<blockquote[^>]*italic[^>]*>[\s\S]{0,200}<\/blockquote>/.test(r.html),
    `2c: no orphan card markup on empty page`);
  // The page should still have its <h1> + nav (i.e., it's not a 500 page)
  ok(/<h1[^>]*>[\s\S]{0,200}Reviews/.test(r.html) || /Reviews/.test(r.html),
    `2d: page header still renders (not a 500)`);

  log('\n=== 3. Home page strip renders NOTHING when no featured ===');
  const h = await getHTML('/');
  ok(h.status === 200, `3a: GET / → 200`);
  // FeaturedReviewsStrip returns null on empty featured list, so the
  // "What guests say" header should be absent (else stub leaked).
  ok(!/What guests say/.test(h.html), `3b: strip header "What guests say" not rendered when empty`);
  ok(!/From past guests/.test(h.html), `3c: strip eyebrow "From past guests" not rendered when empty`);
  // No empty card stubs
  ok(!/<blockquote[^>]*italic[^>]*>[\s\S]{0,200}<\/blockquote>/.test(h.html),
    `3d: no orphan card markup on home page`);
  // Home page still has its hero (i.e., it's not a 500)
  ok(/Vela Luka|Korčula|Korcula|Housey/i.test(h.html), `3e: home hero still renders (not a 500)`);

  log('\n=== 4. After adding 1 NON-featured review, home still empty ===');
  const c = await api('POST', '/api/admin/reviews', {
    author: 'EmptyProbe-1',
    source: 'Airbnb',
    rating: 5,
    quote: 'A first review, but not featured.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 100,
  });
  ok(c.status === 200, `4a: created 1 non-featured row`);
  const h2 = await getHTML('/');
  ok(!/What guests say/.test(h2.html), `4b: home strip still hidden (no featured rows)`);
  // /reviews now shows it
  const r2 = await getHTML('/reviews');
  ok(/EmptyProbe-1/.test(r2.html), `4c: /reviews now shows the row`);

  log('\n=== 5. After featuring it, home strip appears ===');
  const id = c.body.review.id;
  const p = await api('PATCH', `/api/admin/reviews/${id}`, { featured: true });
  ok(p.status === 200, `5a: PATCH featured=true → 200`);
  const h3 = await getHTML('/');
  ok(/What guests say/.test(h3.html), `5b: strip header appears once first featured row exists`);
  // Cleanup the row we created in step 4
  await api('DELETE', `/api/admin/reviews/${id}`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  writeFileSync('data/reviews.json', before);
  log('\n  (rolled back data/reviews.json)');
}

log('');
log(failures === 0 ? 'PASS — empty states render coherently across all surfaces ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
