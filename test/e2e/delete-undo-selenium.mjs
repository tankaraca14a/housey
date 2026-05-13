// Selenium suite for the two-confirm-plus-undo delete flow.
//
// Path A: click Delete → accept both confirm() dialogs → toast appears → wait
//   for the 10s grace window to elapse → row really gone from KV.
// Path B: click Delete → accept both confirms → toast appears → click Undo
//   BEFORE 10s elapse → row still in KV, no DELETE API call ever fires.

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BLOCKED  = join(REPO, 'data', 'blocked-dates.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const GRACE_MS = 10_000;

const initialBookings = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
const initialBlocked  = JSON.parse(readFileSync(BLOCKED, 'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
function restore() {
  writeFileSync(BOOKINGS, JSON.stringify(initialBookings, null, 2));
  writeFileSync(BLOCKED, JSON.stringify(initialBlocked, null, 2));
}

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function seed(name) {
  const r = await api('POST', '/api/admin/bookings', {
    name, email: `${name}@x.com`, phone: '5550000',
    checkIn: '2099-04-10', checkOut: '2099-04-15', guests: '2',
  });
  return r.body.booking;
}

function buildDriver() {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1200');
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { if (readFileSync(pw)) opts.setChromeBinaryPath(pw); } catch {}
  return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

const driver = buildDriver();

async function login() {
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  // Switch to EN
  await driver.findElement(By.xpath("//button[normalize-space()='HR' or normalize-space()='EN']")).click();
  await driver.sleep(200);
  await driver.findElement(By.css('input[type="password"]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('h3')), 8000);
  await driver.sleep(500);
}

try {
  // Auto-accept BOTH confirm() dialogs by stubbing window.confirm
  async function autoAccept() {
    await driver.executeScript('window.confirm = () => true;');
  }

  await login();

  // ── PATH A: delete-then-wait ──────────────────────────────────────────────
  log('=== A. Delete with 2 confirms, wait for grace window → row gone ===');
  const a = await seed('PathA-Delete');
  await driver.findElement(By.xpath("//button[normalize-space()='Refresh']")).click();
  await driver.wait(until.elementLocated(By.xpath(`//h3[text()='PathA-Delete']`)), 5000);
  await autoAccept();

  // Click Delete
  const deleteBtnA = await driver.findElement(By.css(`[data-testid='delete-btn-${a.id}']`));
  await deleteBtnA.click();
  await driver.sleep(500);

  // Toast should appear, row should be hidden from list
  const toastsA = await driver.findElements(By.css(`[data-testid='undo-toast-${a.id}']`));
  ok(toastsA.length === 1, `A1: undo toast visible (count=${toastsA.length})`);
  const visibleRowsA = await driver.findElements(By.xpath(`//h3[text()='PathA-Delete']`));
  ok(visibleRowsA.length === 0, `A2: row hidden from list during grace window`);

  // Confirm the row is STILL in KV during the grace window
  const stillInKv = await api('GET', '/api/admin/bookings');
  ok(stillInKv.body.bookings.some((b) => b.id === a.id), `A3: row still in data during grace window (server unaware)`);

  // Wait out the grace window (+1s buffer)
  log(`  waiting ${(GRACE_MS + 1000) / 1000}s for grace window…`);
  await driver.sleep(GRACE_MS + 1000);

  const afterA = await api('GET', '/api/admin/bookings');
  ok(!afterA.body.bookings.some((b) => b.id === a.id), `A4: row really gone from KV after grace window expired`);
  // Toast should be gone
  const toastsAfter = await driver.findElements(By.css(`[data-testid='undo-toast-${a.id}']`));
  ok(toastsAfter.length === 0, `A5: toast removed after grace window`);

  // ── PATH B: delete-then-undo ──────────────────────────────────────────────
  log('\n=== B. Delete with 2 confirms, then click Undo → row preserved ===');
  const b = await seed('PathB-Undo');
  await driver.findElement(By.xpath("//button[normalize-space()='Refresh']")).click();
  await driver.wait(until.elementLocated(By.xpath(`//h3[text()='PathB-Undo']`)), 5000);
  await autoAccept();

  await driver.findElement(By.css(`[data-testid='delete-btn-${b.id}']`)).click();
  await driver.sleep(500);

  const toastsB = await driver.findElements(By.css(`[data-testid='undo-toast-${b.id}']`));
  ok(toastsB.length === 1, `B1: undo toast visible`);

  // Click Undo well before the 10s timer fires
  await driver.findElement(By.css(`[data-testid='undo-btn-${b.id}']`)).click();
  await driver.sleep(500);

  // Toast should be gone, row visible again
  const toastsAfterB = await driver.findElements(By.css(`[data-testid='undo-toast-${b.id}']`));
  ok(toastsAfterB.length === 0, `B2: toast dismissed after Undo`);
  const visibleAfterB = await driver.findElements(By.xpath(`//h3[text()='PathB-Undo']`));
  ok(visibleAfterB.length === 1, `B3: row restored to visible list after Undo`);

  // Verify nothing was deleted in KV (wait > GRACE_MS to be safe)
  await driver.sleep(GRACE_MS + 1000);
  const afterB = await api('GET', '/api/admin/bookings');
  ok(afterB.body.bookings.some((x) => x.id === b.id), `B4: row still in KV ${(GRACE_MS + 1000)/1000}s after Undo (timer never fired)`);

  // Cleanup the surviving B row
  await api('DELETE', `/api/admin/bookings/${b.id}`);

  // ── C: Cancelling the first confirm aborts before the toast ───────────────
  log('\n=== C. Cancelling the FIRST confirm aborts the delete entirely ===');
  const c = await seed('PathC-Abort');
  await driver.findElement(By.xpath("//button[normalize-space()='Refresh']")).click();
  await driver.wait(until.elementLocated(By.xpath(`//h3[text()='PathC-Abort']`)), 5000);

  // Stub confirm to REJECT the first one
  await driver.executeScript(`
    let calls = 0;
    window.confirm = () => { calls++; return false; };  // reject first
    window.__confirmCalls = () => calls;
  `);
  await driver.findElement(By.css(`[data-testid='delete-btn-${c.id}']`)).click();
  await driver.sleep(500);
  const toastsC = await driver.findElements(By.css(`[data-testid='undo-toast-${c.id}']`));
  ok(toastsC.length === 0, `C1: no toast appears when first confirm is cancelled`);
  const calls1 = await driver.executeScript('return window.__confirmCalls();');
  ok(calls1 === 1, `C2: exactly 1 confirm() call when first is cancelled (got ${calls1})`);

  // Now reject the SECOND confirm (accept first, reject second)
  await driver.executeScript(`
    let calls = 0;
    window.confirm = () => { calls++; return calls === 1 ? true : false; };
    window.__confirmCalls = () => calls;
  `);
  await driver.findElement(By.css(`[data-testid='delete-btn-${c.id}']`)).click();
  await driver.sleep(500);
  const toastsC2 = await driver.findElements(By.css(`[data-testid='undo-toast-${c.id}']`));
  ok(toastsC2.length === 0, `C3: no toast appears when second confirm is cancelled`);
  const calls2 = await driver.executeScript('return window.__confirmCalls();');
  ok(calls2 === 2, `C4: exactly 2 confirm() calls when second is cancelled (got ${calls2})`);

  // Cleanup
  await api('DELETE', `/api/admin/bookings/${c.id}`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await driver.quit();
  restore();
}

log('');
log(failures === 0 ? 'PASS — two-confirm + undo delete flow verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
