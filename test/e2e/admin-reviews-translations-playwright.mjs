// End-to-end test of the per-review *translations* feature.
//
// Owner workflow:
//   - On the admin form, an expandable "Translations (optional)" panel
//     shows one textarea per non-original language. The owner pastes a
//     hand-curated translation; the site stores it on the review row.
//
// Visitor workflow:
//   - On /reviews, when the visitor's current language has a translation,
//     the card renders the translated quote and offers a "Show original"
//     toggle. Click → swap to the source quote. Click again → swap back.
//   - When no translation exists for the visitor's lang, the card falls
//     back to the original quote + the "in {language}" badge (covered
//     separately by admin-reviews-lang-playwright.mjs).
//
// Coverage matrix:
//   1. Translations panel renders 4 textareas (excludes original-lang slot)
//   2. Save with a HR + DE translation, both persist via API + GET
//   3. HR visitor on a review with HR translation → shows translation, no badge
//   4. Toggle "Show original" → reveals source quote + badge appears
//   5. Toggle back → translation re-shown
//   6. DE visitor on the same review → shows DE translation
//   7. IT visitor (no translation) → falls back to original + "in English" badge
//   8. Switching admin lang of the form re-renders the panel's textarea set
//      (the new original-lang slot disappears, the previous one reappears)
//   9. Empty translation slots aren't persisted (admin entered then erased)
//
// Cleanup: every created row is captured in createdIds and deleted in
// finally; the data file is snapshotted + restored.

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const ALL_LANGS = ['en', 'hr', 'de', 'it', 'fr'];

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const createdIds = [];

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': PASS };
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function setVisitorLang(page, code) {
  await page.evaluate((l) => {
    window.localStorage.setItem('housey-lang', l);
    document.cookie = `housey-lang=${l}; max-age=31536000; path=/; SameSite=Lax`;
  }, code);
}

const dataPath = 'data/reviews.json';
const before = existsSync(dataPath) ? readFileSync(dataPath, 'utf8') : '[]\n';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

try {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Translations panel has 4 textareas (excludes original-lang slot)
  // ───────────────────────────────────────────────────────────────────────────
  log('=== 1. Translations panel renders 4 non-original textareas ===');
  // Visit the origin first so localStorage / document.cookie are usable.
  await page.goto(`${BASE}/`);
  await setVisitorLang(page, 'en');
  await page.goto(`${BASE}/admin`);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForSelector('h1');

  await page.getByRole('button', { name: 'Add review' }).click();
  await page.waitForSelector('[data-testid="review-edit-panel"]');

  // Default lang is EN, so the 4 textareas should be HR/DE/IT/FR (no EN).
  // Open the <details> panel first since it's closed by default when
  // every translation slot is empty.
  const panel = page.locator('[data-testid="review-translations-panel"]');
  await panel.evaluate((el) => { el.open = true; });
  for (const code of ALL_LANGS) {
    const ta = page.locator(`[data-testid="review-translation-${code}"]`);
    const count = await ta.count();
    if (code === 'en') {
      ok(count === 0, `1-${code}: original-lang slot hidden (count=${count})`);
    } else {
      ok(count === 1, `1-${code}: translation slot rendered (count=${count})`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Save with HR + DE translations; verify persistence via API
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 2. Save with translations persists ===');
  await page.locator('[data-testid="review-author"]').fill('Multi-lang Anna');
  await page.locator('[data-testid="review-source"]').fill('Airbnb');
  await page.locator('[data-testid="review-rating-5"]').click();
  await page.locator('[data-testid="review-quote"]').fill('Lovely stay, clean and quiet.');
  // English is the original; fill the HR and DE slots. The translations
  // panel is a <details>, ensure it's open before driving the textareas.
  await page.locator('[data-testid="review-translations-panel"]').evaluate((el) => { el.open = true; });
  await page.locator('[data-testid="review-translation-hr"]').fill('Divan boravak, čisto i mirno.');
  await page.locator('[data-testid="review-translation-de"]').fill('Wunderbarer Aufenthalt, sauber und ruhig.');
  // Leave IT and FR empty — they should not be persisted.
  await page.locator('[data-testid="review-save"]').click();
  await page.waitForSelector('[data-testid="review-edit-panel"]', { state: 'detached', timeout: 8000 });
  await page.waitForTimeout(400);

  const list = await api('GET', '/api/admin/reviews');
  const row = list.body.reviews?.find((r) => r.author === 'Multi-lang Anna');
  ok(!!row, `2a: row in admin list`);
  ok(row?.translations?.hr === 'Divan boravak, čisto i mirno.', `2b: HR translation persisted`);
  ok(row?.translations?.de === 'Wunderbarer Aufenthalt, sauber und ruhig.', `2c: DE translation persisted`);
  ok(row?.translations?.it === undefined, `2d: empty IT slot NOT persisted`);
  ok(row?.translations?.fr === undefined, `2e: empty FR slot NOT persisted`);
  ok(row?.translations?.en === undefined, `2f: original-lang slot NOT in translations`);
  if (row?.id) createdIds.push(row.id);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. HR visitor sees the translated quote (no badge)
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 3. HR visitor sees translated quote (no badge) ===');
  await setVisitorLang(page, 'hr');
  await page.goto(`${BASE}/reviews`);
  await page.waitForSelector('h1');
  if (row?.id) {
    const card = page.locator(`[data-testid="review-${row.id}"]`);
    const quoteText = (await card.locator('blockquote').textContent())?.trim() ?? '';
    ok(/Divan boravak/.test(quoteText), `3a: HR visitor sees Croatian quote (got "${quoteText}")`);
    const badge = page.locator(`[data-testid="review-lang-badge-${row.id}"]`);
    ok(await badge.count() === 0, `3b: no "in English" badge (count=${await badge.count()})`);
    const toggle = page.locator(`[data-testid="review-translation-toggle-${row.id}"]`);
    ok(await toggle.count() === 1, `3c: "Show original" toggle visible`);
    const toggleText = (await toggle.textContent())?.trim() ?? '';
    ok(/Prikaži izvornik/.test(toggleText), `3d: toggle reads "Prikaži izvornik" (got "${toggleText}")`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Toggle reveals the original + badge appears
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 4. Toggle → original + badge ===');
  if (row?.id) {
    await page.locator(`[data-testid="review-translation-toggle-${row.id}"]`).click();
    await page.waitForTimeout(100);
    const card = page.locator(`[data-testid="review-${row.id}"]`);
    const quoteText = (await card.locator('blockquote').textContent())?.trim() ?? '';
    ok(/Lovely stay/.test(quoteText), `4a: toggle reveals English original (got "${quoteText}")`);
    const badge = page.locator(`[data-testid="review-lang-badge-${row.id}"]`);
    const badgeText = (await badge.textContent())?.trim() ?? '';
    ok(/engleskom/.test(badgeText), `4b: badge "na engleskom" appears (got "${badgeText}")`);
    const toggle = page.locator(`[data-testid="review-translation-toggle-${row.id}"]`);
    const toggleText = (await toggle.textContent())?.trim() ?? '';
    ok(/Prikaži prijevod/.test(toggleText), `4c: toggle flipped to "Prikaži prijevod" (got "${toggleText}")`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Toggle back → translation re-shown
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 5. Toggle back → translation ===');
  if (row?.id) {
    await page.locator(`[data-testid="review-translation-toggle-${row.id}"]`).click();
    await page.waitForTimeout(100);
    const card = page.locator(`[data-testid="review-${row.id}"]`);
    const quoteText = (await card.locator('blockquote').textContent())?.trim() ?? '';
    ok(/Divan boravak/.test(quoteText), `5a: toggle back to HR translation (got "${quoteText}")`);
    const badge = page.locator(`[data-testid="review-lang-badge-${row.id}"]`);
    ok(await badge.count() === 0, `5b: badge gone again`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. DE visitor sees the DE translation
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 6. DE visitor → DE translation ===');
  await setVisitorLang(page, 'de');
  await page.goto(`${BASE}/reviews`);
  await page.waitForSelector('h1');
  if (row?.id) {
    const card = page.locator(`[data-testid="review-${row.id}"]`);
    const quoteText = (await card.locator('blockquote').textContent())?.trim() ?? '';
    ok(/Wunderbarer/.test(quoteText), `6a: DE visitor sees German translation (got "${quoteText}")`);
    const badge = page.locator(`[data-testid="review-lang-badge-${row.id}"]`);
    ok(await badge.count() === 0, `6b: no badge for DE on DE-translated review`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. IT visitor (no IT translation) → original + "auf Englisch" badge
  //    Wait, the visitor is IT not DE; the badge text comes from the IT dict.
  //    Expected: "in inglese".
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 7. IT visitor (no IT translation) → fallback ===');
  await setVisitorLang(page, 'it');
  await page.goto(`${BASE}/reviews`);
  await page.waitForSelector('h1');
  if (row?.id) {
    const card = page.locator(`[data-testid="review-${row.id}"]`);
    const quoteText = (await card.locator('blockquote').textContent())?.trim() ?? '';
    ok(/Lovely stay/.test(quoteText), `7a: IT visitor falls back to English original (got "${quoteText}")`);
    const badge = page.locator(`[data-testid="review-lang-badge-${row.id}"]`);
    const badgeText = (await badge.textContent())?.trim() ?? '';
    ok(/inglese/.test(badgeText), `7b: badge "in inglese" appears (got "${badgeText}")`);
    const toggle = page.locator(`[data-testid="review-translation-toggle-${row.id}"]`);
    ok(await toggle.count() === 0, `7c: no toggle (no IT translation to swap to)`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Changing form's original lang re-renders the textarea set
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 8. Switching original lang re-shapes the panel ===');
  await setVisitorLang(page, 'en');
  await page.goto(`${BASE}/admin`);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForSelector('h1');
  await page.getByRole('button', { name: 'Add review' }).click();
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.locator('[data-testid="review-translations-panel"]').evaluate((el) => { el.open = true; });

  // Default EN → EN slot hidden, HR present.
  ok(await page.locator('[data-testid="review-translation-en"]').count() === 0, `8a: EN slot hidden when lang=en`);
  ok(await page.locator('[data-testid="review-translation-hr"]').count() === 1, `8b: HR slot present when lang=en`);

  // Switch to HR → HR slot hidden, EN appears.
  await page.locator('[data-testid="review-lang"]').selectOption('hr');
  await page.waitForTimeout(100);
  ok(await page.locator('[data-testid="review-translation-hr"]').count() === 0, `8c: HR slot hidden when lang=hr`);
  ok(await page.locator('[data-testid="review-translation-en"]').count() === 1, `8d: EN slot present when lang=hr`);

  await page.locator('[data-testid="review-cancel"]').click();

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Empty slots not persisted (regression for #2)
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 9. Empty translation slots aren\'t persisted ===');
  await page.getByRole('button', { name: 'Add review' }).click();
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.locator('[data-testid="review-translations-panel"]').evaluate((el) => { el.open = true; });
  await page.locator('[data-testid="review-author"]').fill('Empty Slots Test');
  await page.locator('[data-testid="review-source"]').fill('Direct');
  await page.locator('[data-testid="review-rating-5"]').click();
  await page.locator('[data-testid="review-quote"]').fill('No translations attached');
  // Fill HR then immediately clear it → it should NOT be persisted.
  await page.locator('[data-testid="review-translation-hr"]').fill('temp');
  await page.locator('[data-testid="review-translation-hr"]').fill('');
  await page.locator('[data-testid="review-save"]').click();
  await page.waitForSelector('[data-testid="review-edit-panel"]', { state: 'detached', timeout: 8000 });
  await page.waitForTimeout(400);

  const list2 = await api('GET', '/api/admin/reviews');
  const emptyRow = list2.body.reviews?.find((r) => r.author === 'Empty Slots Test');
  ok(!!emptyRow, `9a: row created`);
  ok(emptyRow?.translations === undefined, `9b: translations field absent (got ${JSON.stringify(emptyRow?.translations)})`);
  if (emptyRow?.id) createdIds.push(emptyRow.id);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  for (const id of createdIds) {
    try {
      await fetch(`${BASE}/api/admin/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': PASS },
      });
    } catch {}
  }
  writeFileSync(dataPath, before);
  log(`\n  (deleted ${createdIds.length} test rows + rolled back ${dataPath})`);
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — review translations verified end-to-end ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
