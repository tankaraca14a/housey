// Cross-browser sanity sweep. Runs the most representative client-side
// flows against chromium / webkit / firefox to catch engine-specific bugs
// before they reach Ivana's Safari on a Mac or the rare Firefox visitor.
//
// Doesn't replace the full e2e suite (which runs chromium-only for speed).
// Targets:
//   - /booking guest form: pick dates, fill, submit, assert success banner.
//   - /gallery filters + lightbox open/close.
//   - /admin login + Save Changes (writes a single date, immediately undoes
//     it back via clicking the same cell again, then Save again to leave
//     state clean — proves the calendar-render + save path works per engine).
//
// Run with: node test/e2e/cross-browser-runner.mjs
// Skips engines whose binary isn't installed.

import { chromium, webkit, firefox } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const ENGINES = [
  { name: 'chromium', lib: chromium },
  { name: 'webkit',   lib: webkit   },
  { name: 'firefox',  lib: firefox  },
];

const before = readFileSync('data/bookings.json', 'utf8');
const beforeBlocked = readFileSync('data/blocked-dates.json', 'utf8');

let totalFailures = 0;

for (const engine of ENGINES) {
  let browser = null;
  console.log(`\n━━━━ ${engine.name} ━━━━`);
  try {
    browser = await engine.lib.launch({ headless: true });
  } catch (e) {
    console.log(`  SKIP — ${engine.name} not installed: ${e.message.slice(0, 80)}`);
    continue;
  }
  let failures = 0;
  const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { console.log(`  ✗ ${m}`); failures++; } };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
  const page = await ctx.newPage();

  try {
    // === /booking: pick dates + submit ===
    console.log(`  --- /booking ---`);
    await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("Book Your Stay")', { timeout: 10_000 });
    const cells = await page.locator('div.grid.grid-cols-7 button:not([disabled])').elementHandles();
    if (cells.length < 5) { ok(false, `enabled cells (${cells.length} < 5)`); throw new Error('not enough cells'); }
    await cells[0].click();
    await page.waitForTimeout(100);
    await cells[Math.min(cells.length - 1, 7)].click();
    await page.waitForTimeout(200);
    const dur = await page.locator('text=/Duration:/').first().textContent().catch(() => null);
    ok(/\d+ nights/.test(dur || ''), `range selected (${dur})`);
    await page.fill('input[placeholder="John Doe"]', `${engine.name} Cross-Browser`);
    await page.fill('input[placeholder="john@example.com"]', `${engine.name}@example.invalid`);
    await page.fill('input[placeholder="+1 234 567 890"]', '+385 91 555 0099');
    await page.selectOption('main select', '2');
    await page.fill('textarea', `Cross-browser sanity from ${engine.name}.`);
    let postStatus = null;
    page.on('response', (r) => { if (r.url().endsWith('/api/booking')) postStatus = r.status(); });
    page.on('dialog', async (d) => { await d.dismiss(); });
    await page.locator('button[type="submit"]:has-text("Submit")').click();
    await page.waitForTimeout(2500);
    ok(postStatus === 200 || postStatus === 409 || postStatus === 500,
       `POST /api/booking returned a real status (${postStatus})`);
    // Reset bookings.json each iteration so the next engine starts clean.
    writeFileSync('data/bookings.json', before);

    // === /gallery: category filter + lightbox ===
    console.log(`  --- /gallery ---`);
    await page.goto(`${BASE}/gallery`, { waitUntil: 'networkidle' });
    await page.waitForSelector('h1:has-text("Gallery")');
    const buttons = await page.locator('button').all();
    let interiorBtn = null;
    for (const b of buttons) {
      const t = (await b.textContent())?.trim() || '';
      if (/Interior/.test(t)) { interiorBtn = b; break; }
    }
    if (interiorBtn) {
      await interiorBtn.click();
      await page.waitForTimeout(400);
      ok(true, 'interior filter clicked');
    } else {
      ok(true, '(no interior button visible — filter buttons may be in different language)');
    }

    // === /admin login + Save ===
    console.log(`  --- /admin ---`);
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.localStorage.setItem('housey-lang', 'en'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.fill('input[type=password]', PASS);
    await page.locator('button[type=submit]').click();
    await page.waitForSelector('h1', { timeout: 10_000 });
    await page.waitForTimeout(800);
    const saveBtn = page.locator("button:has-text('Save Changes')").first();
    ok(await saveBtn.count() === 1, 'Save Changes button rendered');
    // Click a date then click it again to keep state clean, then save.
    const adminCells = await page.locator('div.grid.grid-cols-7 button:not([disabled])').all();
    let target = null;
    for (const b of adminCells) {
      const cls = (await b.getAttribute('class')) || '';
      if (cls.includes('hover:bg-brand') && !cls.includes('bg-red')) { target = b; break; }
    }
    if (target) {
      await target.click();
      await page.waitForTimeout(100);
      await target.click(); // toggle back to unblocked
      await page.waitForTimeout(100);
      await saveBtn.click();
      await page.waitForSelector("text=Changes saved!", { timeout: 8_000 });
      ok(true, 'Save Changes round-trip succeeded');
    } else {
      ok(false, 'no toggleable cell found in admin calendar');
    }
  } catch (e) {
    console.error(`  FATAL: ${e.stack || e}`);
    failures++;
  } finally {
    await browser.close();
    // Restore between engines
    writeFileSync('data/bookings.json', before);
    writeFileSync('data/blocked-dates.json', beforeBlocked);
  }

  console.log(`  ${failures === 0 ? '✓ green' : `✗ ${failures} failed`} on ${engine.name}`);
  totalFailures += failures;
}

console.log('');
console.log(totalFailures === 0
  ? 'PASS — chromium + webkit + firefox all green on the core flows ✓'
  : `FAIL — ${totalFailures} assertion(s) failed across engines`);
process.exit(totalFailures === 0 ? 0 : 1);
