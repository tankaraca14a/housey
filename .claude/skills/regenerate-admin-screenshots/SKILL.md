---
name: regenerate-admin-screenshots
description: Re-seed the admin demo data and re-run both EN + HR Playwright screenshot generators for docs/ADMIN-GUIDE.md and docs/ADMIN-HR.md.
---

# regenerate-admin-screenshots

Use when the admin UI changed (new buttons, new toast, new dialog wording) and the docs' embedded screenshots need to match. The user usually says "recreate images", "update screenshots", or "regen admin guide".

## Preflight

- Local dev server must be running on `:3457` (see `/test-everything` preflight).
- `.env.local` should be moved aside (`.env.local.DISABLED-FOR-TESTS`) so the generators don't hit production by accident.

## Method

The seed data uses stable IDs (`guide-pending-1`, `guide-confirmed-1`, `guide-declined-1`, `guide-img-1..3`) which the generator scripts reference via `data-testid`. Always re-seed before running each generator, because the generator's earlier steps mutate state (clicking Delete/Confirm/Decline, then clicking Undo to restore).

### EN screenshots

```bash
node scripts/seed-admin-guide.mjs --lang=en
node scripts/generate-admin-guide-screenshots.mjs
```

Outputs 22 PNGs to `docs/admin-screenshots/` (retina 2× scale, viewport 1400×1100).

### HR screenshots

```bash
node scripts/seed-admin-guide.mjs --lang=hr
node scripts/generate-admin-guide-screenshots-hr.mjs
```

Outputs 21 PNGs to `docs/admin-screenshots-hr/`.

## Postflight

```bash
# Reset to empty so tests see clean state next time
echo '[]' > data/bookings.json
echo '[]' > data/images.json
```

## When the UI changes

If a new admin behavior was added (new dialog, new toast, new button), extend BOTH generators with the new capture step. Pattern:

1. Scroll to the relevant element via Playwright.
2. Click whatever triggers the new UI.
3. Wait 900 ms for the state to settle.
4. Screenshot using `shot('NN-name')` for full-page or `page.screenshot({ clip: ... })` for a tight crop.
5. Click Undo (if applicable) so subsequent steps see the pre-action state.

Reference: `scripts/generate-admin-guide-screenshots.mjs` lines 175-220 (delete + confirm + decline toast captures).

## Doc references

After regen, both `docs/ADMIN-GUIDE.md` and `docs/ADMIN-HR.md` should reference the new images inline with markdown image syntax. Use the existing screenshot filenames; if you added new ones, add `![alt](./admin-screenshots/NN-name.png)` in the relevant section.

## Spot check

Read one screenshot from each language via the Read tool to confirm the new UI element actually appears in the captured frame. If a toast doesn't appear, the generator's timing is wrong — bump the `waitForTimeout(900)` higher.

## Common failures

- **Missing testid** — generator throws because `[data-testid='confirm-btn-guide-pending-1']` doesn't exist. Add the testid to the admin page or update the seed booking ID.
- **Toast doesn't appear** — `confirm()` dialog wasn't auto-accepted. Make sure `page.on('dialog', d => d.accept())` is registered before the click.
- **Stale screenshots committed** — always `git diff docs/admin-screenshots/` after regen to confirm changes look right.
