// Prints a human-readable summary of production's current blocked dates.
// Use after a failed live-test run to reconcile leaked dates vs. legitimate
// owner-set blocks. Does not modify state.
//
//   node scripts/blocked-dates-report.mjs                  # show all runs
//   node scripts/blocked-dates-report.mjs --min-len=5      # filter to longer blocks
//   node scripts/blocked-dates-report.mjs --year=2026      # only one year

const BASE = process.env.BASE || 'https://www.tankaraca.com';
const PASS = process.env.ADMIN_PASSWORD || 'ivana2026';
const minLen = Number((process.argv.find((a) => a.startsWith('--min-len=')) || '').split('=')[1]) || 1;
const year = (process.argv.find((a) => a.startsWith('--year=')) || '').split('=')[1] || null;

const r = await fetch(`${BASE}/api/admin/blocked-dates`, {
  headers: { 'x-admin-password': PASS },
});
const data = await r.json();
const all = (data.blockedDates || []).filter((d) => !year || d.startsWith(year)).sort();

console.log(`# blocked-dates report — ${BASE}`);
console.log(`# fetched ${new Date().toISOString()} — ${all.length} dates total\n`);

if (all.length === 0) {
  console.log('(none)');
  process.exit(0);
}

// Group into contiguous runs.
const runs = [];
let cur = { start: all[0], end: all[0], n: 1 };
for (let i = 1; i < all.length; i++) {
  const prev = new Date(cur.end);
  prev.setUTCDate(prev.getUTCDate() + 1);
  const expected = prev.toISOString().slice(0, 10);
  if (all[i] === expected) {
    cur.end = all[i];
    cur.n++;
  } else {
    runs.push(cur);
    cur = { start: all[i], end: all[i], n: 1 };
  }
}
runs.push(cur);

const filtered = runs.filter((run) => run.n >= minLen);

console.log(`runs (≥ ${minLen} days):\n`);
console.log('  start        end          nights  approx month');
console.log('  ────────     ────────     ──────  ────────────');
for (const run of filtered) {
  const month = new Date(run.start).toLocaleString('en', { month: 'long', year: 'numeric' });
  console.log(`  ${run.start}   ${run.end}   ${String(run.n).padStart(4)}    ${month}`);
}

console.log(`\nTotal: ${filtered.reduce((s, r) => s + r.n, 0)} dates in ${filtered.length} runs.\n`);

// ── Audit overlay (best-effort) ─────────────────────────────────────────
// Pull the audit log and annotate each currently-blocked date with the
// most recent block-event for it. Lets the owner spot which dates came
// from a test script (HeadlessChrome / Playwright / WebDriver UA) vs.
// from a real /admin click.
try {
  const audit = await fetch(`${BASE}/api/admin/blocked-dates/audit`, {
    headers: { 'x-admin-password': PASS },
  }).then((r) => r.json());
  const entries = audit.entries || [];
  if (entries.length === 0) {
    console.log('Audit log: empty (audit was added in commit 07c3a44 — older blocks');
    console.log('are not tracked retroactively). Going forward every block/unblock');
    console.log('is recorded with IP, User-Agent, source, and bookingId if applicable.');
  } else {
    // Build a per-date map of the most recent block entry
    const byDate = new Map();
    for (const e of entries) {
      if (e.action === 'block') byDate.set(e.date, e);
    }
    console.log('Audit overlay (most-recent block-event per date):\n');
    console.log('  date         source   ua-class       set by ip          bookingId');
    console.log('  ────────     ──────   ──────────     ─────────────────  ──────────');
    let bot = 0;
    let manual = 0;
    let unknown = 0;
    for (const d of all) {
      const e = byDate.get(d);
      if (!e) { unknown++; continue; }
      const uaClass = /Headless|Playwright|WebDriver|Selenium/i.test(e.ua) ? 'TEST'
                    : /iPhone|iPad|Mobile/.test(e.ua) ? 'mobile'
                    : /Safari/.test(e.ua) ? 'browser'
                    : 'other';
      if (uaClass === 'TEST') bot++;
      else manual++;
      console.log(`  ${d}   ${(e.source + '       ').slice(0, 7)} ${(uaClass + '          ').slice(0, 11)}    ${(e.ip + '                  ').slice(0, 17)}  ${e.bookingId?.slice(0, 8) || ''}`);
    }
    console.log(`\nClassification: ${bot} test-residue, ${manual} owner/browser, ${unknown} pre-audit (unknown).`);
  }
} catch (e) {
  console.log(`(audit overlay unavailable: ${e.message})`);
}

console.log('\nNext step: review each run with the owner. Anything Ivana doesn\'t');
console.log('recognise — especially anything marked TEST in the audit overlay — is');
console.log('a leak and can be unblocked via /admin.');
