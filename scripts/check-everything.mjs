// Drives a real headless browser through every user-facing route and
// every primary admin action, screenshots each step, and prints a
// pass/fail line per assertion.
//
// Goal: visual + functional sanity sweep. If anything looks broken on
// production after a deploy, this script catches it FAST and leaves
// PNG evidence in test/e2e/screens-check-everything/.
//
//   BASE=http://localhost:3457 node scripts/check-everything.mjs   # local
//   BASE=https://www.tankaraca.com node scripts/check-everything.mjs # prod
//
// Defaults to local. Uses Selenium WebDriver against chrome-headless-shell
// (same binary the rest of the e2e suite uses, no extra install needed).

import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const OUT = join(REPO, 'test/e2e/screens-check-everything');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE || 'http://localhost:3457';
const PASS = process.env.ADMIN_PASSWORD || 'ivana2026';
const IS_LIVE = BASE.startsWith('https://');

console.log(`\n━━━━ check-everything ━━━━`);
console.log(`Target: ${BASE} ${IS_LIVE ? '(LIVE)' : '(local)'}`);
console.log(`Screens: ${OUT}\n`);

let failures = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { console.log(`  ✗ ${m}`); failures++; } };

const opts = new chrome.Options();
opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1200');
const pwBin = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
try { readFileSync(pwBin); opts.setChromeBinaryPath(pwBin); } catch {}
const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();

async function shot(name) {
  const png = await driver.takeScreenshot();
  const p = join(OUT, `${name}.png`);
  writeFileSync(p, png, 'base64');
  console.log(`     → screens-check-everything/${name}.png`);
}

async function assertText(needle, msg) {
  const body = await driver.findElement(By.css('body')).getText();
  ok(body.includes(needle), `${msg} (looking for "${needle.slice(0, 40)}")`);
}

try {
  // ────────────────────────────────────────────────────────────────────
  // 1. Public pages
  // ────────────────────────────────────────────────────────────────────
  const publicPages = [
    { path: '/',          needle: 'Housey',     name: '01-home' },
    { path: '/about',     needle: 'About',      name: '02-about' },
    { path: '/gallery',   needle: 'Gallery',    name: '03-gallery' },
    { path: '/location',  needle: 'Vela Luka',  name: '04-location' },
    { path: '/booking',   needle: 'Book',       name: '05-booking' },
    { path: '/contact',   needle: 'Contact',    name: '06-contact' },
  ];
  for (const p of publicPages) {
    console.log(`\n=== Public: ${p.path} ===`);
    await driver.get(`${BASE}${p.path}`);
    await driver.sleep(800);
    await assertText(p.needle, `${p.path} renders with expected text`);
    await shot(p.name);
  }

  // ────────────────────────────────────────────────────────────────────
  // 2. Booking calendar: pick range, see Duration update
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== Booking calendar interaction ===');
  await driver.get(`${BASE}/booking`);
  await driver.wait(until.elementLocated(By.css('div.grid.grid-cols-7 button:not([disabled])')), 10_000);
  await driver.sleep(800);
  const cells = await driver.findElements(By.css('div.grid.grid-cols-7 button:not([disabled])'));
  ok(cells.length > 5, `2a: enough enabled cells (${cells.length})`);
  if (cells.length > 5) {
    await cells[0].click();
    await driver.sleep(150);
    await cells[Math.min(cells.length - 1, 7)].click();
    await driver.sleep(250);
    const dur = await driver.findElement(By.xpath("//*[contains(text(), 'Duration:')]")).getText();
    ok(/\d+ nights/.test(dur), `2b: duration shows after range pick (${dur})`);
    await shot('07-booking-range-selected');
  }

  // ────────────────────────────────────────────────────────────────────
  // 3. Admin login
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== Admin login ===');
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type=password]')), 10_000);
  await shot('08-admin-login');
  // Switch to EN for predictable selectors. The site used to have a
  // standalone HR/EN button; it was replaced by the global LangPicker
  // <select> in the SiteHeader (data-testid="lang-picker"). Honour
  // whichever exists so this script keeps working through future
  // navigation tweaks.
  const pickers = await driver.findElements(By.css('[data-testid="lang-picker"]'));
  if (pickers.length > 0) {
    await driver.executeScript(`
      const el = document.querySelector('[data-testid="lang-picker"]');
      if (el) { el.value = 'en'; el.dispatchEvent(new Event('change', { bubbles: true })); }
    `);
  }
  await driver.sleep(150);
  await driver.findElement(By.css('input[type=password]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('h1')), 15_000);
  await driver.sleep(1000);
  // Bilingual: production defaults to HR; the language toggle MAY not have
  // switched cleanly to EN on every host. Accept either label.
  const body = await driver.findElement(By.css('body')).getText();
  ok(/Bookings|Rezervacije/.test(body), '3a: bookings heading visible after login (EN or HR)');
  await shot('09-admin-after-login');

  // ────────────────────────────────────────────────────────────────────
  // 4. Admin sections render
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== Admin sections ===');
  // Allow a moment for the blocked-dates fetch + calendar render to settle.
  await driver.sleep(600);
  const calendarHeadings = await driver.findElements(By.xpath("//h3[contains(., '202')]"));
  ok(calendarHeadings.length >= 3, `4a: ≥3 month headings rendered (${calendarHeadings.length})`);

  // Scroll to images section
  await driver.executeScript(`
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('Images'));
    if (h) h.scrollIntoView({block: 'center'});
  `);
  await driver.sleep(400);
  await shot('10-admin-images-section');
  const bodyImages = await driver.findElement(By.css('body')).getText();
  ok(/Images|Slike/.test(bodyImages), '4b: Images section visible (EN or HR)');

  // Scroll to bookings
  await driver.executeScript(`
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('Bookings'));
    if (h) h.scrollIntoView({block: 'center'});
  `);
  await driver.sleep(400);
  await shot('11-admin-bookings-section');

  // ────────────────────────────────────────────────────────────────────
  // 5. + Add booking opens panel
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== + Add booking panel ===');
  const addBtn = await driver.findElement(By.xpath("//button[contains(., '+ Add booking') or contains(., '+ Dodaj rezervaciju')]"));
  await addBtn.click();
  await driver.wait(until.elementLocated(By.css("[data-testid='booking-add-panel']")), 5_000);
  await driver.sleep(400);
  await shot('12-admin-add-booking-panel');
  ok(true, '5a: Add booking panel opened');
  // Cancel out without saving
  const cancelBtn = await driver.findElement(By.xpath("//div[@data-testid='booking-add-panel']//button[normalize-space()='Cancel' or normalize-space()='Odustani']"));
  await cancelBtn.click();
  await driver.sleep(300);

  // ────────────────────────────────────────────────────────────────────
  // 5b. Translation inbox section visible in /admin
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== Translation inbox in /admin ===');
  await driver.executeScript(`
    const h = [...document.querySelectorAll('h2')].find((e) =>
      /Translation inbox|Inbox za prijevode|Übersetzungs-Inbox|Casella delle traduzioni|Boîte de traduction/.test(e.textContent)
    );
    if (h) h.scrollIntoView({block: 'center'});
  `);
  await driver.sleep(400);
  const bodyInbox = await driver.findElement(By.css('body')).getText();
  ok(/Translation inbox|Inbox za prijevode/.test(bodyInbox), '5b1: Translation inbox heading present in /admin');
  await shot('12b-admin-inbox-section');

  // ────────────────────────────────────────────────────────────────────
  // 6. Logout
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== Logout ===');
  // Scroll to top so Logout is visible
  await driver.executeScript('window.scrollTo(0, 0)');
  await driver.sleep(200);
  // Accept the logout label in any of the 5 supported languages — the
  // global lang cookie may have it set to HR/DE/IT/FR depending on the
  // previous test runs in the same browser session.
  const logoutBtn = await driver.findElement(By.xpath(
    "//button[normalize-space()='Logout' or normalize-space()='Odjava' " +
    "or normalize-space()='Abmelden' or normalize-space()='Esci' " +
    "or normalize-space()='Déconnexion']"
  ));
  await logoutBtn.click();
  await driver.wait(until.elementLocated(By.css('input[type=password]')), 5_000);
  await driver.sleep(200);
  await shot('13-admin-logged-out');
  ok(true, '6a: logged out cleanly');

  // ────────────────────────────────────────────────────────────────────
  // 7. /submit-review reachable + password-gated (unauthenticated check)
  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== /submit-review ===');
  await driver.get(`${BASE}/submit-review`);
  await driver.wait(until.elementLocated(By.css('[data-testid="submit-password"]')), 10_000);
  await shot('14-submit-review-locked');
  ok(true, '7a: /submit-review renders with password gate');
  // SiteHeader (and therefore LangPicker) must show on this route too.
  const pickerOnSubmit = await driver.findElements(By.css('[data-testid="lang-picker"]'));
  ok(pickerOnSubmit.length === 1, `7b: LangPicker available on /submit-review (count=${pickerOnSubmit.length})`);
  // Wrong password → auth error, form NOT revealed.
  await driver.findElement(By.css('[data-testid="submit-password"]')).sendKeys('wrong-pw');
  await driver.findElement(By.css('[data-testid="submit-unlock"]')).click();
  await driver.wait(until.elementLocated(By.css('[data-testid="submit-auth-error"]')), 5_000);
  const formFields = await driver.findElements(By.css('[data-testid="submit-author"]'));
  ok(formFields.length === 0, `7c: wrong password keeps form hidden (form-fields=${formFields.length})`);
  await shot('15-submit-review-wrong-pw');
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  failures++;
  try { await shot('99-fatal-state'); } catch {}
} finally {
  await driver.quit();
}

console.log('');
if (failures === 0) {
  console.log(`PASS — every page renders + key admin flow works against ${BASE}`);
  console.log(`Screens saved to: ${OUT}`);
} else {
  console.log(`FAIL — ${failures} assertion(s) failed (see ${OUT})`);
}
process.exit(failures === 0 ? 0 : 1);
