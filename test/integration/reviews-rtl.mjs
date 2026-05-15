// Integration test: RTL-script quotes round-trip and render correctly.
// Ivana hosts foreign guests; some leave reviews in Arabic, Hebrew, or
// Farsi. We need:
//   1. UTF-8 byte-for-byte round-trip through the API (storage layer)
//   2. The RTL string appears in /reviews HTML, in the rendered card
//   3. The <blockquote> uses dir="auto" (or equivalent) so the browser
//      applies the Unicode bidi algorithm and the text flows correctly
//      right-to-left
//   4. The author span uses dir="auto" too, so an Arabic name renders
//      with the correct visual ordering
//
// Snapshot+restore data/reviews.json in finally.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body, auth = true) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
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

// Three realistic RTL-language samples.
const SAMPLES = [
  {
    lang:   'Arabic',
    author: 'أحمد المهندس',
    quote:  'مكان رائع على البحر، الإطلالة لا تنسى. نوصي به بشدة لكل من يبحث عن الهدوء.',
  },
  {
    lang:   'Hebrew',
    author: 'דניאל לוי',
    quote:  'בית מקסים על חוף הים, נוף מרהיב, מארחת חמה ומכניסת אורחים. נחזור.',
  },
  {
    lang:   'Farsi',
    author: 'مریم رضایی',
    quote:  'مکانی فوق‌العاده با چشم‌اندازی شگفت‌انگیز و میزبانی گرم.',
  },
];

try {
  log('=== 1. UTF-8 round-trip through the API ===');
  for (const s of SAMPLES) {
    const c = await api('POST', '/api/admin/reviews', {
      author: s.author,
      source: 'Airbnb',
      rating: 5,
      quote: s.quote,
      date: '2025-08-15',
      featured: true,
      sortOrder: 100,
    });
    ok(c.status === 200, `1-${s.lang}: POST → 200`);
    if (c.body.review?.id) createdIds.push(c.body.review.id);
    // Storage layer: returned strings must be IDENTICAL bytes
    ok(c.body.review?.author === s.author, `1-${s.lang}: author round-tripped ("${c.body.review?.author}")`);
    ok(c.body.review?.quote === s.quote,   `1-${s.lang}: quote round-tripped`);
    // Refetch via GET to confirm the read path too
    const fetched = (await api('GET', '/api/admin/reviews')).body.reviews
      .find((r) => r.id === c.body.review?.id);
    ok(fetched?.author === s.author && fetched?.quote === s.quote,
      `1-${s.lang}: GET path returns identical bytes`);
  }

  log('\n=== 2. /reviews HTML contains every RTL sample ===');
  const r = await getHTML('/reviews');
  ok(r.status === 200, `2a: GET /reviews → 200`);
  for (const s of SAMPLES) {
    ok(r.html.includes(s.author), `2-${s.lang}: author "${s.author}" present in HTML`);
    ok(r.html.includes(s.quote),  `2-${s.lang}: quote present in HTML`);
  }

  log('\n=== 3. <blockquote> uses dir="auto" so the browser bidis correctly ===');
  // The simplest robust check: every <blockquote …italic …> rendered by
  // ReviewCard must carry dir="auto". If this fails, ReviewCard needs the
  // dir attribute — without it, a 100% Arabic line shows the closing quote
  // on the wrong side.
  const blockquotes = r.html.match(/<blockquote[^>]*italic[^>]*>/g) || [];
  ok(blockquotes.length >= SAMPLES.length, `3a: at least ${SAMPLES.length} <blockquote> tags rendered (got ${blockquotes.length})`);
  const withDirAuto = blockquotes.filter((b) => /\bdir=["']auto["']/.test(b)).length;
  ok(withDirAuto === blockquotes.length,
    `3b: every blockquote carries dir="auto" (${withDirAuto}/${blockquotes.length})`);

  log('\n=== 4. Author span uses dir="auto" too ===');
  // The author appears inside a <span class="...text-white font-semibold">.
  // Find every such span and confirm dir="auto" is on the span (or its
  // parent element). Practical check: count opener tags containing both
  // text-white and font-semibold, plus dir="auto" in the same tag.
  const authorSpans = r.html.match(/<span[^>]*text-white[^>]*font-semibold[^>]*>/g) || [];
  ok(authorSpans.length >= SAMPLES.length, `4a: at least ${SAMPLES.length} author spans rendered (got ${authorSpans.length})`);
  const authorDirAuto = authorSpans.filter((s) => /\bdir=["']auto["']/.test(s)).length;
  ok(authorDirAuto === authorSpans.length,
    `4b: every author span carries dir="auto" (${authorDirAuto}/${authorSpans.length})`);

  log('\n=== 5. Home page strip handles RTL just like /reviews ===');
  const h = await getHTML('/');
  for (const s of SAMPLES) {
    // Only featured rows appear on the home page; we set featured=true above
    ok(h.html.includes(s.author), `5-${s.lang}: home strip shows "${s.author}"`);
  }
  const homeBlockquotes = h.html.match(/<blockquote[^>]*italic[^>]*>/g) || [];
  const homeDirAuto = homeBlockquotes.filter((b) => /\bdir=["']auto["']/.test(b)).length;
  ok(homeDirAuto === homeBlockquotes.length && homeBlockquotes.length > 0,
    `5-dir: home blockquotes all dir="auto" (${homeDirAuto}/${homeBlockquotes.length})`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  for (const id of createdIds) {
    try { await api('DELETE', `/api/admin/reviews/${id}`); } catch {}
  }
  writeFileSync('data/reviews.json', before);
  log(`\n  (rolled back data/reviews.json + deleted ${createdIds.length} RTL sentinel rows)`);
}

log('');
log(failures === 0 ? 'PASS — RTL quotes render correctly end-to-end ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
