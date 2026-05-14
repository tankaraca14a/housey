---
name: bootstrap-website
description: From empty repo to a Next.js + TypeScript + Tailwind app running locally. Sets up the canonical project skeleton this user's projects follow (App Router, single page-per-route, no Storyboards-equivalent in web, i18n-ready, file/KV storage abstraction).
---

# bootstrap-website

Use at the start of a new web project. The user typed something like "build me a website", "I want a site for X", or you're standing in an empty repo.

## Decisions to confirm before scaffolding

Ask once, then proceed. Defaults in **bold**.

1. **Framework**: **Next.js 16 (App Router)** — only suggest something else if the user explicitly asks. Reasons: Vercel-native, server actions + server components, edge-friendly, the user's other projects all use it.
2. **Language**: **TypeScript**.
3. **Styling**: **Tailwind CSS** (v4). Plain CSS only if user explicitly objects.
4. **UI library**: **none** by default. Hand-rolled components keep the dep tree small (see `~/.claude/projects/.../memory/few_deps_decision_vector.md`).
5. **Forms**: **react-hook-form + zod** when needed (`/add-form-with-route` brings these in).
6. **State**: React `useState` / context. No Redux/Zustand unless user has a real reason.
7. **Date**: **none** — handle YYYY-MM-DD strings directly. Don't pull date-fns / dayjs unless calendaring is core (housey-style booking app).
8. **i18n**: in-file `translations: Record<Lang, Translations>` dict pattern (see housey `app/admin/page.tsx`). Don't reach for next-intl until the site has more than ~10 pages.

## Steps

```bash
# 1. Initialise
mkdir <name> && cd <name>
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias '@/*' --no-eslint --no-turbopack
# If turbopack is wanted later, enable in next.config.ts — the flag's stability has varied.

# 2. Trim what create-next-app adds that we don't need
rm -f public/next.svg public/vercel.svg
# Replace app/page.tsx with a minimal "Welcome" placeholder

# 3. Tailwind colours + tokens — site-specific
# Add to app/globals.css:
#   :root { --background: 11 12 16; --foreground: 255 255 255; }
#   @theme inline { --color-brand-500: <brand colour>; --color-surface-700: ...; }
# Use brand-* and surface-* in components.

# 4. Footer + header in app/layout.tsx
# Pattern: <header class="border-b border-white/10 bg-surface-900/80 backdrop-blur">
#          <nav class="container ...">
#            <Link href="/" class="font-semibold">Sitename</Link>
#            <ul class="hidden sm:flex gap-6 text-sm">
#              {/* nav links */}
#            </ul>
#            <Link href="/something" class="sm:hidden ...">Menu</Link>
#          </nav>
#        </header>
# Mobile nav MUST be `hidden sm:flex` from day one — see housey commit cb44917 for why.

# 5. Package scripts
# Add to package.json:
#   "test:unit":        "vitest run",
#   "test:integration": "node test/integration/run.mjs",
#   "test:e2e":         "node test/e2e/run.mjs",
#   "test:live":        "node test/live/run.mjs"
# Actual test files come later via /setup-test-stack.

# 6. Repo hygiene
# .gitignore additions: .next, node_modules, .env.local, data/*.json, /tmp
# Initial commit + push to a private GitHub repo via the user's git-identity setup.
```

## Default file layout

```
app/
  layout.tsx          # site shell (header + footer)
  page.tsx            # /
  globals.css         # Tailwind tokens
  about/page.tsx      # /about
  api/
    contact/route.ts
  lib/                # shared utilities (validators, repository pattern, etc.)
public/
  images/             # static images
data/                 # local JSON storage (file backend); .gitignored or seeded
docs/                 # user-facing guides (markdown + screenshots)
scripts/              # one-shot helpers (seed data, regenerate screenshots, etc.)
test/
  unit/               # vitest (`*.test.mjs`)
  integration/        # node fetch against local server
  e2e/                # selenium + playwright
  live/               # tests against production
.claude/
  skills/             # this directory
```

## Verification before shipping the bootstrap

- `npm run dev` boots, `/` renders the placeholder.
- `npx tsc --noEmit` is clean.
- `git status` shows only what you expect (no leaked `.env.local`).

## Next steps after this skill

1. `/setup-deployment` — link Vercel + domain.
2. `/setup-storage` — pick KV/Postgres/Blob if the app needs persistence.
3. `/setup-transactional-email` — Resend domain + sender setup.
4. `/setup-test-stack` — wire vitest + selenium + playwright.
5. `/add-page` for each route the user wants.
