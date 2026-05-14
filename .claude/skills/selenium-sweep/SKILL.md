---
name: selenium-sweep
description: Run EVERY Selenium-driven test in the repo (5 local + 2 production), count assertions per suite, prove real Chrome WebDriver execution with timestamped screenshots.
---

# selenium-sweep

Use when the user says "use selenium", "run all selenium tests", "I don't trust you, prove it with selenium", or wants explicit evidence that WebDriver (not Playwright, not curl) drove the checks.

Selenium and Playwright tests overlap in coverage on purpose — different automation stacks catch different bugs. This skill isolates the Selenium half so the user can see exactly which assertions were proven by WebDriver against a real `chrome-headless-shell` binary.

## What it runs

### Local Selenium suite (5 files, ~105 assertions)

| File | Coverage |
|---|---|
| `test/e2e/scheduling-selenium.mjs` | /admin month navigation + /booking calendar + booking submission |
| `test/e2e/admin-crud-selenium.mjs` | Login → confirm → decline → status-dropdown → edit-with-undo → manual booking → delete-with-undo → server-error surfacing |
| `test/e2e/delete-undo-selenium.mjs` | 2-confirm + 10s undo for booking delete (positive, negative, cancel-first, cancel-second) |
| `test/e2e/image-undo-selenium.mjs` | 2-confirm + 10s undo for image delete |
| `test/e2e/confirm-decline-undo-selenium.mjs` | 2-confirm + 10s undo for Confirm + Decline (optimistic UI, server stays pending during grace, undo leaves zero residue, real flip after timer) |

### Production Selenium suite (2 files, ~31 assertions)

| File | Coverage |
|---|---|
| `test/live/admin-live.mjs` | Auth probes, CRUD, race-condition stress, UI status-select + edit-panel rename. Real production KV + Blob + Resend. Sentinel-email cleanup in `finally`. |
| `scripts/check-everything.mjs` (via `BASE=https://...`) | Every public page + admin login + admin sections + Add Booking panel + Logout. 13 PNG screenshots saved. |

## Method

### Preflight

1. **Local server up on :3457** (see `/test-everything` preflight). Move `.env.local` aside, reset `data/bookings.json` and `data/images.json` to `[]`.
2. **For production runs**: restore `.env.local` (Resend key needs to be readable for sentinel cleanup; admin-live uses it for the API auth).
3. **Verify the Selenium binary path**: `chrome-headless-shell` ships with Playwright's chromium install. The selenium tests hardcode this fallback path: `/Users/<user>/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell`. If missing, `npx playwright install chromium`.

### Run

Use this exact shape so each suite is isolated AND the assertion-count summary is captured at the end:

```bash
cd <repo>
echo '[]' > data/bookings.json
echo '[]' > data/images.json

TOTAL=0; PASS=0; FAIL=0
run() {
  local name="$1"; local cmd="$2"
  TOTAL=$((TOTAL+1))
  echo "═══ SELENIUM: $name ═══"
  if eval "$cmd" > /tmp/sel-out.log 2>&1; then
    grep -E "✓|✗|PASS|FAIL" /tmp/sel-out.log
    PASS=$((PASS+1))
  else
    echo "FAILED"; tail -30 /tmp/sel-out.log; FAIL=$((FAIL+1))
  fi
  # Reset between tests so leaks don't cascade
  echo '[]' > data/bookings.json
  echo '[]' > data/images.json
}

# LOCAL — server must be up on :3457
run "scheduling-selenium"             "node test/e2e/scheduling-selenium.mjs"
run "admin-crud-selenium"             "node test/e2e/admin-crud-selenium.mjs"
run "delete-undo-selenium"            "node test/e2e/delete-undo-selenium.mjs"
run "image-undo-selenium"             "node test/e2e/image-undo-selenium.mjs"
run "confirm-decline-undo-selenium"   "node test/e2e/confirm-decline-undo-selenium.mjs"

# PRODUCTION — needs .env.local restored for admin-live's password + sentinel cleanup
run "admin-live (Selenium on prod)"   "node test/live/admin-live.mjs"
run "check-everything on prod"        "BASE=https://www.tankaraca.com node scripts/check-everything.mjs"

echo "TOTAL: $PASS/$TOTAL passing"
```

### Proof of Selenium (not Playwright)

After the run, confirm:

```bash
# Imports prove WebDriver
grep -l "from 'selenium-webdriver'" test/e2e/*.mjs test/live/*.mjs scripts/*.mjs

# Version pinned
grep selenium package.json
node -e "console.log(require('./node_modules/selenium-webdriver/package.json').version)"

# Fresh PNG evidence from this run
ls -lt test/e2e/screens-selenium/ test/e2e/screens-check-everything/ | head -10
```

## Failure handling

- **All assertions pass per suite but one suite stack-traces**: usually means previous suite left a row in `data/bookings.json`. Reset state and re-run that suite alone. (`run()` above does this between every test.)
- **`UnexpectedAlertOpenError`**: a confirm dialog is open when the next action tries to fire. Selenium catches this because Playwright eats them silently. Check the test's auto-accept setup: `window.confirm = () => true` injected via `executeScript` BEFORE the click.
- **`ElementClickInterceptedError`**: another element (often a toast) covers the click target. Either wait for the toast to disappear or click via JS: `driver.executeScript('arguments[0].click()', el)`.
- **`chromedriver` crash on prod runs**: Selenium spawns a child process; if the system is resource-starved (during cross-browser sweep) it can OOM. Run prod suite separately.

## Report format

```
## Local Selenium (5/5)
| Suite | Assertions |
|---|---|
| scheduling-selenium     | N |
| admin-crud-selenium     | N |
| delete-undo-selenium    | N |
| image-undo-selenium     | N |
| confirm-decline-undo    | N |

## Production Selenium (2/2)
| Suite | Assertions |
|---|---|
| admin-live              | N |
| check-everything (prod) | N |

Total Selenium assertions: N
Screenshots written: <count>
```

## When NOT to use this

- For programmatic-only checks (Resend delivery, email-resilience, integration suites) → use `/test-everything`.
- For Playwright-specific browsers (webkit, firefox) → use `npm run test:e2e:cross-browser`.
- For "just one page render check" → `BASE=... node scripts/check-everything.mjs` directly, not the full Selenium sweep.
