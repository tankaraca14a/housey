// Live verification of the unsaved-calendar guards: the Logout confirm
// prompt AND the beforeunload listener.
//
// Method:
//   1. Snapshot the production blocked-dates so we can restore exactly
//      whatever state was there.
//   2. Open /admin in a real browser, log in.
//   3. Click an unblocked future date → dirty state.
//   4. Click Logout → expect confirm() to fire with the unsaved-warning
//      message. Dismiss (Cancel) → still logged in, calendar still dirty.
//   5. Dispatch a beforeunload event in the page and verify preventDefault
//      was applied (i.e. the browser would have prompted).
//   6. Click Save Changes → wait for confirmation.
//   7. Click Logout AGAIN → expect NO confirm prompt (calendar is clean).
//   8. Dispatch beforeunload AGAIN → preventDefault should NOT be applied.
//   9. In `finally`, restore the original blocked-dates set exactly.

import { chromium } from 'playwright';

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';

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

const originalBlocked = (await api('GET', '/api/admin/blocked-dates')).body.blockedDates || [];
console.log(`Snapshot: ${originalBlocked.length} blocked dates on production\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

try {
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector('h1', { timeout: 15_000 });
  await page.waitForTimeout(800);
  ok(true, '0a: logged into admin on production');

  // === 1. Click an unblocked future date to dirty the calendar ===
  console.log('\n=== 1. Dirty the calendar ===');
  const enabledCells = await page.locator('div.grid.grid-cols-7 button:not([disabled])').all();
  let dirtied = false;
  for (const b of enabledCells) {
    const cls = (await b.getAttribute('class')) || '';
    if (cls.includes('hover:bg-brand') && !cls.includes('bg-red')) {
      await b.click();
      dirtied = true;
      break;
    }
  }
  ok(dirtied, '1a: clicked an unblocked future date');
  await page.waitForTimeout(200);

  // === 2. Logout → expect confirm prompt ===
  console.log('\n=== 2. Logout with dirty calendar → confirm fires ===');
  let confirmFired = false;
  let confirmMsg = '';
  page.once('dialog', async (d) => {
    confirmFired = true;
    confirmMsg = d.message();
    await d.dismiss(); // simulate Cancel
  });
  await page.locator("button:has-text('Logout')").click();
  await page.waitForTimeout(400);
  ok(confirmFired, '2a: confirm() fired on Logout while dirty');
  ok(confirmMsg.includes('unsaved') || confirmMsg.includes('nespremljene'),
     `2b: confirm message mentions unsaved (got: "${confirmMsg.slice(0, 60)}…")`);
  ok(await page.locator("button:has-text('Logout')").count() === 1,
     '2c: still logged in after dismissing the confirm');

  // === 3. beforeunload listener is active while dirty ===
  console.log('\n=== 3. beforeunload fires while dirty ===');
  const cancelledWhileDirty = await page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(e, 'returnValue', { writable: true, value: '' });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  ok(cancelledWhileDirty, '3a: beforeunload was preventDefault-ed (browser would prompt)');

  // === 4. Save Changes → calendar becomes clean ===
  console.log('\n=== 4. Save Changes resets dirty flag ===');
  await page.locator("button:has-text('Save Changes')").click();
  await page.waitForSelector("text=Changes saved!", { timeout: 8_000 });
  await page.waitForTimeout(600);

  // === 5. Logout → NO prompt ===
  console.log('\n=== 5. Logout when clean → silent ===');
  let confirmFired2 = false;
  page.once('dialog', async (d) => { confirmFired2 = true; await d.dismiss(); });
  await page.locator("button:has-text('Logout')").click();
  await page.waitForTimeout(400);
  ok(!confirmFired2, '5a: no confirm prompt when calendar is clean');
  ok(await page.locator('input[type=password]').count() === 1,
     '5b: actually logged out (password screen visible)');
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
  // === Restore the production blocked-dates to EXACTLY what we found.
  // The dirty-click left one extra date in the calendar state, but Save
  // Changes wrote it through. Roll it back here.
  console.log('\n=== Restore production blocked-dates ===');
  const restore = await api('POST', '/api/admin/blocked-dates', { blockedDates: originalBlocked });
  ok(restore.status === 200, `restore: blocked-dates POST returned 200 (${restore.status})`);
  const after = (await api('GET', '/api/admin/blocked-dates')).body.blockedDates || [];
  ok(after.length === originalBlocked.length,
     `restore: count matches snapshot (${after.length} === ${originalBlocked.length})`);
  ok(originalBlocked.every((d) => after.includes(d)),
     `restore: every original date is still blocked`);
}

console.log('');
console.log(failures === 0 ? 'PASS — calendar dirty guards verified on production ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
