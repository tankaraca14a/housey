// Live smoke for /submit-review → /admin inbox → publish flow against
// production. Read-mostly: POSTs one sentinel through the inbox,
// publishes it with translations, asserts SSR /reviews picks the right
// quote per visitor language, then cleans up (deletes the live row).
//
// Sentinel-tagged so any earlier orphans get swept too.

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';

const SENTINEL = `LiveSubmitProbe-${Date.now()}`;
const sentinelMatch = (s) => typeof s === 'string' && s.startsWith('LiveSubmitProbe-');

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function getHtml(path, cookie) {
  const headers = cookie ? { cookie } : {};
  const r = await fetch(`${BASE}${path}`, { headers });
  return { status: r.status, text: await r.text() };
}

const blockquoteRe = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
const blockquoteTexts = (html) => {
  const out = [];
  let m;
  while ((m = blockquoteRe.exec(html)) !== null) {
    out.push(m[1].replace(/&ldquo;|&rdquo;|"/g, '').trim());
  }
  return out;
};

let submissionId = null;
let liveReviewId = null;

try {
  // ── A. Submit via POST ─────────────────────────────────────────────────────
  log('=== A. Submit via /api/admin/submitted-reviews ===');
  const c = await api('POST', '/api/admin/submitted-reviews', {
    author: `${SENTINEL} Sender`,
    source: 'Direct',
    rating: 5,
    quote: 'Sentinel original in Croatian — please ignore.',
    date: '2025-08-15',
    lang: 'hr',
    notes: 'live smoke sentinel',
  });
  ok(c.status === 200, `A1: POST → 200 (got ${c.status})`);
  submissionId = c.body.submission?.id ?? null;
  ok(!!submissionId, `A2: submission id returned`);

  // ── B. Visible in admin inbox ──────────────────────────────────────────────
  log('\n=== B. Visible in admin inbox ===');
  const inbox = await api('GET', '/api/admin/submitted-reviews');
  ok(inbox.body.submissions?.some((s) => s.id === submissionId), `B1: row in admin inbox`);

  // ── C. NOT in public /api/reviews ──────────────────────────────────────────
  log('\n=== C. Not exposed publicly ===');
  const pub = await fetch(`${BASE}/api/reviews`).then((r) => r.json());
  ok(!pub.reviews?.some((r) => r.id === submissionId), `C1: pending row NOT in public list`);

  // ── D. Publish with translations ───────────────────────────────────────────
  log('\n=== D. Publish ===');
  const pubResp = await api('POST', `/api/admin/submitted-reviews/${submissionId}/publish`, {
    translations: {
      en: 'Live smoke EN translation — please ignore.',
      de: 'Live-Test DE-Übersetzung — bitte ignorieren.',
    },
    featured: false,
  });
  ok(pubResp.status === 200, `D1: publish → 200`);
  liveReviewId = pubResp.body.review?.id ?? null;
  ok(!!liveReviewId, `D2: response carries new review id`);
  ok(pubResp.body.review?.translations?.en?.includes('Live smoke EN'), `D3: EN translation attached`);

  // ── E. Inbox row gone ──────────────────────────────────────────────────────
  log('\n=== E. Inbox row removed ===');
  const inbox2 = await api('GET', '/api/admin/submitted-reviews');
  ok(!inbox2.body.submissions?.some((s) => s.id === submissionId), `E1: inbox row deleted after publish`);

  // ── F. EN visitor SSR sees the EN translation ─────────────────────────────
  log('\n=== F. SSR /reviews (EN cookie) renders EN translation ===');
  const en = await getHtml('/reviews', 'housey-lang=en');
  const enQuotes = blockquoteTexts(en.text);
  ok(enQuotes.some((q) => q.includes('Live smoke EN')), `F1: EN visitor sees EN translation`);

  // ── G. HR visitor SSR sees the original Croatian ──────────────────────────
  log('\n=== G. SSR /reviews (HR cookie) renders Croatian original ===');
  const hr = await getHtml('/reviews', 'housey-lang=hr');
  const hrQuotes = blockquoteTexts(hr.text);
  ok(hrQuotes.some((q) => q.includes('Sentinel original')), `G1: HR visitor sees Croatian original`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  log('\n=== H. Cleanup ===');
  // Sweep any sentinel inbox rows
  try {
    const remainingInbox = await api('GET', '/api/admin/submitted-reviews');
    for (const r of remainingInbox.body.submissions || []) {
      if (sentinelMatch(r.author)) await api('DELETE', `/api/admin/submitted-reviews/${r.id}`);
    }
  } catch {}
  // Sweep any sentinel live reviews
  try {
    const list = await api('GET', '/api/admin/reviews');
    for (const r of list.body.reviews || []) {
      if (sentinelMatch(r.author)) await api('DELETE', `/api/admin/reviews/${r.id}`);
    }
    ok(true, `H1: sentinel rows swept`);
  } catch (e) {
    log(`  ✗ cleanup failed: ${e.message}`);
    failures++;
  }
}

log('');
log(failures === 0 ? 'PASS — submit/publish flow verified on production ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
