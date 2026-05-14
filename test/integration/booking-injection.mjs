// Defensive tests: a guest can put weird characters into name/message
// without breaking anything. We don't currently HTML-escape on render
// (the admin sees the raw string), but the message goes into a
// Resend HTML template — verify it survives the round-trip in storage
// and doesn't break JSON parsing or status flow.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const BOOKINGS_FILE = join(REPO, 'data', 'bookings.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initial = JSON.parse(readFileSync(BOOKINGS_FILE, 'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
async function post(body) {
  const r = await fetch(`${BASE}/api/booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function adminDelete(id) {
  await fetch(`${BASE}/api/admin/bookings/${id}`, { method: 'DELETE', headers: { 'x-admin-password': PASS } });
}

const baseBody = {
  name: 'Injection Test',
  email: 'inj@example.invalid',
  phone: '+385 91 555 1111',
  checkIn: '2099-06-10',
  checkOut: '2099-06-15',
  guests: '2',
};

try {
  const cases = [
    ['HTML tags in message',     { message: '<script>alert("xss")</script>' }],
    ['HTML tags in name',        { name: '<b>Bold Guest</b>' }],
    ['Newlines in message',      { message: 'line1\nline2\nline3' }],
    ['Quotes in message',        { message: `He said "hi" then 'bye'` }],
    ['Backslashes',              { message: 'C:\\path\\to\\file' }],
    ['Unicode + emoji',          { name: 'Šžćčđ 🇭🇷', message: '中文 — العربية' }],
    ['Very long name (1000 chars)', { name: 'a'.repeat(1000) }],
    ['Whitespace-only message',  { message: '   \n\t  ' }],
  ];
  log('=== Submit each weird-input case, verify persistence + roundtrip ===');
  const createdIds = [];
  for (const [label, override] of cases) {
    const body = { ...baseBody, ...override, email: `${label.replace(/\W+/g, '-')}@x.com` };
    const r = await post(body);
    ok(r.status === 200, `${label} → 200 (got ${r.status})`);
    if (r.body.id) {
      createdIds.push(r.body.id);
      // Roundtrip — read the saved row
      const list = await (await fetch(`${BASE}/api/admin/bookings`, { headers: { 'x-admin-password': PASS } })).json();
      const saved = list.bookings.find((b) => b.id === r.body.id);
      ok(!!saved, `${label}: row visible in admin`);
      // Whichever field we mutated — verify the mutated value is exactly what we sent
      const field = Object.keys(override)[0];
      ok(saved?.[field] === override[field], `${label}: ${field} byte-identical after roundtrip`);
    }
  }
  // Cleanup
  for (const id of createdIds) await adminDelete(id);
} finally {
  writeFileSync(BOOKINGS_FILE, JSON.stringify(initial, null, 2));
}

log('');
log(failures === 0 ? 'PASS — injection / weird-input handling verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
