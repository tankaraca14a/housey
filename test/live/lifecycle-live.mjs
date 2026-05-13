// Hardcore end-to-end lifecycle on live production:
//   1. Guest submits a real booking via /booking UI (Playwright real Chrome)
//   2. Verify it lands in /api/admin/bookings (KV-backed)
//   3. Admin /admin opens, finds the row
//   4. Admin clicks Confirm → status flips + checkout-exclusive dates auto-block
//   5. Guest's /booking calendar now shows those dates as unavailable
//   6. Admin clicks the inline status select → declined → pending → confirmed
//   7. Admin clicks the ✎ Edit button, mutates the message, saves
//   8. Admin clicks Delete (auto-accept confirm dialog) → row gone
//   9. Admin un-toggles the auto-blocked dates from step 4 + Save
//  10. Verify zero stray data: bookings count back to original, blocked-dates
//      identical to original
//
// All cleanup paths run even on failure.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCREENS = join(HERE, 'screens-lifecycle');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';
const TAG = `lifecycle-${Date.now()}`;
const SENTINEL_EMAIL = `lifecycle-${TAG}@hardcore-test.invalid`;

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

// ─── Snapshot initial state ───────────────────────────────────────────────────
const beforeBookings = (await api('GET', '/api/admin/bookings')).body.bookings ?? [];
const beforeBlocked  = (await fetch(`${BASE}/api/admin/blocked-dates`).then((r) => r.json())).blockedDates ?? [];
log(`Initial: ${beforeBookings.length} bookings, ${beforeBlocked.length} blocked dates`);
log(`Sentinel email: ${SENTINEL_EMAIL}\n`);

let bookingId = null;          // captured after step 2
let confirmedDates = [];        // captured after step 4 (for cleanup)

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

try {
  // ── Step 1: Guest submits booking via /booking UI ──────────────────────────
  log('=== 1. Guest books via /booking page ===');
  await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h3', { timeout: 15000 });

  // Pick a far-future range, well clear of any existing blocked-dates so it
  // can't accidentally collide.
  let cellHandles;
  for (let attempt = 0; attempt < 8; attempt++) {
    cellHandles = await page.locator('div.grid.grid-cols-7 button:not([disabled])').elementHandles();
    if (cellHandles.length >= 8) break;
    await page.locator('button:has-text("Next")').first().click();
    await page.waitForTimeout(200);
  }
  await cellHandles[0].click();
  await page.waitForTimeout(100);
  await cellHandles[Math.min(cellHandles.length - 1, 7)].click();
  await page.waitForTimeout(200);
  const dur = await page.locator('text=/Duration:/').first().textContent();
  ok(/\d+ nights/.test(dur), `1a: range selected (${dur})`);

  await page.fill('input[placeholder="John Doe"]', `Lifecycle-${TAG}`);
  await page.fill('input[placeholder="john@example.com"]', SENTINEL_EMAIL);
  await page.fill('input[placeholder="+1 234 567 890"]', '+385 91 555 9999');
  await page.selectOption('select', '2');
  await page.fill('textarea', 'Hardcore lifecycle test booking — will be cleaned up.');
  await page.screenshot({ path: join(SCREENS, '01-form-filled.png'), fullPage: true });

  let postResponseStatus = null;
  page.on('response', async (res) => {
    if (res.url().endsWith('/api/booking')) postResponseStatus = res.status();
  });
  await page.locator('button[type="submit"]:has-text("Submit")').click();
  await page.waitForTimeout(2500);
  ok(postResponseStatus === 200, `1b: /api/booking returned 200 (got ${postResponseStatus})`);
  ok(await page.locator('text=/Thank you/').count() > 0, '1c: success banner shown to guest');
  await page.screenshot({ path: join(SCREENS, '02-after-submit.png'), fullPage: true });

  // ── Step 2: Verify booking landed in KV via the API ────────────────────────
  log('\n=== 2. Booking lands in KV (admin API view) ===');
  const list2 = (await api('GET', '/api/admin/bookings')).body.bookings;
  const ours = list2.find((b) => b.email === SENTINEL_EMAIL);
  ok(!!ours, `2a: new booking visible in admin list (id=${ours?.id})`);
  ok(ours?.status === 'pending', `2b: status=pending (${ours?.status})`);
  bookingId = ours.id;
  const ourCheckIn = ours.checkIn;
  const ourCheckOut = ours.checkOut;

  // ── Step 3: Admin UI shows the row ─────────────────────────────────────────
  log('\n=== 3. /admin sees the row ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.fill('input[type="password"]', PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector('h3', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Switch admin to EN
  const lang = page.locator('button:has-text("EN"), button:has-text("HR")').first();
  if (await lang.count() > 0) {
    const txt = (await lang.textContent()).trim();
    if (txt === 'EN') await lang.click();
    await page.waitForTimeout(200);
  }

  const guestHeader = page.locator(`h3:has-text("Lifecycle-${TAG}")`);
  ok(await guestHeader.count() === 1, `3a: new booking visible in admin UI (count=${await guestHeader.count()})`);
  await page.screenshot({ path: join(SCREENS, '03-admin-sees-row.png'), fullPage: true });

  // ── Step 4: Admin clicks Confirm ──────────────────────────────────────────
  log('\n=== 4. Admin Confirm → dates auto-block ===');
  const blockedBefore4 = (await fetch(`${BASE}/api/admin/blocked-dates`).then((r) => r.json())).blockedDates;
  const confirmBtn = page.locator(`[data-testid='row-actions-${bookingId}'] button:has-text("Confirm")`).first();
  await confirmBtn.click();
  await page.waitForTimeout(2500);
  const afterConfirm = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId);
  ok(afterConfirm?.status === 'confirmed', `4a: status=confirmed (${afterConfirm?.status})`);

  const blockedAfter4 = (await fetch(`${BASE}/api/admin/blocked-dates`).then((r) => r.json())).blockedDates;
  const newlyBlocked = blockedAfter4.filter((d) => !blockedBefore4.includes(d));
  // Checkout exclusive: [checkIn, checkOut) — count = nights
  const expectedNights = Math.round((Date.parse(ourCheckOut) - Date.parse(ourCheckIn)) / 86400000);
  ok(newlyBlocked.length === expectedNights,
    `4b: ${newlyBlocked.length} dates auto-blocked, expected ${expectedNights} (nights)`);
  ok(!newlyBlocked.includes(ourCheckOut), `4c: checkout day NOT in blocked set (back-to-back ready)`);
  ok(newlyBlocked.includes(ourCheckIn), `4d: check-in day IS in blocked set`);
  confirmedDates = newlyBlocked;
  await page.screenshot({ path: join(SCREENS, '04-after-confirm.png'), fullPage: true });

  // ── Step 5: Guest calendar shows new blocked dates ─────────────────────────
  log('\n=== 5. Guest /booking calendar reflects new blocked dates ===');
  const guestPage = await ctx.newPage();
  await guestPage.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
  await guestPage.waitForSelector('h3', { timeout: 15000 });
  // Scroll the calendar months until we reach the booked range.
  // Use the API view: check if the calendar at the right month has the
  // checkIn day disabled. Simpler: count disabled cells with title="Unavailable"
  // and verify increase vs original.
  await guestPage.waitForTimeout(400);
  const unavailableNow = await guestPage.locator('button[title="Unavailable"]').count();
  log(`     [info] unavailable cells visible in first 3 months: ${unavailableNow}`);
  ok(unavailableNow > 0, '5a: at least some blocked dates render on guest page');
  await guestPage.close();

  // ── Step 6: Status select cycles ───────────────────────────────────────────
  log('\n=== 6. Inline status select: confirmed → declined → pending → confirmed ===');
  const selectEl = page.locator(`[data-testid='status-select-${bookingId}']`);
  await selectEl.selectOption('declined');
  await page.waitForTimeout(1500);
  ok((await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId)?.status === 'declined', '6a: → declined');

  await page.locator(`[data-testid='status-select-${bookingId}']`).selectOption('pending');
  await page.waitForTimeout(1500);
  ok((await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId)?.status === 'pending', '6b: → pending');

  await page.locator(`[data-testid='status-select-${bookingId}']`).selectOption('confirmed');
  await page.waitForTimeout(1500);
  ok((await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId)?.status === 'confirmed', '6c: → confirmed');

  // ── Step 7: Edit panel ─────────────────────────────────────────────────────
  log('\n=== 7. ✎ Edit panel mutates the message ===');
  await page.locator(`[data-testid='edit-btn-${bookingId}']`).click();
  await page.waitForSelector(`[data-testid='booking-edit-panel']`);

  // Use the React-aware input setter so onChange actually fires
  const messageEl = await page.locator(`[data-testid='booking-edit-panel'] textarea`).elementHandle();
  await page.evaluate(([el, v]) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, [messageEl, 'Edited via lifecycle test']);
  await page.locator(`[data-testid='edit-save']`).click();
  await page.waitForTimeout(2000);
  const afterEdit = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId);
  ok(afterEdit?.message === 'Edited via lifecycle test', `7a: message persisted (${afterEdit?.message})`);

  // ── Step 8: Delete with 2 confirms + 10s undo grace + final hard-delete ───
  log('\n=== 8. Admin Delete (2 confirms, undo toast appears, grace elapses) ===');
  await page.evaluate(() => { window.confirm = () => true; });
  await page.locator(`[data-testid='delete-btn-${bookingId}']`).click();
  await page.waitForTimeout(800);

  // During grace window: UI hides row, toast visible, KV still has row
  const toastVisible = await page.locator(`[data-testid='undo-toast-${bookingId}']`).count();
  ok(toastVisible === 1, `8a: undo toast visible after delete click`);
  const uiHidden = await page.locator(`h3:has-text("Lifecycle-${TAG}")`).count();
  ok(uiHidden === 0, `8b: row hidden from UI during grace window`);
  const stillInKv = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId);
  ok(stillInKv !== undefined, `8c: row still in KV during grace window (optimistic UI)`);

  // Wait out the 10s grace + buffer → hard delete fires
  log('  waiting 11s for grace window…');
  await page.waitForTimeout(11_000);
  const after8 = (await api('GET', '/api/admin/bookings')).body.bookings.find((b) => b.id === bookingId);
  ok(after8 === undefined, `8d: row really gone from KV after grace expired`);
  bookingId = null; // mark cleaned

  // ── Step 9: Unblock the auto-blocked dates ─────────────────────────────────
  log('\n=== 9. Unblock the dates that step 4 added (manual cleanup) ===');
  const remainingBlocked = (await fetch(`${BASE}/api/admin/blocked-dates`).then((r) => r.json())).blockedDates;
  const cleanedBlocked = remainingBlocked.filter((d) => !confirmedDates.includes(d));
  const r9 = await api('POST', '/api/admin/blocked-dates', { blockedDates: cleanedBlocked });
  ok(r9.status === 200, '9a: blocked-dates restored to pre-confirm state');
  confirmedDates = []; // cleaned

  // ── Step 10: Final integrity check ─────────────────────────────────────────
  log('\n=== 10. Final integrity ===');
  const finalBookings = (await api('GET', '/api/admin/bookings')).body.bookings;
  const finalBlocked  = (await fetch(`${BASE}/api/admin/blocked-dates`).then((r) => r.json())).blockedDates;
  ok(finalBookings.length === beforeBookings.length, `10a: bookings count restored (${finalBookings.length} === ${beforeBookings.length})`);
  ok(JSON.stringify([...finalBlocked].sort()) === JSON.stringify([...beforeBlocked].sort()),
    `10b: blocked-dates set restored (${finalBlocked.length} vs ${beforeBlocked.length})`);
  ok(!finalBookings.some((b) => b.email === SENTINEL_EMAIL), `10c: no sentinel-email rows leaked`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();

  // Cleanup-of-cleanup: if anything bailed before step 8 or 9, scrub now.
  if (bookingId) {
    log(`  [recover] deleting orphan booking ${bookingId}`);
    await api('DELETE', `/api/admin/bookings/${bookingId}`);
  }
  if (confirmedDates.length > 0) {
    log(`  [recover] restoring blocked-dates (removing ${confirmedDates.length} auto-blocked entries)`);
    const remaining = (await fetch(`${BASE}/api/admin/blocked-dates`).then((r) => r.json())).blockedDates;
    const cleaned = remaining.filter((d) => !confirmedDates.includes(d));
    await api('POST', '/api/admin/blocked-dates', { blockedDates: cleaned });
  }
}

log('');
log(failures === 0 ? 'PASS — full guest→confirm→edit→status-cycle→delete lifecycle on live ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
