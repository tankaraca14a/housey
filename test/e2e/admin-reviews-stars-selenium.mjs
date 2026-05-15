// End-to-end Selenium spec for the click-to-rate star widget in the admin
// Reviews form. Verifies:
//
//   1.  Default new-review rating is 5 (all stars amber, aria-checked on 5).
//   2.  Clicking the 3rd star drops the rating to 3 (stars 1-3 amber,
//       stars 4-5 slate, aria-checked on 3, "3/5" counter renders).
//   3.  Clicking the 1st star drops the rating to 1.
//   4.  Filling the form and saving creates a review with rating=1 in KV/file.
//   5.  Re-opening the same row's edit panel re-hydrates the star widget
//       to match the persisted rating.
//   6.  Changing the rating on edit and saving persists the new value.
//   7.  Deleting the review (with the 10s undo confirm dialog) removes it.
//
// Snapshot+restore data/reviews.json so tests are hermetic.

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const REVIEWS = join(REPO, 'data', 'reviews.json');
const SCREENS = join(HERE, 'screens-reviews-stars-selenium');
mkdirSync(SCREENS, { recursive: true });
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initial = existsSync(REVIEWS) ? readFileSync(REVIEWS, 'utf-8') : '[]\n';

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
function restore() { writeFileSync(REVIEWS, initial); }

function buildDriver() {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1400');
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { if (readFileSync(pw)) opts.setChromeBinaryPath(pw); } catch {}
  return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const driver = buildDriver();
async function shot(name) {
  const data = await driver.takeScreenshot();
  writeFileSync(join(SCREENS, `${name}.png`), data, 'base64');
}

async function getStarState(i) {
  const el = await driver.findElement(By.css(`[data-testid="review-rating-${i}"]`));
  const aria = await el.getAttribute('aria-checked');
  const cls = await el.getAttribute('class');
  return { aria, isAmber: /text-amber-400/.test(cls), isSlate: /text-slate-500/.test(cls) };
}
async function assertRating(expected, label) {
  for (let i = 1; i <= 5; i++) {
    const s = await getStarState(i);
    const shouldAmber = i <= expected;
    ok(s.isAmber === shouldAmber, `${label}: star #${i} amber=${shouldAmber} (got amber=${s.isAmber})`);
    ok(s.isSlate === !shouldAmber, `${label}: star #${i} slate=${!shouldAmber}`);
    ok(s.aria === (i === expected ? 'true' : 'false'), `${label}: star #${i} aria-checked=${i === expected}`);
  }
  // The counter "N/5"
  const wrap = await driver.findElement(By.css('[data-testid="review-rating"]'));
  const text = await wrap.getText();
  ok(text.includes(`${expected}/5`), `${label}: counter shows ${expected}/5 (got "${text.trim()}")`);
}

try {
  // ── A. LOGIN ────────────────────────────────────────────────────────────────
  log('=== A. Login + open Reviews ===');
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 8000);
  // Force EN — see admin-crud-selenium.mjs for the migration rationale.
  await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  await driver.sleep(150);
  await driver.findElement(By.css('input[type="password"]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('[data-testid="review-add-trigger"]')), 8000);
  await driver.executeScript('window.confirm = () => true;');
  ok(true, 'A1: logged in, reviews trigger present');

  // ── B. DEFAULT RATING = 5 ───────────────────────────────────────────────────
  log('\n=== B. Default rating is 5 ===');
  const addBtn = await driver.findElement(By.css('[data-testid="review-add-trigger"]'));
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', addBtn);
  await driver.sleep(100);
  await addBtn.click();
  await driver.wait(until.elementLocated(By.css('[data-testid="review-edit-panel"]')), 5000);
  await driver.sleep(200);
  await shot('B-default-5');
  await assertRating(5, 'B-default');

  // ── C. CLICK STAR 3 → rating becomes 3 ─────────────────────────────────────
  log('\n=== C. Click star #3 → rating=3 ===');
  await driver.findElement(By.css('[data-testid="review-rating-3"]')).click();
  await driver.sleep(150);
  await shot('C-rating-3');
  await assertRating(3, 'C-after-click-3');

  // ── D. CLICK STAR 1 → rating becomes 1 ─────────────────────────────────────
  log('\n=== D. Click star #1 → rating=1 ===');
  await driver.findElement(By.css('[data-testid="review-rating-1"]')).click();
  await driver.sleep(150);
  await shot('D-rating-1');
  await assertRating(1, 'D-after-click-1');

  // ── E. SAVE + verify persisted rating=1 ────────────────────────────────────
  log('\n=== E. Fill the rest of the form, save ===');
  const author = 'Selenium Star Probe';
  await driver.findElement(By.css('[data-testid="review-author"]')).sendKeys(author);
  // Source field is pre-filled "Airbnb" — leave it.
  await driver.findElement(By.css('[data-testid="review-quote"]')).sendKeys('Star widget end-to-end check.');
  await driver.findElement(By.css('[data-testid="review-save"]')).click();
  // Save closes the panel. Wait for the row to appear, then read its id.
  await driver.wait(async () => {
    const r = await api('GET', '/api/admin/reviews');
    return (r.body.reviews || []).some((x) => x.author === author);
  }, 6000, 'review row did not appear in admin list');
  const list = await api('GET', '/api/admin/reviews');
  const created = list.body.reviews.find((x) => x.author === author);
  ok(!!created, `E1: created via UI (id=${created?.id})`);
  ok(created?.rating === 1, `E2: persisted rating === 1 (got ${created?.rating})`);
  await shot('E-saved');

  // ── F. RE-OPEN edit panel, expect widget hydrated to rating=1 ──────────────
  log('\n=== F. Re-open edit panel hydrates to 1 ===');
  await driver.findElement(By.css(`[data-testid="review-edit-${created.id}"]`)).click();
  await driver.wait(until.elementLocated(By.css('[data-testid="review-edit-panel"]')), 4000);
  await driver.sleep(200);
  await assertRating(1, 'F-rehydrate');

  // ── G. CHANGE rating to 4, save, verify ────────────────────────────────────
  log('\n=== G. Bump rating to 4 on edit, save ===');
  await driver.findElement(By.css('[data-testid="review-rating-4"]')).click();
  await driver.sleep(100);
  await assertRating(4, 'G-after-click-4');
  await driver.findElement(By.css('[data-testid="review-save"]')).click();
  await driver.wait(async () => {
    const r = await api('GET', '/api/admin/reviews');
    const row = (r.body.reviews || []).find((x) => x.id === created.id);
    return row && row.rating === 4;
  }, 6000, 'rating did not update to 4');
  ok(true, 'G1: rating persisted as 4');
  await shot('G-saved-4');

  // ── G2. FEATURED toggle (★ Feature / Unstar) round-trip ────────────────────
  // The row was created at E with featured=false (default). Click ★ Feature,
  // verify the API row flips to featured=true. Click again (button is now
  // labelled Unstar), verify it flips back to false.
  log('\n=== G2. Featured toggle: ★ Feature -> Unstar ===');
  const initialRow = (await api('GET', '/api/admin/reviews')).body.reviews.find((x) => x.id === created.id);
  ok(initialRow?.featured === false, `G2a: row starts with featured=false`);
  await driver.findElement(By.css(`[data-testid="review-featured-toggle-${created.id}"]`)).click();
  await driver.wait(async () => {
    const r = await api('GET', '/api/admin/reviews');
    const row = (r.body.reviews || []).find((x) => x.id === created.id);
    return row && row.featured === true;
  }, 6000, 'featured did not flip to true');
  ok(true, 'G2b: featured -> true via UI');

  await driver.findElement(By.css(`[data-testid="review-featured-toggle-${created.id}"]`)).click();
  await driver.wait(async () => {
    const r = await api('GET', '/api/admin/reviews');
    const row = (r.body.reviews || []).find((x) => x.id === created.id);
    return row && row.featured === false;
  }, 6000, 'featured did not flip back to false');
  ok(true, 'G2c: featured -> false via UI (Unstar)');
  await shot('G2-after-unstar');

  // ── H. DELETE row (10s undo grace window; row hidden immediately) ──────────
  log('\n=== H. Delete row (UI hides immediately, undo grace) ===');
  const before = (await api('GET', '/api/admin/reviews')).body.reviews.length;
  await driver.findElement(By.css(`[data-testid="review-delete-${created.id}"]`)).click();
  // The row should disappear from the DOM (optimistic hide).
  await driver.wait(async () => {
    const matches = await driver.findElements(By.css(`[data-testid="review-row-${created.id}"]`));
    return matches.length === 0;
  }, 4000, 'row did not disappear after delete click');
  ok(true, 'H1: row hidden from list immediately');
  // Wait for grace window to elapse + a safety margin (10s + 2s).
  await driver.sleep(12000);
  const after = await api('GET', '/api/admin/reviews');
  ok(after.body.reviews.length === before - 1, `H2: row removed server-side (${before} → ${after.body.reviews.length})`);
  await shot('H-deleted');
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  restore();
  await driver.quit();
  log('\n  (rolled back data/reviews.json)');
}

log('');
log(failures === 0 ? 'PASS — admin review star widget verified end-to-end ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
