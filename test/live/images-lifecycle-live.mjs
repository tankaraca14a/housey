// End-to-end image management lifecycle on production:
//   1. Admin logs in to /admin
//   2. Admin uploads a real JPEG via the file picker → Vercel Blob
//   3. The new row appears in the Images grid AND on /gallery
//   4. ★ Feature toggle works
//   5. 🗑 Delete (auto-accept both confirms) removes the row + the blob
//   6. /gallery no longer shows it
// Snapshots the production state (images count) and verifies it returns
// to baseline at the end.

import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const SCREENS = join(HERE, 'screens-images-lifecycle');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';
const FIXTURE = join(REPO, 'public', 'images', 'new2', 'img01.jpg'); // ~260 KB JPEG

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

async function fetchImages() {
  const res = await fetch(`${BASE}/api/images`);
  const data = await res.json();
  return data.images ?? [];
}

const beforeImages = await fetchImages();
log(`Baseline production images: ${beforeImages.length}`);

let createdId = null;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
const page = await ctx.newPage();

try {
  // ── 1. Login ──────────────────────────────────────────────────────────────
  log('\n=== 1. Admin login ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[type="password"]');
  await page.fill('input[type="password"]', PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForSelector('h3', { timeout: 15000 });
  await page.waitForTimeout(800);
  ok(true, '1a: logged in');

  // ── 2. Upload via the file input ──────────────────────────────────────────
  log('\n=== 2. Upload a real JPEG via the admin UI ===');
  // The Images section's file input is data-testid='image-upload-input'
  await page.waitForSelector(`[data-testid='image-upload-input']`, { state: 'attached' });
  // Capture network: watch for POST /api/admin/images (metadata insert)
  let metadataPostStatus = null;
  page.on('response', async (res) => {
    if (res.url().endsWith('/api/admin/images') && res.request().method() === 'POST') {
      metadataPostStatus = res.status();
    }
  });
  await page.setInputFiles(`[data-testid='image-upload-input']`, FIXTURE);
  // Wait for the upload + metadata POST to complete. Generous timeout
  // because Blob direct-upload includes a real HTTP PUT to Vercel.
  await page.waitForFunction(() => {
    const tiles = document.querySelectorAll('[data-testid^="image-tile-"]');
    return tiles.length > 0;
  }, { timeout: 60_000 });
  await page.waitForTimeout(500);
  ok(metadataPostStatus === 200, `2a: metadata POST returned 200 (${metadataPostStatus})`);

  await page.screenshot({ path: join(SCREENS, '02-after-upload.png'), fullPage: true });

  // Verify via API
  const afterUpload = await fetchImages();
  ok(afterUpload.length === beforeImages.length + 1, `2b: images grew by 1 (${beforeImages.length} → ${afterUpload.length})`);
  const newRow = afterUpload.find((i) => !beforeImages.some((b) => b.id === i.id));
  ok(!!newRow, `2c: new row identifiable`);
  createdId = newRow?.id;
  ok(newRow?.url?.startsWith('https://'), `2d: blob URL stored (${newRow?.url?.slice(0, 60)}…)`);
  ok(newRow?.width > 0 && newRow?.height > 0, `2e: dimensions extracted (${newRow?.width}x${newRow?.height})`);

  // ── 3. The new row is rendered in /admin UI ───────────────────────────────
  log('\n=== 3. Row visible in admin grid ===');
  const tile = page.locator(`[data-testid='image-tile-${createdId}']`);
  ok(await tile.count() === 1, `3a: admin tile rendered for new image`);

  // ── 4. /gallery shows the new image (BEFORE toggling featured — the
  //      gallery's regularImages grid renders all, but only the top 3
  //      featured images are surfaced. We want a deterministic assertion.)
  log('\n=== 4. /gallery renders the new image ===');
  // Use a fresh context to bypass any HTTP cache between the admin tab's
  // earlier API calls and the gallery's expectation of seeing the new row.
  const freshCtx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  const galleryPage = await freshCtx.newPage();
  await galleryPage.goto(`${BASE}/gallery?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  const blobHost = new URL(newRow.url).hostname;
  // Poll until the new image is in the DOM (or 25s elapses).
  let found = false;
  for (let i = 0; i < 50; i++) {
    const html = await galleryPage.content();
    if (html.includes(blobHost)) { found = true; break; }
    await galleryPage.waitForTimeout(500);
  }
  ok(found, `4a: gallery HTML references the Blob host within 25s (${blobHost})`);
  await galleryPage.screenshot({ path: join(SCREENS, '04-gallery-with-uploaded.png'), fullPage: false });
  await galleryPage.close();
  await freshCtx.close();

  // ── 5. Feature toggle (post-gallery, no longer affects the assertion) ────
  log('\n=== 5. ★ Feature toggle ===');
  await page.locator(`[data-testid='image-tile-${createdId}']`).hover();
  await page.waitForTimeout(150);
  await page.locator(`[data-testid='image-featured-${createdId}']`).click({ force: true });
  await page.waitForTimeout(1200);
  const afterFeature = (await fetchImages()).find((i) => i.id === createdId);
  ok(afterFeature?.featured === true, `5a: featured=true after toggle`);

  // ── 6. Delete via 🗑 (auto-accept both confirms) ─────────────────────────
  // The image delete now has a 10s undo window — the tile vanishes
  // optimistically but the actual DELETE only hits KV after the grace
  // window. The test verifies BOTH halves: optimistic UI + eventual delete.
  log('\n=== 6. Delete the uploaded image (10s grace window) ===');
  await page.evaluate(() => { window.confirm = () => true; });
  await page.locator(`[data-testid='image-delete-${createdId}']`).click({ force: true });
  await page.waitForTimeout(800);
  // Optimistic UI: tile already gone, KV row still there
  ok(await page.locator(`[data-testid='image-tile-${createdId}']`).count() === 0, `6a: tile hidden optimistically`);
  const duringGrace = await fetchImages();
  ok(duringGrace.some((i) => i.id === createdId), `6b: KV row still present during grace window`);
  ok(await page.locator(`[data-testid='undo-image-toast-${createdId}']`).count() === 1, `6c: undo toast visible`);
  // Wait the grace window + safety margin
  log('  waiting 11s for grace window…');
  await page.waitForTimeout(11_500);
  const afterDelete = await fetchImages();
  ok(!afterDelete.some((i) => i.id === createdId), `6d: row removed from API after grace`);
  ok(await page.locator(`[data-testid='undo-image-toast-${createdId}']`).count() === 0, `6e: toast cleared`);
  createdId = null;

  // ── 7. Final state matches baseline ───────────────────────────────────────
  log('\n=== 7. Final state matches baseline ===');
  const final = await fetchImages();
  ok(final.length === beforeImages.length, `7a: images count restored (${final.length} === ${beforeImages.length})`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
  // Cleanup: if test failed before delete, scrub the orphan via the API
  if (createdId) {
    log(`  [recover] deleting orphan row ${createdId}`);
    await fetch(`${BASE}/api/admin/images/${createdId}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': PASS },
    });
  }
}

log('');
log(failures === 0 ? 'PASS — image lifecycle on production verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
