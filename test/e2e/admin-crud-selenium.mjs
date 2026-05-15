// Full Selenium UI sweep of the admin booking interface.
// Tests every administrative capability through the actual rendered UI:
//
//   A. Login + Logout
//   B. Quick Confirm (pending → confirmed via the green button)
//   C. Quick Decline (pending → declined via the red button)
//   D. Free status transitions via the inline <select> (confirmed → pending,
//      declined → confirmed, etc. — covers what the row-buttons cannot)
//   E. Edit a booking via the ✎ Edit panel — change name, email, dates,
//      message, save, verify persisted
//   F. Add a manual booking via the "+ Add booking" panel — fill, save,
//      verify it appears in the list with the chosen initial status
//   G. Delete with the 🗑 button and auto-accept JS confirm() dialog
//   H. Server-side error surfacing — submit an invalid edit, verify the
//      error text is shown in the panel
//
// Snapshots bookings.json + blocked-dates.json at start; restores both at
// the end (whether tests pass or fail).

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/<layer>/ → repo root
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BLOCKED  = join(REPO, 'data', 'blocked-dates.json');
const SCREENS = join(HERE, 'screens-admin-selenium');
mkdirSync(SCREENS, { recursive: true });
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initialBookings = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
const initialBlocked  = JSON.parse(readFileSync(BLOCKED,  'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
function restore() {
  writeFileSync(BOOKINGS, JSON.stringify(initialBookings, null, 2));
  writeFileSync(BLOCKED,  JSON.stringify(initialBlocked,  null, 2));
}

function buildDriver() {
  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1300');
  // Re-use Playwright's chrome-headless-shell to skip a chromedriver download.
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { if (readFileSync(pw)) opts.setChromeBinaryPath(pw); } catch {}
  return new Builder().forBrowser('chrome').setChromeOptions(opts).build();
}

// API helper for setting up + verifying state (faster than going through UI)
async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function listBookings() {
  return (await api('GET', '/api/admin/bookings')).body.bookings;
}
let _seedCounter = 0;
async function seedBooking(extra = {}) {
  // Give each seeded row a unique year so the new overlap detector
  // doesn't flag them as conflicts with each other.
  const year = 2099 + (_seedCounter++);
  const r = await api('POST', '/api/admin/bookings', {
    name: 'Selenium Seed', email: `seed-${_seedCounter}@x.com`, phone: '5550000',
    checkIn: `${year}-04-10`, checkOut: `${year}-04-15`, guests: '2', message: '',
    ...extra,
  });
  return r.body.booking;
}

const driver = buildDriver();
async function shot(name) {
  const data = await driver.takeScreenshot();
  writeFileSync(join(SCREENS, `${name}.png`), data, 'base64');
}
async function clickByCss(css) {
  const el = await driver.findElement(By.css(css));
  await el.click();
  return el;
}

try {
  // ── A. LOGIN ────────────────────────────────────────────────────────────────
  log('=== A. Login ===');
  await driver.get(`${BASE}/admin`);
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  // EN is now the global default (LangProvider in app/layout.tsx); the old
  // HR/EN toggle has been replaced by a 5-language picker. Force-set the
  // language in localStorage and reload so this suite is deterministic
  // regardless of any leftover state from a prior run.
  await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
  await driver.navigate().refresh();
  await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
  await driver.sleep(150);
  await driver.findElement(By.css('input[type="password"]')).sendKeys(PASS, Key.RETURN);
  await driver.wait(until.elementLocated(By.css('h3')), 8000);
  await driver.sleep(400);
  ok(true, 'A1: logged in');
  await shot('A-after-login');

  // Auto-accept any confirm() the page issues from here on out. Confirm,
  // Decline, and Delete all now require multiple dialog OKs.
  await driver.executeScript('window.confirm = () => true;');

  // ── B. QUICK CONFIRM (two confirms now) ─────────────────────────────────────
  log('\n=== B. Quick-confirm a pending booking (2 confirms accepted) ===');
  const b = await seedBooking({ status: 'pending', name: 'QuickConfirm Test' });
  // Click the in-page Refresh button (preserves React-state auth, unlike navigate().refresh())
  await driver.findElement(By.xpath(`//button[normalize-space()='Refresh']`)).click();
  await driver.wait(until.elementLocated(By.xpath(`//h3[text()='QuickConfirm Test']`)), 8000);

  await driver.executeScript('window.confirm = () => true;'); // re-stub after refresh
  const confirmBtn = await driver.findElement(By.xpath(`//div[@data-testid='row-actions-${b.id}']//button[contains(., 'Confirm')]`));
  await confirmBtn.click();
  // Confirm now has a 10s undo window — the /confirm POST only fires after
  // the grace expires. Wait the window + safety margin before asserting KV.
  await driver.sleep(11_500);
  const afterB = await listBookings();
  const rowB = afterB.find((x) => x.id === b.id);
  ok(rowB?.status === 'confirmed', `B1: status=confirmed after grace window (${rowB?.status})`);
  await shot('B-after-confirm');

  // ── C. QUICK DECLINE (two confirms now) ─────────────────────────────────────
  log('\n=== C. Quick-decline a pending booking (2 confirms accepted) ===');
  const c = await seedBooking({ status: 'pending', name: 'QuickDecline Test' });
  await driver.findElement(By.xpath(`//button[normalize-space()='Refresh']`)).click();
  await driver.sleep(800);
  await driver.executeScript('window.confirm = () => true;');
  const declineBtn = await driver.findElement(By.xpath(`//div[@data-testid='row-actions-${c.id}']//button[contains(., 'Decline')]`));
  await declineBtn.click();
  // Decline has the same 10s undo window.
  await driver.sleep(11_500);
  const afterC = await listBookings();
  const rowC = afterC.find((x) => x.id === c.id);
  ok(rowC?.status === 'declined', `C1: status=declined after grace window (${rowC?.status})`);

  // ── B'. CANCELLING either confirm aborts the action ────────────────────────
  log('\n=== B\'/C\'. Cancelling a Confirm/Decline dialog aborts (no state change, no email) ===');
  const bb = await seedBooking({ status: 'pending', name: 'CancelConfirm Test' });
  await driver.findElement(By.xpath(`//button[normalize-space()='Refresh']`)).click();
  await driver.wait(until.elementLocated(By.xpath(`//h3[text()='CancelConfirm Test']`)), 8000);
  // Cancel the FIRST confirm
  await driver.executeScript(`
    let calls = 0;
    window.confirm = () => { calls++; return false; };
    window.__cc = () => calls;
  `);
  await driver.findElement(By.xpath(`//div[@data-testid='row-actions-${bb.id}']//button[contains(., 'Confirm')]`)).click();
  await driver.sleep(1200);
  const afterBprime = (await listBookings()).find((x) => x.id === bb.id);
  ok(afterBprime?.status === 'pending', `B'1: status still pending after first-confirm cancelled (${afterBprime?.status})`);
  ok(await driver.executeScript('return window.__cc();') === 1, `B'2: exactly 1 confirm() call when first cancelled`);

  // Now accept first, reject second
  await driver.executeScript(`
    let calls = 0;
    window.confirm = () => { calls++; return calls === 1; };
    window.__cc = () => calls;
  `);
  await driver.findElement(By.xpath(`//div[@data-testid='row-actions-${bb.id}']//button[contains(., 'Confirm')]`)).click();
  await driver.sleep(1200);
  const afterBprime2 = (await listBookings()).find((x) => x.id === bb.id);
  ok(afterBprime2?.status === 'pending', `B'3: status still pending after second-confirm cancelled`);
  ok(await driver.executeScript('return window.__cc();') === 2, `B'4: exactly 2 confirm() calls when second cancelled`);

  // Cleanup the test row + re-stub confirm to accept
  await api('DELETE', `/api/admin/bookings/${bb.id}`);
  await driver.executeScript('window.confirm = () => true;');

  // ── D. FREE STATUS TRANSITIONS via <select> ─────────────────────────────────
  log('\n=== D. Inline status select (any → any) ===');
  // confirmed → declined (via UI select)
  const selectB = await driver.findElement(By.css(`[data-testid='status-select-${b.id}']`));
  await selectB.sendKeys('Declined');
  await driver.sleep(1200);
  const afterD1 = await listBookings();
  ok(afterD1.find((x) => x.id === b.id)?.status === 'declined', 'D1: confirmed → declined via select');

  // declined → pending (reverse direction — impossible via legacy buttons)
  const selectB2 = await driver.findElement(By.css(`[data-testid='status-select-${b.id}']`));
  await selectB2.sendKeys('Pending');
  await driver.sleep(1200);
  const afterD2 = await listBookings();
  ok(afterD2.find((x) => x.id === b.id)?.status === 'pending', 'D2: declined → pending via select (reverse)');

  // pending → confirmed via select
  const selectB3 = await driver.findElement(By.css(`[data-testid='status-select-${b.id}']`));
  await selectB3.sendKeys('Confirmed');
  await driver.sleep(1200);
  const afterD3 = await listBookings();
  ok(afterD3.find((x) => x.id === b.id)?.status === 'confirmed', 'D3: pending → confirmed via select');

  // ── E. EDIT via the ✎ panel ────────────────────────────────────────────────
  log('\n=== E. Edit booking (✎) — change fields and save ===');
  const e = await seedBooking({ status: 'pending', name: 'BeforeEdit' });
  await driver.findElement(By.xpath(`//button[normalize-space()='Refresh']`)).click();
  await driver.sleep(800);

  const editBtn = await driver.findElement(By.css(`[data-testid='edit-btn-${e.id}']`));
  await editBtn.click();
  await driver.wait(until.elementLocated(By.css(`[data-testid='booking-edit-panel']`)), 5000);
  await shot('E-edit-panel-open');

  // React controlled inputs ignore plain .clear()+.sendKeys() because the
  // synthetic onChange handler is wired to the native setter. The canonical
  // fix is to call the prototype value setter directly and dispatch a
  // bubbling 'input' event, which is what React listens for.
  async function setByLabel(panelTestId, labelText, value) {
    const labelEl = await driver.findElement(
      By.xpath(`//div[@data-testid='${panelTestId}']//label[starts-with(normalize-space(), '${labelText}')]`)
    );
    const inputEl = await labelEl.findElement(By.css('input, select, textarea'));
    const tag = (await inputEl.getTagName()).toLowerCase();
    await driver.executeScript(
      `
      const el = arguments[0], value = arguments[1], tag = arguments[2];
      const proto = tag === 'select'
        ? window.HTMLSelectElement.prototype
        : (tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      `,
      inputEl, value, tag,
    );
  }

  await setByLabel('booking-edit-panel', 'Name', 'AfterEdit');
  await setByLabel('booking-edit-panel', 'Email', 'afteredit@example.invalid');
  await setByLabel('booking-edit-panel', 'Check-in', '2099-06-10');
  await setByLabel('booking-edit-panel', 'Check-out', '2099-06-20');
  await setByLabel('booking-edit-panel', 'Status', 'confirmed');

  await driver.findElement(By.css(`[data-testid='edit-save']`)).click();
  await driver.sleep(1500);

  const afterE = await listBookings();
  const rowE = afterE.find((x) => x.id === e.id);
  ok(rowE?.name === 'AfterEdit',                  `E1: name persisted (${rowE?.name})`);
  ok(rowE?.email === 'afteredit@example.invalid', `E2: email persisted (${rowE?.email})`);
  ok(rowE?.checkIn === '2099-06-10',              `E3: checkIn persisted (${rowE?.checkIn})`);
  ok(rowE?.checkOut === '2099-06-20',             `E4: checkOut persisted (${rowE?.checkOut})`);
  ok(rowE?.status === 'confirmed',                `E5: status changed to confirmed (${rowE?.status})`);

  // E6: undo-edit toast appears after save
  const editToasts = await driver.findElements(By.css(`[data-testid='undo-edit-toast-${e.id}']`));
  ok(editToasts.length === 1, `E6: undo-edit toast visible after save (count=${editToasts.length})`);

  // E7: click Undo → row reverts to pre-edit snapshot (name was 'BeforeEdit')
  await driver.findElement(By.css(`[data-testid='undo-edit-btn-${e.id}']`)).click();
  await driver.sleep(1800);
  const afterUndoE = (await listBookings()).find((x) => x.id === e.id);
  ok(afterUndoE?.name === 'BeforeEdit', `E7: name reverted to pre-edit value (${afterUndoE?.name})`);
  ok(afterUndoE?.status === 'pending',  `E8: status reverted to pre-edit value (${afterUndoE?.status})`);
  const toastsAfterUndo = await driver.findElements(By.css(`[data-testid='undo-edit-toast-${e.id}']`));
  ok(toastsAfterUndo.length === 0, `E9: toast dismissed after undo`);
  await shot('E-after-undo-edit');

  // E10: a second edit + WAIT past the 10s grace → toast disappears, change stays
  log('  E10: re-edit then wait past grace window');
  await driver.findElement(By.css(`[data-testid='edit-btn-${e.id}']`)).click();
  await driver.wait(until.elementLocated(By.css(`[data-testid='booking-edit-panel']`)), 5000);
  await setByLabel('booking-edit-panel', 'Name', 'EditedAndKept');
  await driver.findElement(By.css(`[data-testid='edit-save']`)).click();
  await driver.sleep(1500);
  // toast should appear briefly
  const editToasts2 = await driver.findElements(By.css(`[data-testid='undo-edit-toast-${e.id}']`));
  ok(editToasts2.length === 1, `E10a: toast appeared again`);
  // wait out the grace window
  await driver.sleep(11_000);
  const finalE = (await listBookings()).find((x) => x.id === e.id);
  ok(finalE?.name === 'EditedAndKept', `E10b: edit persisted after grace expired (${finalE?.name})`);
  const toastsExpired = await driver.findElements(By.css(`[data-testid='undo-edit-toast-${e.id}']`));
  ok(toastsExpired.length === 0, `E10c: toast disappeared after grace`);
  await shot('E-after-edit');

  // ── F. ADD a manual booking via the "+ Add booking" panel ─────────────────
  log('\n=== F. Add a manual booking via the form ===');
  const addBtn = await driver.findElement(By.xpath(`//button[contains(., 'Add booking')]`));
  await addBtn.click();
  await driver.wait(until.elementLocated(By.css(`[data-testid='booking-add-panel']`)), 5000);

  await setByLabel('booking-add-panel', 'Name', 'Manual Phone Reservation');
  await setByLabel('booking-add-panel', 'Email', 'manual@example.invalid');
  await setByLabel('booking-add-panel', 'Phone', '+385 91 555 9999');
  await setByLabel('booking-add-panel', 'Check-in', '2099-09-01');
  await setByLabel('booking-add-panel', 'Check-out', '2099-09-10');
  await setByLabel('booking-add-panel', 'Status', 'confirmed');

  const beforeAddLen = (await listBookings()).length;
  await driver.findElement(By.css(`[data-testid='booking-add-panel'] [data-testid='edit-save']`)).click();
  await driver.sleep(1500);
  const afterAdd = await listBookings();
  ok(afterAdd.length === beforeAddLen + 1, `F1: bookings grew by 1 (${beforeAddLen} → ${afterAdd.length})`);
  const manualRow = afterAdd.find((x) => x.name === 'Manual Phone Reservation');
  ok(manualRow?.status === 'confirmed', `F2: manual booking saved with status=confirmed`);
  ok(manualRow?.checkIn === '2099-09-01' && manualRow?.checkOut === '2099-09-10', 'F3: dates persisted');
  await shot('F-after-add');

  // ── G. DELETE with two confirms + grace window + undo ────────────────────
  log('\n=== G. Delete via 🗑 (2 confirms, 10s undo window) ===');
  // Auto-accept BOTH confirm() dialogs (delete-undo flow requires two)
  await driver.executeScript(`window.confirm = () => true;`);

  const deleteRowId = manualRow.id;
  await driver.findElement(By.css(`[data-testid='delete-btn-${deleteRowId}']`)).click();
  await driver.sleep(800);

  // Toast appears, row hidden from UI but STILL in data until grace expires
  const toast = await driver.findElements(By.css(`[data-testid='undo-toast-${deleteRowId}']`));
  ok(toast.length === 1, `G1: undo toast visible after delete click`);
  const hiddenFromUi = await driver.findElements(By.xpath(`//h3[text()='Manual Phone Reservation']`));
  ok(hiddenFromUi.length === 0, `G2: row hidden from admin UI during grace window`);
  const duringGrace = await listBookings();
  ok(duringGrace.some((x) => x.id === deleteRowId), `G3: row still in KV/file during grace window (UI is optimistic)`);

  // Wait for the 10s grace window + buffer, then verify hard delete fired
  await driver.sleep(11_000);
  const afterDelete = await listBookings();
  ok(!afterDelete.some((x) => x.id === deleteRowId), `G4: row gone from data after grace window expired`);
  const toastGone = await driver.findElements(By.css(`[data-testid='undo-toast-${deleteRowId}']`));
  ok(toastGone.length === 0, `G5: toast dismissed after grace window`);

  // ── H. Server-error surfacing ─────────────────────────────────────────────
  log('\n=== H. Edit-panel surfaces server errors ===');
  const h = await seedBooking({ status: 'pending', name: 'ErrorSurface Test' });
  await driver.findElement(By.xpath(`//button[normalize-space()='Refresh']`)).click();
  await driver.sleep(800);
  const hEdit = await driver.findElement(By.css(`[data-testid='edit-btn-${h.id}']`));
  await hEdit.click();
  await driver.wait(until.elementLocated(By.css(`[data-testid='booking-edit-panel']`)), 5000);

  // Make checkOut <= checkIn → server returns 400
  await setByLabel('booking-edit-panel', 'Check-in', '2099-12-15');
  await setByLabel('booking-edit-panel', 'Check-out', '2099-12-10');
  await driver.findElement(By.css(`[data-testid='edit-save']`)).click();
  await driver.sleep(1500);
  const errorEl = await driver.findElements(By.css(`[data-testid='edit-error']`));
  ok(errorEl.length > 0, 'H1: error element appears in panel');
  if (errorEl.length > 0) {
    const text = await errorEl[0].getText();
    ok(/check/i.test(text), `H2: error text mentions checkout (${text})`);
  }
  await shot('H-error-shown');
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await driver.quit();
  restore();
  const finalRows = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
  ok(finalRows.length === initialBookings.length, `restore: bookings ${finalRows.length} === ${initialBookings.length}`);
}

log('');
log(failures === 0 ? 'PASS — Selenium full admin sweep green ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
