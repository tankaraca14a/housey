// Navigation health: every link in the header points to a 200-returning
// page; random paths return 404; the canonical pages have expected
// content markers.

const BASE = 'http://localhost:3457';
const NAV_LINKS = ['/', '/about', '/gallery', '/location', '/booking', '/contact', '/admin'];

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

log('=== Every nav link is reachable ===');
for (const path of NAV_LINKS) {
  const r = await fetch(`${BASE}${path}`);
  ok(r.status === 200, `${path} → 200 (got ${r.status})`);
}

log('\n=== Unknown URLs return 404 ===');
for (const path of ['/does-not-exist', '/foo/bar/baz', '/admin/secret', '/wp-admin', '/.env']) {
  const r = await fetch(`${BASE}${path}`);
  ok(r.status === 404, `${path} → 404 (got ${r.status})`);
}

log('\n=== Canonical content markers ===');
const home = await fetch(`${BASE}/`).then((r) => r.text());
ok(/Housey/i.test(home), 'home: contains "Housey"');
const booking = await fetch(`${BASE}/booking`).then((r) => r.text());
ok(/Book Your Stay|Book Now|Reservation/i.test(booking), 'booking: contains booking-related copy');
const contact = await fetch(`${BASE}/contact`).then((r) => r.text());
ok(/tankaraca14a@gmail\.com/.test(contact), 'contact: shows email');
const location = await fetch(`${BASE}/location`).then((r) => r.text());
ok(/Vela Luka|Korčula|Korcula/i.test(location), 'location: mentions Vela Luka / Korčula');

log('');
log(failures === 0 ? `PASS — navigation health verified (${NAV_LINKS.length} pages + 5 404 probes) ✓` : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
