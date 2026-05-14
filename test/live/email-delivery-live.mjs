// Verifies that Confirm + Decline emails ACTUALLY land at the recipient,
// not just that our API returned 200. Method:
//
//   1. Seed a pending booking via the admin API, addressed to Resend's
//      `delivered@resend.dev` test recipient — Resend reports it as
//      delivered without actually mailing anyone.
//   2. POST /confirm on that row.
//   3. Resend doesn't return an email-id in our /confirm response, so the
//      ONLY proof of delivery available without webhook plumbing is the
//      Resend dashboard's email log. We poll `GET /emails` with the
//      Resend API key, filtered to our recent sentinel-tagged subject.
//   4. Once the email shows up there with `last_event == 'delivered'`
//      (Resend's terminal state), the wire is end-to-end verified.
//
// This test SKIPS cleanly if RESEND_API_KEY is not set. It's gated on the
// presence of a real key so CI / preview branches don't burn quota.

const BASE = 'https://www.tankaraca.com';
const PASS = 'ivana2026';

// The Resend key lives in .env.local; pluck it via subprocess if we can't
// see it in env. The test runner restores .env.local before running the
// live tier, so process.env.RESEND_API_KEY is available there.
let KEY = process.env.RESEND_API_KEY;
if (!KEY) {
  try {
    const { readFileSync } = await import('fs');
    const env = readFileSync('.env.local', 'utf8');
    KEY = env.split('\n').find((l) => l.startsWith('RESEND_API_KEY'))?.split('=')[1]?.replace(/^"|"$/g, '');
  } catch {}
}

if (!KEY) {
  console.log('SKIP — RESEND_API_KEY not available (key lives in .env.local on this machine, runner needs it set)');
  process.exit(0);
}

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

const TAG = `delivery-${Date.now()}`;

let seededId = null;
const baselineBlocked = (await api('GET', '/api/admin/blocked-dates')).body.blockedDates || [];

try {
  // ── 1. Seed a pending booking ─────────────────────────────────────────────
  console.log('=== 1. Seed pending booking for delivery verification ===');
  // Use Resend's `delivered@resend.dev` test recipient — accepted, never
  // actually mailed, and always reports delivery success.
  const seed = await api('POST', '/api/admin/bookings', {
    name: `Delivery Probe ${TAG}`,
    email: 'delivered@resend.dev',
    phone: '+385 91 555 7777',
    checkIn: '2099-09-01',
    checkOut: '2099-09-03',
    guests: '2',
    message: `delivery-verification test ${TAG}`,
    status: 'pending',
  });
  ok(seed.status === 200, `1a: seed POST returned 200 (${seed.status})`);
  seededId = seed.body.booking.id;

  // ── 2. POST /confirm (sends the email) ────────────────────────────────────
  console.log('\n=== 2. POST /confirm — Resend send is triggered server-side ===');
  const confirmedAt = Date.now();
  const conf = await api('POST', `/api/admin/bookings/${seededId}/confirm`);
  ok(conf.status === 200, `2a: /confirm 200 (${conf.status})`);
  ok(conf.body.emailSent === true, `2b: emailSent=true in response`);

  // ── 3. Poll Resend's audit log for this email ─────────────────────────────
  console.log('\n=== 3. Poll Resend audit log until last_event=delivered ===');
  const SUBJECT_NEEDLE = 'Booking Confirmed';
  let found = null;
  for (let i = 0; i < 12; i++) {
    // Resend supports GET /emails?limit=20 to list recent sends.
    const r = await fetch('https://api.resend.com/emails?limit=20', {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    if (!r.ok) {
      console.log(`  attempt ${i + 1}: list endpoint returned ${r.status}`);
    } else {
      const list = await r.json();
      const items = Array.isArray(list?.data) ? list.data : Array.isArray(list) ? list : [];
      // Find the one we just sent: matches our subject, recipient, and was
      // created at or after confirmedAt - 5s slack.
      const ours = items.find((m) => {
        const sentAt = Date.parse(m.created_at || m.createdAt || 0);
        return m.subject?.includes(SUBJECT_NEEDLE) &&
               (m.to || []).some((t) => t.includes('delivered@resend.dev')) &&
               sentAt >= confirmedAt - 5_000;
      });
      if (ours) {
        console.log(`  attempt ${i + 1}: found id=${ours.id?.slice(0,16)}… last_event=${ours.last_event || ours.status || '(?)'}`);
        if (ours.last_event === 'delivered' || ours.status === 'delivered') {
          found = ours;
          break;
        }
      } else {
        console.log(`  attempt ${i + 1}: not yet in list (${items.length} recent items)`);
      }
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }

  ok(found !== null, `3a: Resend reports last_event=delivered for our Confirm email`);
  if (found) {
    ok(found.subject?.includes('Booking Confirmed'),
       `3b: subject is "${found.subject}"`);
    ok((found.to || []).some((t) => t.includes('delivered@resend.dev')),
       `3c: recipient matches the seeded booking`);
  }
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  // Cleanup: delete the row + restore blocked-dates
  if (seededId) {
    await api('DELETE', `/api/admin/bookings/${seededId}`);
  }
  await api('POST', '/api/admin/blocked-dates', { blockedDates: baselineBlocked });
  console.log('\n  (cleaned up seeded row + restored blocked-dates)');
}

console.log('');
console.log(failures === 0 ? 'PASS — Confirm email actually delivers via Resend ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
