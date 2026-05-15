// Generates the screenshots used by docs/ADMIN-GUIDE.md.
// Run with: node scripts/generate-admin-guide-screenshots.mjs
//
// Prereqs: local server on :3457 with the seed data loaded
// (see the inline JSON in the calling script).

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const OUT = join(ROOT, 'docs', 'admin-screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 1500 },
  deviceScaleFactor: 2, // crisp retina screenshots
});
const page = await ctx.newPage();

async function shot(name, fullPage = false) {
  await page.waitForTimeout(300);
  const file = join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  console.log(`  ✓ ${name}.png`);
}

// Auto-accept all native confirm/alert dialogs throughout. We screenshot
// the BEFORE state of each destructive action; the dialog itself is
// described in prose in the guide.
page.on('dialog', async (d) => {
  console.log(`     [dialog auto-accepted] ${d.message().slice(0, 80)}`);
  await d.accept();
});

// ─── 1. Login screen ─────────────────────────────────────────────────────────
console.log('─── Login ───');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('input[type="password"]');
await shot('01-login-empty');

await page.fill('input[type="password"]', PASS);
await shot('02-login-filled');

// EN is the default; the LangPicker in the top nav initialises to "en". If a
// previous run wrote "hr" / "de" / "it" / "fr" to localStorage, force it to
// EN so the EN doc's screenshots match the language label they describe.
await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
await page.reload({ waitUntil: 'networkidle' });
await page.fill('input[type="password"]', PASS);
await page.waitForTimeout(150);

await page.locator('button[type="submit"]').click();
await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 });
await page.waitForSelector('h3:has-text("2026")', { timeout: 15000 });
await page.waitForTimeout(800);

// ─── 2. Full overview ────────────────────────────────────────────────────────
console.log('─── Overview ───');
await page.evaluate(() => window.scrollTo(0, 0));
await shot('03-overview-top', false);
// Full page scroll for context
await shot('04-overview-full', true);

// ─── 3. Blocked-dates calendar interaction ──────────────────────────────────
console.log('─── Blocked dates ───');
// Show calendar area near top
await page.evaluate(() => window.scrollTo(0, 150));
await shot('05-calendar');

// Click a date to block it (using a non-blocked future cell)
// Find an enabled cell that isn't red. First grid is May 2026.
const calendarBtns = await page.locator('div.grid.grid-cols-7 button:not([disabled])').all();
// Find a green/unbblocked cell — those have hover:bg-brand-500/30
let clickedCell = null;
for (const b of calendarBtns) {
  const cls = (await b.getAttribute('class')) || '';
  if (cls.includes('hover:bg-brand') && !cls.includes('bg-red')) { clickedCell = b; break; }
}
if (clickedCell) {
  await clickedCell.click();
  await shot('06-calendar-date-clicked');
}

// Click Save Changes
await page.locator('button:has-text("Save Changes")').click();
await page.waitForTimeout(1500);
await shot('07-calendar-save-confirmation');

// ─── 4. Bookings list ────────────────────────────────────────────────────────
console.log('─── Bookings ───');
// Scroll to bookings section
const bookingsHeader = page.locator('h2:has-text("Bookings")');
await bookingsHeader.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await shot('08-bookings-list');

// Zoom in: focus on the pending booking (Anna Schmidt)
const annaRow = page.locator('div.bg-surface-800', { has: page.locator('h3:has-text("Anna Schmidt")') }).first();
await annaRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
// Use clip to focus on just that row
const annaBox = await annaRow.boundingBox();
if (annaBox) {
  await page.screenshot({
    path: join(OUT, '09-pending-row.png'),
    clip: { x: annaBox.x - 20, y: annaBox.y - 10, width: annaBox.width + 40, height: annaBox.height + 20 },
  });
  console.log('  ✓ 09-pending-row.png');
}

// Status dropdown opened — focus on Marco's confirmed row
const marcoRow = page.locator('div.bg-surface-800', { has: page.locator('h3:has-text("Marco Rossi")') }).first();
await marcoRow.scrollIntoViewIfNeeded();
const marcoBox = await marcoRow.boundingBox();
if (marcoBox) {
  await page.screenshot({
    path: join(OUT, '10-confirmed-row.png'),
    clip: { x: marcoBox.x - 20, y: marcoBox.y - 10, width: marcoBox.width + 40, height: marcoBox.height + 20 },
  });
  console.log('  ✓ 10-confirmed-row.png');
}

// Status select dropdown — interaction shot
const statusSelect = page.locator('[data-testid="status-select-guide-confirmed-1"]');
if (await statusSelect.count() > 0) {
  await statusSelect.focus();
  await page.waitForTimeout(200);
  await shot('11-status-select-focused');
}

// ─── 5. Edit booking panel ────────────────────────────────────────────────────
console.log('─── Edit panel ───');
await page.locator('[data-testid="edit-btn-guide-pending-1"]').click();
await page.waitForSelector('[data-testid="booking-edit-panel"]');
await page.waitForTimeout(400);
// The edit panel is inline — scroll so we see the whole thing
await page.locator('[data-testid="booking-edit-panel"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const editPanel = page.locator('[data-testid="booking-edit-panel"]');
const editBox = await editPanel.boundingBox();
if (editBox) {
  await page.screenshot({
    path: join(OUT, '12-edit-panel.png'),
    clip: { x: editBox.x - 20, y: editBox.y - 10, width: editBox.width + 40, height: editBox.height + 20 },
  });
  console.log('  ✓ 12-edit-panel.png');
}

// Cancel out (don't save — we want to preserve the seed data)
await page.locator('[data-testid="booking-edit-panel"] button:has-text("Cancel")').click();
await page.waitForTimeout(300);

// ─── 6. Add booking panel ────────────────────────────────────────────────────
console.log('─── Add booking ───');
await page.locator('button:has-text("+ Add booking")').click();
await page.waitForSelector('[data-testid="booking-add-panel"]');
await page.waitForTimeout(400);
const addPanel = page.locator('[data-testid="booking-add-panel"]');
await addPanel.scrollIntoViewIfNeeded();
const addBox = await addPanel.boundingBox();
if (addBox) {
  await page.screenshot({
    path: join(OUT, '13-add-booking-empty.png'),
    clip: { x: addBox.x - 20, y: addBox.y - 10, width: addBox.width + 40, height: addBox.height + 20 },
  });
  console.log('  ✓ 13-add-booking-empty.png');
}
// Cancel
await page.locator('[data-testid="booking-add-panel"] button:has-text("Cancel")').click();
await page.waitForTimeout(300);

// ─── 7. Delete with undo toast ───────────────────────────────────────────────
console.log('─── Delete + undo toast ───');
// We have to actually click delete to capture the undo toast.
// We click Delete on the DECLINED row (Tomás Garcia) so an undo within
// the grace window leaves no permanent change.
const declinedDeleteBtn = page.locator('[data-testid="delete-btn-guide-declined-1"]');
await declinedDeleteBtn.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await declinedDeleteBtn.click(); // dialog auto-accepts
await page.waitForTimeout(900);
// Toast should be visible now
const toast = page.locator('[data-testid="undo-toast-container"]');
if (await toast.count() > 0) {
  await shot('14-delete-toast', false);
  // Click Undo so the row is preserved for subsequent shots
  await page.locator('[data-testid="undo-btn-guide-declined-1"]').click();
  await page.waitForTimeout(800);
}

// ─── 7b. Confirm undo toast ─────────────────────────────────────────────────
// Click ✓ Confirm on the pending row, capture the toast, then Undo so the
// row stays pending for the rest of the run (no email sent, no dates blocked).
console.log('─── Confirm undo toast ───');
const pendingRow = page.locator('[data-testid="booking-row-guide-pending-1"]');
await pendingRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.locator('[data-testid="confirm-btn-guide-pending-1"]').click();
await page.waitForTimeout(900);
const confirmToast = page.locator('[data-testid="undo-confirm-toast-guide-pending-1"]');
if (await confirmToast.count() > 0) {
  await shot('14b-confirm-toast', false);
  await page.locator('[data-testid="undo-confirm-btn-guide-pending-1"]').click();
  await page.waitForTimeout(800);
}

// ─── 7c. Decline undo toast ─────────────────────────────────────────────────
console.log('─── Decline undo toast ───');
await pendingRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.locator('[data-testid="decline-btn-guide-pending-1"]').click();
await page.waitForTimeout(900);
const declineToast = page.locator('[data-testid="undo-decline-toast-guide-pending-1"]');
if (await declineToast.count() > 0) {
  await shot('14c-decline-toast', false);
  await page.locator('[data-testid="undo-decline-btn-guide-pending-1"]').click();
  await page.waitForTimeout(800);
}

// ─── 8. Images section ───────────────────────────────────────────────────────
console.log('─── Images ───');
// Scroll to images section
const imagesHeader = page.locator('h2:has-text("Images")');
await imagesHeader.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await shot('15-images-grid');

// Hover over a tile to reveal the actions
const tile1 = page.locator('[data-testid="image-tile-guide-img-2"]');
await tile1.hover();
await page.waitForTimeout(300);
const tile1Box = await tile1.boundingBox();
if (tile1Box) {
  await page.screenshot({
    path: join(OUT, '16-image-hover-actions.png'),
    clip: { x: tile1Box.x - 20, y: tile1Box.y - 10, width: tile1Box.width + 40, height: tile1Box.height + 20 },
  });
  console.log('  ✓ 16-image-hover-actions.png');
}

// Upload button focus
const uploadLabel = page.locator('[data-testid="image-upload-trigger"]');
await uploadLabel.scrollIntoViewIfNeeded();
await uploadLabel.hover();
await page.waitForTimeout(300);
const uploadBox = await uploadLabel.boundingBox();
if (uploadBox) {
  await page.screenshot({
    path: join(OUT, '17-upload-button.png'),
    clip: { x: uploadBox.x - 20, y: uploadBox.y - 10, width: uploadBox.width + 40, height: uploadBox.height + 20 },
  });
  console.log('  ✓ 17-upload-button.png');
}

// ─── 8b. Reviews section ─────────────────────────────────────────────────────
console.log('─── Reviews ───');
const reviewsHeader = page.locator('h2:has-text("Reviews")');
await reviewsHeader.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);

// 21 — full Reviews section showing two seeded tiles (one featured).
// Find the .mt-16 wrapper that contains the whole Reviews section. The
// h2 is 3 levels deep inside it: h2 -> heading-grid -> flex-row -> mt-16.
const reviewsSection = page.locator(
  'xpath=//h2[normalize-space()="Reviews"]/ancestor::div[contains(@class, "mt-16")][1]',
);
await reviewsSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await reviewsSection.screenshot({ path: join(OUT, '21-reviews-list.png') });
console.log('  ✓ 21-reviews-list.png');

// Open the Add Review panel for the star widget shots
await page.locator('[data-testid="review-add-trigger"]').click();
await page.waitForSelector('[data-testid="review-edit-panel"]');
await page.waitForTimeout(400);
const panel = page.locator('[data-testid="review-edit-panel"]');
await panel.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);

// 22 — Add review form, rating defaulted to 5 (all stars amber).
// element.screenshot auto-clips to the element's exact bounds, even
// if it extends beyond the current viewport.
await panel.screenshot({ path: join(OUT, '22-review-form-default.png') });
console.log('  ✓ 22-review-form-default.png');

// Click star 3, capture the same panel showing 3 amber + 2 slate + "3/5"
await page.locator('[data-testid="review-rating-3"]').click();
await page.waitForTimeout(200);
await panel.screenshot({ path: join(OUT, '23-review-form-rating-3.png') });
console.log('  ✓ 23-review-form-rating-3.png');

// Close without saving so we leave the seeded list untouched
await page.locator('[data-testid="review-cancel"]').click();
await page.waitForTimeout(300);

// ─── 9. HR mode ──────────────────────────────────────────────────────────────
console.log('─── HR mode ───');
// Pick "hr" in the global LangPicker (header dropdown) and capture two
// shots so the EN doc can show what the page looks like in Croatian.
await page.locator('[data-testid="lang-picker"]').selectOption('hr');
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await shot('18-hr-mode-top');

const bookingsHrHeader = page.locator('h2:has-text("Rezervacije")');
if (await bookingsHrHeader.count() > 0) {
  await bookingsHrHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot('19-hr-mode-bookings');
}

// Switch back to EN for the logout screenshot
await page.locator('[data-testid="lang-picker"]').selectOption('en');
await page.waitForTimeout(300);

// ─── 10. Logout ──────────────────────────────────────────────────────────────
console.log('─── Logout ───');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.locator('button:has-text("Logout")').click();
await page.waitForSelector('input[type="password"]');
await page.waitForTimeout(300);
await shot('20-logged-out');

await browser.close();
console.log('\nDone. Screenshots in:', OUT);
