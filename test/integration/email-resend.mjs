// Live Resend integration smoke test. Verifies the API key + verified
// sender domain by sending to Resend's `delivered@resend.dev` test
// address (silently accepted, never delivered — does NOT spam anyone).
//
// Gated on RESEND_API_KEY being present in the environment. Skips
// cleanly when unset, which is the default for our local sweeps
// (.env.local is moved aside).
//
// NOT in the integration/run.mjs orchestrator. Run explicitly with:
//   RESEND_API_KEY=$(grep RESEND_API_KEY .env.local | cut -d= -f2 | tr -d '"') \
//   node test/integration/email-resend.mjs

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

if (!process.env.RESEND_API_KEY) {
  log('SKIP — RESEND_API_KEY not set (this test is opt-in)');
  process.exit(0);
}

log('=== Direct Resend API smoke ===');
const r = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Housey <noreply@tankaraca.com>',
    to: ['delivered@resend.dev'],   // Resend's test address (drops silently)
    subject: 'Housey integration smoke — please ignore',
    html: '<p>Automated test from the housey integration suite. No action needed.</p>',
  }),
});
const body = await r.json().catch(() => ({}));
log(`  status: ${r.status}`);
log(`  body:   ${JSON.stringify(body).slice(0, 200)}`);

ok(r.status === 200, `1a: Resend API accepts the request (got ${r.status})`);
ok(typeof body.id === 'string' && body.id.length > 0,
  `1b: response includes a Resend message id (${body.id?.slice(0, 16)}…)`);

log('');
log(failures === 0
  ? 'PASS — Resend integration works (API key valid, sender domain verified, accepted) ✓'
  : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
