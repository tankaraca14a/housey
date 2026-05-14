// Verifies the new "you have unsaved calendar changes" guards:
//   A. Logout button with dirty calendar → confirm() prompt
//   B. Logout button when calendar is clean → no prompt, just logs out
//   C. window.beforeunload fires on refresh/close ONLY when dirty
//   D. After Save Changes, calendar becomes clean again

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
const beforeBlocked = readFileSync('data/blocked-dates.json', 'utf8');
let failures = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { console.log(`  ✗ ${m}`); failures++; } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function login() {
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  // Switch to English for predictable selectors.
  const lang = page.locator("button:has-text('HR'), button:has-text('EN')").first();
  if ((await lang.textContent())?.trim() === 'EN') await lang.click();
  await page.fill('input[type=password]', PASS);
  await page.locator('button[type=submit]').click();
  await page.waitForSelector('h1');
  await page.waitForTimeout(800);
}

try {
  await login();

  // Find one enabled, unblocked, future date and click it to dirty the calendar.
  console.log('\n=== A. Dirty calendar → Logout asks for confirm ===');
  const enabledCells = await page.locator('div.grid.grid-cols-7 button:not([disabled])').all();
  let clicked = null;
  for (const b of enabledCells) {
    const cls = (await b.getAttribute('class')) || '';
    if (cls.includes('hover:bg-brand') && !cls.includes('bg-red')) { clicked = b; break; }
  }
  if (!clicked) throw new Error('no enabled unblocked cell to click');
  await clicked.click();
  await page.waitForTimeout(150);
  ok(true, 'A1: clicked a date to dirty the calendar');

  // Intercept the next confirm dialog. Should fire on Logout click.
  let confirmFired = false;
  let confirmMsg = '';
  page.once('dialog', async (d) => {
    confirmFired = true;
    confirmMsg = d.message();
    await d.dismiss(); // simulate "Cancel" → should NOT log out
  });
  await page.locator("button:has-text('Logout')").click();
  await page.waitForTimeout(400);
  ok(confirmFired, 'A2: confirm() fired on Logout click while dirty');
  ok(confirmMsg.includes('unsaved'), `A3: confirm message mentions "unsaved" (got: ${confirmMsg.slice(0, 50)}…)`);
  // After dismissing, we should still be logged in (Logout button visible)
  ok(await page.locator("button:has-text('Logout')").count() === 1, 'A4: still logged in after Cancel');

  // === B. Save → clean → Logout doesn't prompt ===
  console.log('\n=== B. Save → calendar clean → Logout silent ===');
  await page.locator("button:has-text('Save Changes')").click();
  await page.waitForSelector("text=Changes saved!", { timeout: 5000 });
  await page.waitForTimeout(600);

  let confirmFired2 = false;
  page.once('dialog', async (d) => { confirmFired2 = true; await d.dismiss(); });
  await page.locator("button:has-text('Logout')").click();
  await page.waitForTimeout(400);
  ok(!confirmFired2, 'B1: no confirm prompt when calendar is clean');
  ok(await page.locator('input[type=password]').count() === 1, 'B2: logged out (password screen visible)');

  // === C. Beforeunload — install a listener; click a date; reload; expect dialog ===
  console.log('\n=== C. beforeunload guard fires only when dirty ===');
  await login();
  // Clean state: navigate should NOT prompt
  let beforeUnloadFiredClean = false;
  page.once('dialog', async (d) => { beforeUnloadFiredClean = true; await d.accept(); });
  await page.reload();
  await page.waitForTimeout(800);
  ok(!beforeUnloadFiredClean, 'C1: no beforeunload prompt when clean');

  // Dirty it again and try a navigation. Playwright's `route('navigation')`
  // doesn't surface beforeunload; instead we check the listener was attached
  // by inspecting whether `window.onbeforeunload` resolves to a function or
  // by directly firing the event and watching for preventDefault.
  await login();
  const cellsAgain = await page.locator('div.grid.grid-cols-7 button:not([disabled])').all();
  for (const b of cellsAgain) {
    const cls = (await b.getAttribute('class')) || '';
    if (cls.includes('hover:bg-brand') && !cls.includes('bg-red')) { await b.click(); break; }
  }
  await page.waitForTimeout(200);

  // Fire a beforeunload event in the page and detect cancellation.
  const cancelled = await page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(e, 'returnValue', { writable: true, value: '' });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  ok(cancelled, 'C2: beforeunload event was preventDefault-ed when dirty');

  // === D. Save again → beforeunload should no longer cancel ===
  console.log('\n=== D. After Save, beforeunload no longer cancels ===');
  await page.locator("button:has-text('Save Changes')").click();
  await page.waitForSelector("text=Changes saved!", { timeout: 5000 });
  await page.waitForTimeout(500);

  const cancelledAfterSave = await page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true });
    Object.defineProperty(e, 'returnValue', { writable: true, value: '' });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  ok(!cancelledAfterSave, 'D1: beforeunload is a no-op after Save (calendar clean)');

  await browser.close();
} catch (e) {
  console.error(`FATAL: ${e.stack || e}`);
  failures++;
  await browser.close().catch(() => {});
} finally {
  writeFileSync('data/blocked-dates.json', beforeBlocked); // restore baseline
}

console.log('');
console.log(failures === 0 ? 'PASS — calendar dirty-state guards work ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
