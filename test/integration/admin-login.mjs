// Admin login edge cases. The handleLogin verifies the typed password by
// hitting GET /api/admin/bookings — so this is essentially "auth attempt"
// testing on that endpoint. Empty, wrong, correct, special chars.

const BASE = 'http://localhost:3457';

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
async function attempt(pw, headers = {}) {
  const r = await fetch(`${BASE}/api/admin/bookings`, {
    headers: { ...headers, 'x-admin-password': pw },
  });
  return r.status;
}

log('=== Admin login edge cases ===');
ok(await attempt('ivana2026') === 200, 'a: correct password → 200');
ok(await attempt('wrong') === 401, 'b: wrong password → 401');
ok(await attempt('') === 401, 'c: empty password → 401');
ok(await attempt('IVANA2026') === 401, 'd: case-sensitive (uppercase rejected)');
// HTTP spec (RFC 9112) says intermediaries / parsers SHOULD trim
// leading/trailing OWS from header values, so ' ivana2026 ' is equivalent
// to 'ivana2026' at the wire level. Not testable here.
ok(await attempt('ivana2026; DROP TABLE bookings;') === 401, 'f: SQL-injection-style suffix rejected');
// Note: HTTP header values can't carry newlines per RFC 7230 — Node's
// fetch silently strips them so this isn't actually testable at the
// network layer. Skipped.

// No header at all
const r = await fetch(`${BASE}/api/admin/bookings`);
ok(r.status === 401, 'h: missing x-admin-password header → 401');

// Header with empty string
const re = await fetch(`${BASE}/api/admin/bookings`, { headers: { 'x-admin-password': '' } });
ok(re.status === 401, 'i: empty x-admin-password header → 401');

// Brute-force pace: 20 rapid wrong attempts — should all 401, no lockout (we don't have one)
const burst = await Promise.all(Array.from({ length: 20 }, () => attempt('wrong')));
ok(burst.every((s) => s === 401), 'j: 20 rapid wrong attempts all → 401 (no false positives)');
// (no lockout assertion since we don't currently implement one — see follow-up issue)

log('');
log(failures === 0 ? 'PASS — admin login edge cases verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
