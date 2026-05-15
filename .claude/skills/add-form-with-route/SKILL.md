---
name: add-form-with-route
description: Add a guest-facing form (contact, booking, signup, etc.) with react-hook-form + zod validation, a Next.js route handler that persists + emails, success/error UX, and the test triad covering all three.
---

# add-form-with-route

Use for any form a non-logged-in user submits. NOT for admin-side forms — those go inline in the admin page (see `/add-admin-page`).

## Stack

- `react-hook-form` for state + binding
- `zod` for schema validation (client + server share the same schema)
- `@hookform/resolvers/zod` to bridge them
- Next.js Route Handler for the server (no Server Actions — keeps the form independent of React 19 specifics)
- Resend for the optional confirmation email (see `/setup-transactional-email`)

`npm install react-hook-form zod @hookform/resolvers`

## File layout

```
app/<route>/page.tsx        # client component with the form
app/api/<route>/route.ts    # POST handler
app/lib/<thing>.ts          # validators + types (live alongside the model)
```

Where the validator lives depends on whether error messages need to be translated:

- **Static error strings** (English-only, or no i18n): put the schema in `app/lib/<thing>.ts` next to the model. Both the client form (via `zodResolver`) and the route handler import the same exported `schema` constant. This is the cleanest split.

- **Translated error messages** (i18n required): the schema must be built *inside* the page component with `useMemo` so it can call `useT()`. See `app/booking/page.tsx:292` for the real-world example — `bookingSchema` is defined inside the component because its error messages need to render in the user's chosen language. The server still validates separately in `app/api/<route>/route.ts` via a plain validator function (housey calls these `validate<Thing>Input` — see `app/lib/bookings.ts`), since the server has no React context.

Both shapes coexist in this repo. Pick by whether the form is i18n.

## Schema (static-error version)

```ts
// app/lib/contact.ts — only when error strings don't need translation
import { z } from 'zod';

export const contactSchema = z.object({
  name:    z.string().min(1, 'name required').max(120),
  email:   z.string().email('valid email required'),
  phone:   z.string().regex(/^[\d+\s()-]{5,30}$/, 'valid phone required').optional(),
  message: z.string().min(5, 'tell us a bit more').max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;
```

## Schema (i18n version)

```tsx
// inside app/<route>/page.tsx
const t = useT();
const formSchema = useMemo(() => z.object({
  name:    z.string().min(1, t.formNameRequired).max(120),
  email:   z.string().email(t.formEmailInvalid),
  // ...
}), [t]);
```

## Client form

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { contactSchema, type ContactInput } from '@/app/lib/contact';

export default function ContactPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<ContactInput>({ resolver: zodResolver(contactSchema) });
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (data: ContactInput) => {
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error('failed');
      setSubmitted(true);
      reset();
      setTimeout(() => setSubmitted(false), 5000);
    } catch (e) {
      console.error('contact submit:', e);
      alert('Failed to send message. Please try again or email us directly.');
    }
  };

  if (submitted) {
    return <div className="container py-16 text-center">
      <h2 className="text-3xl font-bold text-white">Thank you!</h2>
      <p className="text-slate-300 mt-2">We'll be in touch shortly.</p>
    </div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="container py-16 max-w-2xl mx-auto space-y-4">
      <input {...register('name')} placeholder="John Doe"
        className="w-full px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white" />
      {errors.name && <p className="text-red-400 text-sm">{errors.name.message}</p>}

      <input {...register('email')} placeholder="john@example.com" type="email"
        className="w-full px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white" />
      {errors.email && <p className="text-red-400 text-sm">{errors.email.message}</p>}

      <textarea {...register('message')} placeholder="Your message..." rows={6}
        className="w-full px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white" />
      {errors.message && <p className="text-red-400 text-sm">{errors.message.message}</p>}

      <button type="submit" disabled={isSubmitting}
        className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl disabled:opacity-50">
        {isSubmitting ? 'Sending…' : 'Submit'}
      </button>
    </form>
  );
}
```

Notes:

- The submit button MUST be `disabled` while submitting, otherwise impatient users will double-submit.
- Success state inside the same component, not a redirect. Redirects break "back button" UX.
- `alert()` for failures is fine — guests rarely see this and a toast library would be a dep.

## Server route

```ts
// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { contactSchema } from '@/app/lib/contact';
import { Resend } from 'resend';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }
  const data = parsed.data;

  // Persist FIRST (see /setup-transactional-email — data write must NOT depend on email)
  // For low-volume forms, KV insert or an admin@-forwarded email IS the persistence.

  let emailSent = false;
  let emailError: string | null = null;
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: 'Sitename <noreply@example.com>',
        to: ['owner@example.com'],
        replyTo: data.email,
        subject: `Contact form: ${data.name}`,
        html: `<p>From: ${data.name} &lt;${data.email}&gt;</p><pre>${data.message.replace(/</g, '&lt;')}</pre>`,
      });
      if (error) emailError = typeof error === 'string' ? error : JSON.stringify(error);
      else emailSent = true;
    } catch (e) {
      emailError = e instanceof Error ? e.message : String(e);
    }
  } else {
    emailError = 'RESEND_API_KEY not configured';
  }

  return NextResponse.json({ success: true, emailSent, emailError });
}
```

## Tests (three layers)

### Unit (vitest)

```ts
// test/unit/contact-schema.test.mjs
import { describe, it, expect } from 'vitest';
import { contactSchema } from '@/app/lib/contact';

describe('contactSchema', () => {
  it('accepts a valid payload', () => {
    expect(contactSchema.safeParse({
      name: 'Anna', email: 'anna@example.com', message: 'Hi there',
    }).success).toBe(true);
  });
  it('rejects empty name', () => {
    expect(contactSchema.safeParse({ name: '', email: 'a@b.c', message: 'hello' }).success).toBe(false);
  });
  // ... rejects bad email, too-short message, etc.
});
```

### Integration (real HTTP)

```js
// test/integration/contact-api.mjs
// Same shape as housey test/integration/*.mjs:
// - POST with valid body → 200 + emailSent flag
// - POST with bad body → 400 with error string
// - POST with bad JSON → 400
```

### E2E (Selenium or Playwright drives the form)

```js
// test/e2e/contact-form-playwright.mjs
// Open /contact, fill, click submit, assert success state shows.
```

## Verify

```bash
npm run test:unit && npm run test:integration && npm run test:e2e
```

## Common pitfalls

- **`safeParse` not destructured**: `parsed.data` is undefined unless `parsed.success === true`. Always check first.
- **Bot spam**: add honeypot field (hidden input that must stay empty). If reCAPTCHA needed, lean on Vercel BotID before pulling in Google.
- **The user double-clicks Submit**: `disabled` + `isSubmitting` covers this.
- **Email-failure-rolls-back-the-row trap**: never. See `/setup-transactional-email` for the right pattern.
