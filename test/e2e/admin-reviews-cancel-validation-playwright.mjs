// E2E test: two muggle-protection scenarios that only matter at the UI level.
//
//   A. Edit + Cancel preserves original data
//      Open the edit panel on an existing row, change the rating from 4 -> 1,
//      change the quote text, click Cancel. The row's KV state must NOT have
//      changed (no PATCH fired) and the visible tile must still show the
//      original 4-star rating + original quote.
//
//   B. Validation errors surface in the form, not silently
//      Open Add Review, leave the Author empty, click Save. The form must
//      stay open, the error text must render (data-testid="review-error"),
//      and no row must be created in KV. Pasting valid content + Save then
//      succeeds.

import { chromium } from 'playwright';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': PASS };
  const r = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
const page = await ctx.newPage();
page.on('dialog', async (d) => await d.accept());

let seededId = null;
let createdInBId = null;
try {
  // ── A. Edit + Cancel preserves original ───────────────────────────────────
  log('=== A. Edit + Cancel preserves original ===');
  const seed = await api('POST', '/api/admin/reviews', {
    author: 'CancelProbe',
    source: 'Airbnb',
    rating: 4,
    quote: 'Original quote, must survive cancel.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 100,
  });
  ok(seed.status === 200, `A1: seeded original row`);
  seededId = seed.body.review.id;

  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector(`[data-testid="review-row-${seededId}"]`, { timeout: 8000 });

  // Open the edit panel
  await page.locator(`[data-testid="review-edit-${seededId}"]`).scrollIntoViewIfNeeded();
  await page.locator(`[data-testid="review-edit-${seededId}"]`).click();
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.waitForTimeout(300);

  // Tamper: rating 4 -> 1, quote -> "If you see this, Cancel failed"
  await page.locator('[data-testid="review-rating-1"]').click();
  await page.waitForTimeout(150);
  await page.locator('[data-testid="review-quote"]').fill('If you see this, Cancel failed');
  await page.waitForTimeout(100);

  // Cancel
  await page.locator('[data-testid="review-cancel"]').click();
  await page.waitForSelector('[data-testid="review-edit-panel"]', { state: 'detached', timeout: 3000 });
  ok(true, 'A2: edit panel closed via Cancel');

  // KV must still hold the ORIGINAL values
  const after = await api('GET', '/api/admin/reviews');
  const row = (after.body.reviews || []).find((r) => r.id === seededId);
  ok(row?.rating === 4, `A3: KV rating still 4 (got ${row?.rating})`);
  ok(row?.quote === 'Original quote, must survive cancel.', `A4: KV quote intact ("${row?.quote}")`);

  // The visible tile must still show the original rating + quote
  const rowText = (await page.locator(`[data-testid="review-row-${seededId}"]`).textContent()) || '';
  ok(rowText.includes('Original quote, must survive cancel.'), 'A5: tile still shows original quote');
  // Tile renders rating via "★".repeat(r.rating) + slate spans → 4 amber chars expected
  // The exact count of "★" is r.rating amber + (5 - r.rating) slate = 5 total. We
  // can't easily distinguish color here in textContent, so we check the KV rating
  // already (A3) and skip a visual count.

  // ── B. Validation error surfaces in the UI ───────────────────────────────
  log('\n=== B. Save with empty author surfaces an error ===');
  await page.locator('[data-testid="review-add-trigger"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="review-add-trigger"]').click();
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.waitForTimeout(200);

  // Don't fill author. Add a valid quote so only `author` is invalid.
  await page.locator('[data-testid="review-quote"]').fill('Quote is fine');
  const beforeCount = (await api('GET', '/api/admin/reviews')).body.reviews.length;
  await page.locator('[data-testid="review-save"]').click();
  // Error toast/element should appear
  await page.waitForSelector('[data-testid="review-error"]', { timeout: 4000 });
  const errText = (await page.locator('[data-testid="review-error"]').textContent()) || '';
  ok(/author/i.test(errText), `B1: error text mentions author ("${errText.trim()}")`);
  // Panel still open
  const panelStillOpen = await page.locator('[data-testid="review-edit-panel"]').count();
  ok(panelStillOpen === 1, 'B2: edit panel stayed open after failed save');
  // No new row in KV
  const afterCount = (await api('GET', '/api/admin/reviews')).body.reviews.length;
  ok(afterCount === beforeCount, `B3: no row leaked into KV (${beforeCount} → ${afterCount})`);

  // Fix the form: type a valid author, save, succeed
  log('\n=== C. Filling author + retry saves cleanly ===');
  await page.locator('[data-testid="review-author"]').fill('ValidAuthor');
  await page.locator('[data-testid="review-save"]').click();
  // Wait until KV gains a row
  await page.waitForFunction(async (base) => {
    const r = await fetch(`${base}/api/admin/reviews`, { headers: { 'x-admin-password': 'ivana2026' } });
    const j = await r.json();
    return (j.reviews || []).some((x) => x.author === 'ValidAuthor');
  }, BASE, { timeout: 8000 });
  ok(true, 'C1: retry succeeded after the author was supplied');
  // Track the new row for cleanup
  const created = (await api('GET', '/api/admin/reviews')).body.reviews.find((r) => r.author === 'ValidAuthor');
  if (created) createdInBId = created.id;
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  if (seededId) {
    try { await api('DELETE', `/api/admin/reviews/${seededId}`); } catch {}
  }
  if (createdInBId) {
    try { await api('DELETE', `/api/admin/reviews/${createdInBId}`); } catch {}
  }
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — Cancel preserves data + validation errors render ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
