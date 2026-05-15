// Live verification that Confirm + Decline undo works on production —
// i.e. clicking Confirm/Decline does NOT send the email immediately,
// and clicking Undo within 10s leaves zero residue on KV / blocked-dates.
//
// Drives a real browser against https://www.tankaraca.com with sentinel
// emails so any leftover row is auto-cleaned.

import { chromium } from 'playwright';

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';
const TAG = `confirm-undo-${Date.now()}`;
const SENTINEL_EMAIL = `probe@${TAG}.invalid`;
const SENTINEL_EMAIL_RE = new RegExp(`@${TAG}\\.invalid$`);

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

async function listBookings() {
  return (await api('GET', '/api/admin/bookings')).body.bookings ?? [];
}
async function listBlocked() {
  return new Set((await api('GET', '/api/admin/blocked-dates')).body.blockedDates ?? []);
}
async function cleanupSentinels() {
  const all = await listBookings();
  for (const b of all.filter((x) => SENTINEL_EMAIL_RE.test(x.email))) {
    await api('DELETE', `/api/admin/bookings/${b.id}`);
  }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

try {
  // ── 0. Snapshot baseline ──────────────────────────────────────────────────
  const baselineBookings = await listBookings();
  const baselineBlocked = await listBlocked();
  console.log(`Baseline: ${baselineBookings.length} bookings, ${baselineBlocked.size} blocked dates`);
  console.log(`Sentinel tag: ${TAG}\n`);

  // ── 1. Seed pending booking via API ───────────────────────────────────────
  console.log('=== 1. Seed pending booking ===');
  const seed = await api('POST', '/api/admin/bookings', {
    name: 'Confirm Undo Live Probe',
    email: SENTINEL_EMAIL,
    phone: '+385 91 555 0007',
    checkIn: '2099-09-10',
    checkOut: '2099-09-15',
    guests: '2',
    message: `confirm-undo live probe ${TAG}`,
    status: 'pending',
  });
  ok(seed.status === 200, `1a: seed booking returned 200 (${seed.status})`);
  const id = seed.body.booking.id;

  // ── 2. Log into admin in browser ──────────────────────────────────────────
  console.log('\n=== 2. Admin login (real browser) ===');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  // EN is the global default; force it explicitly to neutralise prior state.
  await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector('h1', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.locator(`[data-testid='booking-row-${id}']`).waitFor({ timeout: 10_000 });
  ok(true, '2a: row visible after login');

  // Auto-accept all confirm() dialogs from here.
  await page.evaluate(() => { window.confirm = () => true; });

  // ── 3. Click ✓ Confirm and verify the toast appears ───────────────────────
  console.log('\n=== 3. Click Confirm → toast appears, but email NOT yet sent ===');
  await page.locator(`[data-testid='confirm-btn-${id}']`).click();
  await page.waitForTimeout(800);
  ok(await page.locator(`[data-testid='undo-confirm-toast-${id}']`).count() === 1,
     '3a: confirm undo toast visible on production');
  // Server is still pending — proves /confirm POST hasn't fired
  const serverDuring = (await listBookings()).find((b) => b.id === id);
  ok(serverDuring?.status === 'pending', `3b: KV row still pending during grace (${serverDuring?.status})`);
  // No new blocked dates yet
  const blockedDuring = await listBlocked();
  ok(blockedDuring.size === baselineBlocked.size,
     `3c: blocked-dates not changed during grace (${blockedDuring.size} === ${baselineBlocked.size})`);

  // ── 4. Click Undo and verify zero residue ─────────────────────────────────
  console.log('\n=== 4. Click Undo → 100% rollback ===');
  await page.locator(`[data-testid='undo-confirm-btn-${id}']`).click();
  await page.waitForTimeout(500);
  ok(await page.locator(`[data-testid='undo-confirm-toast-${id}']`).count() === 0,
     '4a: toast dismissed after Undo');
  // Wait 11s to be SURE the timer didn't fire after Undo
  console.log('  waiting 11s to confirm timer never fires…');
  await page.waitForTimeout(11_500);
  const serverAfter = (await listBookings()).find((b) => b.id === id);
  ok(serverAfter?.status === 'pending',
     `4b: KV still pending 11s after Undo — email was never sent (${serverAfter?.status})`);
  const blockedAfter = await listBlocked();
  ok(blockedAfter.size === baselineBlocked.size,
     `4c: blocked-dates UNCHANGED — Undo was perfect rollback (${blockedAfter.size} === ${baselineBlocked.size})`);

  // ── 5. Now do a real Decline + wait grace to prove the timer DOES fire ───
  console.log('\n=== 5. Real Decline → after grace, status flips ===');
  await page.locator(`[data-testid='decline-btn-${id}']`).click();
  await page.waitForTimeout(800);
  ok(await page.locator(`[data-testid='undo-decline-toast-${id}']`).count() === 1,
     '5a: decline toast visible');
  console.log('  waiting 11s for decline grace to expire…');
  await page.waitForTimeout(11_500);
  const serverDeclined = (await listBookings()).find((b) => b.id === id);
  ok(serverDeclined?.status === 'declined',
     `5b: KV row really flipped to declined after grace (${serverDeclined?.status})`);
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
  // Always scrub sentinel rows
  console.log('\n=== Cleanup ===');
  await cleanupSentinels();
  const finalRows = await listBookings();
  const leftover = finalRows.filter((b) => SENTINEL_EMAIL_RE.test(b.email));
  ok(leftover.length === 0, `cleanup: 0 sentinel rows remain (${leftover.length})`);
}

console.log('');
console.log(failures === 0 ? 'PASS — Confirm + Decline undo verified on production ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
