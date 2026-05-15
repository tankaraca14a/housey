// Live smoke for the per-review `lang` + `translations` fields against
// production. Read-mostly: creates one sentinel-tagged row carrying every
// flavour we care about, asserts persistence + public exposure, then
// deletes it in finally. No file snapshots — prod is on KV.
//
// Coverage:
//   A. Create a sentinel review with lang=en + HR/DE translations -> 200
//   B. GET /api/admin/reviews returns the row with lang + translations intact
//   C. GET /api/reviews (public, unauthenticated) exposes lang + translations
//   D. PATCH adds an IT translation + drops DE -> stored map equals new shape
//   E. The /reviews page HTML for the sentinel row contains the original
//      English quote (no translation in EN visitor default)
//   F. The /reviews page HTML for an HR-cookie request contains the
//      Croatian translation (server reads the cookie and renders the
//      visitor-lang quote, no flash)
//   G. Cleanup: DELETE every row whose author starts with the sentinel prefix

import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(HERE, 'screens-reviews-lang-live'), { recursive: true });

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';

const SENTINEL = `LiveLangProbe-${Date.now()}`;
const sentinelMatch = (s) => typeof s === 'string' && s.startsWith('LiveLangProbe-');

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.admin !== false) headers['x-admin-password'] = PASS;
  if (opts.cookie) headers.cookie = opts.cookie;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function getHtml(path, cookie) {
  const headers = cookie ? { cookie } : {};
  const r = await fetch(`${BASE}${path}`, { headers });
  return { status: r.status, text: await r.text() };
}

let createdId = null;

try {
  // ── A. Create with lang + 2 translations ────────────────────────────────────
  log('=== A. Create with lang + translations ===');
  const create = await api('POST', '/api/admin/reviews', {
    author: `${SENTINEL} Anna`,
    source: 'Airbnb',
    rating: 5,
    quote: 'Sentinel test review — please ignore.',
    date: '2025-08-15',
    featured: false,
    sortOrder: Date.now(),
    lang: 'en',
    translations: {
      hr: 'Probna recenzija — molim ignorirajte.',
      de: 'Sentinel-Testbewertung — bitte ignorieren.',
    },
  });
  ok(create.status === 200, `A1: POST returned 200 (got ${create.status})`);
  createdId = create.body.review?.id ?? null;
  ok(!!createdId, `A2: response carries an id`);
  ok(create.body.review?.lang === 'en', `A3: lang=en persisted on response`);
  ok(create.body.review?.translations?.hr === 'Probna recenzija — molim ignorirajte.', `A4: HR translation persisted`);
  ok(create.body.review?.translations?.de === 'Sentinel-Testbewertung — bitte ignorieren.', `A5: DE translation persisted`);

  // ── B. GET admin list returns same shape ───────────────────────────────────
  log('\n=== B. Admin GET round-trip ===');
  const adm = await api('GET', '/api/admin/reviews');
  const admRow = adm.body.reviews?.find((r) => r.id === createdId);
  ok(!!admRow, `B1: row appears in admin list`);
  ok(admRow?.lang === 'en', `B2: lang round-trips`);
  ok(admRow?.translations?.hr?.startsWith('Probna'), `B3: HR translation round-trips`);
  ok(admRow?.translations?.de?.startsWith('Sentinel'), `B4: DE translation round-trips`);

  // ── C. Public GET exposes the fields ───────────────────────────────────────
  log('\n=== C. Public GET exposes fields ===');
  const pub = await api('GET', '/api/reviews', undefined, { admin: false });
  const pubRow = pub.body.reviews?.find((r) => r.id === createdId);
  ok(!!pubRow, `C1: row visible to unauthenticated visitors`);
  ok(pubRow?.lang === 'en', `C2: public list returns lang`);
  ok(pubRow?.translations?.hr?.startsWith('Probna'), `C3: public list returns HR translation`);

  // ── D. PATCH map replacement ───────────────────────────────────────────────
  log('\n=== D. PATCH translations (replace map) ===');
  const patch = await api('PATCH', `/api/admin/reviews/${createdId}`, {
    translations: {
      hr: 'Probna recenzija — molim ignorirajte.',
      it: 'Recensione di prova — ignora per favore.',
    },
  });
  ok(patch.status === 200, `D1: PATCH translations → 200`);
  ok(patch.body.review?.translations?.it?.startsWith('Recensione'), `D2: IT key added`);
  ok(patch.body.review?.translations?.de === undefined, `D3: DE key dropped after wholesale replace`);

  // Helper: pull every <blockquote> inner text from an HTML response.
  // We grep blockquote-only because Next.js ships the full Review row
  // (incl. all translations) inside the serialized RSC payload, which
  // would defeat a naive "html.includes(...)" test. Visible quote text
  // is what actually changes per visitor language, and it lives inside
  // <blockquote ...>"...QUOTE..."</blockquote>.
  const blockquoteRe = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
  const blockquoteTexts = (html) => {
    const out = [];
    let m;
    while ((m = blockquoteRe.exec(html)) !== null) {
      out.push(m[1].replace(/&ldquo;|&rdquo;|"/g, '').trim());
    }
    return out;
  };

  // ── E. /reviews HTML with no cookie (default EN visitor) ───────────────────
  log('\n=== E. SSR /reviews on EN ===');
  const en = await getHtml('/reviews');
  ok(en.status === 200, `E1: /reviews → 200`);
  const enQuotes = blockquoteTexts(en.text);
  ok(enQuotes.some((q) => q.includes('Sentinel test review')), `E2: EN visitor's blockquote shows English original`);
  ok(!enQuotes.some((q) => q.includes('Probna recenzija')), `E3: EN visitor's blockquote does NOT render HR translation`);

  // ── F. /reviews HTML with HR cookie ────────────────────────────────────────
  log('\n=== F. SSR /reviews on HR (cookie) ===');
  const hr = await getHtml('/reviews', 'housey-lang=hr');
  ok(hr.status === 200, `F1: /reviews?cookie=hr → 200`);
  const hrQuotes = blockquoteTexts(hr.text);
  ok(hrQuotes.some((q) => q.includes('Probna recenzija')), `F2: HR visitor's blockquote renders Croatian translation`);
  ok(!hrQuotes.some((q) => q.includes('Sentinel test review')), `F3: HR visitor's blockquote does NOT render English original`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // ── G. Cleanup ─────────────────────────────────────────────────────────────
  log('\n=== G. Cleanup ===');
  try {
    const list = await api('GET', '/api/admin/reviews');
    const toDelete = (list.body.reviews || []).filter((r) => sentinelMatch(r.author));
    for (const r of toDelete) {
      await api('DELETE', `/api/admin/reviews/${r.id}`);
    }
    ok(true, `G1: deleted ${toDelete.length} sentinel row(s)`);
  } catch (e) {
    log(`  ✗ cleanup failed: ${e.message}`);
    failures++;
  }
}

log('');
log(failures === 0 ? 'PASS — review lang + translations verified on production ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
