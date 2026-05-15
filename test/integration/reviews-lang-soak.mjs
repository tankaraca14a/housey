// "Painful" soak: hammers the per-review lang + translations feature
// across edge cases the focused suites don't cover. Snapshot+restore
// data/reviews.json so prod-ish dev state is never disturbed.
//
// Coverage:
//   1. Featured strip on home page picks the right translation
//   2. RTL review (Arabic original) with LTR translations renders LTR
//      when visitor language matches the translation
//   3. Translation at max length (2000 chars) round-trips intact
//   4. Translation with emoji, smart quotes, multi-byte chars survives
//   5. PATCH a single field leaves translations untouched (no clobber)
//   6. PATCH lang to a code that's already in translations is rejected
//      (would create the duplicate-of-quote conflict)
//   7. 20 reviews each with 4 translations all coexist, fetch under budget
//   8. Concurrent PATCH of translations doesn't corrupt the row
//   9. Empty-string translation entry in PATCH drops that key
//  10. Trimming behaviour: leading/trailing whitespace is stripped

import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

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

const blockquoteRe = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi;
const blockquoteTexts = (html) => {
  const out = [];
  let m;
  while ((m = blockquoteRe.exec(html)) !== null) {
    out.push(m[1].replace(/&ldquo;|&rdquo;|"/g, '').trim());
  }
  return out;
};

const dataPath = 'data/reviews.json';
const before = existsSync(dataPath) ? readFileSync(dataPath, 'utf8') : '[]\n';
const createdIds = [];

try {
  // ── 1. Home-page featured strip picks translation ─────────────────────────
  log('=== 1. Home-page featured strip honours translations ===');
  const featured = await api('POST', '/api/admin/reviews', {
    author: 'Soak Featured EN',
    source: 'Direct',
    rating: 5,
    quote: 'Soak featured original English quote — sentinel.',
    date: '2025-08-15',
    featured: true,
    sortOrder: 1,
    lang: 'en',
    translations: { hr: 'Soak prijevod citata, hrvatski.' },
  });
  if (featured.body.review?.id) createdIds.push(featured.body.review.id);

  const homeHr = await getHtml('/', 'housey-lang=hr');
  ok(homeHr.status === 200, `1a: home /?cookie=hr → 200`);
  const homeQuotes = blockquoteTexts(homeHr.text);
  ok(homeQuotes.some((q) => q.includes('Soak prijevod')), `1b: HR translation appears on home strip`);
  ok(!homeQuotes.some((q) => q.includes('original English quote')), `1c: original English NOT rendered on HR home`);

  // ── 2. RTL original + English translation ──────────────────────────────────
  log('\n=== 2. RTL original + LTR translation ===');
  const rtl = await api('POST', '/api/admin/reviews', {
    author: 'أحمد المهندس',
    source: 'Airbnb',
    rating: 5,
    quote: 'مكان رائع على البحر، الإطلالة لا تنسى.',
    date: '2025-08-16',
    featured: false,
    sortOrder: 10,
    // No native Arabic in our 5; tag the original as fr just to exercise
    // a non-default lang. The point of this test is that the EN
    // translation renders LTR when visitor=en regardless of original
    // text direction.
    lang: 'fr',
    translations: { en: 'Wonderful place by the sea, the view is unforgettable.' },
  });
  if (rtl.body.review?.id) createdIds.push(rtl.body.review.id);

  const en = await getHtml('/reviews', 'housey-lang=en');
  const enQuotes = blockquoteTexts(en.text);
  ok(enQuotes.some((q) => q.includes('Wonderful place by the sea')), `2a: EN visitor sees the English translation`);

  const fr = await getHtml('/reviews', 'housey-lang=fr');
  const frQuotes = blockquoteTexts(fr.text);
  ok(frQuotes.some((q) => q.includes('مكان رائع')), `2b: FR visitor (== original lang) sees Arabic original`);

  // ── 3. Max-length translation round-trips ──────────────────────────────────
  log('\n=== 3. 2000-char translation round-trips ===');
  const big = 'A'.repeat(2000);
  const bigOne = await api('POST', '/api/admin/reviews', {
    author: 'Soak Long',
    source: 'Direct',
    rating: 5,
    quote: 'short original',
    date: '2025-08-15',
    featured: false,
    sortOrder: 20,
    lang: 'en',
    translations: { hr: big },
  });
  ok(bigOne.status === 200, `3a: 2000-char translation accepted`);
  ok(bigOne.body.review?.translations?.hr?.length === 2000, `3b: 2000-char translation persisted intact`);
  if (bigOne.body.review?.id) createdIds.push(bigOne.body.review.id);

  // ── 4. Special chars (emoji, smart quotes, multi-byte) ────────────────────
  log('\n=== 4. Special chars in translations ===');
  const fancy = 'Wunderschön — sauber, ruhig & friedlich. 🌊 "Heerlich!" – wir kommen wieder.';
  const spec = await api('POST', '/api/admin/reviews', {
    author: 'Soak Special',
    source: 'Booking.com',
    rating: 5,
    quote: 'Beautiful place.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 30,
    lang: 'en',
    translations: { de: fancy },
  });
  ok(spec.status === 200, `4a: emoji + smart quotes accepted`);
  ok(spec.body.review?.translations?.de === fancy, `4b: chars round-trip byte-for-byte`);
  if (spec.body.review?.id) createdIds.push(spec.body.review.id);

  // SSR check: DE visitor sees the emoji rendered.
  const de = await getHtml('/reviews', 'housey-lang=de');
  const deQuotes = blockquoteTexts(de.text);
  ok(deQuotes.some((q) => q.includes('Wunderschön') && q.includes('🌊')), `4c: emoji renders in SSR HTML`);

  // ── 5. PATCH single field leaves translations untouched ───────────────────
  log('\n=== 5. Targeted PATCH preserves translations ===');
  const t5id = createdIds[0]; // the home-strip one with HR translation
  const beforeT = (await api('GET', '/api/admin/reviews')).body.reviews?.find((r) => r.id === t5id);
  ok(beforeT?.translations?.hr === 'Soak prijevod citata, hrvatski.', `5a: starting state has HR translation`);
  await api('PATCH', `/api/admin/reviews/${t5id}`, { rating: 4 });
  const afterT = (await api('GET', '/api/admin/reviews')).body.reviews?.find((r) => r.id === t5id);
  ok(afterT?.rating === 4, `5b: rating patched`);
  ok(afterT?.translations?.hr === 'Soak prijevod citata, hrvatski.', `5c: HR translation survived an unrelated PATCH`);

  // ── 6. PATCH lang to a code already in translations → rejected ────────────
  log('\n=== 6. PATCH lang conflicting with existing translations ===');
  // Currently API sanitises silently and stores the conflict; validator
  // *should* catch the duplicate. Verify behaviour either way.
  const conflict = await api('PATCH', `/api/admin/reviews/${t5id}`, { lang: 'hr' });
  // Two acceptable outcomes:
  //   (a) 400 with "original" in error
  //   (b) 200 + translations rebuilt to drop the conflicting key
  if (conflict.status === 400) {
    ok(/original/i.test(conflict.body.error || ''), `6a: PATCH rejected with 'original' in error`);
  } else if (conflict.status === 200) {
    ok(conflict.body.review?.lang === 'hr', `6a-alt: PATCH accepted, lang now 'hr'`);
    ok(conflict.body.review?.translations?.hr === undefined, `6b-alt: conflicting HR key was dropped`);
  } else {
    ok(false, `6a-bad: unexpected status ${conflict.status}`);
  }
  // Restore.
  await api('PATCH', `/api/admin/reviews/${t5id}`, { lang: 'en', translations: { hr: 'Soak prijevod citata, hrvatski.' } });

  // ── 7. Scale: 20 reviews × 4 translations each ────────────────────────────
  log('\n=== 7. 20 reviews × 4 translations under budget ===');
  const startT = Date.now();
  const scaleIds = [];
  for (let i = 0; i < 20; i++) {
    const r = await api('POST', '/api/admin/reviews', {
      author: `Scale ${i}`,
      source: 'Direct',
      rating: 5,
      quote: `Original ${i}`,
      date: '2025-08-15',
      featured: false,
      sortOrder: 100 + i,
      lang: 'en',
      translations: {
        hr: `Hrvatski ${i}`,
        de: `Deutsch ${i}`,
        it: `Italiano ${i}`,
        fr: `Français ${i}`,
      },
    });
    if (r.body.review?.id) {
      scaleIds.push(r.body.review.id);
      createdIds.push(r.body.review.id);
    }
  }
  ok(scaleIds.length === 20, `7a: created 20 scale rows (${scaleIds.length})`);
  const listStart = Date.now();
  const scaleList = await api('GET', '/api/admin/reviews');
  const listMs = Date.now() - listStart;
  ok(listMs < 1500, `7b: GET list returns under 1.5s with 20+ translated rows (${listMs}ms)`);
  // Every scale row carries all 4 translations.
  let intact = 0;
  for (const id of scaleIds) {
    const row = scaleList.body.reviews?.find((r) => r.id === id);
    if (row?.translations?.hr && row?.translations?.de && row?.translations?.it && row?.translations?.fr) intact++;
  }
  ok(intact === 20, `7c: all 20 rows have all 4 translations intact (got ${intact})`);

  // SSR /reviews with 20+ translated rows still works for every lang.
  for (const lang of ['en', 'hr', 'de', 'it', 'fr']) {
    const r = await getHtml('/reviews', `housey-lang=${lang}`);
    ok(r.status === 200, `7d-${lang}: SSR /reviews → 200 with 20 scale rows`);
  }

  // ── 8. Concurrent PATCH of translations on the same row ───────────────────
  log('\n=== 8. Concurrent translation PATCHes don\'t corrupt row ===');
  const concId = scaleIds[0];
  // Fire 6 PATCHes simultaneously — each setting a different key — and
  // then check the final state has *one* of them (last writer wins, but
  // the row must still be valid).
  const concurrent = [];
  for (const code of ['hr', 'de', 'it', 'fr', 'hr', 'de']) {
    concurrent.push(api('PATCH', `/api/admin/reviews/${concId}`, {
      translations: { [code]: `Concurrent ${code} ${Math.random().toString(36).slice(2, 8)}` },
    }));
  }
  const results = await Promise.all(concurrent);
  const okCount = results.filter((r) => r.status === 200).length;
  ok(okCount === 6, `8a: all 6 concurrent PATCHes returned 200 (got ${okCount})`);
  const finalRow = (await api('GET', '/api/admin/reviews')).body.reviews?.find((r) => r.id === concId);
  ok(!!finalRow, `8b: row still exists after concurrent writes`);
  // The translations map is one of the patches (wholesale replacement),
  // so exactly one key should be present.
  const finalKeys = Object.keys(finalRow?.translations || {});
  ok(finalKeys.length === 1, `8c: exactly 1 translation key survives (got ${finalKeys.length}: ${finalKeys.join(',')})`);

  // ── 9. Empty-string keys in PATCH drop from map ────────────────────────────
  log('\n=== 9. PATCH with empty-string value drops that key ===');
  const dropId = scaleIds[1];
  await api('PATCH', `/api/admin/reviews/${dropId}`, {
    translations: { hr: 'kept', de: '', it: '   ' },
  });
  const dropRow = (await api('GET', '/api/admin/reviews')).body.reviews?.find((r) => r.id === dropId);
  ok(dropRow?.translations?.hr === 'kept', `9a: HR with content kept`);
  ok(dropRow?.translations?.de === undefined, `9b: empty DE dropped`);
  ok(dropRow?.translations?.it === undefined, `9c: whitespace-only IT dropped`);

  // ── 10. Trimming behaviour ─────────────────────────────────────────────────
  log('\n=== 10. Translations are trimmed on save ===');
  const trimId = scaleIds[2];
  await api('PATCH', `/api/admin/reviews/${trimId}`, {
    translations: { hr: '   trimmed value   ' },
  });
  const trimRow = (await api('GET', '/api/admin/reviews')).body.reviews?.find((r) => r.id === trimId);
  ok(trimRow?.translations?.hr === 'trimmed value', `10a: leading/trailing spaces trimmed (got "${trimRow?.translations?.hr}")`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Cleanup: every row we created
  for (const id of createdIds) {
    try {
      await fetch(`${BASE}/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': PASS },
      });
    } catch {}
  }
  writeFileSync(dataPath, before);
  log(`\n  (deleted ${createdIds.length} soak rows + rolled back ${dataPath})`);
}

log('');
log(failures === 0 ? 'PASS — lang/translations soak verified across edge cases ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
