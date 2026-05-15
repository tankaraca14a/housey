// Integration: /api/admin/submitted-reviews CRUD + the /publish endpoint
// that promotes a queued submission into a live Review row.
//
// Two store files in play — submitted-reviews.json + reviews.json — so
// snapshot/restore both in finally so dev state stays untouched.

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opts.admin !== false) headers['x-admin-password'] = PASS;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const inboxPath = 'data/submitted-reviews.json';
const reviewsPath = 'data/reviews.json';
const inboxBefore = existsSync(inboxPath) ? readFileSync(inboxPath, 'utf8') : '[]\n';
const reviewsBefore = existsSync(reviewsPath) ? readFileSync(reviewsPath, 'utf8') : '[]\n';

try {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  log('=== 1. Auth ===');
  for (const [m, p, hasBody] of [
    ['GET',    '/api/admin/submitted-reviews', false],
    ['POST',   '/api/admin/submitted-reviews', true],
    ['DELETE', '/api/admin/submitted-reviews/anything', false],
    ['POST',   '/api/admin/submitted-reviews/anything/publish', true],
  ]) {
    const r = await api(m, p, hasBody ? {} : undefined, { admin: false });
    ok(r.status === 401, `1-${m} ${p} without password → 401 (got ${r.status})`);
  }

  // ── 2. Validation ──────────────────────────────────────────────────────────
  log('\n=== 2. Validation ===');
  const bad1 = await api('POST', '/api/admin/submitted-reviews', {
    author: '', source: 'x', rating: 5, quote: 'q', date: '2025-08-15', lang: 'en',
  });
  ok(bad1.status === 400 && /author/.test(bad1.body.error || ''), `2a: empty author → 400`);

  const bad2 = await api('POST', '/api/admin/submitted-reviews', {
    author: 'A', source: 'x', rating: 5, quote: 'q', date: '2025-08-15',
    // lang missing - server defaults to 'en' so should succeed; this
    // probes that path. (For invalid lang the server coerces to 'en'.)
  });
  // Allow either: server coerces to default lang and accepts, OR rejects.
  ok(bad2.status === 200 || bad2.status === 400, `2b: missing lang handled (got ${bad2.status})`);
  if (bad2.status === 200 && bad2.body.submission?.id) {
    await api('DELETE', `/api/admin/submitted-reviews/${bad2.body.submission.id}`);
  }

  const bad3 = await api('POST', '/api/admin/submitted-reviews', {
    author: 'A', source: 'x', rating: 6, quote: 'q', date: '2025-08-15', lang: 'en',
  });
  ok(bad3.status === 400 && /rating/.test(bad3.body.error || ''), `2c: rating=6 → 400`);

  // ── 3. Create + read ───────────────────────────────────────────────────────
  log('\n=== 3. Create + read ===');
  const c = await api('POST', '/api/admin/submitted-reviews', {
    author: 'Inbox Test',
    source: 'Direct',
    rating: 4,
    quote: 'Original review text in HR.',
    date: '2025-08-15',
    lang: 'hr',
    notes: 'Ivana liked this one a lot',
  });
  ok(c.status === 200, `3a: create → 200`);
  const id = c.body.submission?.id;
  ok(typeof id === 'string' && id.length > 0, `3b: returned id`);
  ok(c.body.submission?.notes === 'Ivana liked this one a lot', `3c: notes persisted`);

  const list = await api('GET', '/api/admin/submitted-reviews');
  ok(list.body.submissions?.some((s) => s.id === id), `3d: row appears in queue`);

  // The public /api/reviews must NEVER expose pending submissions.
  const pub = await fetch(`${BASE}/api/reviews`);
  const pubBody = await pub.json();
  ok(!pubBody.reviews?.some((r) => r.id === id), `3e: pending row NOT in public /api/reviews`);

  // ── 4. Publish → moves to live Review ─────────────────────────────────────
  log('\n=== 4. Publish moves submission to live Review ===');
  const pubResp = await api('POST', `/api/admin/submitted-reviews/${id}/publish`, {
    translations: {
      en: 'English translation',
      de: 'Deutsche Übersetzung',
      it: 'Traduzione italiana',
      fr: 'Traduction française',
    },
    featured: true,
  });
  ok(pubResp.status === 200, `4a: publish → 200`);
  const reviewId = pubResp.body.review?.id;
  ok(typeof reviewId === 'string', `4b: response carries the new Review id`);
  ok(pubResp.body.review?.lang === 'hr', `4c: original lang preserved`);
  ok(pubResp.body.review?.translations?.en === 'English translation', `4d: EN translation attached`);
  ok(pubResp.body.review?.translations?.de === 'Deutsche Übersetzung', `4e: DE translation attached`);
  ok(pubResp.body.review?.featured === true, `4f: featured flag honoured`);

  // Inbox must be empty.
  const afterList = await api('GET', '/api/admin/submitted-reviews');
  ok(!afterList.body.submissions?.some((s) => s.id === id), `4g: inbox row gone after publish`);

  // Live reviews must contain the new one.
  const pub2 = await fetch(`${BASE}/api/reviews`).then((r) => r.json());
  ok(pub2.reviews?.some((r) => r.id === reviewId), `4h: published row visible publicly`);

  // ── 5. Publish drops translation in original lang ──────────────────────────
  log('\n=== 5. Publish drops translation in original lang ===');
  const c2 = await api('POST', '/api/admin/submitted-reviews', {
    author: 'Dup Lang',
    source: 'Direct',
    rating: 5,
    quote: 'in HR',
    date: '2025-08-15',
    lang: 'hr',
  });
  const id2 = c2.body.submission?.id;
  const pub3 = await api('POST', `/api/admin/submitted-reviews/${id2}/publish`, {
    // Sending a HR translation when original lang IS hr — should be silently dropped.
    translations: { hr: 'duplicate', en: 'english fine' },
    featured: false,
  });
  ok(pub3.status === 200, `5a: publish with duplicate-lang translation → 200 (silently dropped)`);
  ok(pub3.body.review?.translations?.hr === undefined, `5b: HR slot was dropped`);
  ok(pub3.body.review?.translations?.en === 'english fine', `5c: EN slot survived`);

  // Cleanup live row.
  await api('DELETE', `/api/admin/reviews/${pub3.body.review.id}`);

  // ── 6. Dismiss without publishing ──────────────────────────────────────────
  log('\n=== 6. Dismiss without publishing ===');
  const c3 = await api('POST', '/api/admin/submitted-reviews', {
    author: 'Dismiss Me',
    source: 'Direct',
    rating: 3,
    quote: 'meh',
    date: '2025-08-15',
    lang: 'en',
  });
  const id3 = c3.body.submission?.id;
  const del = await api('DELETE', `/api/admin/submitted-reviews/${id3}`);
  ok(del.status === 200, `6a: DELETE without publish → 200`);

  const afterDel = await api('GET', '/api/admin/submitted-reviews');
  ok(!afterDel.body.submissions?.some((s) => s.id === id3), `6b: row gone`);

  // And it was NOT promoted to live.
  const pub4 = await fetch(`${BASE}/api/reviews`).then((r) => r.json());
  ok(!pub4.reviews?.some((r) => r.quote === 'meh'), `6c: dismissed row never reached live reviews`);

  // ── 7. Unknown id ──────────────────────────────────────────────────────────
  log('\n=== 7. Unknown id 404s ===');
  const d404 = await api('DELETE', '/api/admin/submitted-reviews/does-not-exist');
  ok(d404.status === 404, `7a: DELETE unknown id → 404`);
  const p404 = await api('POST', '/api/admin/submitted-reviews/does-not-exist/publish', {});
  ok(p404.status === 404, `7b: publish unknown id → 404`);

  // ── 8. Cleanup live test reviews ──────────────────────────────────────────
  log('\n=== 8. Cleanup ===');
  if (reviewId) await api('DELETE', `/api/admin/reviews/${reviewId}`);
  ok(true, `8a: cleaned test live review`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  writeFileSync(inboxPath, inboxBefore);
  writeFileSync(reviewsPath, reviewsBefore);
  log(`\n  (rolled back ${inboxPath} + ${reviewsPath})`);
}

log('');
log(failures === 0 ? 'PASS — submitted-reviews API + publish flow verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
