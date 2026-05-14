// HR-mode variant of generate-admin-guide-screenshots.mjs.
// Keeps the language toggle on Croatian for every shot so the labels in
// the Croatian admin guide match what Ivana actually sees on the page.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const OUT = join(ROOT, 'docs', 'admin-screenshots-hr');
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 1100 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

async function shot(name, fullPage = false) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage });
  console.log(`  ✓ ${name}.png`);
}

page.on('dialog', async (d) => {
  console.log(`     [dialog] ${d.message().slice(0, 80)}`);
  await d.accept();
});

// ─── 1. Login (HR is default) ───────────────────────────────────────────────
console.log('─── Prijava ───');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForSelector('input[type="password"]');
await shot('01-prijava-prazna');

await page.fill('input[type="password"]', PASS);
await shot('02-prijava-popunjena');

// Do NOT switch language — default is HR
await page.locator('button[type="submit"]').click();
await page.waitForSelector('h1', { timeout: 15000 });
await page.waitForSelector('h3:has-text("2026")', { timeout: 15000 });
await page.waitForTimeout(800);

console.log('─── Pregled ───');
await page.evaluate(() => window.scrollTo(0, 0));
await shot('03-pregled-vrh', false);
await shot('04-pregled-cijela', true);

console.log('─── Blokirani datumi ───');
await page.evaluate(() => window.scrollTo(0, 150));
await shot('05-kalendar');

const calendarBtns = await page.locator('div.grid.grid-cols-7 button:not([disabled])').all();
let clickedCell = null;
for (const b of calendarBtns) {
  const cls = (await b.getAttribute('class')) || '';
  if (cls.includes('hover:bg-brand') && !cls.includes('bg-red')) { clickedCell = b; break; }
}
if (clickedCell) {
  await clickedCell.click();
  await shot('06-kalendar-kliknut-datum');
}

await page.locator('button:has-text("Spremi promjene")').click();
await page.waitForTimeout(1500);
await shot('07-kalendar-spremljeno');

console.log('─── Rezervacije ───');
const bookingsHeader = page.locator('h2:has-text("Rezervacije")');
await bookingsHeader.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await shot('08-rezervacije-lista');

const annaRow = page.locator('div.bg-surface-800', { has: page.locator('h3:has-text("Anna Schmidt")') }).first();
await annaRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const annaBox = await annaRow.boundingBox();
if (annaBox) {
  await page.screenshot({
    path: join(OUT, '09-na-cekanju-red.png'),
    clip: { x: annaBox.x - 20, y: annaBox.y - 10, width: annaBox.width + 40, height: annaBox.height + 20 },
  });
  console.log('  ✓ 09-na-cekanju-red.png');
}

const marcoRow = page.locator('div.bg-surface-800', { has: page.locator('h3:has-text("Marco Rossi")') }).first();
await marcoRow.scrollIntoViewIfNeeded();
const marcoBox = await marcoRow.boundingBox();
if (marcoBox) {
  await page.screenshot({
    path: join(OUT, '10-potvrdjen-red.png'),
    clip: { x: marcoBox.x - 20, y: marcoBox.y - 10, width: marcoBox.width + 40, height: marcoBox.height + 20 },
  });
  console.log('  ✓ 10-potvrdjen-red.png');
}

const statusSelect = page.locator('[data-testid="status-select-guide-confirmed-1"]');
if (await statusSelect.count() > 0) {
  await statusSelect.focus();
  await page.waitForTimeout(200);
  await shot('11-status-dropdown');
}

console.log('─── Uredi panel ───');
await page.locator('[data-testid="edit-btn-guide-pending-1"]').click();
await page.waitForSelector('[data-testid="booking-edit-panel"]');
await page.waitForTimeout(400);
await page.locator('[data-testid="booking-edit-panel"]').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const editPanel = page.locator('[data-testid="booking-edit-panel"]');
const editBox = await editPanel.boundingBox();
if (editBox) {
  await page.screenshot({
    path: join(OUT, '12-uredi-panel.png'),
    clip: { x: editBox.x - 20, y: editBox.y - 10, width: editBox.width + 40, height: editBox.height + 20 },
  });
  console.log('  ✓ 12-uredi-panel.png');
}
await page.locator('[data-testid="booking-edit-panel"] button:has-text("Odustani")').click();
await page.waitForTimeout(300);

console.log('─── Dodaj rezervaciju ───');
await page.locator('button:has-text("Dodaj rezervaciju")').click();
await page.waitForSelector('[data-testid="booking-add-panel"]');
await page.waitForTimeout(400);
const addPanel = page.locator('[data-testid="booking-add-panel"]');
await addPanel.scrollIntoViewIfNeeded();
const addBox = await addPanel.boundingBox();
if (addBox) {
  await page.screenshot({
    path: join(OUT, '13-dodaj-rezervaciju-prazan.png'),
    clip: { x: addBox.x - 20, y: addBox.y - 10, width: addBox.width + 40, height: addBox.height + 20 },
  });
  console.log('  ✓ 13-dodaj-rezervaciju-prazan.png');
}
await page.locator('[data-testid="booking-add-panel"] button:has-text("Odustani")').click();
await page.waitForTimeout(300);

console.log('─── Brisanje + poništi toast ───');
const declinedDeleteBtn = page.locator('[data-testid="delete-btn-guide-declined-1"]');
await declinedDeleteBtn.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await declinedDeleteBtn.click();
await page.waitForTimeout(900);
const toast = page.locator('[data-testid="undo-toast-container"]');
if (await toast.count() > 0) {
  await shot('14-brisanje-toast', false);
  await page.locator('[data-testid="undo-btn-guide-declined-1"]').click();
  await page.waitForTimeout(800);
}

// ─── 7b. Potvrdi — undo toast ──────────────────────────────────────────────
console.log('─── Potvrdi undo toast ───');
const pendingRow = page.locator('[data-testid="booking-row-guide-pending-1"]');
await pendingRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.locator('[data-testid="confirm-btn-guide-pending-1"]').click();
await page.waitForTimeout(900);
const confirmToast = page.locator('[data-testid="undo-confirm-toast-guide-pending-1"]');
if (await confirmToast.count() > 0) {
  await shot('14b-potvrdi-toast', false);
  await page.locator('[data-testid="undo-confirm-btn-guide-pending-1"]').click();
  await page.waitForTimeout(800);
}

// ─── 7c. Odbij — undo toast ────────────────────────────────────────────────
console.log('─── Odbij undo toast ───');
await pendingRow.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await page.locator('[data-testid="decline-btn-guide-pending-1"]').click();
await page.waitForTimeout(900);
const declineToast = page.locator('[data-testid="undo-decline-toast-guide-pending-1"]');
if (await declineToast.count() > 0) {
  await shot('14c-odbij-toast', false);
  await page.locator('[data-testid="undo-decline-btn-guide-pending-1"]').click();
  await page.waitForTimeout(800);
}

console.log('─── Slike ───');
const imagesHeader = page.locator('h2:has-text("Images")'); // section header not translated yet
await imagesHeader.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await shot('15-slike-mreza');

const tile1 = page.locator('[data-testid="image-tile-guide-img-2"]');
await tile1.hover();
await page.waitForTimeout(300);
const tile1Box = await tile1.boundingBox();
if (tile1Box) {
  await page.screenshot({
    path: join(OUT, '16-slika-hover-akcije.png'),
    clip: { x: tile1Box.x - 20, y: tile1Box.y - 10, width: tile1Box.width + 40, height: tile1Box.height + 20 },
  });
  console.log('  ✓ 16-slika-hover-akcije.png');
}

const uploadLabel = page.locator('[data-testid="image-upload-trigger"]');
await uploadLabel.scrollIntoViewIfNeeded();
await uploadLabel.hover();
await page.waitForTimeout(300);
const uploadBox = await uploadLabel.boundingBox();
if (uploadBox) {
  await page.screenshot({
    path: join(OUT, '17-upload-gumb.png'),
    clip: { x: uploadBox.x - 20, y: uploadBox.y - 10, width: uploadBox.width + 40, height: uploadBox.height + 20 },
  });
  console.log('  ✓ 17-upload-gumb.png');
}

console.log('─── EN način (za usporedbu) ───');
const toggle = page.locator('button[title*="Hrvatski"], button[title*="English"]').first();
await toggle.click();
await page.waitForTimeout(500);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await shot('18-en-nacin-vrh');

// Switch back to HR
await page.locator('button[title*="Hrvatski"], button[title*="English"]').first().click();
await page.waitForTimeout(300);

console.log('─── Odjava ───');
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(200);
await page.locator('button:has-text("Odjava")').click();
await page.waitForSelector('input[type="password"]');
await page.waitForTimeout(300);
await shot('19-odjavljen');

await browser.close();
console.log('\nGotovo. Screenshotovi u:', OUT);
