// Image-delete now mirrors the booking-delete two-confirm + 10s undo flow.
// This drives a real browser through:
//   A. Upload an image via the admin metadata POST (faster than file picker)
//   B. Click 🗑 → through both confirms → toast appears, tile vanishes, but
//      KV still has the row during the grace window
//   C. Click Undo → tile reappears, KV row still there, no DELETE fired
//   D. Click 🗑 again → both confirms → wait 11s → tile gone AND KV row gone
//   E. First-confirm cancel → no toast, no state change
//   F. Second-confirm cancel → no toast, no state change

import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const SCREENS = '/Users/mm/Developer/ivanadrag/housey/test/e2e/screens-image-undo';

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

async function listImageIds() {
  const r = await api('GET', '/api/admin/images');
  return (r.body.images ?? []).map((i) => i.id);
}

// Snapshot images.json so we can restore at the end no matter what.
const before = readFileSync('data/images.json', 'utf8');

try {
  // ── Seed: insert a fake image row directly via the metadata POST. The
  // URL doesn't have to be a real blob — the admin page just renders it,
  // and DELETE works the same regardless.
  const seed = await api('POST', '/api/admin/images', {
    url: 'https://placehold.co/600x400/png',
    blobPathname: 'fake/undo-test.png',
    alt: 'undo-test-image',
    categories: [],
    featured: false,
    sortOrder: Date.now(),
    width: 600,
    height: 400,
  });
  if (seed.status !== 200) throw new Error(`seed failed: ${seed.status}`);
  const id = seed.body.image.id;
  console.log(`Seeded image id=${id}`);

  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1300');
  const pwBin = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { readFileSync(pwBin); opts.setChromeBinaryPath(pwBin); } catch {}
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();

  try {
    await driver.get(`${BASE}/admin`);
    await driver.wait(until.elementLocated(By.css('input[type=password]')), 8000);
    // Force EN deterministically — see admin-crud-selenium.mjs for why.
    await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('input[type=password]')), 5000);
    await driver.sleep(150);
    await driver.findElement(By.css('input[type=password]')).sendKeys(PASS);
    await driver.findElement(By.css('button[type=submit]')).click();
    await driver.wait(until.elementLocated(By.css('h1')), 10000);
    await driver.sleep(800);

    const tileSel = By.css(`[data-testid='image-tile-${id}']`);
    const delSel = By.css(`[data-testid='image-delete-${id}']`);
    const toastSel = By.css(`[data-testid='undo-image-toast-${id}']`);
    const undoBtnSel = By.css(`[data-testid='undo-image-btn-${id}']`);

    // === A. Tile visible ===
    console.log('\n=== A. Tile visible ===');
    await driver.wait(until.elementLocated(tileSel), 8000);
    ok((await driver.findElements(tileSel)).length === 1, 'A1: image tile rendered');

    // === B. Delete with both confirms accepted → toast appears, tile gone ===
    console.log('\n=== B. Delete → both confirms → undo toast ===');
    // Override window.confirm to always return true for this run.
    await driver.executeScript('window.confirm = () => true; window.__confirmCalls = (window.__confirmCalls || 0); window.confirm = function(...a){ window.__confirmCalls += 1; return true; };');

    // Hover the tile so the action buttons appear, then click delete.
    const tile = await driver.findElement(tileSel);
    await driver.actions().move({ origin: tile }).perform();
    await driver.sleep(200);
    const delBtn = await driver.findElement(delSel);
    await driver.executeScript('arguments[0].click()', delBtn);
    await driver.sleep(500);

    const confirmCalls = await driver.executeScript('return window.__confirmCalls');
    ok(confirmCalls === 2, `B1: confirm() called exactly twice (got ${confirmCalls})`);

    const toastFound = await driver.findElements(toastSel);
    ok(toastFound.length === 1, 'B2: undo toast visible');

    const tilesAfter = await driver.findElements(tileSel);
    ok(tilesAfter.length === 0, 'B3: image tile hidden from grid during grace window');

    // KV check — still present
    const idsDuringGrace = await listImageIds();
    ok(idsDuringGrace.includes(id), 'B4: KV still has the image row during grace window');

    // === C. Click Undo → tile back, KV intact ===
    console.log('\n=== C. Click Undo → tile restored ===');
    await driver.findElement(undoBtnSel).click();
    await driver.sleep(400);
    const tileBack = await driver.findElements(tileSel);
    ok(tileBack.length === 1, 'C1: tile reappears after Undo');
    const noToast = await driver.findElements(toastSel);
    ok(noToast.length === 0, 'C2: toast dismissed');
    const idsAfterUndo = await listImageIds();
    ok(idsAfterUndo.includes(id), 'C3: KV row preserved (no DELETE fired)');

    // === D. Real delete: confirms, wait 11s, row really gone ===
    console.log('\n=== D. Real delete after grace window ===');
    await driver.executeScript('window.__confirmCalls = 0;');
    const tile2 = await driver.findElement(tileSel);
    await driver.actions().move({ origin: tile2 }).perform();
    await driver.sleep(200);
    const delBtn2 = await driver.findElement(delSel);
    await driver.executeScript('arguments[0].click()', delBtn2);
    await driver.sleep(400);
    ok((await driver.findElements(toastSel)).length === 1, 'D1: toast appeared again');
    console.log('  waiting 11s for grace window…');
    await driver.sleep(11_500);
    const finalIds = await listImageIds();
    ok(!finalIds.includes(id), 'D2: KV row deleted after grace window expired');
    ok((await driver.findElements(toastSel)).length === 0, 'D3: toast cleared');

    // === E + F. Cancel first or second confirm → no state change ===
    console.log('\n=== E. Cancel first confirm → abort ===');
    // Seed another row to test cancellation
    const seed2 = await api('POST', '/api/admin/images', {
      url: 'https://placehold.co/600x400/png?text=2',
      blobPathname: 'fake/cancel-test.png',
      alt: 'cancel-test',
      categories: [],
      featured: false,
      sortOrder: Date.now(),
      width: 600,
      height: 400,
    });
    const id2 = seed2.body.image.id;
    // Simplest refresh: reload the page; password is in React state and the
    // initial fetch would re-bounce to the password screen, so just log back in.
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('input[type=password]')), 6000);
    // Force EN again — localStorage persists across reloads, but be explicit.
    await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('input[type=password]')), 5000);
    await driver.sleep(150);
    await driver.findElement(By.css('input[type=password]')).sendKeys(PASS);
    await driver.findElement(By.css('button[type=submit]')).click();
    await driver.sleep(1200);
    await driver.wait(until.elementLocated(By.css(`[data-testid='image-tile-${id2}']`)), 6000);
    await driver.executeScript('window.__confirmCalls = 0; window.confirm = function(){ window.__confirmCalls += 1; return false; };');
    const tile3 = await driver.findElement(By.css(`[data-testid='image-tile-${id2}']`));
    await driver.actions().move({ origin: tile3 }).perform();
    await driver.sleep(200);
    await driver.executeScript('arguments[0].click()', await driver.findElement(By.css(`[data-testid='image-delete-${id2}']`)));
    await driver.sleep(400);
    const cancelCalls1 = await driver.executeScript('return window.__confirmCalls');
    ok(cancelCalls1 === 1, `E1: confirm() called once when first is cancelled (got ${cancelCalls1})`);
    ok((await driver.findElements(By.css(`[data-testid='undo-image-toast-${id2}']`))).length === 0, 'E2: no toast when first confirm cancelled');

    console.log('\n=== F. Cancel second confirm → abort ===');
    await driver.executeScript('window.__confirmCalls = 0; let n = 0; window.confirm = function(){ n += 1; window.__confirmCalls = n; return n < 2; };');
    const tile4 = await driver.findElement(By.css(`[data-testid='image-tile-${id2}']`));
    await driver.actions().move({ origin: tile4 }).perform();
    await driver.sleep(200);
    await driver.executeScript('arguments[0].click()', await driver.findElement(By.css(`[data-testid='image-delete-${id2}']`)));
    await driver.sleep(400);
    const cancelCalls2 = await driver.executeScript('return window.__confirmCalls');
    ok(cancelCalls2 === 2, `F1: confirm() called twice when second cancelled (got ${cancelCalls2})`);
    ok((await driver.findElements(By.css(`[data-testid='undo-image-toast-${id2}']`))).length === 0, 'F2: no toast when second confirm cancelled');
  } finally {
    await driver.quit();
  }
} catch (e) {
  console.error(`FATAL: ${e.stack || e}`);
  failures++;
} finally {
  // restore images.json
  writeFileSync('data/images.json', before);
}

console.log('');
console.log(failures === 0 ? 'PASS — image delete now reversible with 10s undo ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
