// Mobile-viewport e2e: drive the admin Reviews UI from a 390x844 iPhone-ish
// viewport (the size Ivana will actually use). Asserts:
//   * the Reviews section + Add Review button are visible and tappable
//   * the 5 star buttons fit inside the form without overflow
//   * tapping the 3rd star updates the rating (visual + aria-checked)
//   * the form's Save button fits inside the visible area after scrolling
//
// No data is written via API; we cancel out of the form. Safe to run any
// time without cleanup.

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, // iPhone 14 Pro CSS
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();
page.on('dialog', async (d) => await d.accept());

try {
  log('=== A. Login on mobile viewport ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector('[data-testid="review-add-trigger"]', { timeout: 8000 });
  ok(true, 'A1: logged in at 390x844');

  log('\n=== B. Reviews section reachable + button tappable ===');
  const addTrigger = page.locator('[data-testid="review-add-trigger"]');
  await addTrigger.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const triggerBox = await addTrigger.boundingBox();
  // Tap targets should be at least ~32px in the smaller dimension to be
  // comfortable on a phone (Apple recommends 44px; we're checking a basic
  // floor here).
  ok(triggerBox && triggerBox.height >= 32, `B1: Add Review button height ≥32px (got ${Math.round(triggerBox?.height ?? 0)})`);
  ok(triggerBox && triggerBox.x >= 0 && (triggerBox.x + triggerBox.width) <= 390, `B2: button fits inside 390px wide viewport`);
  await page.screenshot({ path: '/tmp/admin-mobile-reviews-section.png' });

  log('\n=== C. Open Add Review form ===');
  await addTrigger.tap();
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.waitForTimeout(300);

  log('\n=== D. Star buttons fit inside the form ===');
  const ratingWrap = page.locator('[data-testid="review-rating"]');
  await ratingWrap.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const wrapBox = await ratingWrap.boundingBox();
  ok(wrapBox && wrapBox.x >= 0 && (wrapBox.x + wrapBox.width) <= 390,
    `D1: rating widget fits 390px viewport (x=${Math.round(wrapBox?.x)}, w=${Math.round(wrapBox?.width)})`);

  // Every star button is visible + at least 24px tall (so a thumb can hit it).
  for (let i = 1; i <= 5; i++) {
    const star = page.locator(`[data-testid="review-rating-${i}"]`);
    const sb = await star.boundingBox();
    ok(sb && sb.height >= 24, `D2.${i}: star ${i} ≥24px tall (got ${Math.round(sb?.height ?? 0)})`);
    ok(sb && sb.x >= 0 && (sb.x + sb.width) <= 390, `D3.${i}: star ${i} inside viewport (x=${Math.round(sb?.x)}, w=${Math.round(sb?.width)})`);
  }

  log('\n=== E. Tap star 3 → rating becomes 3 ===');
  await page.locator('[data-testid="review-rating-3"]').tap();
  await page.waitForTimeout(200);
  const star3 = page.locator('[data-testid="review-rating-3"]');
  const star3Aria = await star3.getAttribute('aria-checked');
  ok(star3Aria === 'true', `E1: star 3 aria-checked=true after tap (got ${star3Aria})`);
  const counterText = (await ratingWrap.textContent()) || '';
  ok(counterText.includes('3/5'), `E2: counter shows 3/5 (got "${counterText.trim().replace(/\s+/g, ' ')}")`);

  await page.screenshot({ path: '/tmp/admin-mobile-rating-3.png' });

  log('\n=== F. Save button is reachable (in or below viewport) ===');
  const saveBtn = page.locator('[data-testid="review-save"]');
  await saveBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const saveBox = await saveBtn.boundingBox();
  ok(saveBox && saveBox.height >= 32, `F1: Save button is normal-tap height (got ${Math.round(saveBox?.height ?? 0)})`);
  ok(saveBox && saveBox.y >= 0 && saveBox.y <= 844, `F2: Save button is in the visible viewport after scrollIntoView`);
  await page.screenshot({ path: '/tmp/admin-mobile-save-visible.png' });

  // Cancel out — we never touched the data
  await page.locator('[data-testid="review-cancel"]').tap();
  await page.waitForTimeout(200);
  ok(true, 'G1: cancel without saving (no data leaks)');
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — review form works on 390x844 mobile viewport ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
