# `.claude/skills/`

Project-scoped Claude Code skills for building, shipping, and maintaining websites. Any Claude Code agent running inside this repo can invoke them with `/<skill-name>`.

The skills are organized by the lifecycle of building a website from an empty repo. Each one references the next sensible step at the bottom.

## Stack assumptions (read first)

These skills are **the owner's personal stack playbook**, not generic web advice. They assume:

| Layer | Assumption |
|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript |
| Styling | **Tailwind CSS v4**, hand-rolled components |
| Hosting | **Vercel** (CLI + Marketplace integrations) |
| Persistence | **Upstash KV** (Redis) + **Vercel Blob** for files, file-JSON backend locally |
| Email | **Resend** transactional |
| Forms | **react-hook-form** + **zod** |
| Auth | Hand-rolled single-password admin (no Clerk / Auth.js) |
| Tests | Vitest (unit) + Playwright + Selenium (e2e) + node-fetch (integration) |
| Identity | Multi-account git via SSH config + git includeIfs |
| i18n | In-file `translations: Record<Lang, Translations>` dict; HR + EN for the owner's sites |
| Image conversion | `heic2any` for iPhone HEIC → JPEG in-browser |

If a future project uses a different framework (SvelteKit / Astro / Rails / etc.), most of these skills DON'T transfer — the design philosophy does (recoverable destructive actions, persist-first-then-email, hard test-isolation), but the specific recipes don't.

Two skills are framework-neutral: `/setup-multi-identity-git`, `/write-admin-guide`. The principles inside `/add-undo-pattern` and `/recoverability-audit` transfer to any framework but the example code is React.

## 0. Bootstrap (empty repo → running locally)

| Skill | What |
|---|---|
| `/bootstrap-website` | Next.js + TypeScript + Tailwind scaffold, canonical file layout, package scripts wired |

## 1. Infrastructure (hosting + persistence + email)

| Skill | What |
|---|---|
| `/setup-deployment` | Link Vercel + custom domain + DNS + env vars + first prod deploy |
| `/setup-storage` | Pick + provision Upstash KV / Neon Postgres / Vercel Blob via Marketplace, plus the file-locally / KV-in-prod abstraction pattern |
| `/setup-transactional-email` | Resend domain + DKIM + sender + the graceful-failure route pattern |

## 2. Identity (multi-account git/SSH)

| Skill | What |
|---|---|
| `/setup-multi-identity-git` | Per-folder GitHub identity via SSH config + git includeIfs, replays cleanly to other Macs |

## 3. Build features

| Skill | What |
|---|---|
| `/add-page` | Public route with hero + content + nav integration, responsive mobile-first |
| `/add-form-with-route` | react-hook-form + zod + Next route handler + Resend, success/error UX |
| `/add-admin-page` | Password-gated admin with bilingual toggle, refresh, undo toast container, logout-with-unsaved-guard |
| `/add-image-upload` | Vercel Blob client-direct-upload, HEIC conversion, metadata persistence, admin grid |

## 4. Safety patterns

| Skill | What |
|---|---|
| `/add-undo-pattern` | 10-second undo toast for any destructive action (delete, confirm, decline, edit). 2 confirms + optimistic UI + deferred API call |
| `/recoverability-audit` | Map every destructive action in a UI, verify each has an undo path, fix gaps using existing patterns only |

## 5. Test stack

| Skill | What |
|---|---|
| `/setup-test-stack` | Wire vitest + Playwright + Selenium + npm scripts + the four-tier directory layout |

## 6. Docs for end users

| Skill | What |
|---|---|
| `/write-admin-guide` | Non-technical user guide with deterministic screenshots, bilingual variants, troubleshooting section keyed by likely mistakes |
| `/regenerate-admin-screenshots` | Re-seed admin demo data + run all 3 Playwright generators (EN admin, HR admin, feature shots) + verify pristine (no orphan PNGs, no broken refs) |

## 7. Test + verify (run as needed)

| Skill | What |
|---|---|
| `/test-everything` | Unit → integration → e2e → live, all tiers in order, with state isolation between them |
| `/selenium-sweep` | Every Selenium-driven test (local + production), assertion counts, WebDriver proof |
| `/check-everything` | Selenium visual sweep of every page + admin flow, 13 PNG screenshots |
| `/post-deploy-verify` | After `git push` to main: wait for Vercel rebuild, curl-assert new behavior, run live suite |

## Building a new site from scratch — recommended order

1. `/bootstrap-website`
2. `/setup-multi-identity-git` (if multi-account)
3. `/setup-deployment`
4. `/setup-storage` (if persistence needed)
5. `/setup-transactional-email` (if email needed)
6. `/setup-test-stack`
7. Loop: `/add-page`, `/add-form-with-route`, `/add-admin-page`, `/add-image-upload`, `/add-undo-pattern` as features land
8. `/write-admin-guide` once admin is feature-complete
9. `/test-everything` before every deploy; `/post-deploy-verify` after
10. `/recoverability-audit` whenever any destructive action ships

## Adding a new skill

Drop a new folder `.claude/skills/<name>/SKILL.md` with this frontmatter:

```markdown
---
name: skill-name
description: One-line purpose for the agent's index
---

# skill-name

Use when [user-facing trigger].

## ...
```

Then add the entry to this README under the right lifecycle phase.
