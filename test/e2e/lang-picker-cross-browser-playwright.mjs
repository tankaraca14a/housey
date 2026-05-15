// Cross-browser e2e of the LangPicker: drives the same end-to-end flow
// (set lang, navigate, assert localised label) in Chromium, Firefox,
// AND WebKit (the Safari engine). The existing Chromium-only test
// (test/e2e/lang-picker-playwright.mjs) covers the full 38-assertion
// matrix; this thinner spec proves the picker also works in the other
// two engines so a guest using Firefox or Safari on iPhone/Mac sees
// the same behaviour.

import { chromium, firefox, webkit } from 'playwright';

const BASE = 'http://localhost:3457';
const ENGINES = [
  { name: 'Chromium', launcher: chromium },
  { name: 'Firefox',  launcher: firefox  },
  { name: 'WebKit',   launcher: webkit   },
];
const EXPECTED_BOOKING_H1 = {
  en: 'Book Your Stay',
  hr: 'Rezervirajte boravak',
  de: 'Aufenthalt buchen',
  it: 'Prenota il soggiorno',
  fr: 'Réserver votre séjour',
};

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

try {
  for (const eng of ENGINES) {
    log(`\n=== ${eng.name} ===`);
    const browser = await eng.launcher.launch({ headless: true });
    try {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      const page = await ctx.newPage();

      // 1. Picker present + default EN on a fresh context.
      await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
      const count = await page.locator('[data-testid="lang-picker"]').count();
      ok(count === 1, `${eng.name}: picker rendered (count=${count})`);
      const def = await page.locator('[data-testid="lang-picker"]').inputValue();
      ok(def === 'en', `${eng.name}: default value 'en' on fresh ctx (got '${def}')`);

      // 2. Each language flips the booking H1 to the right translation.
      for (const [lang, expected] of Object.entries(EXPECTED_BOOKING_H1)) {
        await page.locator('[data-testid="lang-picker"]').selectOption(lang);
        await page.waitForTimeout(150);
        const h1 = (await page.locator('main h1').first().textContent())?.trim();
        ok(h1 === expected, `${eng.name}/${lang}: H1 = "${expected}" (got "${h1}")`);
      }

      // 3. localStorage persisted under our key.
      const stored = await page.evaluate(() => window.localStorage.getItem('housey-lang'));
      ok(stored === 'fr', `${eng.name}: last pick (fr) persisted to localStorage`);
    } finally {
      await browser.close();
    }
  }
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
}

log('');
log(failures === 0 ? 'PASS — LangPicker works identically across Chromium + Firefox + WebKit ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
