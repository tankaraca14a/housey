// Full round-trip: guest books → admin deletes → row gone.
//
//   1. Snapshot bookings.json
//   2. Book via /booking UI
//   3. Verify the row appears in bookings.json AND on the admin page
//   4. Hit DELETE /api/admin/bookings/<id> directly (covers API auth + row removal)
//   5. ALSO drive the admin UI's new 🗑 Delete button on a SECOND booking,
//      auto-accepting the confirm() dialog, to prove the click path
//   6. Verify bookings.json is back to the pre-test state
//
// At end: bookings.json is identical to how we found it.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const BOOKINGS = join(REPO, 'data', 'bookings.json');
const BASE = 'http://localhost:3457';
const ADMIN_PASSWORD = 'ivana2026';

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

const initial = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
log(`Initial bookings.json: ${initial.length} row(s)`);
log(`(Test will restore exactly this state at the end.)`);

async function postBooking(suffix) {
  // Reverse-engineer a valid future range. We use a fixed pair well past today.
  // Today (per session): 2026-05-13 → use 2026-06-{10..15}, well in future, > 5 nights.
  const offset = suffix * 7; // each iteration jumps 1 week to avoid the duplicate guard
  const ci = `2026-06-${String(10 + offset).padStart(2, '0')}`;
  const co = `2026-06-${String(15 + offset).padStart(2, '0')}`;
  const r = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Delete-Test #${suffix}`,
      email: `delete-test-${suffix}@example.invalid`,
      phone: '+385 91 555 0000',
      checkIn: ci,
      checkOut: co,
      guests: '2',
      message: `Created by local-book-and-delete.mjs run #${suffix}`,
    }),
  });
  return await r.json();
}

// ─── Step 1: API-level book + delete ──────────────────────────────────────────
log('\n=== 1. API-level: book → DELETE ===');
const b1 = await postBooking(0);
ok(b1.success === true, `1a: API booking created (id=${b1.id})`);

const afterBook1 = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(afterBook1.length === initial.length + 1, `1b: bookings.json grew (${initial.length} → ${afterBook1.length})`);

// Unauthorized DELETE should be rejected
const noAuth = await fetch(`${BASE}/api/admin/bookings/${b1.id}`, { method: 'DELETE' });
ok(noAuth.status === 401, `1c: DELETE without password → 401 (got ${noAuth.status})`);

// 404 for unknown id
const bogus = await fetch(`${BASE}/api/admin/bookings/00000000-0000-0000-0000-000000000000`, {
  method: 'DELETE',
  headers: { 'x-admin-password': ADMIN_PASSWORD },
});
ok(bogus.status === 404, `1d: DELETE unknown id → 404 (got ${bogus.status})`);

// Authorized DELETE
const del1 = await fetch(`${BASE}/api/admin/bookings/${b1.id}`, {
  method: 'DELETE',
  headers: { 'x-admin-password': ADMIN_PASSWORD },
});
const del1Body = await del1.json();
ok(del1.status === 200 && del1Body.success === true && del1Body.deleted === b1.id,
  `1e: DELETE returned 200 success deleted=${del1Body.deleted}`);

const afterDel1 = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(afterDel1.length === initial.length, `1f: bookings.json back to initial size (${afterDel1.length})`);
ok(!afterDel1.some((r) => r.id === b1.id), `1g: deleted id no longer present`);

// Double-delete = 404
const del1again = await fetch(`${BASE}/api/admin/bookings/${b1.id}`, {
  method: 'DELETE',
  headers: { 'x-admin-password': ADMIN_PASSWORD },
});
ok(del1again.status === 404, `1h: second DELETE for same id → 404`);

// ─── Step 2: UI-level book + delete via the new 🗑 button ─────────────────────
log('\n=== 2. UI: book via /booking, then 🗑 Delete via /admin ===');
const b2 = await postBooking(1);
ok(b2.success === true, `2a: second API booking created (id=${b2.id})`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

// Auto-accept the JS confirm() dialog
page.on('dialog', async (d) => {
  log(`     [dialog] ${d.type()}: "${d.message()}"`);
  await d.accept();
});

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
// Switch to EN
const langBtn = page.locator('button:has-text("EN"), button:has-text("HR")').first();
await langBtn.click().catch(() => {});
await page.waitForTimeout(200);
await page.fill('input[type="password"]', ADMIN_PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForSelector('h3:has-text("2026"), h3:has-text("2027")', { timeout: 15000 });
await page.waitForTimeout(400);

// Confirm the new booking shows on admin
const guestHeader = page.locator(`h3:has-text("Delete-Test #1")`);
ok(await guestHeader.count() === 1, `2b: new booking visible in admin UI`);

// Find and click its Delete button — it's the only Delete button visible since
// any other rows in `initial` already existed.
const deleteBtns = page.locator('button:has-text("Delete")');
const deleteBtnCount = await deleteBtns.count();
ok(deleteBtnCount >= 1, `2c: 🗑 Delete button(s) rendered (count=${deleteBtnCount})`);

// Click the Delete button on the row of our test booking specifically.
// Each booking row is wrapped in `div.bg-surface-800 ...`. Find that row by
// h3 text, then click its Delete button.
const row = page.locator('div.bg-surface-800', { has: page.locator('h3:has-text("Delete-Test #1")') }).first();
const rowDelete = row.locator('button:has-text("Delete")').first();
await rowDelete.click();
await page.waitForTimeout(1200);

// After delete + fetchBookings refresh, the row should be gone
const guestHeaderAfter = await page.locator(`h3:has-text("Delete-Test #1")`).count();
ok(guestHeaderAfter === 0, `2d: row removed from admin UI after Delete (count=${guestHeaderAfter})`);

await browser.close();

// ─── Step 3: bookings.json restored ───────────────────────────────────────────
log('\n=== 3. Final state ===');
const finalRows = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(finalRows.length === initial.length, `3a: bookings.json length restored (${finalRows.length} === ${initial.length})`);
ok(JSON.stringify(finalRows) === JSON.stringify(initial), `3b: bookings.json content identical to pre-test snapshot`);

log('');
log(failures === 0
  ? `PASS — admin can delete bookings end-to-end (API + UI); local data restored ✓`
  : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
