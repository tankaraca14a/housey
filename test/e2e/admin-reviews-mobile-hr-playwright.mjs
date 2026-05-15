// Mobile-viewport e2e in Croatian locale: confirm the HR labels in the
// admin Reviews form are not overflowing or truncated at 390x844, the
// most common phone width. The "Istaknuti (prikaz na početnoj)" string
// is longer than the English "Featured (shown on home page)" and most
// at risk of clipping on narrow screens — that's specifically what we
// exercise here.
//
// No data is written; we cancel out of the form.

import { chromium } from 'playwright';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();
page.on('dialog', async (d) => await d.accept());

try {
  log('=== A. Login in HR (default locale) ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  // HR is the default on this site; don't touch the lang toggle.
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector('[data-testid="review-add-trigger"]', { timeout: 8000 });

  // Sanity-check we're in HR: the "Recenzije" h2 must exist.
  const hrHeader = await page.locator('h2:has-text("Recenzije")').count();
  ok(hrHeader === 1, `A1: "Recenzije" header visible (count=${hrHeader})`);

  log('\n=== B. Open Croatian Add Review form ===');
  await page.locator('[data-testid="review-add-trigger"]').scrollIntoViewIfNeeded();
  await page.locator('[data-testid="review-add-trigger"]').tap();
  await page.waitForSelector('[data-testid="review-edit-panel"]');
  await page.waitForTimeout(300);

  log('\n=== C. Every HR label is present + not truncated ===');
  // Each label paragraph above an input should be fully visible.
  const labels = [
    { text: 'Autor',                          why: 'Author' },
    { text: 'Izvor',                          why: 'Source' },
    { text: 'Ocjena',                         why: 'Rating' },
    { text: 'Datum',                          why: 'Date' },
    { text: 'Citat',                          why: 'Quote' },
    { text: 'URL (opcionalno)',               why: 'URL' },
    { text: 'Istaknuti (prikaz na početnoj)', why: 'Featured (longest)' },
    { text: 'Spremi',                         why: 'Save button' },
    { text: 'Odustani',                       why: 'Cancel button' },
  ];
  for (const { text, why } of labels) {
    const loc = page.locator(`text="${text}"`).first();
    const count = await loc.count();
    if (count === 0) { ok(false, `C-${why}: label "${text}" not on page`); continue; }
    // Measure: the label box must be fully inside the 390px viewport.
    const box = await loc.boundingBox();
    if (!box) { ok(false, `C-${why}: label "${text}" has no bounding box`); continue; }
    const fitsHoriz = box.x >= 0 && (box.x + box.width) <= 390;
    ok(fitsHoriz, `C-${why}: "${text}" fits 390px viewport (x=${Math.round(box.x)}, w=${Math.round(box.width)})`);
  }

  log('\n=== D. Star widget tap-to-rate works in HR locale ===');
  const ratingWrap = page.locator('[data-testid="review-rating"]');
  await ratingWrap.scrollIntoViewIfNeeded();
  await page.locator('[data-testid="review-rating-2"]').tap();
  await page.waitForTimeout(150);
  const text = (await ratingWrap.textContent()) || '';
  ok(text.includes('2/5'), `D1: counter reads "2/5" after tap (got "${text.trim().replace(/\s+/g, ' ')}")`);

  log('\n=== E. Cancel out — no leaks ===');
  await page.locator('[data-testid="review-cancel"]').tap();
  await page.waitForTimeout(200);
  const rows = await fetch(`${BASE}/api/admin/reviews`, { headers: { 'x-admin-password': PASS } })
    .then((r) => r.json());
  ok(rows.reviews.length === 0, `E1: no rows leaked (count=${rows.reviews.length})`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — Croatian admin Reviews form fits 390px viewport ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
