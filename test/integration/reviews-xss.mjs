// Integration test: prove the Review fields are HTML-escaped, not raw-rendered.
// Posts payloads containing the common XSS attack vectors in each
// user-controlled field (author, source, quote, url) and confirms:
//   * the API stores the literal string
//   * /reviews HTML escapes < > & " ' so the browser sees text, not markup
//   * no executable <script> or onerror attribute survives a round-trip
//
// Snapshot+restore data/reviews.json in finally.

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

const createdIds = [];

const PAYLOADS = [
  // Each: { name, field, value }
  { name: 'quote: <script> tag',         field: 'quote',   value: '<script>window.__pwned=1</script>Hello' },
  { name: 'quote: <img onerror=>',       field: 'quote',   value: 'A <img src=x onerror="window.__pwned=1"> B' },
  { name: 'author: closing tag',         field: 'author',  value: '"><svg/onload=alert(1)>' },
  { name: 'source: javascript: scheme',  field: 'source',  value: 'javascript:alert(1)' },
  { name: 'quote: html entity already',  field: 'quote',   value: 'Five &amp; perfect &lt; gem' },
];

try {
  log('=== 1. Post XSS payloads via admin API ===');
  for (const p of PAYLOADS) {
    const body = {
      author: 'XSSProbe-' + p.field,
      source: 'XSSSource',
      rating: 5,
      quote: 'Default ok',
      date: '2025-08-15',
      featured: true,
      sortOrder: 100,
      [p.field]: p.value, // overwrite the targeted field
    };
    const c = await api('POST', '/api/admin/reviews', body);
    ok(c.status === 200, `1-${p.name}: created (status=${c.status})`);
    if (c.body.review?.id) createdIds.push(c.body.review.id);

    // The API stores the literal string (no scrubbing — that's by design;
    // escaping is the renderer's job).
    const stored = c.body.review?.[p.field];
    ok(stored === p.value, `1-${p.name}: stored literally (round-tripped through KV)`);
  }

  log('\n=== 2. /reviews HTML never contains executable script ===');
  const reviews = await getHTML('/reviews');
  ok(reviews.status === 200, `2a: GET /reviews → 200`);
  // The CRITICAL test: the rendered HTML must NOT contain any of these
  // executable fragments verbatim (which would mean React forgot to escape).
  ok(!/<script>window\.__pwned/.test(reviews.html), `2b: no raw <script> in /reviews HTML`);
  ok(!/<img[^>]*onerror=[^>]*window\.__pwned/.test(reviews.html), `2c: no raw <img onerror=> in /reviews HTML`);
  ok(!/<svg\/onload=alert/.test(reviews.html), `2d: no raw <svg onload=> in /reviews HTML`);

  // The escaped versions MUST appear (proves the content is rendered, just
  // as inert text rather than dropped on the floor).
  ok(/&lt;script&gt;window\.__pwned=1&lt;\/script&gt;Hello/.test(reviews.html),
    `2e: <script> payload appears escaped (&lt;script&gt;...)`);
  ok(/A &lt;img src=x onerror=&quot;window\.__pwned=1&quot;&gt; B/.test(reviews.html),
    `2f: <img onerror=> payload appears escaped`);
  ok(/&quot;&gt;&lt;svg\/onload=alert\(1\)&gt;/.test(reviews.html),
    `2g: closing-tag injection appears escaped`);

  log('\n=== 3. URL field rejects non-http schemes (validator-level) ===');
  // javascript:alert(1) as a URL should be rejected by the validator.
  // We posted it in `source` (free-text) above, but the URL field has
  // explicit http/https checks. Verify:
  const u = await api('POST', '/api/admin/reviews', {
    author: 'XSSProbe-url',
    source: 'Airbnb',
    rating: 5,
    quote: 'q',
    date: '2025-08-15',
    url: 'javascript:alert(1)',
    featured: false,
    sortOrder: 100,
  });
  ok(u.status === 400 && /url/i.test(u.body.error || ''), `3a: javascript: URL rejected at validator (status=${u.status}, err=${u.body.error})`);

  log('\n=== 4. Home-page strip also escapes ===');
  const home = await getHTML('/');
  ok(!/<script>window\.__pwned/.test(home.html), `4a: no raw <script> on home page`);
  ok(!/<img[^>]*onerror=[^>]*window\.__pwned/.test(home.html), `4b: no raw <img onerror=> on home page`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Cleanup: belt + braces. Snapshot restore AND DELETE created rows by id.
  for (const id of createdIds) {
    try { await api('DELETE', `/api/admin/reviews/${id}`); } catch {}
  }
  writeFileSync('data/reviews.json', before);
  log('\n  (rolled back data/reviews.json + deleted ' + createdIds.length + ' XSS sentinel rows)');
}

log('');
log(failures === 0 ? 'PASS — review fields are XSS-safe end-to-end ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
