// Live test: prove on the real https://www.tankaraca.com production
// instance that the cookie path works end-to-end through a browser
// (not just curl).
//
//   1. Open https://www.tankaraca.com/ in a fresh context (no cookie)
//   2. Verify <html lang="en"> (default for first-time visitor)
//   3. Click the LangPicker, pick "de"
//   4. Verify the housey-lang=de cookie was written AND has Secure flag
//      (we're on https) AND has SameSite=Lax
//   5. Reload — server now reads the cookie, must render in DE
//   6. Verify <html lang="de"> on the reloaded page (first-paint German,
//      no client-side flash)
//   7. Same dance for /booking — confirm SSR title flips per cookie
//   8. Clear cookies — next visit returns to EN default

import { chromium } from 'playwright';

const BASE = 'https://www.tankaraca.com';
let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();

  log('=== 1. Fresh visit (no cookie) defaults to EN ===');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const initialLang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
  ok(initialLang === 'en', `1a: <html lang="en"> on first visit (got "${initialLang}")`);

  log('\n=== 2. Click picker -> "de" writes a Secure cookie ===');
  await page.locator('[data-testid="lang-picker"]').selectOption('de');
  await page.waitForTimeout(300);
  const cookies = await page.context().cookies();
  const c = cookies.find((x) => x.name === 'housey-lang');
  ok(c?.value === 'de', `2a: housey-lang cookie value = "de" (got "${c?.value}")`);
  ok(c?.secure === true, `2b: cookie has Secure flag on prod (https) — got secure=${c?.secure}`);
  ok(c?.sameSite === 'Lax', `2c: cookie SameSite=Lax (got "${c?.sameSite}")`);
  // expires must be ~1 year out (we set max-age=31536000 ≈ 1y)
  ok(c && c.expires > Date.now() / 1000 + 364 * 86400,
    `2d: cookie expiry ~1 year out (got ${c ? Math.round((c.expires - Date.now()/1000) / 86400) + 'd' : 'no cookie'})`);

  log('\n=== 3. Reload — server reads cookie, SSR-renders in DE ===');
  await page.reload({ waitUntil: 'networkidle' });
  const afterLang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
  ok(afterLang === 'de', `3a: <html lang="de"> after reload (got "${afterLang}")`);
  // And the SSR <title> is German now
  const title = await page.title();
  ok(/Ferienhaus|dalmatinischen/i.test(title), `3b: <title> is German (got "${title}")`);

  log('\n=== 4. /booking SSR also flips ===');
  await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
  const bookingTitle = await page.locator('main h1').first().textContent();
  ok(bookingTitle?.trim() === 'Aufenthalt buchen', `4a: /booking H1 = "Aufenthalt buchen" (got "${bookingTitle?.trim()}")`);

  log('\n=== 5. Clear cookies — returns to EN ===');
  await page.context().clearCookies();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const clearedLang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
  ok(clearedLang === 'en', `5a: after cookie clear, <html lang="en"> again (got "${clearedLang}")`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — cookie + SSR i18n verified live on production ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
