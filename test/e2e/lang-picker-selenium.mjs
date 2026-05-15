// End-to-end test of the global LangPicker via Selenium WebDriver.
// Mirrors test/e2e/lang-picker-playwright.mjs but drives Chrome through
// the WebDriver protocol, so we have cross-driver redundancy on the
// most-visible feature on the site. If a regression slips past one
// driver's quirks the other one catches it.
//
// Coverage:
//   1. Picker rendered on every public page (8 pages total incl. /admin)
//   2. Default value "en" for a fresh visitor (cleared localStorage)
//   3. All 5 supported languages present as <option> elements
//   4. Each language pick flips admin labels (Save Changes etc.)
//   5. Each language pick writes to localStorage
//   6. Persistence across page navigations (HR on / → HR on /about)
//   7. Persistence across reload
//   8. localStorage cleared => returns to EN

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const ALL_LANGS = ['en', 'hr', 'de', 'it', 'fr'];
const PUBLIC_PAGES = ['/', '/about', '/gallery', '/location', '/booking', '/reviews', '/contact'];

let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

function buildDriver() {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1000');
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { if (readFileSync(pw)) opts.setChromeBinaryPath(pw); } catch {}
  return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

const driver = buildDriver();

async function setLangAndReload(lang) {
  await driver.executeScript(`window.localStorage.setItem('housey-lang', '${lang}');`);
  await driver.navigate().refresh();
}

async function selectLangViaPicker(lang) {
  // The native <select> doesn't react to a plain .click() + sendKeys cycle
  // reliably in headless Chrome via Selenium. Use a JS dispatchEvent
  // change after setting `.value` programmatically — exactly what a user
  // does, just without the OS-level dropdown.
  await driver.executeScript(`
    const el = document.querySelector('[data-testid="lang-picker"]');
    if (!el) return;
    el.value = '${lang}';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  `);
}

async function pickerValue() {
  return await driver.executeScript(`
    return document.querySelector('[data-testid="lang-picker"]')?.value;
  `);
}

try {
  log('=== 1. Picker rendered on every public page ===');
  for (const path of PUBLIC_PAGES) {
    await driver.get(`${BASE}${path}`);
    await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
    const count = (await driver.findElements(By.css('[data-testid="lang-picker"]'))).length;
    ok(count === 1, `1-${path}: exactly one picker (count=${count})`);
  }

  log('\n=== 2. Picker on /admin too ===');
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  const adminCount = (await driver.findElements(By.css('[data-testid="lang-picker"]'))).length;
  ok(adminCount === 1, `2a: /admin has the picker (count=${adminCount})`);

  log('\n=== 3. Default value is "en" for a fresh visitor ===');
  await driver.get(`${BASE}/`);
  await driver.executeScript("window.localStorage.removeItem('housey-lang');");
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  const defaultVal = await pickerValue();
  ok(defaultVal === 'en', `3a: default is "en" (got "${defaultVal}")`);

  log('\n=== 4. All 5 supported languages are <option> values ===');
  const optionValues = await driver.executeScript(`
    return Array.from(document.querySelectorAll('[data-testid="lang-picker"] option')).map(o => o.value);
  `);
  for (const code of ALL_LANGS) {
    ok(optionValues.includes(code), `4-${code}: option "${code}" present`);
  }
  ok(optionValues.length === ALL_LANGS.length, `4-total: exactly ${ALL_LANGS.length} options (got ${optionValues.length})`);

  log('\n=== 5. Each language flips admin labels live ===');
  await driver.get(`${BASE}/admin`);
  await setLangAndReload('en');
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 8000);
  await driver.findElement(By.css('input[type="password"]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('h1')), 8000);
  await driver.sleep(400);
  const expectedSaveLabel = {
    en: 'Save Changes',
    hr: 'Spremi promjene',
    de: 'Änderungen speichern',
    it: 'Salva modifiche',
    fr: 'Enregistrer les modifications',
  };
  for (const code of ALL_LANGS) {
    await selectLangViaPicker(code);
    await driver.sleep(300);
    const expected = expectedSaveLabel[code];
    const matches = await driver.findElements(
      By.xpath(`//button[normalize-space(text())="${expected}"]`),
    );
    ok(matches.length >= 1, `5-${code}: "${expected}" visible after pick`);
    const stored = await driver.executeScript("return window.localStorage.getItem('housey-lang');");
    ok(stored === code, `5-${code}: localStorage = "${code}" (got "${stored}")`);
  }

  log('\n=== 6. Persistence across page navigations ===');
  await driver.get(`${BASE}/`);
  await setLangAndReload('hr');
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  await driver.get(`${BASE}/about`);
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  const aboutVal = await pickerValue();
  ok(aboutVal === 'hr', `6a: navigating / -> /about preserves "hr" (got "${aboutVal}")`);
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  const adminVal = await pickerValue();
  ok(adminVal === 'hr', `6b: navigating / -> /admin preserves "hr" (got "${adminVal}")`);

  log('\n=== 7. Persistence across reload ===');
  await driver.get(`${BASE}/`);
  await setLangAndReload('de');
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  const afterReload = await pickerValue();
  ok(afterReload === 'de', `7a: reload preserves "de" (got "${afterReload}")`);

  log('\n=== 8. localStorage + cookie cleared => returns to "en" ===');
  await driver.get(`${BASE}/`);
  await driver.executeScript("window.localStorage.removeItem('housey-lang');");
  // SSR uses the cookie too — clear it or the server will keep
  // rendering in the most recently picked language.
  await driver.manage().deleteCookie('housey-lang');
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('[data-testid="lang-picker"]')), 8000);
  const cleared = await pickerValue();
  ok(cleared === 'en', `8a: after clearing, picker defaults to "en" (got "${cleared}")`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await driver.quit();
}

log('');
log(failures === 0 ? 'PASS — LangPicker verified end-to-end via Selenium ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
