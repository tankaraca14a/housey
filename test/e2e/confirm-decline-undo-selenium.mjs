// Confirm and Decline both now have a 10s undo window mirroring the
// booking-delete pattern. This drives a real browser through:
//   A. Confirm flow:
//      - seed a pending booking
//      - click ✓ Confirm → both confirms accepted → toast appears, status
//        badge shows "Confirmed" optimistically, KV still says pending,
//        no blocked-dates change
//      - click Undo → badge reverts to Pending, KV still pending, no email
//      - click Confirm again → wait 11s → KV flips to confirmed, dates
//        auto-blocked
//   B. Decline flow: same shape against /decline (no dates side effect)

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

let failures = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { console.log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function getBooking(id) {
  const r = await api('GET', '/api/admin/bookings');
  return (r.body.bookings || []).find((b) => b.id === id);
}

async function getBlockedDates() {
  const r = await api('GET', '/api/admin/blocked-dates');
  return new Set(r.body.blockedDates || []);
}

// Snapshot data files for rollback
const beforeBookings = readFileSync('data/bookings.json', 'utf8');
const beforeBlocked = readFileSync('data/blocked-dates.json', 'utf8');

let driver;
try {
  // ── Seed two pending bookings (one for confirm flow, one for decline) ──
  const seedConfirm = await api('POST', '/api/admin/bookings', {
    name: 'Confirm Probe',
    email: 'confirm@probe.invalid',
    phone: '+385 91 555 0001',
    checkIn: '2099-06-10',
    checkOut: '2099-06-15',
    guests: '2',
    message: 'confirm-undo test',
    status: 'pending',
  });
  if (seedConfirm.status !== 200) throw new Error(`seed confirm failed: ${seedConfirm.status}`);
  const idC = seedConfirm.body.booking.id;
  console.log(`Seeded confirm-test booking id=${idC}`);

  const seedDecline = await api('POST', '/api/admin/bookings', {
    name: 'Decline Probe',
    email: 'decline@probe.invalid',
    phone: '+385 91 555 0002',
    checkIn: '2099-07-10',
    checkOut: '2099-07-15',
    guests: '2',
    message: 'decline-undo test',
    status: 'pending',
  });
  if (seedDecline.status !== 200) throw new Error(`seed decline failed: ${seedDecline.status}`);
  const idD = seedDecline.body.booking.id;
  console.log(`Seeded decline-test booking id=${idD}`);

  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1600');
  const pwBin = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { readFileSync(pwBin); opts.setChromeBinaryPath(pwBin); } catch {}
  driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();

  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type=password]')), 8000);
  await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('input[type=password]')), 5000);
  await driver.sleep(150);
  await driver.findElement(By.css('input[type=password]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('h1')), 10000);
  await driver.sleep(800);

  // Auto-accept every confirm() in this run.
  await driver.executeScript('window.__confirmCalls = 0; window.confirm = function(){ window.__confirmCalls += 1; return true; };');

  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== A. Confirm flow ===');
  const confirmBtn = await driver.findElement(By.css(`[data-testid='confirm-btn-${idC}']`));
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', confirmBtn);
  await driver.executeScript('arguments[0].click()', confirmBtn);
  await driver.sleep(500);

  ok((await driver.executeScript('return window.__confirmCalls')) === 2,
     'A1: confirm() called exactly twice');
  ok((await driver.findElements(By.css(`[data-testid='undo-confirm-toast-${idC}']`))).length === 1,
     'A2: confirm undo toast visible');

  // Status badge in the row should now show "Confirmed" optimistically.
  // Grab the row's full innerText and search for the badge label — more
  // robust than xpath text() against i18n + nested spans.
  const rowText = await driver.executeScript(
    `return document.querySelector('[data-testid="booking-row-${idC}"]').innerText`,
  );
  ok(/Confirmed/i.test(rowText), `A3: row text contains "Confirmed" optimistically (got: ${(rowText || '').slice(0, 120)}…)`);

  // Confirm button should be GONE during grace (booking is no longer pending in render)
  const confirmBtnsDuringGrace = await driver.findElements(By.css(`[data-testid='confirm-btn-${idC}']`));
  ok(confirmBtnsDuringGrace.length === 0, 'A4: ✓ Confirm button hidden during grace window');

  // KV check: server still says pending, dates not yet blocked.
  const serverDuringGrace = await getBooking(idC);
  ok(serverDuringGrace?.status === 'pending', `A5: server still pending during grace (got ${serverDuringGrace?.status})`);
  const blockedBefore = await getBlockedDates();
  ok(!blockedBefore.has('2099-06-10'), 'A6: KV blocked-dates NOT touched during grace');

  // ── Click Undo ──
  console.log('  → click Undo');
  await driver.findElement(By.css(`[data-testid='undo-confirm-btn-${idC}']`)).click();
  await driver.sleep(500);

  ok((await driver.findElements(By.css(`[data-testid='undo-confirm-toast-${idC}']`))).length === 0,
     'A7: toast dismissed after Undo');
  // Pending badge restored
  const rowTextAfterUndo = await driver.executeScript(
    `return document.querySelector('[data-testid="booking-row-${idC}"]').innerText`,
  );
  ok(/Pending/i.test(rowTextAfterUndo) && !/Confirmed/.test(rowTextAfterUndo.split('\n').slice(0, 3).join(' ')),
     `A8: row reverts to "Pending" after Undo`);
  const serverAfterUndo = await getBooking(idC);
  ok(serverAfterUndo?.status === 'pending', 'A9: server still pending after Undo (no API call fired)');

  // ── Real confirm: click + wait grace ──
  console.log('  → click Confirm again, wait 11s');
  await driver.executeScript('window.__confirmCalls = 0;');
  const confirmBtnAgain = await driver.findElement(By.css(`[data-testid='confirm-btn-${idC}']`));
  await driver.executeScript('arguments[0].click()', confirmBtnAgain);
  await driver.sleep(500);
  ok((await driver.findElements(By.css(`[data-testid='undo-confirm-toast-${idC}']`))).length === 1,
     'A10: toast appeared again');
  console.log('     waiting 11s for grace window…');
  await driver.sleep(11_500);
  const serverFinal = await getBooking(idC);
  ok(serverFinal?.status === 'confirmed',
     `A11: server flipped to confirmed after grace (got ${serverFinal?.status})`);
  const blockedFinal = await getBlockedDates();
  ok(blockedFinal.has('2099-06-10') && blockedFinal.has('2099-06-14'),
     `A12: KV blocked-dates added by /confirm`);
  ok((await driver.findElements(By.css(`[data-testid='undo-confirm-toast-${idC}']`))).length === 0,
     'A13: toast cleared after grace');

  // ────────────────────────────────────────────────────────────────────
  console.log('\n=== B. Decline flow ===');
  await driver.executeScript('window.__confirmCalls = 0;');
  const declineBtn = await driver.findElement(By.css(`[data-testid='decline-btn-${idD}']`));
  await driver.executeScript('arguments[0].scrollIntoView({block:"center"})', declineBtn);
  await driver.executeScript('arguments[0].click()', declineBtn);
  await driver.sleep(500);
  ok((await driver.findElements(By.css(`[data-testid='undo-decline-toast-${idD}']`))).length === 1,
     'B1: decline undo toast visible');

  const rowTextDecline = await driver.executeScript(
    `return document.querySelector('[data-testid="booking-row-${idD}"]').innerText`,
  );
  ok(/Declined/i.test(rowTextDecline), `B2: row text contains "Declined" optimistically`);

  const serverDuringGraceD = await getBooking(idD);
  ok(serverDuringGraceD?.status === 'pending', `B3: server still pending during decline grace`);

  // Undo
  await driver.findElement(By.css(`[data-testid='undo-decline-btn-${idD}']`)).click();
  await driver.sleep(500);
  ok((await driver.findElements(By.css(`[data-testid='undo-decline-toast-${idD}']`))).length === 0,
     'B4: decline toast dismissed after Undo');
  const serverAfterUndoD = await getBooking(idD);
  ok(serverAfterUndoD?.status === 'pending', 'B5: server still pending after decline Undo');

  // Real decline
  console.log('  → click Decline again, wait 11s');
  const declineBtnAgain = await driver.findElement(By.css(`[data-testid='decline-btn-${idD}']`));
  await driver.executeScript('arguments[0].click()', declineBtnAgain);
  await driver.sleep(500);
  console.log('     waiting 11s for grace window…');
  await driver.sleep(11_500);
  const serverFinalD = await getBooking(idD);
  ok(serverFinalD?.status === 'declined',
     `B6: server flipped to declined after grace (got ${serverFinalD?.status})`);
  // Decline does NOT block dates
  const blockedFinalD = await getBlockedDates();
  ok(!blockedFinalD.has('2099-07-10'),
     'B7: Decline did NOT block dates (only Confirm does)');
} catch (e) {
  console.error(`FATAL: ${e.stack || e}`);
  failures++;
} finally {
  if (driver) await driver.quit().catch(() => {});
  // Always restore the data files to the snapshot taken at start. The
  // confirm flow may have inserted real rows + blocked dates; we wipe them.
  writeFileSync('data/bookings.json', beforeBookings);
  writeFileSync('data/blocked-dates.json', beforeBlocked);
}

console.log('');
console.log(failures === 0 ? 'PASS — Confirm + Decline both have 10s undo ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
