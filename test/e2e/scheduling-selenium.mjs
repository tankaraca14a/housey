// SAME end-to-end suite as e2e-scheduling.mjs + e2e-booking-flow.mjs,
// but driven through Selenium WebDriver instead of Playwright.
// Proves the fixes hold under a different automation stack.

import { Builder, By, Key, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/<layer>/ → repo root
const SCREENS = join(HERE, 'screens-selenium');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'http://localhost:3457';
let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

// ── Build the Chrome driver. Try Selenium Manager first; fall back to the
// chrome-headless-shell that Playwright already downloaded.
function buildOptions() {
  const opts = new chrome.Options();
  opts.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1400,1100',
  );
  // If the Playwright chromium binary is present, use it — saves a download.
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try {
    if (readFileSync(pw)) opts.setChromeBinaryPath(pw);
  } catch {}
  return opts;
}

const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(buildOptions())
  .build();

async function shot(name) {
  const data = await driver.takeScreenshot();
  const p = join(SCREENS, `${name}.png`);
  writeFileSync(p, data, 'base64');
  log(`     → ${p}`);
}

async function visibleMonthHeadings() {
  const els = await driver.findElements(By.css('h3'));
  const out = [];
  for (const el of els) {
    const t = (await el.getText()).trim();
    if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(t)) {
      out.push(t);
    }
  }
  return out;
}

const MN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function offset(o) {
  const n = new Date();
  return [0,1,2].map((i) => {
    const d = new Date(n.getFullYear(), n.getMonth() + o + i, 1);
    return `${MN[d.getMonth()]} ${d.getFullYear()}`;
  });
}

// Snapshot of bookings.json before section C; restored in `finally` regardless
// of whether the test passes, fails, or throws an unexpected alert.
let bookingsBefore = null;

try {
  // ── A. /admin month nav ─────────────────────────────────────────────────────
  log('=== A. /admin month navigation (Selenium) ===');
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  await shot('S-A-01-login');

  // Force EN — see admin-crud-selenium.mjs.
  await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  await driver.sleep(150);

  await driver.findElement(By.css('input[type="password"]')).sendKeys('ivana2026', Key.RETURN);
  await driver.wait(until.elementLocated(By.css('h1')), 5000);
  await driver.sleep(400); // let blocked-dates fetch settle
  await shot('S-A-02-after-login');

  const initial = await visibleMonthHeadings();
  ok(JSON.stringify(initial) === JSON.stringify(offset(0)),
    `A2: initial months ${JSON.stringify(initial)} == ${JSON.stringify(offset(0))}`);

  // Locate Prev / Next by visible text "Previous" / "Next"
  const buttons = await driver.findElements(By.css('button'));
  let prevBtn = null, nextBtn = null;
  for (const b of buttons) {
    const t = (await b.getText()).trim();
    if (/^← Previous$/.test(t)) prevBtn = b;
    else if (/^Next →$/.test(t)) nextBtn = b;
  }
  ok(prevBtn !== null, 'A3a: Previous button found');
  ok(nextBtn !== null, 'A3b: Next button found');
  ok(await prevBtn.getAttribute('disabled') === 'true', 'A3c: Previous disabled at offset 0');

  await nextBtn.click();
  await driver.sleep(200);
  const after1 = await visibleMonthHeadings();
  ok(JSON.stringify(after1) === JSON.stringify(offset(1)),
    `A4: after Next → ${JSON.stringify(after1)} == ${JSON.stringify(offset(1))}`);
  await shot('S-A-03-after-1-next');

  await nextBtn.click();
  await driver.sleep(200);
  const after2 = await visibleMonthHeadings();
  ok(JSON.stringify(after2) === JSON.stringify(offset(2)),
    `A7: after 2 Next → ${JSON.stringify(after2)}`);

  await prevBtn.click();
  await prevBtn.click();
  await driver.sleep(200);
  const back = await visibleMonthHeadings();
  ok(JSON.stringify(back) === JSON.stringify(offset(0)), 'A6: two Prevs return to initial');

  const blocked = await driver.findElements(By.css('div.grid.grid-cols-7 button[class*="bg-red"]'));
  ok(blocked.length > 0, `A9: blocked cells render red (${blocked.length})`);

  // ── B. /booking guest calendar ──────────────────────────────────────────────
  log('\n=== B. /booking calendar (Selenium) ===');
  await driver.get(`${BASE}/booking`);
  await driver.wait(until.elementLocated(By.css('h1')), 5000);
  await driver.sleep(300);

  const guestMonths = await visibleMonthHeadings();
  ok(guestMonths.length === 3, `B1: 3 month headings (${guestMonths.length})`);

  // ── C. Booking submission ───────────────────────────────────────────────────
  log('\n=== C. Booking submission (Selenium) ===');
  // Snapshot taken HERE so the `finally` block can always restore it,
  // even if any assertion below throws (e.g. unexpected alert dialog).
  bookingsBefore = JSON.parse(readFileSync(join(REPO, 'data', 'bookings.json'), 'utf-8'));

  // Click two enabled day cells
  const dayCells = await driver.findElements(By.css('div.grid.grid-cols-7 button:not([disabled])'));
  ok(dayCells.length > 5, `C1: enabled cells (${dayCells.length})`);
  await dayCells[0].click();
  await driver.sleep(120);
  await dayCells[Math.min(dayCells.length - 1, 7)].click();
  await driver.sleep(250);

  const dur = await driver.findElement(By.xpath("//*[contains(text(), 'Duration:')]")).getText();
  ok(/\d+ nights/.test(dur), `C2: range selected (${dur})`);

  // Fill the form fields
  await driver.findElement(By.css('input[placeholder="John Doe"]')).sendKeys('Selenium Test Guest');
  await driver.findElement(By.css('input[placeholder="john@example.com"]')).sendKeys('selenium@example.invalid');
  await driver.findElement(By.css('input[placeholder="+1 234 567 890"]')).sendKeys('+385 91 555 5555');
  // Pick the guests select in the booking form, not the global LangPicker.
  // findElement(By.css('select')) used to be unambiguous; now the picker
  // in the top nav also matches.
  await driver.findElement(By.css('main select')).sendKeys('2 guests');
  await driver.findElement(By.css('textarea')).sendKeys('Submitted via Selenium WebDriver.');
  await shot('S-C-01-form-filled');

  // Submit
  const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
  await submitBtn.click();
  await driver.sleep(3000);
  await shot('S-C-02-after-submit');

  // Success banner check
  const successCount = await driver.findElements(By.xpath("//*[contains(text(), 'Thank you')]"));
  ok(successCount.length > 0, 'C3: success banner visible');

  const after = JSON.parse(readFileSync(join(REPO, 'data', 'bookings.json'), 'utf-8'));
  ok(after.length === bookingsBefore.length + 1, `C4: bookings.json grew (${bookingsBefore.length} → ${after.length})`);
  const last = after[after.length - 1];
  ok(last && last.name === 'Selenium Test Guest', 'C5: stored row has correct name');
  ok(last && last.status === 'pending', 'C6: stored row has status=pending');
} finally {
  // Always restore the snapshot — even if any assertion above threw —
  // so a failed run doesn't poison the bookings file and break later e2e
  // suites with stale overlap-conflict data.
  if (bookingsBefore !== null) {
    writeFileSync(join(REPO, 'data', 'bookings.json'), JSON.stringify(bookingsBefore, null, 2));
    log('  (rolled back bookings.json)');
  }
  await driver.quit();
}

log('');
log(failures === 0 ? 'PASS — Selenium suite green ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
