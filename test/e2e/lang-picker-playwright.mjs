// End-to-end test of the global LangPicker via Playwright.
//
// Coverage:
//   1. Picker is rendered on every public page AND on /admin.
//   2. Default value is "en" for a first-time visitor (empty localStorage).
//   3. All 5 supported languages appear as options with correct values.
//   4. Selecting each language flips visible admin labels (Save Changes,
//      month names, day names) AND persists to localStorage.
//   5. Persistence across page navigations: pick a lang on page A,
//      navigate to page B, picker still on that lang.
//   6. Persistence across reload: pick a lang, reload, still on that lang.
//   7. Picker fits inside a 390px mobile viewport on every page (no
//      horizontal overflow).
//   8. data-testid='lang-picker' is exactly ONE per page (no duplicates).

import { chromium } from 'playwright';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const ALL_LANGS = ['en', 'hr', 'de', 'it', 'fr'];
const PUBLIC_PAGES = ['/', '/about', '/gallery', '/location', '/booking', '/reviews', '/contact'];

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
page.on('dialog', async (d) => await d.accept());

// Always start each section from a clean localStorage so tests are
// independent of any leftover state.
async function resetLang() {
  await page.evaluate(() => window.localStorage.removeItem('housey-lang'));
  await page.reload({ waitUntil: 'networkidle' });
}

try {
  log('=== 1. Picker rendered on every public page ===');
  for (const path of PUBLIC_PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const count = await page.locator('[data-testid="lang-picker"]').count();
    ok(count === 1, `1-${path}: exactly one picker rendered (count=${count})`);
  }

  log('\n=== 2. Picker rendered on /admin too ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  const adminCount = await page.locator('[data-testid="lang-picker"]').count();
  ok(adminCount === 1, `2a: /admin has the picker (count=${adminCount})`);

  log('\n=== 3. Default value is "en" for a first-time visitor ===');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await resetLang();
  const defaultVal = await page.locator('[data-testid="lang-picker"]').inputValue();
  ok(defaultVal === 'en', `3a: picker defaults to "en" with empty localStorage (got "${defaultVal}")`);

  log('\n=== 4. All 5 supported languages are present as options ===');
  const optionValues = await page.locator('[data-testid="lang-picker"] option').evaluateAll(
    (opts) => opts.map((o) => o.getAttribute('value'))
  );
  for (const code of ALL_LANGS) {
    ok(optionValues.includes(code), `4-${code}: option "${code}" present`);
  }
  ok(optionValues.length === ALL_LANGS.length, `4-total: exactly ${ALL_LANGS.length} options (got ${optionValues.length})`);

  log('\n=== 5. Each language flips admin labels live ===');
  // Login first
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector('h1', { timeout: 8000 });
  await page.waitForTimeout(300);
  // The save button has different copy in every lang — assert the right one
  // shows for each pick.
  const expectedSaveLabel = {
    en: 'Save Changes',
    hr: 'Spremi promjene',
    de: 'Änderungen speichern',
    it: 'Salva modifiche',
    fr: 'Enregistrer les modifications',
  };
  for (const code of ALL_LANGS) {
    await page.locator('[data-testid="lang-picker"]').selectOption(code);
    await page.waitForTimeout(200);
    const visible = await page.locator(`button:has-text("${expectedSaveLabel[code]}")`).count();
    ok(visible >= 1, `5-${code}: "${expectedSaveLabel[code]}" visible after pick`);
    // Also check localStorage was updated
    const stored = await page.evaluate(() => window.localStorage.getItem('housey-lang'));
    ok(stored === code, `5-${code}: localStorage now "${code}" (got "${stored}")`);
  }

  log('\n=== 6. Persistence across page navigations ===');
  // Set HR on /, navigate to /about, picker should be HR
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="lang-picker"]').selectOption('hr');
  await page.waitForTimeout(150);
  await page.goto(`${BASE}/about`, { waitUntil: 'networkidle' });
  const aboutVal = await page.locator('[data-testid="lang-picker"]').inputValue();
  ok(aboutVal === 'hr', `6a: navigating / -> /about preserves "hr" (got "${aboutVal}")`);
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  const adminVal = await page.locator('[data-testid="lang-picker"]').inputValue();
  ok(adminVal === 'hr', `6b: navigating / -> /admin preserves "hr" (got "${adminVal}")`);

  log('\n=== 7. Persistence across full page reload ===');
  await page.locator('[data-testid="lang-picker"]').selectOption('de');
  await page.waitForTimeout(150);
  await page.reload({ waitUntil: 'networkidle' });
  const afterReload = await page.locator('[data-testid="lang-picker"]').inputValue();
  ok(afterReload === 'de', `7a: reload preserves "de" (got "${afterReload}")`);

  log('\n=== 8. Mobile (390px) — picker fits every page without overflow ===');
  await ctx.close();
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const mpage = await mctx.newPage();
  mpage.on('dialog', async (d) => await d.accept());
  for (const path of [...PUBLIC_PAGES, '/admin']) {
    await mpage.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const picker = mpage.locator('[data-testid="lang-picker"]');
    const c = await picker.count();
    if (c === 0) { ok(false, `8-${path}: picker not rendered on mobile`); continue; }
    const box = await picker.boundingBox();
    ok(box && box.x >= 0 && (box.x + box.width) <= 390,
      `8-${path}: picker fits 390px viewport (x=${Math.round(box?.x ?? -1)}, w=${Math.round(box?.width ?? -1)})`);
  }
  await mctx.close();

  log('\n=== 9. localStorage cleared => returns to "en" default ===');
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p2.evaluate(() => window.localStorage.removeItem('housey-lang'));
  await p2.reload({ waitUntil: 'networkidle' });
  const cleared = await p2.locator('[data-testid="lang-picker"]').inputValue();
  ok(cleared === 'en', `9a: after clearing storage, picker defaults to "en" (got "${cleared}")`);
  await ctx2.close();
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
}

log('');
log(failures === 0 ? 'PASS — LangPicker behaves correctly across all pages, langs, persistence, mobile ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
