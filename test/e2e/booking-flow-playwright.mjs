// E2E: can a guest actually make a reservation?
// Drives /booking with Playwright, captures the network response,
// and inspects data/bookings.json for persistence.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE)); // test/<layer>/ → repo root
const SCREENS = join(HERE, 'screens');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'http://localhost:3457';
let failures = 0;
const log = (...a) => console.log(...a);
function ok(cond, msg) { if (cond) log(`  ✓ ${msg}`); else { log(`  ✗ ${msg}`); failures++; } }

function readBookings() {
  try { return JSON.parse(readFileSync(join(REPO, 'data', 'bookings.json'), 'utf-8')); } catch { return []; }
}

// ─── Pre: snapshot bookings.json ──────────────────────────────────────────────
const before = readBookings();
log(`Pre-test bookings.json has ${before.length} entries`);

let browser = null;
try {

// ─── 1. Direct API test ───────────────────────────────────────────────────────
log('\n=== 1. Direct POST /api/booking ===');

const apiRes = await fetch(`${BASE}/api/booking`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'API Test Guest',
    email: 'apitest@example.invalid',
    phone: '+385 91 555 0001',
    checkIn: '2026-06-10',
    checkOut: '2026-06-15',
    guests: '2',
    message: 'Testing API path',
  }),
});
const apiBody = await apiRes.json().catch(() => ({}));
log(`  status: ${apiRes.status}`);
log(`  body:   ${JSON.stringify(apiBody)}`);

const afterApi = readBookings();
log(`  bookings.json after API call: ${afterApi.length} entries (delta ${afterApi.length - before.length})`);

if (apiRes.status === 200) {
  ok(afterApi.length === before.length + 1, '1a: booking persisted to bookings.json');
  const last = afterApi[afterApi.length - 1];
  ok(last && last.name === 'API Test Guest', '1b: persisted booking has correct name');
  ok(last && last.checkIn === '2026-06-10' && last.checkOut === '2026-06-15', '1c: checkIn/checkOut correct');
  ok(last && last.status === 'pending', '1d: status is pending');
  // Clean up so we don't pollute the data file
  writeFileSync(join(REPO, 'data', 'bookings.json'), JSON.stringify(before, null, 2));
  log('  (rolled back bookings.json to pre-test state)');
} else {
  log('  ⚠ API booking did NOT succeed. Likely RESEND_API_KEY missing.');
  log('  ⚠ Current /api/booking route gates persistence on email success → no row written.');
  ok(false, '1: end-to-end POST /api/booking returns 200');
}

// ─── 2. UI test: drive the guest form with Playwright ─────────────────────────
log('\n=== 2. UI test: /booking form submission ===');

browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

// Capture the booking POST request and response
const apiCalls = [];
page.on('response', async (res) => {
  if (res.url().endsWith('/api/booking')) {
    let json = null;
    try { json = await res.json(); } catch {}
    apiCalls.push({ status: res.status(), body: json });
  }
});

await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1:has-text("Book Your Stay")');
await page.screenshot({ path: join(SCREENS, 'C-01-form-empty.png'), fullPage: true });

// Pick check-in + check-out via the calendar
const dayCells = page.locator('div.grid.grid-cols-7 button:not([disabled])');
const handles = await dayCells.elementHandles();
ok(handles.length > 5, `2a: enough enabled cells (${handles.length})`);
await handles[0].click();
await page.waitForTimeout(100);
await handles[Math.min(handles.length - 1, 7)].click();
await page.waitForTimeout(200);

const dur = await page.locator('text=/Duration:/').first().textContent().catch(() => null);
log(`     [info] duration line: ${dur}`);
ok(dur && /\d+ nights/.test(dur), '2b: date range successfully selected');

// Fill form fields
await page.fill('input[placeholder="John Doe"]', 'UI Test Guest');
await page.fill('input[placeholder="john@example.com"]', 'uitest@example.invalid');
await page.fill('input[placeholder="+1 234 567 890"]', '+385 91 555 0002');
await page.selectOption('main select', '2');
await page.fill('textarea', 'Submitted by Playwright e2e suite — please disregard.');
await page.screenshot({ path: join(SCREENS, 'C-02-form-filled.png'), fullPage: true });

// Set up dialog handler in case the failure path triggers `alert()`
let alertText = null;
page.on('dialog', async (d) => { alertText = d.message(); await d.dismiss(); });

await page.locator('button[type="submit"]:has-text("Submit")').click();
// Wait for either the success banner or the alert
await page.waitForTimeout(2500);

await page.screenshot({ path: join(SCREENS, 'C-03-after-submit.png'), fullPage: true });

log(`  API calls observed: ${JSON.stringify(apiCalls)}`);
log(`  alert text:         ${alertText}`);

const successBanner = await page.locator('text=/Thank you/').count();
const successPath = successBanner > 0;
ok(apiCalls.length === 1, `2c: exactly one POST /api/booking fired (got ${apiCalls.length})`);

if (apiCalls[0]?.status === 200) {
  ok(successPath, '2d: success banner visible after 200 response');
  const afterUI = readBookings();
  ok(afterUI.length > before.length, `2e: bookings.json grew (${before.length} → ${afterUI.length})`);
} else {
  log(`  ⚠ UI submit returned ${apiCalls[0]?.status} — error path expected when no Resend key.`);
  ok(alertText !== null, '2d-err: client showed an alert on error (acceptable failure handling)');
}

} finally {
  // Always restore the bookings.json snapshot, regardless of pass/fail/throw.
  // Without this, any uncaught error mid-test leaks rows that break the next
  // chained e2e suite via the overlap-conflict guard.
  if (browser) await browser.close().catch(() => {});
  writeFileSync(join(REPO, 'data', 'bookings.json'), JSON.stringify(before, null, 2));
  log('  (rolled back bookings.json)');
}

log('');
log(failures === 0 ? 'PASS — reservations can be made end-to-end' : `PARTIAL — ${failures} assertion(s) failed`);
log(failures === 0 ? '' : '\nNext step: provide RESEND_API_KEY in .env.local, or make the email step best-effort so reservations save even when Resend is unreachable.');
process.exit(failures === 0 ? 0 : 1);
