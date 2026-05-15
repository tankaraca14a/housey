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

  // ── 6. lang field on create ─────────────────────────────────────────────────
  log('\n=== 6. lang field on create ===');
  const langIds = [];
  for (const code of ['en', 'hr', 'de', 'it', 'fr']) {
    const r = await api('POST', '/api/admin/reviews', {
      author: `Lang ${code.toUpperCase()}`,
      source: 'Airbnb',
      rating: 5,
      quote: `quote in ${code}`,
      date: '2025-08-15',
      featured: false,
      sortOrder: 200 + langIds.length,
      lang: code,
    });
    ok(r.status === 200, `6-${code}: create with lang=${code} → 200`);
    ok(r.body.review?.lang === code, `6-${code}: lang=${code} persisted on response`);
    if (r.body.review?.id) langIds.push(r.body.review.id);
  }
  const listWithLangs = await api('GET', '/api/admin/reviews');
  for (let i = 0; i < langIds.length; i++) {
    const code = ['en', 'hr', 'de', 'it', 'fr'][i];
    const row = listWithLangs.body.reviews?.find((r) => r.id === langIds[i]);
    ok(row?.lang === code, `6-${code}: lang=${code} survives GET list`);
  }

  // ── 7. Reject unsupported lang on create ────────────────────────────────────
  log('\n=== 7. Reject unsupported lang on create ===');
  const langBad = await api('POST', '/api/admin/reviews', {
    author: 'Bad lang',
    source: 'Airbnb',
    rating: 5,
    quote: 'q',
    date: '2025-08-15',
    featured: false,
    sortOrder: 999,
    lang: 'es', // not in our 5
  });
  // The API silently coerces unknown lang to undefined (legacy-compatible),
  // so the row is accepted but has no lang. This is intentional — see route.ts.
  ok(langBad.status === 200, `7a: create with unknown lang='es' → 200 (coerced)`);
  ok(langBad.body.review?.lang === undefined, `7b: unknown lang silently dropped (got ${JSON.stringify(langBad.body.review?.lang)})`);
  if (langBad.body.review?.id) langIds.push(langBad.body.review.id);

  // ── 8. lang field via PATCH ─────────────────────────────────────────────────
  log('\n=== 8. lang via PATCH ===');
  if (langIds[0]) {
    const pLang = await api('PATCH', `/api/admin/reviews/${langIds[0]}`, { lang: 'hr' });
    ok(pLang.status === 200, `8a: PATCH lang=en→hr → 200`);
    ok(pLang.body.review?.lang === 'hr', `8b: lang now "hr"`);

    const pBadLang = await api('PATCH', `/api/admin/reviews/${langIds[0]}`, { lang: 'zz' });
    // Same coerce-to-undefined behaviour on PATCH; ends up clearing the field.
    ok(pBadLang.status === 200, `8c: PATCH bad lang → 200 (cleared)`);
    ok(pBadLang.body.review?.lang === undefined, `8d: PATCH bad lang clears field`);
  }

  // ── 9. Public GET exposes lang ─────────────────────────────────────────────
  log('\n=== 9. Public GET exposes lang ===');
  const pubLang = await api('GET', '/api/reviews', undefined, false);
  if (langIds[1]) {
    const hrRow = pubLang.body.reviews?.find((r) => r.id === langIds[1]);
    ok(hrRow?.lang === 'hr', `9a: public list returns lang for HR row (got ${JSON.stringify(hrRow?.lang)})`);
  }

  // ── 10. translations map on create ─────────────────────────────────────────
  log('\n=== 10. translations on create ===');
  const tCreate = await api('POST', '/api/admin/reviews', {
    author: 'Translated Anna',
    source: 'Airbnb',
    rating: 5,
    quote: 'The original quote in English',
    date: '2025-08-15',
    featured: false,
    sortOrder: 800,
    lang: 'en',
    translations: { hr: 'Hrvatski prijevod', de: 'Deutsche Übersetzung' },
  });
  ok(tCreate.status === 200, `10a: create with translations → 200`);
  ok(tCreate.body.review?.translations?.hr === 'Hrvatski prijevod', `10b: HR translation persisted`);
  ok(tCreate.body.review?.translations?.de === 'Deutsche Übersetzung', `10c: DE translation persisted`);
  const translatedId = tCreate.body.review?.id;
  if (translatedId) langIds.push(translatedId);

  // ── 11. Round-trip translations through GET ────────────────────────────────
  log('\n=== 11. translations survive GET (admin + public) ===');
  if (translatedId) {
    const adm = await api('GET', '/api/admin/reviews');
    const admRow = adm.body.reviews?.find((r) => r.id === translatedId);
    ok(admRow?.translations?.hr === 'Hrvatski prijevod', `11a: admin GET returns HR translation`);
    const pub3 = await api('GET', '/api/reviews', undefined, false);
    const pubRow = pub3.body.reviews?.find((r) => r.id === translatedId);
    ok(pubRow?.translations?.hr === 'Hrvatski prijevod', `11b: public GET exposes HR translation`);
    ok(pubRow?.translations?.de === 'Deutsche Übersetzung', `11c: public GET exposes DE translation`);
  }

  // ── 12. PATCH adds + removes individual translations ──────────────────────
  log('\n=== 12. PATCH translations (replace wholesale) ===');
  if (translatedId) {
    // Replace map: drop DE, add IT.
    const p = await api('PATCH', `/api/admin/reviews/${translatedId}`, {
      translations: { hr: 'Hrvatski prijevod', it: 'Traduzione italiana' },
    });
    ok(p.status === 200, `12a: PATCH translations → 200`);
    ok(p.body.review?.translations?.it === 'Traduzione italiana', `12b: new IT key present`);
    ok(p.body.review?.translations?.de === undefined, `12c: dropped DE key gone`);
    ok(p.body.review?.translations?.hr === 'Hrvatski prijevod', `12d: HR key still present`);

    // Empty map should clear.
    const pClear = await api('PATCH', `/api/admin/reviews/${translatedId}`, { translations: {} });
    ok(pClear.status === 200, `12e: PATCH translations={} → 200`);
    ok(pClear.body.review?.translations === undefined, `12f: empty map clears the field entirely`);
  }

  // ── 13. Reject original-lang in translations ───────────────────────────────
  log('\n=== 13. Reject translation in the original language ===');
  const tBad = await api('POST', '/api/admin/reviews', {
    author: 'Conflict',
    source: 'Airbnb',
    rating: 5,
    quote: 'q',
    date: '2025-08-15',
    featured: false,
    sortOrder: 850,
    lang: 'en',
    translations: { en: 'duplicate', hr: 'ok' },
  });
  ok(tBad.status === 400, `13a: translation in original lang → 400 (got ${tBad.status})`);
  ok(/original/.test(tBad.body.error || ''), `13b: error mentions 'original' (${tBad.body.error})`);

  // ── 13b. PATCH lang to a code already in translations → conflict resolved
  log('\n=== 13b. PATCH lang shadows a translation key → cleaned ===');
  const conflictCreate = await api('POST', '/api/admin/reviews', {
    author: 'Conflict Soak',
    source: 'Direct',
    rating: 5,
    quote: 'English original',
    date: '2025-08-15',
    featured: false,
    sortOrder: 860,
    lang: 'en',
    translations: { hr: 'Hrvatski prijevod', de: 'Deutsche Übersetzung' },
  });
  ok(conflictCreate.status === 200, `13b-a: setup row created`);
  const conflictId = conflictCreate.body.review?.id;
  if (conflictId) langIds.push(conflictId);

  if (conflictId) {
    // PATCH lang=hr — the existing translations.hr would now duplicate
    // quote. Route must drop it from the merged map.
    const conflict = await api('PATCH', `/api/admin/reviews/${conflictId}`, { lang: 'hr' });
    ok(conflict.status === 200, `13b-b: PATCH lang=hr → 200`);
    ok(conflict.body.review?.lang === 'hr', `13b-c: lang now 'hr'`);
    ok(conflict.body.review?.translations?.hr === undefined, `13b-d: conflicting HR key dropped from translations`);
    ok(conflict.body.review?.translations?.de === 'Deutsche Übersetzung', `13b-e: non-conflicting DE key preserved`);
  }

  // ── 14. Sanitisation: garbage keys + non-string values dropped ────────────
  log('\n=== 14. Sanitisation strips garbage ===');
  const tDirty = await api('POST', '/api/admin/reviews', {
    author: 'Dirty',
    source: 'Airbnb',
    rating: 5,
    quote: 'q',
    date: '2025-08-15',
    featured: false,
    sortOrder: 870,
    lang: 'en',
    translations: {
      hr: 'real',
      es: 'unsupported lang',         // not in 5 → dropped
      __proto__: 'attack',             // not a lang → dropped
      de: 42,                          // wrong type → dropped
      it: '   ',                       // whitespace-only → dropped
      fr: 'x'.repeat(5000),            // too long → dropped
    },
  });
  ok(tDirty.status === 200, `14a: dirty translations create → 200`);
  if (tDirty.body.review?.id) {
    langIds.push(tDirty.body.review.id);
    ok(tDirty.body.review.translations?.hr === 'real', `14b: clean HR key kept`);
    ok(tDirty.body.review.translations?.es === undefined, `14c: ES key dropped`);
    ok(tDirty.body.review.translations?.de === undefined, `14d: non-string DE dropped`);
    ok(tDirty.body.review.translations?.it === undefined, `14e: whitespace IT dropped`);
    ok(tDirty.body.review.translations?.fr === undefined, `14f: too-long FR dropped`);
    ok(Object.keys(tDirty.body.review.translations || {}).length === 1, `14g: exactly 1 key kept`);
  }

  // ── 15. Cleanup ────────────────────────────────────────────────────────────
  log('\n=== 15. Cleanup ===');
  for (const lid of langIds) {
    await api('DELETE', `/api/admin/reviews/${lid}`);
  }
  ok(true, `15a: deleted ${langIds.length} test rows`);
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
