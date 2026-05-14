---
name: test-everything
description: Run the full housey test pyramid (unit → integration → e2e → live) against local dev + production, with clean state isolation between runs.
---

# test-everything

The full housey test pyramid. Use when the user says "test everything", "run all tests", "verify everything still works", "test painfully", or after making changes that touch multiple layers.

## Preflight

1. **Disable `.env.local` so local tests don't try to hit Resend / Vercel KV:**
   ```bash
   [ -f .env.local ] && mv .env.local .env.local.DISABLED-FOR-TESTS
   ```
2. **Reset data files to empty so e2e tests start clean:**
   ```bash
   echo '[]' > data/bookings.json
   echo '[]' > data/images.json
   ```
   Do NOT touch `data/blocked-dates.json` — that's a real-ish dataset and several tests assume specific dates exist there.
3. **Boot local dev server on :3457:**
   ```bash
   pkill -f "next dev" 2>/dev/null; sleep 1
   nohup npx next dev -p 3457 > /tmp/housey-dev.log 2>&1 &
   ```
4. **Wait for server to respond:**
   ```bash
   for i in 1 2 3 4 5 6 7 8 9 10; do
     s=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3457/api/images)
     [ "$s" = "200" ] && break
     sleep 1
   done
   ```

## Run order

Tiers run in order. Each must pass before moving on.

```bash
npm run test:unit          # 92 tests, ~300 ms
npm run test:integration   # 16 suites, ~30 s, hits localhost:3457
npm run test:e2e           # 9 selenium + playwright suites, ~3 min, uses real chrome-headless-shell
npm run test:live          # 5 suites against https://www.tankaraca.com — real KV, real Blob, sentinel-emails get cleaned up
```

## Failure investigation rules

- **Single suite fails in e2e**: re-run that one suite in isolation (`node test/e2e/<name>.mjs`). If it passes alone but fails when chained, the failure is test-isolation (previous suite polluted data files). Either fix that suite's cleanup or update its snapshot/restore wrapper.
- **`UnexpectedAlertOpenError: Failed to send booking request`** in `scheduling-selenium.mjs`: the booking form alert fired because Resend is missing AND a previous suite left a conflicting booking in `data/bookings.json`. Reset bookings.json to `[]` and re-run.
- **`ElementClickInterceptedError`** in admin tests after my undo-toast changes: a toast in the bottom-right corner is covering buttons. Tests need to wait or scroll. Don't disable the toast.
- **Live `lifecycle-live.mjs` or `images-lifecycle-live.mjs` fails on confirm/decline/delete assertions**: those flows now have a 10s undo grace window. Test must `sleep 11_500` before checking persisted KV state.
- **Live drift on `data/blocked-dates`**: if a prior live run failed before cleanup, dates leak. Compare current production blocked-dates against the test's snapshot via `curl /api/admin/blocked-dates`. Don't blow them away — Ivana has real dates blocked. Ask before manually cleaning.

## Postflight (always run, even if tests fail)

```bash
pkill -f "next dev" 2>/dev/null
[ -f .env.local.DISABLED-FOR-TESTS ] && mv .env.local.DISABLED-FOR-TESTS .env.local
echo '[]' > data/bookings.json
echo '[]' > data/images.json
```

## Report format

After all tiers:

```
| Tier | Result |
|---|---|
| Unit | N / N ✓ |
| Integration | N / N ✓ |
| E2E | N / N ✓ |
| Live | N / N ✓ |
```

If any failure: name the suite, name the failing assertion, classify (test-isolation vs. real regression), and propose the fix before applying it.
