// Integration test: prove the rating actually renders to the visitor's
// browser. Posts a review via admin API at rating=3, fetches /reviews
// + / (home page) HTML, asserts:
//   * page contains the quote + author (so the row was rendered at all)
//   * the rendered ★ counts match: 3 amber + 2 slate per ReviewStars card
//   * featured=true puts the review on the home page; featured=false does NOT
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

// Count amber + slate stars inside a single rendered review card.
// Each <ReviewStars> renders 5 spans with text-amber-400 or text-slate-600.
// We only want the spans for ONE specific card (filtered by the author).
function countStarsForCard(html, author) {
  // Slice the HTML to a window around the author so we don't accidentally
  // pick up stars from other cards on the page.
  const idx = html.indexOf(author);
  if (idx < 0) return { amber: 0, slate: 0, found: false };
  const window = html.slice(Math.max(0, idx - 2000), idx + 200);
  // Each star: <span ... class="...text-amber-400..." or "...text-slate-600..." ...>★</span>
  const amber = (window.match(/text-amber-400[^"]*"[^>]*>★/g) || []).length;
  const slate = (window.match(/text-slate-600[^"]*"[^>]*>★/g) || []).length;
  return { amber, slate, found: true };
}

// Tighter check: a "rendered" review card includes the quote inside an
// italic <blockquote class="...italic...">"…quote…"</blockquote> element.
// Plain substring search on the author alone trips on Next.js dev-mode
// RSC traces that embed the raw data/reviews.json contents in a JS
// chunk (the dev overlay sometimes captures fs reads in a JSON dump).
// We require the quote to appear inside a literal <blockquote …italic">
// marker so we only count actually-rendered cards.
function pageHasRenderedReview(html, _author, quote) {
  // React 18+ inserts `<!-- -->` between adjacent text children, so the
  // rendered card looks like:
  //   <blockquote …italic">“<!-- -->QUOTE<!-- -->”</blockquote>
  // We allow the comment to sit anywhere within a ~120-char window between
  // the italic blockquote opener and the quote text. The dev-overlay JSON
  // trace uses escaped \\"quote\\": values which never appear inside a
  // <blockquote> tag, so this matcher rejects them.
  const esc = quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rendered = new RegExp(`<blockquote[^>]*italic[^>]*>[\\s\\S]{0,120}${esc}`);
  return rendered.test(html);
}

const before = existsSync('data/reviews.json')
  ? readFileSync('data/reviews.json', 'utf8')
  : '[]\n';

let createdId = null;
try {
  const AUTHOR = `PublicRenderProbe-${Date.now()}`;
  log('=== 1. Create rating=3 featured review via API ===');
  const c = await api('POST', '/api/admin/reviews', {
    author: AUTHOR,
    source: 'Airbnb',
    rating: 3,
    quote: 'Public render smoke check.',
    date: '2025-08-15',
    featured: true,
    sortOrder: 100,
  });
  ok(c.status === 200 && c.body.review?.id, `1a: review created (id=${c.body.review?.id})`);
  createdId = c.body.review.id;

  const QUOTE = 'Public render smoke check.';

  log('\n=== 2. /reviews page renders the row ===');
  const reviews = await getHTML('/reviews');
  ok(reviews.status === 200, `2a: GET /reviews → 200`);
  ok(pageHasRenderedReview(reviews.html, AUTHOR, QUOTE), `2b: /reviews renders a card for "${AUTHOR}"`);
  const s1 = countStarsForCard(reviews.html, AUTHOR);
  ok(s1.amber === 3, `2c: /reviews shows 3 amber stars for the row (got ${s1.amber})`);
  ok(s1.slate === 2, `2d: /reviews shows 2 slate stars for the row (got ${s1.slate})`);

  log('\n=== 3. Home page strip shows the FEATURED review ===');
  const home = await getHTML('/');
  ok(home.status === 200, `3a: GET / → 200`);
  ok(pageHasRenderedReview(home.html, AUTHOR, QUOTE), `3b: home page renders the review card`);
  const s2 = countStarsForCard(home.html, AUTHOR);
  ok(s2.amber === 3, `3c: home page strip shows 3 amber stars (got ${s2.amber})`);
  ok(s2.slate === 2, `3d: home page strip shows 2 slate stars (got ${s2.slate})`);

  log('\n=== 4. Patch featured→false. Home page must drop it. ===');
  const p = await api('PATCH', `/api/admin/reviews/${createdId}`, { featured: false });
  ok(p.status === 200 && p.body.review?.featured === false, `4a: PATCH featured=false → 200`);
  const home2 = await getHTML('/');
  ok(!pageHasRenderedReview(home2.html, AUTHOR, QUOTE), `4b: home page no longer renders the card`);
  // /reviews still includes it (non-featured rows show there too)
  const reviews2 = await getHTML('/reviews');
  ok(pageHasRenderedReview(reviews2.html, AUTHOR, QUOTE), `4c: /reviews still renders the card`);

  log('\n=== 5. PATCH rating 3→5, verify /reviews re-renders 5 amber ===');
  const p2 = await api('PATCH', `/api/admin/reviews/${createdId}`, { rating: 5 });
  ok(p2.status === 200, `5a: PATCH rating=5 → 200`);
  const reviews3 = await getHTML('/reviews');
  const s3 = countStarsForCard(reviews3.html, AUTHOR);
  ok(s3.amber === 5, `5b: /reviews now shows 5 amber stars (got ${s3.amber})`);
  ok(s3.slate === 0, `5c: /reviews now shows 0 slate stars (got ${s3.slate})`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Hard cleanup: snapshot restore + (belt & braces) DELETE the created row
  // in case the snapshot path differs in another backend (file vs KV).
  if (createdId) {
    try { await api('DELETE', `/api/admin/reviews/${createdId}`); } catch {}
  }
  writeFileSync('data/reviews.json', before);
  log('\n  (rolled back data/reviews.json)');
}

log('');
log(failures === 0 ? 'PASS — review rating renders to public HTML ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
