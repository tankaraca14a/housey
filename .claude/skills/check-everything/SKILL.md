---
name: check-everything
description: Selenium-driven visual + functional sweep of every public page and the key admin flow. Screenshots each step to test/e2e/screens-check-everything/. Runs against local OR live with one env var.
---

# check-everything

Use when the user says "check everything", "is it all working", "give me a visual sweep", or after any deploy you want to verify isn't visibly broken.

This is the **visual / functional** counterpart to `/test-everything` (which is programmatic assertions only). It drives a real headless chromium through 6 public pages and the full admin flow, takes 13 PNG screenshots, and asserts every step rendered correctly.

## Method

The work happens in `scripts/check-everything.mjs`. The skill just wires up the env vars and confirms preflight.

### Preflight

1. **Decide target**: local (default) or production.
   - Local: needs `next dev` running on `:3457` (see `/test-everything` preflight).
   - Production: pass `BASE=https://www.tankaraca.com` env var; no local server needed.
2. **`.env.local` state doesn't matter** for this script — it doesn't write to bookings or Resend.

### Run

```bash
# Local (default)
node scripts/check-everything.mjs

# Production
BASE=https://www.tankaraca.com node scripts/check-everything.mjs
```

Output: 13 PNGs in `test/e2e/screens-check-everything/`:

| # | File | What it shows |
|---|---|---|
| 01 | `01-home.png` | `/` landing page |
| 02 | `02-about.png` | `/about` |
| 03 | `03-gallery.png` | `/gallery` |
| 04 | `04-location.png` | `/location` |
| 05 | `05-booking.png` | `/booking` (clean state) |
| 06 | `06-contact.png` | `/contact` |
| 07 | `07-booking-range-selected.png` | After picking 7 nights on the booking calendar |
| 08 | `08-admin-login.png` | `/admin` password screen |
| 09 | `09-admin-after-login.png` | Post-login admin dashboard top |
| 10 | `10-admin-images-section.png` | Scrolled to Images section |
| 11 | `11-admin-bookings-section.png` | Scrolled to Bookings section |
| 12 | `12-admin-add-booking-panel.png` | `+ Add booking` panel open |
| 13 | `13-admin-logged-out.png` | After clicking Logout |

Plus 13 assertions printed to stdout (one per `✓` / `✗` line).

## What it covers

- Every nav link resolves and renders its canonical content.
- Booking calendar accepts a range and computes Duration.
- Admin login flow (with HR→EN toggle if needed).
- 3 month headings render after login (calendar populated from KV).
- Images and Bookings sections both reachable and rendered.
- Add Booking panel opens cleanly.
- Logout returns to password screen.

## What it does NOT cover (use `/test-everything` for these)

- Booking submission with side effects (use `lifecycle-live.mjs`).
- Confirm/Decline undo flows (use `confirm-decline-undo-selenium.mjs` or `confirm-undo-live.mjs`).
- Image upload with real Blob (use `images-lifecycle-live.mjs`).
- Cross-browser (use `npm run test:e2e:cross-browser`).
- Email delivery (use `email-delivery-live.mjs`).

## Failure handling

- If any assertion fails, the script saves `99-fatal-state.png` showing the last good state plus a stack trace.
- **First-place to look**: the failed assertion's expected text vs. what's actually on the page (the script reads `body.innerText`).
- **Bilingual gotcha**: production defaults to HR. The script tolerates both labels (e.g. `Bookings`/`Rezervacije`, `Images`/`Slike`) for admin-section assertions but expects English headings on public pages because of canonical content markers.

## When to extend

Add a new screenshot step when:
- A new top-level page ships (`/something-new`).
- A new admin action gets its own dedicated UI element.

Skip adding a step for:
- Toast-style transient UI (covered by the dedicated `*-undo-*` tests).
- Anything that needs cleanup on production (this skill is read-mostly — only `+ Add booking` opens then cancels).

## Report format

```
| Target | Result |
|---|---|
| local  | N / N ✓ — screens in test/e2e/screens-check-everything/ |
| prod   | N / N ✓ |
```

If failures: name the assertion, link the screenshot, classify (env drift vs. real regression).
