# Housey test suite

End-to-end testing strategy for a Next.js 16 (App Router) booking site
deployed on Vercel. Follows the test pyramid recommended by Next.js and the
broader Node/TypeScript community:

```
  ┌─ live ─┐         tiny — read-only smoke against production
  │ e2e    │         medium — real browser drives the running app
  │integ.  │         large — node fetch against a local server
  │ unit   │         largest — pure functions, no I/O
  └────────┘
```

| Layer | What it tests | Backend | Tool | Run |
|---|---|---|---|---|
| **unit** | Pure functions in `app/lib/*` — validators, `getDatesInRange`, `isBooking`. No filesystem, no network. | n/a | Vitest | `npm run test:unit` |
| **integration** | API routes via real HTTP against a `next start` server on `localhost:3457`. Snapshots & restores `data/*.json`. | file repo | node fetch + node:test-ish | `npm run test:integration` |
| **e2e** | Real Chromium drives `/booking` + `/admin`. Verifies the user flow including the new admin CRUD, status select, edit panel, add-booking panel, delete. Two parallel suites: Playwright (fast) AND Selenium (per request). | file repo | Playwright + Selenium | `npm run test:e2e` |
| **live** | Read-only smoke + admin sentinel-cleanup against `https://www.tankaraca.com`. Never touches Ivana's real data. | KV (prod) | Playwright + node fetch | `npm run test:live` |

## Folder layout

```
test/
├── README.md              # this file
├── unit/                  # Vitest *.test.mjs
│   └── getDatesInRange.test.mjs
├── integration/           # *.mjs against localhost:3457
│   ├── admin-api.mjs      # full /api/admin/* matrix (38 assertions)
│   ├── booking-guards.mjs # /api/booking validation + dup guard
│   ├── booking-make.mjs   # full guest booking via the UI
│   └── book-and-delete.mjs# admin delete round-trip
├── e2e/                   # browser-driven
│   ├── scheduling-playwright.mjs    # month nav + range select
│   ├── scheduling-selenium.mjs      # same, via Selenium (per request)
│   ├── booking-flow-playwright.mjs  # full guest booking
│   └── admin-crud-selenium.mjs      # admin: confirm/decline/status/edit/add/delete
├── live/                  # production smoke
│   ├── scheduling-smoke.mjs   # 6 read-only assertions on /admin + /booking
│   ├── scheduling-deep.mjs    # 14 deep assertions, parity check vs API
│   └── admin-live.mjs         # admin CRUD with sentinel-tagged cleanup
├── helpers/               # shared (currently empty — utils inlined for now)
└── fixtures/              # shared JSON fixtures
```

## Run from project root

```bash
# fast (no server, no browser)
npm run test:unit

# requires running server on :3457
npm run start &
npm run test:integration

# requires running server + Chrome
npm run test:e2e

# hits production
npm run test:live

# everything except live
npm run test
```

## Snapshot/restore semantics

Integration and e2e tests that mutate data MUST snapshot `data/bookings.json`
and `data/blocked-dates.json` at start and restore them at end (success or
failure). The `live/` tests use sentinel-tagged emails (`@live-suite-<ts>.invalid`)
and clean themselves up via the admin DELETE API — they never touch
pre-existing rows.

## Why both Playwright AND Selenium

The user explicitly requested Selenium coverage in addition to Playwright,
so both stacks live side-by-side. Playwright runs faster and gets first
priority for new tests. Selenium is kept as a parity check that the UI
isn't tightly coupled to one driver's quirks.

## Reference

- [Next.js testing docs](https://nextjs.org/docs/app/guides/testing) —
  recommends Vitest (unit) + Playwright (E2E).
- [Vitest with Next.js](https://nextjs.org/docs/app/guides/testing/vitest) —
  config patterns this repo follows.
