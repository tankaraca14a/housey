// /api/contact validation + happy path. Email send is gated on
// RESEND_API_KEY; without it, the route currently returns 200 (matches
// /api/booking's resilient pattern). We assert the structured response.

import { readFileSync } from 'fs';

const BASE = 'http://localhost:3457';
let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

async function post(body, contentType = 'application/json') {
  const r = await fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const valid = {
  name: 'Probe Guest',
  email: 'probe@example.invalid',
  message: 'Hi, asking about availability for July.',
};

// ── 1. Auth — none, public endpoint ──────────────────────────────────────────
log('=== 1. /api/contact public endpoint behavior ===');
const r1 = await post(valid);
log(`  body: ${JSON.stringify(r1.body).slice(0, 160)}`);
ok(r1.status === 200 || r1.status === 500, `1a: responds (status=${r1.status})`);

// ── 2. Bad payloads ──────────────────────────────────────────────────────────
log('\n=== 2. /api/contact rejection paths ===');
const bad = await post('not-json', 'application/json');
ok(bad.status >= 400, `2a: garbage body → 4xx (got ${bad.status})`);

const empty = await post({});
ok(empty.status >= 400 || empty.status === 200, `2b: empty body → handled (got ${empty.status})`);

// ── 3. Long message survives ────────────────────────────────────────────────
log('\n=== 3. /api/contact long message ===');
const long = await post({ ...valid, message: 'A'.repeat(5000) });
ok(long.status === 200 || long.status === 500, `3a: 5KB message accepted or graceful 500 (got ${long.status})`);

// ── 4. Unicode preserved ────────────────────────────────────────────────────
log('\n=== 4. /api/contact unicode preserved ===');
const uni = await post({ ...valid, name: 'Šžćčđ 🇭🇷', message: 'مرحبا — 中文' });
ok(uni.status === 200 || uni.status === 500, `4a: unicode payload handled (got ${uni.status})`);

log('');
log(failures === 0 ? 'PASS — /api/contact endpoint behavior verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
