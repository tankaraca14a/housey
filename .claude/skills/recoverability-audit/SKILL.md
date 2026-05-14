---
name: recoverability-audit
description: Map every destructive action in the housey admin (or any UI specified), verify each has a recovery path the user can take without a developer.
---

# recoverability-audit

Use when the user says "she needs to be able to recover from her mistakes", "make it muggle-proof", "every error should be fixable", "what happens if she clicks wrong", or asks for an audit of any destructive UI flow.

## Method

Build a table with columns: **Action | Confirms | Undo path | Email/external side effect | Self-fixable?**

For each row in the admin (or whichever UI the user asks about), answer:

1. **Confirms** — how many `confirm()` dialogs does the user click through before the action commits? 0, 1, or 2.
2. **Undo path** — is there a toast / undo button / setting that reverses the action from inside the UI? If yes, what's the time window?
3. **Email / external side effect** — does the action send an email, write to a third-party (Resend, Blob, KV), or otherwise touch state outside our DB?
4. **Self-fixable?** — can the user recover via the UI alone, with no developer help? Use ✓ / ⚠️ partial / ❌ no.

## Checklist of destructive actions in housey admin

- Delete booking (🗑)
- Confirm booking (✓) — sends email, auto-blocks dates
- Decline booking (✗) — sends email
- Edit booking (Save)
- Status dropdown (any → any)
- Delete image (🗑)
- Toggle featured
- Block/unblock date + Save Changes
- Logout
- Refresh / close tab with unsaved calendar
- Upload wrong image
- Add manual booking with wrong data

## Recovery patterns already in the codebase

Mirror these when fixing a gap. **Do not invent new mechanisms.**

| Pattern | State shape | Render | Used by |
|---|---|---|---|
| 10s undo toast (deferred API call) | `pendingDeletes: Record<string, PendingDelete>` with `timerId` + `deadline` | Toast in `[data-testid='undo-toast-container']` (bottom-right fixed) | Delete booking, Delete image, Confirm, Decline |
| 10s undo toast (rollback after save) | `pendingEdits` with `snapshot` of pre-state | Same container | Edit booking |
| Browser-native unload guard | `useEffect` attaches `beforeunload` only while dirty | Browser shows generic prompt | Unsaved calendar |
| `confirm()`-on-logout guard | Inline dirty-check in `handleLogout` | Native confirm | Unsaved calendar + Logout button |

## Rules

- **Never redesign visible UI** while fixing recovery. Add to existing toast container, reuse existing button positions, reuse `t.undo` translation.
- **Tab close during grace = action does NOT happen.** This is the right failure mode (user wasn't sure → they got out → nothing committed). Don't argue for Resend `scheduledAt`-style "survive tab close" — see `~/.claude/projects/-Users-mm-Developer-ivanadrag/memory/few_deps_decision_vector.md`.
- **Update both `docs/ADMIN-GUIDE.md` and `docs/ADMIN-HR.md`** when adding a recovery path. Both languages, matching on-screen labels.
- **Regenerate the relevant screenshots** in `docs/admin-screenshots/` and `docs/admin-screenshots-hr/` via `/regenerate-admin-screenshots`.
- **Add an e2e test** that proves the recovery. Mirror `test/e2e/image-undo-selenium.mjs` or `test/e2e/confirm-decline-undo-selenium.mjs`.

## Report format

After the audit:

1. The table.
2. Explicit list of gaps (❌ rows).
3. Proposed fix for each gap, using only existing patterns.
4. Estimated diff size and which files.
5. Wait for user OK before implementing.
