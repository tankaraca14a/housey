---
name: setup-transactional-email
description: Resend domain + DKIM + sender configured, route pattern with graceful-failure handling so a Resend outage never loses the underlying data. Includes the 10s defer pattern when the email is reversible.
---

# setup-transactional-email

Use when the app sends booking confirmations, contact-form replies, password resets, or any other transactional email.

**Provider default**: Resend. Reasons: simple API, generous free tier, good Vercel integration, supports `scheduledAt` + `cancel` for advanced flows.

## Steps

### 1. Resend account + domain

```bash
# Open dashboard for the new project
open https://resend.com/domains
```

Add your sending domain (e.g. `tankaraca.com`). Resend gives DKIM, SPF, and DMARC records to add at your DNS provider. Wait until Resend's verification badge turns green (5-30 min).

### 2. Sender identities

Create a couple of `from:` addresses:
- `noreply@example.com` — for system-triggered email (confirmations, resets)
- `bookings@example.com` (or similar) — for owner-monogrammed transactional copy

### 3. API key + Vercel env

```bash
vercel env add RESEND_API_KEY production
vercel env pull .env.local --yes
```

### 4. SDK

```bash
npm install resend
```

### 5. The route pattern (graceful-failure invariant)

**Rule: the data write ALWAYS commits BEFORE the email send. Email failure must not roll back the data.**

```ts
// app/api/<thing>/route.ts
import { Resend } from 'resend';
import { thing as thingRepo } from '@/app/lib/store-factory';

export async function POST(request: Request) {
  // 1. Validate
  const body = await request.json();
  if (!body.email || !body.message) {
    return Response.json({ error: 'missing fields' }, { status: 400 });
  }

  // 2. Persist FIRST — this is the source of truth
  const saved = await thingRepo.insert({
    id: crypto.randomUUID(),
    ...body,
    createdAt: new Date().toISOString(),
  });

  // 3. Send email — best-effort. Failures surfaced in response, NOT thrown.
  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: 'Sitename <noreply@example.com>',
        to: [saved.email],
        subject: 'Subject',
        html: renderTemplate(saved),
      });
      if (error) {
        emailError = typeof error === 'string' ? error : JSON.stringify(error);
      } else {
        emailSent = true;
      }
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
  } else {
    emailError = 'RESEND_API_KEY not configured';
  }

  return Response.json({ success: true, id: saved.id, emailSent, emailError });
}
```

Why this shape:
- A Resend outage doesn't make the user feel like the submit failed.
- The admin sees the row in their dashboard regardless — they can re-send manually if needed.
- `emailSent` + `emailError` in the response lets the client show "we got your booking, the confirmation email may be a few minutes late" instead of "ERROR — try again."

### 6. Re-send-safe templates

Each email should be **idempotent in receipt**:
- Include a clear identifier (booking ID, contact reference).
- Avoid wording like "We just received your..." if the same email might re-send. Use "Your booking is confirmed" instead.

### 7. Reversibility — the 10s defer pattern

For emails the admin manually triggers (Confirm a pending booking, Decline a booking) the admin should be able to **undo before the email is dispatched**. Don't use Resend's `scheduledAt` for this — it's heavier than needed. Defer the API call client-side via `setTimeout`:

See `/add-undo-pattern` skill. The recipe applies to any "click this button → email + side effect" action.

## Verify

```bash
# 1. Send a test email
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@example.com","to":["delivered@resend.dev"],"subject":"test","html":"<p>hi</p>"}'
# Should return { id: "..." } with 200.

# 2. Poll Resend's audit API for delivery
curl -H "Authorization: Bearer $RESEND_API_KEY" \
  "https://api.resend.com/emails?limit=10" \
  | jq '.data[] | {id, subject, last_event}'
# `last_event: "delivered"` proves the wire reached recipient SMTP.
```

The user has a battle-tested live test for this pattern: see `test/live/email-delivery-live.mjs` in housey. It polls the Resend audit log until `last_event=delivered`.

## Common errors

- **`Domain not verified`**: DKIM/SPF records haven't propagated or were typed wrong. `dig TXT example.com._domainkey` from outside your network.
- **`Invalid sender`**: the `from:` address doesn't match a verified domain. Use the exact domain Resend confirmed.
- **Email sent but never arrives**: check Resend dashboard — the audit shows `bounced` / `complained` / `delayed` states.
- **Mass cleanup needed because tests sent to real addresses**: use `delivered@resend.dev` (accept-and-drop) as your sentinel recipient in tests.

## Next steps

- `/add-form-with-route` to wire a contact form.
- `/add-undo-pattern` if any "trigger an email" button should be reversible.
- `/test-everything` includes `email-resilience.mjs` to verify graceful-failure stays graceful.
