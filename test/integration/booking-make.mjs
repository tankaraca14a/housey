// Make a real reservation on the local server, end-to-end:
//   1. Open /booking
//   2. Pick check-in + check-out via the calendar
//   3. Fill the form
//   4. Submit
//   5. Verify bookings.json grew by 1 with the expected fields
//   6. Open /admin, log in, verify the new booking appears in the Bookings list as "Pending"
//
// Does NOT clean up — the row stays in bookings.json. To remove:
//   echo '[]' > data/bookings.json   (or hand-edit to drop just the new row)

import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/<layer>/ → repo root
const SCREENS = join(HERE, 'screens-local-book');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'http://localhost:3457';
const BOOKINGS = join(REPO, 'data', 'bookings.json');
let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

const before = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
log(`Before: bookings.json has ${before.length} row(s)`);

const GUEST = {
  name: 'Ivana Local Test Booking',
  email: 'test-local-booking@example.invalid',
  phone: '+385 91 555 4321',
  guests: '2',
  message: 'End-to-end local booking made by the housey test suite. Safe to delete.',
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

// ─── 1. /booking ──────────────────────────────────────────────────────────────
log('\n=== 1. Open /booking ===');
await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1:has-text("Book Your Stay")');
await page.screenshot({ path: join(SCREENS, '01-form-empty.png'), fullPage: true });

// Pick the first enabled day-cell as check-in, then index 7 as check-out
// (which gives us a 5+ night range — the calendar already filters out
// too-close cells, so handles[7] will be at least 5 nights apart).
const dayCells = page.locator('div.grid.grid-cols-7 button:not([disabled])');
const handles = await dayCells.elementHandles();
ok(handles.length >= 8, `1a: enough enabled cells (${handles.length})`);
await handles[0].click();
await page.waitForTimeout(120);
await handles[7].click();
await page.waitForTimeout(200);

const dur = await page.locator('text=/Duration:/').first().textContent().catch(() => null);
ok(dur && /\d+ nights/.test(dur), `1b: range selected → "${dur}"`);
log(`     range: ${dur}`);

// Capture the displayed check-in/check-out from the form strip
const checkInDisplay  = await page.locator('text=/Check-in:/').first().textContent();
const checkOutDisplay = await page.locator('text=/Check-out:/').first().textContent();
log(`     ${checkInDisplay}    ${checkOutDisplay}`);

// ─── 2. Fill + submit ─────────────────────────────────────────────────────────
log('\n=== 2. Fill form + submit ===');
await page.fill('input[placeholder="John Doe"]',         GUEST.name);
await page.fill('input[placeholder="john@example.com"]', GUEST.email);
await page.fill('input[placeholder="+1 234 567 890"]',   GUEST.phone);
await page.selectOption('select',                        GUEST.guests);
await page.fill('textarea',                              GUEST.message);
await page.screenshot({ path: join(SCREENS, '02-form-filled.png'), fullPage: true });

let postResponse = null;
page.on('response', async (res) => {
  if (res.url().endsWith('/api/booking')) {
    postResponse = { status: res.status(), body: await res.json().catch(() => ({})) };
  }
});

await page.locator('button[type="submit"]:has-text("Submit")').click();
await page.waitForTimeout(2500);
await page.screenshot({ path: join(SCREENS, '03-after-submit.png'), fullPage: true });

ok(postResponse !== null,                     '2a: /api/booking POST fired');
ok(postResponse?.status === 200,              `2b: /api/booking returned 200 (got ${postResponse?.status})`);
ok(postResponse?.body?.success === true,      '2c: response.success === true');
ok(typeof postResponse?.body?.id === 'string','2d: response includes booking id');
log(`     server: ${JSON.stringify(postResponse)}`);

const successBanner = await page.locator('text=/Thank you/').count();
ok(successBanner > 0, '2e: success banner visible to the guest');

// ─── 3. Verify persistence ────────────────────────────────────────────────────
log('\n=== 3. Verify bookings.json grew ===');
const after = JSON.parse(readFileSync(BOOKINGS, 'utf-8'));
ok(after.length === before.length + 1, `3a: bookings.json: ${before.length} → ${after.length}`);
const last = after[after.length - 1];
ok(last?.name    === GUEST.name,    `3b: name persisted (${last?.name})`);
ok(last?.email   === GUEST.email,   `3c: email persisted (${last?.email})`);
ok(last?.phone   === GUEST.phone,   `3d: phone persisted (${last?.phone})`);
ok(last?.guests  === GUEST.guests,  `3e: guests persisted (${last?.guests})`);
ok(last?.message === GUEST.message, `3f: message persisted`);
ok(last?.status  === 'pending',     `3g: status === pending`);
ok(typeof last?.id === 'string' && last.id.length > 8, `3h: id is a uuid`);
ok(typeof last?.createdAt === 'string' && !isNaN(Date.parse(last.createdAt)), '3i: createdAt is a valid timestamp');
log(`     stored row:\n${JSON.stringify(last, null, 2).split('\n').map((l) => '       ' + l).join('\n')}`);

// ─── 4. Verify admin sees it ──────────────────────────────────────────────────
log('\n=== 4. /admin sees the new booking ===');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
const lang = page.locator('button:has-text("EN"), button:has-text("HR")').first();
await lang.click().catch(() => {});
await page.waitForTimeout(150);
await page.fill('input[type="password"]', 'ivana2026');
await page.locator('button[type="submit"]').click();
await page.waitForSelector('h3:has-text("2026"), h3:has-text("2027")', { timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: join(SCREENS, '04-admin.png'), fullPage: true });

const totalCount = await page.locator('text=/\\d+ total/').first().textContent();
ok(totalCount && totalCount.includes('total'), `4a: admin shows bookings count: ${totalCount}`);

const guestNameOnAdmin = await page.locator(`h3:has-text("${GUEST.name}")`).count();
ok(guestNameOnAdmin === 1, `4b: new booking's guest name appears in admin (count=${guestNameOnAdmin})`);

const pendingBadge = await page.locator('text=/Pending/').count();
ok(pendingBadge >= 1, `4c: at least one Pending badge visible (count=${pendingBadge})`);

await browser.close();
log('');
log(failures === 0
  ? `PASS — real reservation booked on localhost and verified end-to-end ✓\n\nLeft in bookings.json:\n  id: ${last.id}\n  name: ${last.name}\n  ${last.checkIn} → ${last.checkOut}\n\nTo delete: edit data/bookings.json (or run "echo '[]' > data/bookings.json").`
  : `PARTIAL — ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
