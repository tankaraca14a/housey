// End-to-end: the full "Ivana submits → Mihaela translates + publishes"
// flow exercised through real UI.
//
//   1. /submit-review password gate rejects wrong, accepts right
//   2. The form posts a submission; thanks screen shown after
//   3. The submission appears in /admin's Translation inbox section
//   4. Clicking "Publish with translations" opens the panel pre-filled
//      with the submission's read-only fields + 4 empty textareas
//   5. Filling translations + clicking Publish:
//        - The inbox row disappears
//        - A live Review row appears with all 4 translations attached
//   6. The live /reviews page shows the right quote per visitor lang
//      (the translated quote when visitor's lang matches, otherwise
//      original + "in {language}" badge)
//   7. Dismissing a different submission (DELETE without publish) just
//      removes it from the queue; nothing leaks to live reviews

import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const inboxPath = 'data/submitted-reviews.json';
const reviewsPath = 'data/reviews.json';
const inboxBefore = existsSync(inboxPath) ? readFileSync(inboxPath, 'utf8') : '[]\n';
const reviewsBefore = existsSync(reviewsPath) ? readFileSync(reviewsPath, 'utf8') : '[]\n';
const cleanupIds = { inbox: [], reviews: [] };

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': PASS };
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

try {
  // ── 1. Password gate ────────────────────────────────────────────────────
  log('=== 1. Password gate on /submit-review ===');
  await page.goto(`${BASE}/submit-review`);
  await page.waitForSelector('[data-testid="submit-password"]');

  await page.locator('[data-testid="submit-password"]').fill('wrong');
  await page.locator('[data-testid="submit-unlock"]').click();
  await page.waitForSelector('[data-testid="submit-auth-error"]', { timeout: 5000 });
  ok(true, `1a: wrong password shows error`);

  await page.locator('[data-testid="submit-password"]').fill(PASS);
  await page.locator('[data-testid="submit-unlock"]').click();
  await page.waitForSelector('[data-testid="submit-author"]', { timeout: 5000 });
  ok(true, `1b: right password reveals form`);

  // ── 2. Fill + submit form ───────────────────────────────────────────────
  log('\n=== 2. Submit a review through the form ===');
  await page.locator('[data-testid="submit-author"]').fill('E2E Ivana Submit');
  await page.locator('[data-testid="submit-source"]').fill('Airbnb');
  await page.locator('[data-testid="submit-rating-4"]').click();
  await page.locator('[data-testid="submit-lang"]').selectOption('hr');
  await page.locator('[data-testid="submit-quote"]').fill('Bilo nam je odlično u Veloj Luci.');
  await page.locator('[data-testid="submit-notes"]').fill('Stari gost, vraćao se već 3 puta.');
  await page.locator('[data-testid="submit-send"]').click();

  await page.waitForSelector('[data-testid="submit-thanks"]', { timeout: 6000 });
  ok(true, `2a: thanks screen shown after submission`);

  // Capture id for cleanup
  const inbox = await api('GET', '/api/admin/submitted-reviews');
  const submitted = inbox.body.submissions?.find((s) => s.author === 'E2E Ivana Submit');
  ok(!!submitted, `2b: submission persisted to inbox`);
  ok(submitted?.rating === 4, `2c: rating=4 persisted`);
  ok(submitted?.lang === 'hr', `2d: lang=hr persisted`);
  ok(submitted?.notes?.includes('Stari gost'), `2e: notes persisted`);
  if (submitted?.id) cleanupIds.inbox.push(submitted.id);

  // ── 3. Submission appears in admin Translation inbox ────────────────────
  log('\n=== 3. Translation inbox row visible in /admin ===');
  await page.goto(`${BASE}/admin`);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForSelector('h1');
  // Wait until /admin has loaded the inbox.
  await page.waitForTimeout(800);

  const row = page.locator(`[data-testid="inbox-row-${submitted.id}"]`);
  await row.scrollIntoViewIfNeeded();
  ok(await row.count() === 1, `3a: inbox row rendered`);

  const rowText = (await row.textContent()) ?? '';
  ok(rowText.includes('E2E Ivana Submit'), `3b: row shows author`);
  ok(rowText.includes('Bilo nam je odlično'), `3c: row shows quote`);
  ok(rowText.includes('HR'), `3d: row shows lang code`);

  // ── 4. Open publish panel ───────────────────────────────────────────────
  log('\n=== 4. Open publish panel ===');
  await page.locator(`[data-testid="inbox-publish-${submitted.id}"]`).click();
  await page.waitForSelector(`[data-testid="inbox-publish-panel-${submitted.id}"]`);
  // 4 translation textareas (no HR slot since HR is the original lang).
  ok(await page.locator(`[data-testid="inbox-translation-hr"]`).count() === 0, `4a: HR slot hidden (original lang)`);
  for (const code of ['en', 'de', 'it', 'fr']) {
    ok(await page.locator(`[data-testid="inbox-translation-${code}"]`).count() === 1, `4b-${code}: translation slot present`);
  }

  // ── 5. Fill translations + publish ──────────────────────────────────────
  log('\n=== 5. Publish with translations ===');
  await page.locator(`[data-testid="inbox-translation-en"]`).fill('We had a great time in Vela Luka.');
  await page.locator(`[data-testid="inbox-translation-de"]`).fill('Wir hatten eine tolle Zeit in Vela Luka.');
  await page.locator(`[data-testid="inbox-translation-it"]`).fill('Ci siamo trovati benissimo a Vela Luka.');
  await page.locator(`[data-testid="inbox-translation-fr"]`).fill('Nous avons passé un excellent moment à Vela Luka.');
  await page.locator(`[data-testid="inbox-publish-featured-${submitted.id}"]`).check();
  await page.locator(`[data-testid="inbox-publish-save-${submitted.id}"]`).click();

  // Wait for the inbox row to disappear (publish succeeded).
  await page.waitForSelector(`[data-testid="inbox-row-${submitted.id}"]`, { state: 'detached', timeout: 10000 });
  ok(true, `5a: inbox row removed after publish`);

  // Check via API that the live review has all 4 translations.
  const liveList = await fetch(`${BASE}/api/reviews`).then((r) => r.json());
  const live = liveList.reviews?.find((r) => r.author === 'E2E Ivana Submit');
  ok(!!live, `5b: published row visible in /api/reviews`);
  ok(live?.lang === 'hr', `5c: original lang carried over`);
  ok(live?.translations?.en?.includes('great time'), `5d: EN translation attached`);
  ok(live?.translations?.de?.includes('tolle Zeit'), `5e: DE translation attached`);
  ok(live?.translations?.it?.includes('benissimo'), `5f: IT translation attached`);
  ok(live?.translations?.fr?.includes('excellent moment'), `5g: FR translation attached`);
  ok(live?.featured === true, `5h: featured flag carried over`);
  if (live?.id) cleanupIds.reviews.push(live.id);

  // ── 6. Visitor sees the right quote per lang ────────────────────────────
  log('\n=== 6. Visitor /reviews picks per-lang quote ===');
  await page.goto(`${BASE}/`);
  await page.evaluate(() => {
    window.localStorage.setItem('housey-lang', 'de');
    document.cookie = 'housey-lang=de; max-age=31536000; path=/; SameSite=Lax';
  });
  await page.goto(`${BASE}/reviews`);
  await page.waitForSelector('h1');
  if (live?.id) {
    const card = page.locator(`[data-testid="review-${live.id}"]`);
    const quoteText = (await card.locator('blockquote').textContent())?.trim() ?? '';
    ok(/tolle Zeit/.test(quoteText), `6a: DE visitor sees German translation (got "${quoteText}")`);
    const badge = page.locator(`[data-testid="review-lang-badge-${live.id}"]`);
    ok(await badge.count() === 0, `6b: no "in Kroatisch" badge when translation matches visitor lang`);
  }

  // ── 7. Dismiss flow ─────────────────────────────────────────────────────
  log('\n=== 7. Dismiss a different submission without publishing ===');
  const c2 = await api('POST', '/api/admin/submitted-reviews', {
    author: 'E2E Dismiss Test',
    source: 'Email',
    rating: 2,
    quote: 'should never reach live',
    date: '2025-08-15',
    lang: 'en',
  });
  const dismissId = c2.body.submission?.id;
  if (dismissId) cleanupIds.inbox.push(dismissId);

  await page.goto(`${BASE}/admin`);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForSelector('h1');
  await page.waitForTimeout(500);

  // Auto-accept the confirm dialog
  page.once('dialog', (d) => d.accept());
  await page.locator(`[data-testid="inbox-delete-${dismissId}"]`).click();
  await page.waitForSelector(`[data-testid="inbox-row-${dismissId}"]`, { state: 'detached', timeout: 5000 });
  ok(true, `7a: dismissed row removed from queue`);

  const liveList2 = await fetch(`${BASE}/api/reviews`).then((r) => r.json());
  ok(!liveList2.reviews?.some((r) => r.author === 'E2E Dismiss Test'), `7b: dismissed row never reached live reviews`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  for (const id of cleanupIds.inbox) {
    try { await fetch(`${BASE}/api/admin/submitted-reviews/${id}`, { method: 'DELETE', headers: { 'x-admin-password': PASS } }); } catch {}
  }
  for (const id of cleanupIds.reviews) {
    try { await fetch(`${BASE}/api/admin/reviews/${id}`, { method: 'DELETE', headers: { 'x-admin-password': PASS } }); } catch {}
  }
  writeFileSync(inboxPath, inboxBefore);
  writeFileSync(reviewsPath, reviewsBefore);
  log(`\n  (cleaned ${cleanupIds.inbox.length} inbox + ${cleanupIds.reviews.length} live rows; rolled back data files)`);
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — submit→translate→publish flow verified end-to-end ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
