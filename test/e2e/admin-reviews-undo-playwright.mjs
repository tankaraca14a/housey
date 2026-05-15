// E2E test: click Undo within the 10s grace window restores the row and
// leaves KV unchanged. This is the heart of the muggle-friendly delete
// flow — the existing star-widget Selenium spec only tests the "wait 10s
// then row is gone" path; we need the OTHER path.
//
// Flow:
//   1.  Seed one review via API (KV row exists)
//   2.  Open admin, locate the row, click 🗑 — confirm dialog auto-accepts
//   3.  Row hides immediately from the UI (optimistic)
//   4.  Undo toast appears
//   5.  Click Undo button (within ~2s, well inside the 10s grace)
//   6.  Toast disappears
//   7.  Row reappears in the list with the SAME id/data
//   8.  KV still has the row (the deferred DELETE never fired)
//
// Cleanup: delete the seeded row at end.

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
try {
  log('=== 1. Seed one review via API ===');
  const seed = await api('POST', '/api/admin/reviews', {
    author: 'UndoProbe',
    source: 'Airbnb',
    rating: 4,
    quote: 'Saved by the undo button.',
    date: '2025-08-15',
    featured: false,
    sortOrder: 100,
  });
  ok(seed.status === 200, `1a: created`);
  seededId = seed.body.review.id;

  log('\n=== 2. Login + scroll to Reviews ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector(`[data-testid="review-row-${seededId}"]`, { timeout: 8000 });
  await page.locator(`[data-testid="review-row-${seededId}"]`).scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  ok(true, '2a: row visible before delete');

  log('\n=== 3. Click 🗑 — row hides + toast appears ===');
  // Stub the confirm() so the click resolves without a real dialog
  await page.evaluate(() => { window.confirm = () => true; });
  await page.locator(`[data-testid="review-delete-${seededId}"]`).click();
  // Row should disappear from the list immediately (optimistic hide)
  await page.waitForSelector(`[data-testid="review-row-${seededId}"]`, { state: 'detached', timeout: 3000 });
  ok(true, '3a: row hidden from list (optimistic)');
  await page.waitForSelector(`[data-testid="undo-review-toast-${seededId}"]`, { timeout: 3000 });
  ok(true, '3b: undo toast rendered');

  log('\n=== 4. Click Undo within grace → row restored ===');
  // Click well inside the 10s grace window (< 2s after delete click)
  await page.locator(`[data-testid="undo-review-btn-${seededId}"]`).click();
  // Toast should disappear
  await page.waitForSelector(`[data-testid="undo-review-toast-${seededId}"]`, { state: 'detached', timeout: 3000 });
  ok(true, '4a: toast removed after undo');
  // Row should be back in the list
  await page.waitForSelector(`[data-testid="review-row-${seededId}"]`, { timeout: 3000 });
  ok(true, '4b: row reappears in list');

  log('\n=== 5. KV still has the row (deferred DELETE never fired) ===');
  // Wait past the original 10s grace window to make sure no late DELETE fires
  await page.waitForTimeout(11_000);
  const after = await api('GET', '/api/admin/reviews');
  const stillThere = (after.body.reviews || []).find((r) => r.id === seededId);
  ok(!!stillThere, `5a: KV row survived (id=${seededId})`);
  ok(stillThere?.author === 'UndoProbe' && stillThere?.rating === 4 && stillThere?.quote === 'Saved by the undo button.',
    `5b: original data intact after undo round-trip`);

  log('\n=== 6. Visual: row content is identical pre/post undo ===');
  // The visible tile should still show "UndoProbe" + 4-star rendering
  const rowText = (await page.locator(`[data-testid="review-row-${seededId}"]`).textContent()) || '';
  ok(rowText.includes('UndoProbe'), '6a: row tile still shows author');
  ok(rowText.includes('Saved by the undo button.'), '6b: row tile still shows quote');
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  if (seededId) {
    try { await api('DELETE', `/api/admin/reviews/${seededId}`); } catch {}
  }
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — undo restores deleted review without losing data ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
