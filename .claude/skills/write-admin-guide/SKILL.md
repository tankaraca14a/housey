---
name: write-admin-guide
description: Generate a non-technical user guide (`docs/ADMIN-GUIDE.md` + localized variants) with deterministic, regeneratable screenshots embedded inline. Optimized for a non-technical owner who needs to fix their own mistakes.
---

# write-admin-guide

Use after the admin is feature-complete. Result: a markdown guide the owner can read on a phone, with one screenshot per action, that survives UI changes via a regenerator script.

## Audience: think "muggle"

The owner is non-technical. They will:
- Not read carefully.
- Press Enter to dismiss anything.
- Click the wrong button and panic.
- Close the tab thinking "I'll come back later".
- Be on a phone half the time.

The guide must therefore:
- Open with "where to find this page" (URL).
- Have every action's recovery path clearly stated.
- Use the EXACT button labels they see (English or their language) — never refer to internal selectors.
- Show a screenshot of the actual button beside the explanation.
- End with a troubleshooting section keyed by "I clicked X by mistake".

## Skeleton

```markdown
# How to manage <Sitename>

This is your complete guide to <Sitename>'s admin page. Every action is here with a screenshot.

The admin page lives at **<https://<domain>/admin>**. Bookmark it.

---

## 1. Logging in

![Login screen](./admin-screenshots/01-login-empty.png)

[explanation]

---

## 2. The admin page at a glance

![Overview](./admin-screenshots/03-overview-top.png)

1. **<Section A>** — for X
2. **<Section B>** — for Y

---

## 3-N. Each major action

For each action:
1. Where to find it (with screenshot)
2. What clicking does
3. The recovery path ("Within 10 seconds, click Undo")

---

## N+1. What to do if something goes wrong

### "I clicked Confirm on the wrong booking"

- Within 10 seconds: click Undo
- After 10 seconds: ...

[one entry per likely mistake]

---

## What the system protects you from

- Misclicks: every destructive action has 2 confirmations + 10s undo
- Email accidents: 10s window before any email is sent
- Lost work: refresh/close prompts you if there are unsaved changes
```

See housey `docs/ADMIN-GUIDE.md` for a full 280-line example.

## The screenshot generator

Build `scripts/generate-admin-guide-screenshots.mjs` once. The user re-runs it any time the UI changes. Pattern:

```js
// Playwright-based, headless chromium, retina (deviceScaleFactor: 2)
// Login → screenshot each major section → trigger destructive actions
// to capture the undo toast mid-grace → click Undo to keep state clean
// → continue.

// Auto-accept all confirm() dialogs:
page.on('dialog', async (d) => d.accept());

async function shot(name, fullPage = false) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage });
}
```

See `scripts/generate-admin-guide-screenshots.mjs` in housey. Conventions:

- **Retina**: `deviceScaleFactor: 2` so PNGs look sharp on modern displays.
- **Viewport**: 1400×1100 (matches what e2e tests use).
- **One PNG per concept** — login, overview, calendar, bookings list, each action's "after" state, troubleshooting toasts.
- **Filename is the concept, not the action order** — e.g. `09-pending-row.png` not `step-09.png`.

## Seed data

The generator needs deterministic data so the screenshots are reproducible. Build `scripts/seed-admin-guide.mjs` that resets data files to a fixed set of demo rows (a pending booking, a confirmed booking, a declined booking, 3 demo images). Generator runs against this seed.

```bash
node scripts/seed-admin-guide.mjs --lang=en
node scripts/generate-admin-guide-screenshots.mjs
```

The seed booking IDs are stable strings (`guide-pending-1`, `guide-confirmed-1`, etc.) so the generator can reference data-testids by ID without re-discovering them.

## Bilingual

If the user's native language isn't English, write the guide in BOTH. The translation must match the labels in the UI's translations dict, not a fresh translation.

For housey: `docs/ADMIN-GUIDE.md` (English) and `docs/ADMIN-HR.md` (Croatian, using "Potvrdi", "Odbij", "Obriši", "Poništi" — the exact buttons in the UI).

The screenshot generator gets two versions too:
- `scripts/generate-admin-guide-screenshots.mjs` — runs the page in English mode
- `scripts/generate-admin-guide-screenshots-hr.mjs` — runs the page in Croatian mode

Both write to different output directories (`docs/admin-screenshots/` vs `docs/admin-screenshots-hr/`).

## Updating the guide

Whenever the admin gets a new destructive action or recovery flow:

1. Update the in-UI translations dict.
2. Extend the screenshot generator to capture the new toast / panel.
3. Re-run `/regenerate-admin-screenshots` (existing skill).
4. Add a section to `ADMIN-GUIDE.md` AND the localized variants.
5. Add a "I clicked X by mistake" entry to troubleshooting.
6. Commit + push.

## Sharing the guide

Once the markdown + images are committed, the owner can read it directly on GitHub at `https://github.com/<owner>/<repo>/blob/main/docs/ADMIN-GUIDE.md`. Images render inline. No additional hosting needed.

For a personal share link with the user's onboarding-style format, use the `ShareOnboardingGuide` tool from this environment — `mode: 'check'` uploads and returns a stable short URL.

## Verify

After regenerating:

- Eyeball 2-3 screenshots from each section. Look for: are the labels in the right language? Are toasts visible mid-grace? Is anything cropped?
- Open the markdown in a preview. Confirm every `![...](...)` resolves.
- Hand the link to a non-technical friend and watch them attempt one action. Note what confuses them.

## Next steps

- `/regenerate-admin-screenshots` whenever the UI changes (existing skill).
- For any new destructive action added: `/add-undo-pattern` first, then update the guide.
