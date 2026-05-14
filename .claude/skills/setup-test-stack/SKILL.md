---
name: setup-test-stack
description: Wire vitest (unit), node-fetch-based integration tests, Playwright + Selenium for e2e + cross-browser, and a live tier that hits production. After this skill the user has `npm run test:*` scripts and the runner glue.
---

# setup-test-stack

Use after the project has at least one feature worth testing. Result: four working tiers + the `/test-everything` + `/selenium-sweep` + `/check-everything` skills become applicable.

## Install

```bash
npm install -D vitest @vitejs/plugin-react playwright selenium-webdriver
npx playwright install chromium
# Optional cross-browser:
npx playwright install webkit firefox
```

## Package scripts

```json
{
  "scripts": {
    "test":             "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit":        "vitest run",
    "test:unit:watch":  "vitest",
    "test:integration": "node test/integration/run.mjs",
    "test:e2e":         "node test/e2e/run.mjs",
    "test:e2e:cross-browser": "node test/e2e/cross-browser-runner.mjs",
    "test:live":        "node test/live/run.mjs"
  }
}
```

## vitest.config.ts

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.{ts,mjs,js}'],
    globals: false,
  },
});
```

For tests that need browser globals (Blob, File, window) → run them under Playwright in `test/e2e/` instead of jsdom-in-vitest. The user's housey project has one example: `test/e2e/heic-conversion-playwright.mjs`.

## Directory layout

```
test/
  unit/
    *.test.mjs                  # vitest, pure logic, no I/O
  integration/
    run.mjs                     # spawns each .mjs in sequence
    <suite>.mjs                 # node fetch against http://localhost:3457
  e2e/
    run.mjs                     # spawns each .mjs in sequence, resets state between
    <suite>-playwright.mjs      # playwright
    <suite>-selenium.mjs        # selenium
    cross-browser-runner.mjs    # loops over chromium/webkit/firefox
    screens-*/                  # generated PNGs
  live/
    run.mjs                     # production tier
    <suite>-live.mjs            # hits real production; cleanup in `finally`
  fixtures/
    *.heic, *.jpg, etc.         # real binary fixtures
```

## The runners (template)

`test/integration/run.mjs`:

```js
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = [
  // add one per *.mjs in this directory
  'admin-api.mjs',
  'contact-api.mjs',
  // ...
];

let failed = 0;
for (const f of FILES) {
  console.log(`\n━━━━ ${f} ━━━━`);
  const r = spawnSync('node', [join(HERE, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(failed === 0 ? `PASS — all ${FILES.length} integration suites green` : `FAIL — ${failed}/${FILES.length} failed`);
process.exit(failed === 0 ? 0 : 1);
```

`test/e2e/run.mjs` — **same shape PLUS hard isolation between suites**:

```js
import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));

function resetState() {
  writeFileSync(join(REPO, 'data', 'bookings.json'), '[]\n');
  writeFileSync(join(REPO, 'data', 'images.json'), '[]\n');
  // Add any other JSON state files the project uses. NEVER reset
  // anything Ivana-set like blocked-dates if it's the source of truth.
}

const FILES = [/* ... */];
let failed = 0;
for (const f of FILES) {
  resetState();
  console.log(`\n━━━━ ${f} ━━━━`);
  const r = spawnSync('node', [join(HERE, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
resetState();
```

The hard isolation is mandatory. Without it, one suite's leaked booking breaks the next via overlap-conflict.

## Test conventions

Every test file:
1. Snapshots state at top.
2. Wraps the assertions in `try`.
3. **Restores state in `finally`** — regardless of pass/fail/throw.
4. Uses `process.exit(failures === 0 ? 0 : 1)` at the end.
5. Prints `✓` / `✗` per assertion + a final `PASS —` / `FAIL —` line.

```js
let failures = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { console.log(`  ✗ ${m}`); failures++; } };

const before = readFileSync('data/things.json', 'utf8');
try {
  // assertions
} catch (e) {
  console.error(`FATAL: ${e.stack || e}`);
  failures++;
} finally {
  writeFileSync('data/things.json', before);
}

console.log(failures === 0 ? 'PASS — green' : `FAIL — ${failures}`);
process.exit(failures === 0 ? 0 : 1);
```

## Live tier specifics

Live tests run against real production. Two rules:

1. **Use sentinel emails** like `<purpose>@<timestamp>.invalid` so cleanup can match by regex. Anyone seeing the row in prod can identify it as a test artifact.
2. **Cleanup is `finally`-mandatory**. List + delete all sentinel rows even if the test crashed.

Use Resend's `delivered@resend.dev` as the recipient in any live email tests — it's accept-and-drop and reports delivery without spamming real inboxes.

## Cross-browser

`test/e2e/cross-browser-runner.mjs` (template in housey). Loops `chromium`, `webkit`, `firefox` over the most representative flows (booking, gallery, admin login). Skips silently if a binary isn't installed.

## Verify the stack works

```bash
npm run test:unit         # vitest sample test runs
npm run test:integration  # one suite runs, exits 0
npm run test:e2e          # one suite runs in chromium, exits 0
npm run test:live         # one suite runs against prod, exits 0
```

If all four print PASS, the stack is wired. Now layer suites in.

## Next steps

- Apply the existing skills:
  - `/test-everything` — full pyramid
  - `/selenium-sweep` — Selenium-only
  - `/check-everything` — visual functional sweep with screenshots
  - `/post-deploy-verify` — after each push, prove it actually deployed
- Add suite per feature: every `/add-form-with-route`, `/add-admin-page`, `/add-image-upload`, `/add-undo-pattern` skill ends with "write the matching test."
