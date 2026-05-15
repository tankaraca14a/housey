// Live-safe version of admin-full-api.mjs + admin-full-selenium.mjs.
// Runs the same capability/resilience matrix against https://www.tankaraca.com
// without writing to local files. Cleanup strategy:
//   - SENTINEL_EMAIL_RE matches every row this script creates
//   - At end (success OR failure), enumerate all bookings and DELETE every
//     row whose email matches SENTINEL_EMAIL_RE
//   - blocked-dates is read-only here (the confirm test on local exercises
//     auto-block; on live we just verify the API works, no auto-block test)

import { Builder, By, until, Key } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { readFileSync } from 'fs';

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';

const SENTINEL_TAG = `live-suite-${Date.now()}`;
const SENTINEL_EMAIL_RE = new RegExp(`@${SENTINEL_TAG}\\.invalid$`);

function emailFor(label) {
  return `${label}@${SENTINEL_TAG}.invalid`;
}

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

async function api(method, path, { body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['x-admin-password'] = PASS;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function listBookings() {
  const r = await api('GET', '/api/admin/bookings');
  return r.body.bookings ?? [];
}

async function cleanupSentinelRows() {
  const all = await listBookings();
  const ours = all.filter((b) => SENTINEL_EMAIL_RE.test(b.email));
  for (const row of ours) {
    await api('DELETE', `/api/admin/bookings/${row.id}`);
  }
  return ours.length;
}

// ── 0. Snapshot initial state ─────────────────────────────────────────────────
const beforeAll = await listBookings();
log(`Live bookings.json snapshot: ${beforeAll.length} pre-existing rows (we will NOT touch them)`);
log(`Sentinel tag for this run: ${SENTINEL_TAG}\n`);

try {
  // ── 1. AUTH ─────────────────────────────────────────────────────────────────
  log('=== 1. Auth ===');
  for (const [m, p, hasBody] of [
    ['GET',    '/api/admin/bookings', false],
    ['POST',   '/api/admin/bookings', true],
    ['POST',   '/api/admin/blocked-dates', true],
    ['PATCH',  '/api/admin/bookings/anything', true],
    ['DELETE', '/api/admin/bookings/anything', false],
    ['POST',   '/api/admin/bookings/anything/confirm', false],
    ['POST',   '/api/admin/bookings/anything/decline', false],
  ]) {
    const r = await api(m, p, { auth: false, body: hasBody ? {} : undefined });
    ok(r.status === 401, `1-${m} ${p} without password → 401 (got ${r.status})`);
  }

  // ── 2. CREATE (admin) ──────────────────────────────────────────────────────
  log('\n=== 2. POST /api/admin/bookings (manual create) ===');
  const valid = {
    name: 'Live Suite Probe',
    email: emailFor('live-probe-1'),
    phone: '+385 91 555 0000',
    checkIn: '2099-04-10',
    checkOut: '2099-04-15',
    guests: '2',
    message: `live test ${SENTINEL_TAG}`,
  };

  const r2bad = await api('POST', '/api/admin/bookings', { body: { ...valid, name: '' } });
  ok(r2bad.status === 400 && r2bad.body.error === 'name required', '2a: empty name → 400');

  const r2 = await api('POST', '/api/admin/bookings', { body: valid });
  ok(r2.status === 200 && r2.body.booking?.id, `2b: valid POST → 200 (${r2.body.booking?.id})`);
  const id1 = r2.body.booking.id;

  // Different dates so the new overlap-detection on /api/admin/bookings
  // doesn't reject this as conflicting with r2.
  const r2c = await api('POST', '/api/admin/bookings', { body: { ...valid, status: 'confirmed', email: emailFor('live-probe-2'), checkIn: '2099-05-10', checkOut: '2099-05-15' } });
  ok(r2c.status === 200 && r2c.body.booking?.status === 'confirmed', `2c: initial status=confirmed persists (got ${r2c.status})`);
  const id2 = r2c.body.booking.id;

  // ── 3. PATCH ────────────────────────────────────────────────────────────────
  log('\n=== 3. PATCH any field + status both directions ===');
  const r3a = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { name: 'Live Renamed' } });
  ok(r3a.status === 200 && r3a.body.booking.name === 'Live Renamed', '3a: rename');

  const r3b = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { status: 'declined' } });
  ok(r3b.body.booking.status === 'declined', '3b: pending → declined');

  const r3c = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { status: 'pending' } });
  ok(r3c.body.booking.status === 'pending', '3c: declined → pending (reverse)');

  const r3d = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { checkIn: '2099-05-01', checkOut: '2099-05-08' } });
  ok(r3d.body.booking.checkIn === '2099-05-01' && r3d.body.booking.checkOut === '2099-05-08', '3d: shift dates atomically');

  const r3e = await api('PATCH', `/api/admin/bookings/${id1}`, { body: { checkIn: '2099-12-01', checkOut: '2099-11-01' } });
  ok(r3e.status === 400, '3e: invalid date order → 400');

  const r3f = await api('PATCH', '/api/admin/bookings/00000000-0000-0000-0000-000000000000', { body: { status: 'declined' } });
  ok(r3f.status === 404, '3f: unknown id → 404');

  // ── 4. RACE (5 concurrent on live — keep small to be polite) ───────────────
  log('\n=== 4. Concurrent create race (mutex on live) ===');
  const beforeRace = (await listBookings()).filter((b) => SENTINEL_EMAIL_RE.test(b.email)).length;
  // Unique year per iteration so overlap detector doesn't reject them.
  const racers = Array.from({ length: 5 }, (_, i) =>
    api('POST', '/api/admin/bookings', {
      body: {
        ...valid,
        name: `Race-${i}`,
        email: emailFor(`race-${i}`),
        checkIn: `${2200 + i}-04-10`,
        checkOut: `${2200 + i}-04-15`,
      },
    })
  );
  const raceResults = await Promise.all(racers);
  const successes = raceResults.filter((r) => r.status === 200);
  ok(successes.length === 5, `4a: all 5 concurrent creates returned 200 (${successes.length})`);
  const ids = new Set(successes.map((r) => r.body.booking.id));
  ok(ids.size === 5, '4b: all 5 ids unique');
  const afterRace = (await listBookings()).filter((b) => SENTINEL_EMAIL_RE.test(b.email)).length;
  ok(afterRace === beforeRace + 5, `4c: sentinel rows grew by exactly 5 (no lost updates)`);

  // ── 5. UI: SELENIUM live admin sweep ───────────────────────────────────────
  log('\n=== 5. Selenium UI: live admin ===');

  const opts = new chrome.Options();
  opts.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1300');
  const pw = '/Users/mm/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
  try { if (readFileSync(pw)) opts.setChromeBinaryPath(pw); } catch {}
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(opts).build();

  try {
    await driver.get(`${BASE}/admin`);
    await driver.wait(until.elementLocated(By.css('input[type="password"]')), 8000);
    // Force EN — see admin-crud-selenium.mjs for the rationale.
    await driver.executeScript("window.localStorage.setItem('housey-lang', 'en');");
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('input[type="password"]')), 5000);
    await driver.sleep(150);
    await driver.findElement(By.css('input[type="password"]')).sendKeys(PASS, Key.RETURN);
    await driver.wait(until.elementLocated(By.css('h3')), 15000);
    await driver.sleep(800);
    ok(true, '5a: live admin login');

    // Look at id2 (confirmed status). Use the inline status select to flip it
    // to declined, then back to confirmed.
    await driver.findElement(By.xpath("//button[normalize-space()='Refresh']")).click();
    await driver.sleep(800);
    const liveSelect = await driver.findElement(By.css(`[data-testid='status-select-${id2}']`));
    await liveSelect.sendKeys('Declined');
    await driver.sleep(1500);
    const after5b = (await listBookings()).find((b) => b.id === id2);
    ok(after5b?.status === 'declined', `5b: UI select changed status to declined (${after5b?.status})`);

    const liveSelect2 = await driver.findElement(By.css(`[data-testid='status-select-${id2}']`));
    await liveSelect2.sendKeys('Confirmed');
    await driver.sleep(1500);
    const after5c = (await listBookings()).find((b) => b.id === id2);
    ok(after5c?.status === 'confirmed', `5c: UI select changed back to confirmed (${after5c?.status})`);

    // Edit id2 via the panel — change name
    const editBtn = await driver.findElement(By.css(`[data-testid='edit-btn-${id2}']`));
    await editBtn.click();
    await driver.wait(until.elementLocated(By.css(`[data-testid='booking-edit-panel']`)), 5000);

    const nameInputLabel = await driver.findElement(By.xpath("//div[@data-testid='booking-edit-panel']//label[starts-with(normalize-space(), 'Name')]"));
    const nameInput = await nameInputLabel.findElement(By.css('input'));
    await driver.executeScript(
      `const el = arguments[0], v = arguments[1];
       const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
       setter.call(el, v);
       el.dispatchEvent(new Event('input', { bubbles: true }));`,
      nameInput, 'Live UI Renamed'
    );
    await driver.findElement(By.css(`[data-testid='edit-save']`)).click();
    await driver.sleep(1500);
    const after5d = (await listBookings()).find((b) => b.id === id2);
    ok(after5d?.name === 'Live UI Renamed', `5d: UI edit panel renamed booking (${after5d?.name})`);
  } finally {
    await driver.quit();
  }
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // ── CLEANUP ────────────────────────────────────────────────────────────────
  log('\n=== Cleanup ===');
  const deleted = await cleanupSentinelRows();
  log(`  deleted ${deleted} sentinel rows`);
  const finalRows = await listBookings();
  const leftoverSentinels = finalRows.filter((b) => SENTINEL_EMAIL_RE.test(b.email));
  ok(leftoverSentinels.length === 0, `cleanup: 0 sentinel rows remain (left=${leftoverSentinels.length})`);
  ok(finalRows.length === beforeAll.length, `cleanup: live bookings count restored (${finalRows.length} === ${beforeAll.length})`);

  // Double-check we didn't accidentally touch any pre-existing rows
  const initialIds = new Set(beforeAll.map((b) => b.id));
  const newRowsThatAreNotOurs = finalRows.filter((b) => !initialIds.has(b.id));
  ok(newRowsThatAreNotOurs.length === 0, `cleanup: 0 stray new rows (${newRowsThatAreNotOurs.length})`);
}

log('');
log(failures === 0 ? 'PASS — live admin suite green, no production data left behind ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
