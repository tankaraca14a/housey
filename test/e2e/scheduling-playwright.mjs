// End-to-end UI tests for the scheduling fixes.
// Drives the running server on http://localhost:3457 with Playwright (chromium).
//
// What we test:
//   A. /admin month navigation (the new fix)
//      A1. Login renders
//      A2. After login, Previous/Next nav buttons exist
//      A3. Previous is disabled at offset 0
//      A4. Clicking Next advances the displayed 3 months by 1
//      A5. After Next, Previous becomes enabled
//      A6. Clicking Previous returns to original months
//      A7. Two clicks Next advances by 2 months
//      A8. Croatian/English toggle reflects in month names
//      A9. Calendar still toggles blocked dates correctly
//
//   B. /booking guest calendar (regression)
//      B1. Calendar renders 3 months
//      B2. Previous/Next nav exists and works
//      B3. Blocked May 13 (today, per data file) is disabled
//      B4. Selecting valid check-in + check-out 5 nights later shows range

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCREENS = join(HERE, 'screens');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'http://localhost:3457';
let failures = 0;
const log = (...args) => console.log(...args);

function assert(cond, msg) {
  if (cond) { log(`  ✓ ${msg}`); return; }
  log(`  ✗ ${msg}`);
  failures++;
}

async function shot(page, name) {
  const p = join(SCREENS, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  log(`     → ${p}`);
}

const MONTH_NAMES_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function monthYearAfterOffset(offset) {
  // Real "now" on this machine.
  const now = new Date();
  const months = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset + i, 1);
    months.push(`${MONTH_NAMES_EN[d.getMonth()]} ${d.getFullYear()}`);
  }
  return months;
}

async function getVisibleMonthHeadings(page) {
  return page.$$eval('h3', (els) =>
    els
      .map((el) => el.textContent.trim())
      .filter((t) => /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/.test(t))
  );
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

// ─── A. ADMIN MONTH NAVIGATION ───────────────────────────────────────────────
log('\n=== A. /admin month navigation ===');

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await shot(page, 'A-01-login');

assert(await page.locator('input[type="password"]').count() === 1, 'A1: Login form renders');

// EN is the global default now (LangProvider in app/layout.tsx). Force-set
// it via the LangPicker's localStorage key in case a prior run left a
// different value behind.
await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(200);

await page.fill('input[type="password"]', 'ivana2026');
await page.locator('button[type="submit"]').click();
await page.waitForLoadState('networkidle');
await page.waitForSelector('h1:has-text("Admin")');
await shot(page, 'A-02-after-login');

// Initial state: monthOffset = 0
const initialMonths = await getVisibleMonthHeadings(page);
const expectInitial = monthYearAfterOffset(0);
assert(initialMonths.length === 3, `A2: 3 month headings rendered (got ${initialMonths.length})`);
assert(JSON.stringify(initialMonths) === JSON.stringify(expectInitial),
  `A2: initial months match offset 0 (got ${JSON.stringify(initialMonths)}; want ${JSON.stringify(expectInitial)})`);

// Previous / Next buttons
const prevBtn = page.locator('button:has-text("Previous")').filter({ hasNot: page.locator('h3') });
const nextBtn = page.locator('button:has-text("Next")').filter({ hasNot: page.locator('h3') });
assert(await prevBtn.count() === 1, 'A3a: Previous button exists');
assert(await nextBtn.count() === 1, 'A3b: Next button exists');
assert(await prevBtn.isDisabled(), 'A3c: Previous is disabled at offset 0');
assert(await nextBtn.isEnabled(), 'A3d: Next is enabled at offset 0');

// Click Next → offset 1
await nextBtn.click();
await page.waitForTimeout(150);
const monthsAfterNext = await getVisibleMonthHeadings(page);
const expectAfterNext = monthYearAfterOffset(1);
assert(JSON.stringify(monthsAfterNext) === JSON.stringify(expectAfterNext),
  `A4: after one Next, months are offset+1 (got ${JSON.stringify(monthsAfterNext)})`);
assert(await prevBtn.isEnabled(), 'A5: Previous is now enabled');
await shot(page, 'A-03-after-1-next');

// Click Previous → back to offset 0
await prevBtn.click();
await page.waitForTimeout(150);
const monthsAfterPrev = await getVisibleMonthHeadings(page);
assert(JSON.stringify(monthsAfterPrev) === JSON.stringify(expectInitial),
  `A6: Previous returns to initial months`);
assert(await prevBtn.isDisabled(), 'A6b: Previous re-disabled at offset 0');

// Two Next clicks → offset 2
await nextBtn.click();
await nextBtn.click();
await page.waitForTimeout(150);
const monthsAfter2 = await getVisibleMonthHeadings(page);
const expectAfter2 = monthYearAfterOffset(2);
assert(JSON.stringify(monthsAfter2) === JSON.stringify(expectAfter2),
  `A7: two Next clicks → offset 2 (got ${JSON.stringify(monthsAfter2)}; want ${JSON.stringify(expectAfter2)})`);
await shot(page, 'A-04-after-2-next');

// Far-forward to confirm no cap: 12 Nexts
for (let i = 0; i < 12; i++) await nextBtn.click();
await page.waitForTimeout(200);
const monthsFar = await getVisibleMonthHeadings(page);
const expectFar = monthYearAfterOffset(14);
assert(JSON.stringify(monthsFar) === JSON.stringify(expectFar),
  `A7b: 14 cumulative Nexts → offset 14 (got ${JSON.stringify(monthsFar)})`);
await shot(page, 'A-05-far-future');

// Go back to offset 0 for next checks
for (let i = 0; i < 14; i++) await prevBtn.click();
await page.waitForTimeout(150);
const monthsBackToZero = await getVisibleMonthHeadings(page);
assert(JSON.stringify(monthsBackToZero) === JSON.stringify(expectInitial),
  `A7c: 14 Prevs back to initial`);

// Toggle language → buttons should localize
const langBtn2 = page.locator('button:has-text("HR")').first();
if (await langBtn2.count()) {
  await langBtn2.click();
  await page.waitForTimeout(150);
  const prevHR = page.locator('button:has-text("Prethodni")');
  const nextHR = page.locator('button:has-text("Sljedeći")');
  assert(await prevHR.count() === 1, 'A8a: Previous localizes to Prethodni in HR');
  assert(await nextHR.count() === 1, 'A8b: Next localizes to Sljedeći in HR');
  await shot(page, 'A-06-hr-mode');
  // Back to EN for screenshot consistency
  await page.locator('button:has-text("EN")').first().click();
  await page.waitForTimeout(150);
}

// Admin renders blocked cells with `bg-red-500/80`. Count any visible red day-cell.
const blockedAdminCount = await page.locator('div.grid.grid-cols-7 button[class*="bg-red"]').count();
log(`     [info] red (blocked) cells visible in admin at offset 0: ${blockedAdminCount}`);
assert(blockedAdminCount > 0, 'A9: blocked dates render as red cells in admin');

// Confirm toggling a blocked date un-marks it (state-only, doesn't save).
const firstBlocked = page.locator('div.grid.grid-cols-7 button[class*="bg-red"]').first();
await firstBlocked.click();
await page.waitForTimeout(120);
const blockedAfterToggle = await page.locator('div.grid.grid-cols-7 button[class*="bg-red"]').count();
assert(blockedAfterToggle === blockedAdminCount - 1, `A9b: clicking a red cell un-marks it (was ${blockedAdminCount}, now ${blockedAfterToggle})`);
// Toggle it back so we don't mutate the in-memory state for subsequent assertions.
await firstBlocked.click();
await page.waitForTimeout(120);

// ─── B. BOOKING GUEST CALENDAR REGRESSION ────────────────────────────────────
log('\n=== B. /booking guest calendar ===');

await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1:has-text("Book Your Stay")');
await shot(page, 'B-01-initial');

const guestMonths = await getVisibleMonthHeadings(page);
assert(guestMonths.length === 3, `B1: 3 month headings on /booking (got ${guestMonths.length})`);

const guestPrev = page.locator('button:has-text("Previous")');
const guestNext = page.locator('button:has-text("Next")');
assert(await guestPrev.count() === 1, 'B2a: guest Previous exists');
assert(await guestNext.count() === 1, 'B2b: guest Next exists');
assert(await guestPrev.isDisabled(), 'B2c: guest Previous disabled at offset 0');

await guestNext.click();
await page.waitForTimeout(150);
const guestMonthsAfter = await getVisibleMonthHeadings(page);
assert(JSON.stringify(guestMonthsAfter) === JSON.stringify(monthYearAfterOffset(1)),
  `B2d: guest Next advances months`);
await guestPrev.click();
await page.waitForTimeout(150);

// May 13 2026 (today) is in the blocked range May 6-23. It should be disabled+blocked.
// The cell text is just "13" — but several "13"s exist across months. Filter by title="Unavailable".
const unavailable = page.locator('button[title="Unavailable"]');
const unavailableCount = await unavailable.count();
assert(unavailableCount > 0, `B3a: blocked dates rendered as disabled cells (count=${unavailableCount})`);

// Find a non-blocked, non-past date in the current month grid by picking a cell
// that is interactive (not disabled). We pick day 24 of the current month if today is May 13.
// More robust: pick the first enabled day-cell button inside the calendar.
const dayCells = page.locator('div.grid.grid-cols-7 button:not([disabled])');
const enabledDays = await dayCells.count();
log(`     [info] enabled day cells across visible months: ${enabledDays}`);
assert(enabledDays > 5, `B3b: enough enabled cells exist to test range selection (got ${enabledDays})`);

// Pick the first enabled cell as check-in, then a cell ~6 enabled cells later as check-out
// (we want >= 5 nights apart). Iterate enabled cells and collect (date-from-onclick?).
// Cells don't expose data-date directly; we click by visual order:
const handles = await dayCells.elementHandles();
// Click first enabled
await handles[0].click();
await page.waitForTimeout(100);
// Click a far-enough one (index 7)
const farIdx = Math.min(handles.length - 1, 7);
await handles[farIdx].click();
await page.waitForTimeout(200);

// After selecting both, the page renders a "Check-in: ... Check-out: ... Duration: N nights" strip.
const dur = await page.locator('text=/Duration:/').first().textContent().catch(() => null);
log(`     [info] duration line: ${dur}`);
assert(dur !== null, 'B4: a range was successfully selected (Duration line rendered)');

await shot(page, 'B-02-range-selected');

// ─── DONE ────────────────────────────────────────────────────────────────────
await browser.close();
log('');
if (failures === 0) {
  log('PASS — all UI assertions green ✓');
  process.exit(0);
} else {
  log(`FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
