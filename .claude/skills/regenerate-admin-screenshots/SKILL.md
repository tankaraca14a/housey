---
name: regenerate-admin-screenshots
description: Regenerate every PNG referenced by docs/ADMIN-GUIDE.md + docs/ADMIN-HR.md from a freshly seeded local dev server. Three generators (EN admin, HR admin, feature shots) + a mandatory pristine audit.
---

# regenerate-admin-screenshots

Use when:
- The user says "recreate images", "update screenshots", "regen admin guide", "fresh screenshots", "screenshots are stale".
- You changed any owner-visible admin UI (the docs-pair rule says every change ships fresh shots — see memory `housey_docs_pair.md`).
- The pristine audit (below) finds orphan PNGs or broken doc refs.

The skill exists because the **seed → generate → verify** sequence is non-obvious and easy to get wrong:
- Running a generator without seeding times out on missing rows (e.g. waiting for "Anna Schmidt" row that doesn't exist).
- Running EN seed before HR generator produces English-text toasts inside HR shots.
- Forgetting the feature generator leaves shots 24, 25, 30–37 stale even after the admin generator passes.

## Three generators, one matrix

| Script | Output dirs | Covers |
|---|---|---|
| `scripts/generate-admin-guide-screenshots.mjs` | `docs/admin-screenshots/` | EN admin flow: 01–23 + 18/19/20 (login → calendar → bookings → images → reviews → HR-toggle comparison → logout) |
| `scripts/generate-admin-guide-screenshots-hr.mjs` | `docs/admin-screenshots-hr/` | HR admin flow: same numbering, HR-named files (`prijava`, `kalendar`, `pregled-cijela`, `potvrdjen-red`, etc.) + 18 EN-comparison shot |
| `scripts/generate-feature-screenshots.mjs` | both dirs | Cross-language feature shots: 24 (RTL reviews), 25 (public site in HR/DE/FR/IT), 30 (public-site pages), 31–37 (review lang/translations + submit-review + inbox + publish panel) |

Together these reference every PNG the docs link to. If you add a new shot, add a reference in **both** docs in the same commit — that's the docs-pair rule.

## Preflight

1. **Dev server up on :3457**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3457/
   ```
   Expect `200`. If not, ask the user to start `next dev -p 3457` in another terminal (don't background it yourself, it ties up Bash sessions).

2. **File-backed data store, not KV**: The scripts mutate `data/bookings.json`, `data/reviews.json`, `data/images.json` directly via the seed step. They silently misbehave against a KV-backed instance. Local dev uses files by default — confirm `.env.local` does NOT set `KV_REST_API_URL`. If it does, move it aside as `.env.local.DISABLED-FOR-TESTS` and restart `next dev`.

3. **Admin password**: scripts default to `ivana2026` via `ADMIN_PASSWORD`. Production password is different — **do not run these against production**.

## Run

Two seed passes because EN and HR scripts each expect their own message-language seed. Run sequentially — they share `data/*.json` and the dev server state, so parallel runs corrupt each other.

```bash
# 1) EN: seed → generate
ADMIN_PASSWORD=ivana2026 BASE=http://localhost:3457 node scripts/seed-admin-guide.mjs --lang=en
BASE=http://localhost:3457 node scripts/generate-admin-guide-screenshots.mjs

# 2) HR: re-seed with HR message text → generate
ADMIN_PASSWORD=ivana2026 BASE=http://localhost:3457 node scripts/seed-admin-guide.mjs --lang=hr
BASE=http://localhost:3457 node scripts/generate-admin-guide-screenshots-hr.mjs

# 3) Feature shots (seeds + cleans its own review/inbox rows in finally{})
BASE=http://localhost:3457 node scripts/generate-feature-screenshots.mjs

# 4) Postflight: reset the seed-polluted data files (they're tracked as [] in git)
echo '[]' > data/bookings.json
echo '[]' > data/images.json
echo '[]' > data/reviews.json
```

The feature generator cleans up its own rows in `finally{}`, but the admin-guide generators leave the seed data in place by design (so a human can poke around afterwards). The postflight reset is mandatory before commit — otherwise the regen will sneak fake "Anna Schmidt" / "Marco Rossi" bookings into git.

`data/blocked-dates.json` is NOT reset by this skill — it holds real local blocked dates and is tracked with content. Check `git diff data/blocked-dates.json` before commit; if the regen touched it, restore from HEAD.

Each script takes 30–90 s. Generators use retina 2× scale, viewport 1400×1100.

The seed data uses stable IDs (`guide-pending-1`, `guide-confirmed-1`, `guide-declined-1`, `guide-img-1..3`) which the generator scripts reference via `data-testid`. Re-seeding between EN and HR is mandatory because each generator mutates state via clicks (Delete/Confirm/Decline + Undo restores) and because the seed seeds different message-text per language.

## Verify pristine (mandatory)

After regenerating, run the orphan + broken-ref check. Exit zero means every PNG on disk is referenced by its doc AND every doc reference resolves to a file on disk.

```bash
cd /Users/mm/Developer/ivanadrag/housey
fail=0
for dir in admin-screenshots admin-screenshots-hr; do
  doc="docs/ADMIN-GUIDE.md"; [ "$dir" = "admin-screenshots-hr" ] && doc="docs/ADMIN-HR.md"
  for f in docs/$dir/*.png; do
    name=$(basename "$f")
    grep -q "$name" "$doc" || { echo "ORPHAN: $dir/$name"; fail=1; }
  done
  for ref in $(grep -oE "\./$dir/[^)]+\.png" "$doc" | sort -u); do
    [ ! -f "docs/${ref#./}" ] && { echo "BROKEN: $ref"; fail=1; }
  done
done
[ "$fail" = "0" ] && echo "✓ pristine"
```

Non-zero means either:
- **Orphan**: a script produces a PNG no doc references → **prefer adding a doc reference** (the shot exists for a reason — find the right section in BOTH docs and link it). Only remove the shot from the generator if the UI it captured no longer exists.
- **Broken ref**: a doc links a PNG no script produces → **prefer adding the shot to a generator** (or fix a filename typo in the doc).

## Spot check

After regen, read one screenshot per language via the Read tool to confirm the captured frame actually shows the new UI element. If a toast doesn't appear, the generator's timing is wrong — bump `waitForTimeout(900)` higher.

## When the UI changes

If a new admin behavior was added (new dialog, new toast, new button), extend the relevant generator with the new capture step:

1. Scroll to the element via Playwright.
2. Click whatever triggers the new UI.
3. Wait 900 ms for the state to settle.
4. Screenshot using `shot('NN-name')` for full-page or `page.screenshot({ clip: ... })` for a tight crop.
5. Click Undo (if applicable) so subsequent steps see the pre-action state.

Reference: `scripts/generate-admin-guide-screenshots.mjs` lines 175-220 (delete + confirm + decline toast captures).

Then add the new reference to **both** `docs/ADMIN-GUIDE.md` and `docs/ADMIN-HR.md` in the same commit.

## Failure modes seen in the wild

| Symptom | Cause | Fix |
|---|---|---|
| `locator.scrollIntoViewIfNeeded: Timeout` waiting for "Anna Schmidt" | `data/bookings.json` is `[]` — seed step skipped | Run `seed-admin-guide.mjs --lang=en` first |
| HR shots show English text in toast dialogs | EN seed left over from previous pass | Re-seed with `--lang=hr` before HR generator |
| Feature script's review shots look identical to a previous run | KV-backed store ignored the script's file writes | Disable `KV_REST_API_URL` in `.env.local` and restart `next dev` |
| `locator(...): Timeout` waiting for `[data-testid='confirm-btn-guide-pending-1']` | Admin page changed: testid renamed or removed | Update the testid in the admin page or in the seed booking ID |
| Toast doesn't appear in shot | `confirm()` dialog wasn't auto-accepted before the click | Make sure `page.on('dialog', d => d.accept())` is registered |
| `localStorage` SecurityError in feature script | `setLang()` called before `page.goto()` established origin | Already fixed; if you see it again, the script was edited |

## Tests

`test/unit/regenerate-admin-screenshots-skill.test.mjs` enforces the skill's contract as 190+ vitest assertions, runnable any time without a dev server:

```bash
npx vitest run test/unit/regenerate-admin-screenshots-skill.test.mjs
```

The tests cover three concerns:

1. **Skill structure** — frontmatter has `name` + `description`, body documents all three generators + seed --lang flags + the postflight reset for the three seeded data files.
2. **Referenced files exist** — every `scripts/*.mjs` mentioned in this SKILL.md resolves to a real file, both docs exist, both screenshot dirs exist. Catches drift if a generator gets renamed.
3. **Pristine invariant** — every PNG in `docs/admin-screenshots{,-hr}/` is referenced by its doc (no orphans), every doc image reference resolves to a real file (no broken refs). Per-PNG assertions so failures pinpoint the exact filename to fix.

These run as part of `npm run test:unit`. If they fail in CI, run this skill to fix.

## After regen

If you just shipped owner-visible UI, the **docs-pair rule** requires committing five things in the same commit:
1. The code change
2. EN doc updates (`docs/ADMIN-GUIDE.md`)
3. HR doc updates (`docs/ADMIN-HR.md`)
4. EN screenshot updates (`docs/admin-screenshots/`)
5. HR screenshot updates (`docs/admin-screenshots-hr/`)

See memory `housey_docs_pair.md` for the pre-commit checklist.

**Do not auto-commit.** Show `git status --short docs/` and let the user review the regen diff before commit.
