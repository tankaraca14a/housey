// Verify the live deployment of housey reflects commit dac8837 on main:
//   - admin calendar has Previous/Next month nav buttons
//   - booking calendar has Previous/Next month nav buttons (was already there)
//   - /api/booking saves bookings without RESEND_API_KEY (the resilience fix)
// No data is left behind: we DO NOT submit a real reservation. We only
// inspect DOM and probe one safe API endpoint with an obviously-bogus payload.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCREENS = join(HERE, 'screens-live');
mkdirSync(SCREENS, { recursive: true });

const BASE = 'https://www.tankaraca.com';
let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

// ─── 1. /admin: post-fix UI ──────────────────────────────────────────────────
log('=== 1. LIVE /admin month navigation ===');
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.screenshot({ path: join(SCREENS, 'live-admin-login.png'), fullPage: true });

// Switch to EN for stable text
const langBtn = page.locator('button:has-text("EN"), button:has-text("HR")').first();
await langBtn.click().catch(() => {});
await page.waitForTimeout(200);

await page.fill('input[type="password"]', 'ivana2026');
await page.locator('button[type="submit"]').click();
await page.waitForLoadState('networkidle');
await page.waitForSelector('h1', { timeout: 8000 });
// React useEffect fires the /api/admin/blocked-dates fetch AFTER hydration —
// wait for a month-heading to appear (means calendar grid rendered, which
// means the fetch resolved and loadingDates flipped to false).
await page.waitForSelector('h3:has-text("2026"), h3:has-text("2027")', { timeout: 15000 });
await page.waitForTimeout(300);
await page.screenshot({ path: join(SCREENS, 'live-admin-after-login.png'), fullPage: true });

// Are the Prev/Next buttons present in the admin? (the new fix)
const adminPrev = page.locator('button:has-text("Previous"), button:has-text("Prethodni")');
const adminNext = page.locator('button:has-text("Next"), button:has-text("Sljedeći")');
const prevCount = await adminPrev.count();
const nextCount = await adminNext.count();
log(`  admin Previous count: ${prevCount}, Next count: ${nextCount}`);
ok(prevCount >= 1, '1a: admin Previous button deployed');
ok(nextCount >= 1, '1b: admin Next button deployed');

if (prevCount >= 1 && nextCount >= 1) {
  // Click Next, confirm months advanced
  const before = await page.$$eval('h3', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) =>
      /^(January|February|March|April|May|June|July|August|September|October|November|December|Siječanj|Veljača|Ožujak|Travanj|Svibanj|Lipanj|Srpanj|Kolovoz|Rujan|Listopad|Studeni|Prosinac)\s+\d{4}$/.test(t)
    )
  );
  await adminNext.first().click();
  await page.waitForTimeout(300);
  const after = await page.$$eval('h3', (els) =>
    els.map((e) => e.textContent.trim()).filter((t) =>
      /^(January|February|March|April|May|June|July|August|September|October|November|December|Siječanj|Veljača|Ožujak|Travanj|Svibanj|Lipanj|Srpanj|Kolovoz|Rujan|Listopad|Studeni|Prosinac)\s+\d{4}$/.test(t)
    )
  );
  log(`  months before Next: ${JSON.stringify(before)}`);
  log(`  months after Next:  ${JSON.stringify(after)}`);
  ok(JSON.stringify(before) !== JSON.stringify(after), '1c: clicking Next actually changes the visible months');
  await page.screenshot({ path: join(SCREENS, 'live-admin-after-next.png'), fullPage: true });
}

// ─── 2. /booking: regression spot-check ──────────────────────────────────────
log('\n=== 2. LIVE /booking calendar ===');
await page.goto(`${BASE}/booking`, { waitUntil: 'networkidle' });
const guestPrev = await page.locator('button:has-text("Previous"), button:has-text("Prethodni")').count();
const guestNext = await page.locator('button:has-text("Next"), button:has-text("Sljedeći")').count();
log(`  guest Previous count: ${guestPrev}, Next count: ${guestNext}`);
ok(guestPrev >= 1 && guestNext >= 1, '2a: /booking month nav present');

// ─── 3. /api/booking resilience: probe with a 400-triggering bogus payload ───
// We DON'T want to write a real row to production data. So we send something
// the validator will reject with 400. If the validator code is deployed, we
// get 400. If the OLD code is deployed, we get 500 (Resend tries to send and
// fails on the bogus payload OR the JSON.stringify hits a different path).
log('\n=== 3. LIVE /api/booking validator deployed? ===');
const probeRes = await fetch(`${BASE}/api/booking`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '',  // intentionally invalid — should trigger validator
    email: 'not-an-email',
    phone: '1',
    checkIn: 'not-a-date',
    checkOut: 'not-a-date',
    guests: '',
  }),
});
const probeBody = await probeRes.json().catch(() => ({}));
log(`  status: ${probeRes.status}`);
log(`  body:   ${JSON.stringify(probeBody)}`);
ok(probeRes.status === 400, '3a: bogus payload rejected with 400 (new validator deployed)');
ok(typeof probeBody.error === 'string', '3b: response carries the validator message');

// ─── Done ────────────────────────────────────────────────────────────────────
await browser.close();
log('');
log(failures === 0 ? 'PASS — live deployment reflects commit dac8837 ✓' : `PARTIAL — ${failures} live check(s) failed (deploy may be stale)`);
process.exit(failures === 0 ? 0 : 1);
