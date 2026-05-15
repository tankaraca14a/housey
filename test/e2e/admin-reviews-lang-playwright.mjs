// End-to-end test of the per-review "original language" feature.
//
// Scope:
//   1. Admin form renders a language <select> with the 5 supported codes
//   2. Saving with lang=hr persists the field and round-trips through GET
//   3. Editing the row re-populates the dropdown with the saved lang
//   4. Public /reviews page renders the "in {language}" badge when the
//      visitor's lang ≠ review's lang
//   5. Switching visitor language to match the review removes the badge
//   6. A legacy review with no lang field never renders the badge
//   7. The badge text localises into the visitor's language
//      (e.g. EN visitor on HR review → "in Croatian";
//            DE visitor on EN review → "auf Englisch")
//
// Cleanup: every row created is captured in `createdIds` and deleted in
// the finally block via the admin DELETE endpoint, so the data file ends
// up untouched.

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const ALL_LANGS = ['en', 'hr', 'de', 'it', 'fr'];

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const createdIds = [];

async function api(method, path, body, pwd = PASS) {
  const headers = { 'Content-Type': 'application/json' };
  if (pwd) headers['x-admin-password'] = pwd;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

// Snapshot data/reviews.json so even if our cleanup misses something the
// dev state survives. Run inside try / finally so we always restore.
const dataPath = 'data/reviews.json';
const before = existsSync(dataPath) ? readFileSync(dataPath, 'utf8') : '[]\n';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

try {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Admin form has the language dropdown with all 5 langs
  // ───────────────────────────────────────────────────────────────────────────
  log('=== 1. Admin form has language dropdown ===');
  await page.goto(`${BASE}/admin`);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForSelector('h1');

  // Click "Add review" (in whatever language the admin happens to be in
  // — picker default is EN so the label is "Add review").
  // Scroll to the Reviews section and open the add panel.
  await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
  await page.reload();
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForSelector('h1');

  const addReviewBtn = page.getByRole('button', { name: 'Add review' });
  await addReviewBtn.scrollIntoViewIfNeeded();
  await addReviewBtn.click();
  await page.waitForSelector('[data-testid="review-edit-panel"]');

  const langSelect = page.locator('[data-testid="review-lang"]');
  ok(await langSelect.count() === 1, `1a: review-lang select rendered`);

  const optionValues = await page.locator('[data-testid="review-lang"] option').evaluateAll(
    (opts) => opts.map((o) => o.value),
  );
  for (const code of ALL_LANGS) {
    ok(optionValues.includes(code), `1-${code}: option present`);
  }
  ok(optionValues.length === 5, `1-total: exactly 5 options (got ${optionValues.length})`);

  const defaultVal = await langSelect.inputValue();
  ok(defaultVal === 'en', `1b: default selected is "en" (got "${defaultVal}")`);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Save a review with lang=hr; verify it round-trips
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 2. Save review with lang=hr ===');
  await page.locator('[data-testid="review-author"]').fill('Lang Test HR');
  await page.locator('[data-testid="review-source"]').fill('Airbnb');
  await page.locator('[data-testid="review-rating-5"]').click();
  await page.locator('[data-testid="review-quote"]').fill('Divan boravak u Veloj Luci.');
  await langSelect.selectOption('hr');
  await page.locator('[data-testid="review-save"]').click();

  // Wait for save to complete (panel closes).
  await page.waitForSelector('[data-testid="review-edit-panel"]', { state: 'detached', timeout: 8000 });
  await page.waitForTimeout(400); // let the list refresh

  // Find the row in the admin list and capture its id for cleanup.
  const list = await api('GET', '/api/admin/reviews');
  const hrRow = list.body.reviews?.find((r) => r.author === 'Lang Test HR');
  ok(!!hrRow, `2a: HR row appears in admin list`);
  ok(hrRow?.lang === 'hr', `2b: lang="hr" persisted on the row`);
  if (hrRow?.id) createdIds.push(hrRow.id);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Edit-reopen pre-fills the dropdown with the saved value
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 3. Edit reopens with saved lang ===');
  if (hrRow?.id) {
    const editBtn = page.locator(`[data-testid="review-edit-${hrRow.id}"]`);
    if (await editBtn.count() === 1) {
      await editBtn.click();
      await page.waitForSelector('[data-testid="review-edit-panel"]');
      const reopened = await page.locator('[data-testid="review-lang"]').inputValue();
      ok(reopened === 'hr', `3a: re-opened form shows lang="hr" (got "${reopened}")`);
      await page.locator('[data-testid="review-cancel"]').click();
    } else {
      ok(false, `3a-skip: edit button not found (test-id review-edit-${hrRow.id})`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Public /reviews on EN shows "in Croatian" badge for HR review
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 4. Badge on /reviews when visitor.lang ≠ review.lang ===');
  await page.evaluate(() => {
    window.localStorage.setItem('housey-lang', 'en');
    document.cookie = 'housey-lang=en; max-age=31536000; path=/; SameSite=Lax';
  });
  await page.goto(`${BASE}/reviews`);
  await page.waitForSelector('h1');

  if (hrRow?.id) {
    const badge = page.locator(`[data-testid="review-lang-badge-${hrRow.id}"]`);
    await badge.waitFor({ state: 'visible', timeout: 5000 });
    const badgeText = (await badge.textContent())?.trim() ?? '';
    ok(/Croatian/.test(badgeText), `4a: EN visitor sees "Croatian" in badge (got "${badgeText}")`);
    ok(/in /.test(badgeText), `4b: EN preposition "in" in badge (got "${badgeText}")`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Switching visitor to HR removes the badge
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 5. No badge when visitor.lang === review.lang ===');
  await page.evaluate(() => {
    window.localStorage.setItem('housey-lang', 'hr');
    document.cookie = 'housey-lang=hr; max-age=31536000; path=/; SameSite=Lax';
  });
  await page.reload();
  await page.waitForSelector('h1');
  if (hrRow?.id) {
    const badge = page.locator(`[data-testid="review-lang-badge-${hrRow.id}"]`);
    const count = await badge.count();
    ok(count === 0, `5a: HR visitor on HR review → no badge (count=${count})`);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Legacy review (no lang field) never shows a badge
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 6. Legacy review (no lang) → no badge ===');
  const legacy = await api('POST', '/api/admin/reviews', {
    author: 'Legacy NoLang',
    source: 'Airbnb',
    rating: 5,
    quote: 'Old review without a lang field.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 555,
    // explicitly omit lang
  });
  ok(legacy.status === 200, `6a: legacy create succeeds`);
  const legacyId = legacy.body.review?.id;
  if (legacyId) createdIds.push(legacyId);
  ok(legacy.body.review?.lang === undefined, `6b: legacy row has lang=undefined`);

  // Flip visitor to every language and confirm no badge appears for the
  // legacy row in any of them.
  for (const visitorLang of ALL_LANGS) {
    await page.evaluate((l) => {
      window.localStorage.setItem('housey-lang', l);
      document.cookie = `housey-lang=${l}; max-age=31536000; path=/; SameSite=Lax`;
    }, visitorLang);
    await page.goto(`${BASE}/reviews`);
    await page.waitForSelector('h1');
    if (legacyId) {
      const badge = page.locator(`[data-testid="review-lang-badge-${legacyId}"]`);
      const count = await badge.count();
      ok(count === 0, `6-${visitorLang}: legacy row → no badge on ${visitorLang} visitor (count=${count})`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Badge text localises into visitor's language
  // ───────────────────────────────────────────────────────────────────────────
  log('\n=== 7. Badge localises ===');
  // Create one review in each lang, then check the badge text on each
  // (visitor lang, review lang) pair where they differ.
  const matrix = {
    // visitor → expected fragment when review.lang is the key below
    en: { hr: /in Croatian/, de: /in German/, it: /in Italian/, fr: /in French/ },
    hr: { en: /na engleskom/, de: /na njemačkom/, it: /na talijanskom/, fr: /na francuskom/ },
    de: { en: /auf Englisch/, hr: /auf Kroatisch/, it: /auf Italienisch/, fr: /auf Französisch/ },
    it: { en: /in inglese/, hr: /in croato/, de: /in tedesco/, fr: /in francese/ },
    fr: { en: /en anglais/, hr: /en croate/, de: /en allemand/, it: /en italien/ },
  };

  const matrixRows = {};
  for (const reviewLang of ALL_LANGS) {
    const r = await api('POST', '/api/admin/reviews', {
      author: `Matrix ${reviewLang.toUpperCase()}`,
      source: 'Airbnb',
      rating: 5,
      quote: `Matrix test review (${reviewLang})`,
      date: '2025-08-15',
      featured: false,
      sortOrder: 700 + ALL_LANGS.indexOf(reviewLang),
      lang: reviewLang,
    });
    if (r.body.review?.id) {
      matrixRows[reviewLang] = r.body.review.id;
      createdIds.push(r.body.review.id);
    }
  }

  for (const visitorLang of ALL_LANGS) {
    await page.evaluate((l) => {
      window.localStorage.setItem('housey-lang', l);
      document.cookie = `housey-lang=${l}; max-age=31536000; path=/; SameSite=Lax`;
    }, visitorLang);
    await page.goto(`${BASE}/reviews`);
    await page.waitForSelector('h1');

    for (const reviewLang of ALL_LANGS) {
      const id = matrixRows[reviewLang];
      if (!id) continue;
      const badge = page.locator(`[data-testid="review-lang-badge-${id}"]`);
      if (visitorLang === reviewLang) {
        ok(await badge.count() === 0, `7-${visitorLang}-${reviewLang}: same lang → no badge`);
      } else {
        const txt = (await badge.textContent())?.trim() ?? '';
        const expected = matrix[visitorLang]?.[reviewLang];
        ok(expected && expected.test(txt), `7-${visitorLang}-${reviewLang}: badge "${txt}" matches ${expected}`);
      }
    }
  }
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Cleanup every row we created via the admin DELETE endpoint, then
  // restore the snapshot in case anything slipped through.
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
log(failures === 0 ? 'PASS — review lang field verified end-to-end ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
