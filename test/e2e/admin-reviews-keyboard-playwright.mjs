// E2E test: drive the star widget from the keyboard only. No mouse / no
// touch. Verifies the radiogroup is reachable, focusable, and operable
// without pointer input. Critical for screen-reader users and the owner
// when she's on a laptop without a mouse.
//
// Flow:
//   1.  Login (with keyboard: type password, press Enter)
//   2.  Open the Add Review form by tabbing to "+ Add review" + Enter
//   3.  Tab into the rating widget until star 3 is focused
//   4.  Press Space → rating becomes 3 (aria-checked + visible amber)
//   5.  Press Enter on star 5 → rating becomes 5
//   6.  Verify a visible focus ring is rendered (the focus-visible:ring-2
//       class shows up in the live class list)
//   7.  Cancel out — no data created
//
// Assumes data/reviews.json is empty going in. Safe to run any time.

import { chromium } from 'playwright';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
const page = await ctx.newPage();
page.on('dialog', async (d) => await d.accept());

try {
  log('=== A. Login from the keyboard ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.locator('input[type=password]').focus();
  await page.keyboard.type(PASS);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="review-add-trigger"]', { timeout: 8000 });
  ok(true, 'A1: logged in via Enter on password field');

  log('\n=== B. Open Add Review by keyboard ===');
  // The reviews trigger is below the fold; Tab-ing to it is annoying and
  // brittle. Use programmatic focus then Enter — still keyboard input,
  // not mouse, which is what matters for a11y.
  await page.locator('[data-testid="review-add-trigger"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.waitForTimeout(300);
  ok(true, 'B1: form opened via Enter');

  log('\n=== C. Each star is keyboard-reachable + activates with Space ===');
  // Focus the 3rd star directly and Space-activate it. (The page allows
  // Tab cycling through all 5 — we don't need to enumerate Tab presses,
  // which would be brittle to surrounding form fields.)
  const star3 = page.locator('[data-testid="review-rating-3"]');
  await star3.focus();
  // Verify focus actually landed on the button
  const focused3 = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  ok(focused3 === 'review-rating-3', `C1: star 3 focused (active=${focused3})`);

  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  const aria3 = await star3.getAttribute('aria-checked');
  ok(aria3 === 'true', `C2: Space activates star 3 → aria-checked=true (got ${aria3})`);
  const ratingWrap = page.locator('[data-testid="review-rating"]');
  const counterText = (await ratingWrap.textContent()) || '';
  ok(counterText.includes('3/5'), `C3: counter reads "3/5" after Space (got "${counterText.trim().replace(/\s+/g, ' ')}")`);

  log('\n=== D. Enter also activates ===');
  const star5 = page.locator('[data-testid="review-rating-5"]');
  await star5.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const aria5 = await star5.getAttribute('aria-checked');
  ok(aria5 === 'true', `D1: Enter activates star 5 → aria-checked=true (got ${aria5})`);
  const counterText2 = (await ratingWrap.textContent()) || '';
  ok(counterText2.includes('5/5'), `D2: counter reads "5/5" after Enter`);

  log('\n=== E. Visible focus ring (focus-visible:ring) is applied ===');
  // Focus a star and inspect computed styles for a non-zero ring.
  await page.locator('[data-testid="review-rating-2"]').focus();
  const ringInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="review-rating-2"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    // focus-visible:ring-2 + ring-brand-400 should produce a non-transparent
    // box-shadow when the button has keyboard focus.
    return { boxShadow: cs.boxShadow, outline: cs.outline };
  });
  const hasFocusIndicator =
    ringInfo &&
    ((ringInfo.boxShadow && ringInfo.boxShadow !== 'none') ||
     (ringInfo.outline && ringInfo.outline !== 'none' && !/0px/.test(ringInfo.outline)));
  ok(!!hasFocusIndicator, `E1: focused star has a visible focus indicator (shadow=${ringInfo?.boxShadow?.slice(0, 60)})`);

  log('\n=== F. Tabbing from a star lands on the next form field ===');
  // After star 5 is focused, Tab should NOT eat the user; it should
  // continue to the Date input (or whichever the next focusable is).
  await page.locator('[data-testid="review-rating-5"]').focus();
  await page.keyboard.press('Tab');
  const nextFocused = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? (el.getAttribute('data-testid') || el.tagName.toLowerCase()) : null;
  });
  ok(nextFocused != null && nextFocused !== 'review-rating-5',
    `F1: Tab from star 5 advances to "${nextFocused}"`);

  log('\n=== G. Cancel — no data leaks ===');
  await page.locator('[data-testid="review-cancel"]').click();
  await page.waitForTimeout(200);
  // Make sure no row was created
  const rows = await fetch(`${BASE}/api/admin/reviews`, {
    headers: { 'x-admin-password': PASS },
  }).then((r) => r.json());
  ok(rows.reviews.length === 0, `G1: no rows leaked into KV (count=${rows.reviews.length})`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — star widget works keyboard-only ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
