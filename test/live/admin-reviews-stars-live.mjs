// Live-safe Selenium spec for the click-to-rate star widget. Drives
// https://www.tankaraca.com/admin in a real headless Chrome and tags every
// review it creates with a per-run sentinel so cleanup can find rows even
// if the test aborts mid-way. NO file snapshot/restore — prod uses KV.
//
//   B. Default new-review rating is 5 (all stars amber, aria-checked on 5)
//   C. Click star 3 -> 1-3 amber, 4-5 slate, aria on 3, "3/5"
//   D. Click star 1 -> only star 1 amber, "1/5"
//   E. Save -> review row appears via /api/admin/reviews with rating=1
//   F. Re-open edit -> widget rehydrates to 1
//   G. Bump to 4 on edit, save, persists as 4
//   H. Delete row -> hidden immediately, gone server-side after 10s grace
//
// Cleanup: finally block lists /api/admin/reviews and DELETEs every row
// whose author starts with the SENTINEL prefix this script generated.

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCREENS = join(HERE, 'screens-reviews-stars-live');
mkdirSync(SCREENS, { recursive: true });
const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';

const SENTINEL = `LiveStarProbe-${Date.now()}`;
const sentinelMatch = (s) => typeof s === 'string' && s.startsWith('LiveStarProbe-');

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function cleanupSentinel() {
  const r = await api('GET', '/api/admin/reviews');
  const rows = (r.body.reviews || []).filter((x) => sentinelMatch(x.author));
  for (const row of rows) await api('DELETE', `/api/admin/reviews/${row.id}`);
  return rows.length;
}

function buildDriver() {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1400');
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { if (readFileSync(pw)) opts.setChromeBinaryPath(pw); } catch {}
  return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
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
  const wrap = await driver.findElement(By.css('[data-testid="review-rating"]'));
  const text = await wrap.getText();
  ok(text.includes(`${expected}/5`), `${label}: counter shows ${expected}/5`);
}

let createdId = null;

try {
  // ── A. Login ───────────────────────────────────────────────────────────────
  log(`=== A. Login on ${BASE} ===`);
  log(`     SENTINEL author = ${SENTINEL}`);
  // Belt-and-braces: clear stale sentinels from earlier aborted runs.
  const stalePurged = await cleanupSentinel();
  if (stalePurged > 0) log(`     (purged ${stalePurged} stale sentinel rows before starting)`);
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 10_000);
  // Force HR for owner-realistic flow (EN is the global default, but Ivana
  // herself uses Croatian). Set via the new LangPicker's localStorage key.
  await driver.executeScript("window.localStorage.setItem('housey-lang', 'hr');");
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  await driver.sleep(200);
  await driver.findElement(By.css('input[type="password"]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('[data-testid="review-add-trigger"]')), 10_000);
  await driver.executeScript('window.confirm = () => true;');
  ok(true, 'A1: logged in to prod admin');

  // ── B. Default rating = 5 ──────────────────────────────────────────────────
  log('\n=== B. Default rating = 5 ===');
  const addBtn = await driver.findElement(By.css('[data-testid="review-add-trigger"]'));
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"});', addBtn);
  await driver.sleep(150);
  await addBtn.click();
  await driver.wait(until.elementLocated(By.css('[data-testid="review-edit-panel"]')), 5_000);
  await driver.sleep(250);
  await shot('B-default-5');
  await assertRating(5, 'B-default');

  // ── C. Click 3 ─────────────────────────────────────────────────────────────
  log('\n=== C. Click star 3 ===');
  await driver.findElement(By.css('[data-testid="review-rating-3"]')).click();
  await driver.sleep(200);
  await shot('C-rating-3');
  await assertRating(3, 'C-after-3');

  // ── D. Click 1 ─────────────────────────────────────────────────────────────
  log('\n=== D. Click star 1 ===');
  await driver.findElement(By.css('[data-testid="review-rating-1"]')).click();
  await driver.sleep(200);
  await shot('D-rating-1');
  await assertRating(1, 'D-after-1');

  // ── E. Save -> verify persisted rating=1 ───────────────────────────────────
  log('\n=== E. Fill + save (rating=1) ===');
  await driver.findElement(By.css('[data-testid="review-author"]')).sendKeys(SENTINEL);
  await driver.findElement(By.css('[data-testid="review-quote"]')).sendKeys('Prod star widget probe — auto cleanup');
  await driver.findElement(By.css('[data-testid="review-save"]')).click();
  // Poll the live API until our sentinel row appears.
  await driver.wait(async () => {
    const r = await api('GET', '/api/admin/reviews');
    return (r.body.reviews || []).some((x) => x.author === SENTINEL);
  }, 8_000, 'sentinel review did not appear in prod KV');
  const after = (await api('GET', '/api/admin/reviews')).body.reviews;
  const created = after.find((x) => x.author === SENTINEL);
  createdId = created?.id;
  ok(!!created, `E1: created on prod (id=${createdId})`);
  ok(created?.rating === 1, `E2: persisted rating=1 (got ${created?.rating})`);
  await shot('E-saved');

  // ── F. Re-open edit -> rehydrates to 1 ─────────────────────────────────────
  log('\n=== F. Re-open edit panel ===');
  await driver.findElement(By.css(`[data-testid="review-edit-${createdId}"]`)).click();
  await driver.wait(until.elementLocated(By.css('[data-testid="review-edit-panel"]')), 4_000);
  await driver.sleep(250);
  await assertRating(1, 'F-rehydrate');

  // ── G. Bump to 4, save, verify ─────────────────────────────────────────────
  log('\n=== G. Bump to 4 + save ===');
  await driver.findElement(By.css('[data-testid="review-rating-4"]')).click();
  await driver.sleep(150);
  await assertRating(4, 'G-after-4');
  await driver.findElement(By.css('[data-testid="review-save"]')).click();
  await driver.wait(async () => {
    const r = await api('GET', '/api/admin/reviews');
    const row = (r.body.reviews || []).find((x) => x.id === createdId);
    return row && row.rating === 4;
  }, 8_000, 'prod row did not update to rating=4');
  ok(true, 'G1: prod KV rating now 4');
  await shot('G-saved-4');

  // ── H. Delete -> optimistic hide + grace ───────────────────────────────────
  log('\n=== H. Delete row (10s grace then KV gone) ===');
  const beforeLen = (await api('GET', '/api/admin/reviews')).body.reviews.length;
  await driver.findElement(By.css(`[data-testid="review-delete-${createdId}"]`)).click();
  await driver.wait(async () => {
    const matches = await driver.findElements(By.css(`[data-testid="review-row-${createdId}"]`));
    return matches.length === 0;
  }, 4_000, 'row did not disappear from DOM');
  ok(true, 'H1: row hidden from UI immediately');
  await driver.sleep(12_000); // 10s grace + 2s safety
  const afterLen = (await api('GET', '/api/admin/reviews')).body.reviews.length;
  ok(afterLen === beforeLen - 1, `H2: KV row removed (${beforeLen} -> ${afterLen})`);
  createdId = null; // no need to re-clean via API
  await shot('H-deleted');
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Hard backstop: even if anything aborted, sweep every sentinel row this
  // run might have left behind.
  try {
    const swept = await cleanupSentinel();
    log(`\n  (post-run cleanup swept ${swept} sentinel review(s) from prod)`);
  } catch (e) {
    log(`\n  WARN cleanup failed: ${e.message}`);
  }
  await driver.quit();
}

log('');
log(failures === 0 ? `PASS — prod star widget verified end-to-end ✓` : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
