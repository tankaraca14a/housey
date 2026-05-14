---
name: add-undo-pattern
description: Add a 10-second "undo toast" to any destructive action so a misclick can be recovered without leaving the UI. Mirrors the housey-proven pattern used for delete, edit, confirm, decline, image-delete.
---

# add-undo-pattern

Use when adding a button that emails someone, deletes data, blocks calendar dates, sends an irreversible side effect, or anything else a non-technical user might fumble. This is the single most important UX pattern in this user's projects — see `~/.claude/projects/.../memory/few_deps_decision_vector.md`.

## The contract

After two confirm() dialogs:

1. The UI shows the result of the action immediately (status badge flips, row hides, etc.) — **optimistic**.
2. A toast appears in the bottom-right corner with a 10-second countdown and an **Undo** button.
3. **Nothing has actually happened on the server yet.** The toast is the proof.
4. If the user clicks Undo before the timer fires: state reverts in the UI, no API call is ever made.
5. If 10 seconds elapse: the API call fires, the side effect happens for real, the toast disappears.
6. If the tab closes or the user navigates away during grace: the side effect does NOT happen (safer failure mode — they weren't sure enough to wait).

## Recipe (TypeScript / Next.js client component)

### 1. State

Always add a `pendingX` Record alongside `pendingDeletes`/`pendingEdits`/etc. that already exist:

```tsx
const GRACE_MS = 10_000;

interface PendingThing {
  payload: Thing;
  timerId: ReturnType<typeof setTimeout>;
  deadline: number; // epoch ms
}
const [pendingThings, setPendingThings] = useState<Record<string, PendingThing>>({});
```

### 2. Handler

```tsx
const handleDoThing = (id: string) => {
  const thing = things.find((t) => t.id === id);
  if (!thing) return;
  if (pendingThings[id]) return; // already in flight, ignore double-click
  if (!confirm(t.doThingConfirm)) return;
  if (!confirm(`${t.doThingConfirm2}\n\n${thing.label}`)) return;

  const timerId = setTimeout(async () => {
    try {
      const res = await fetch(`/api/admin/things/${id}/do`, {
        method: 'POST',
        headers: { 'x-admin-password': authPassword },
      });
      if (!res.ok) throw new Error('failed');
    } catch (e) {
      console.error('do-thing failed', e);
    } finally {
      setPendingThings((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await refetchThings();
    }
  }, GRACE_MS);

  setPendingThings((prev) => ({
    ...prev,
    [id]: { payload: thing, timerId, deadline: Date.now() + GRACE_MS },
  }));
};

const handleUndoThing = (id: string) => {
  setPendingThings((prev) => {
    const p = prev[id];
    if (!p) return prev;
    clearTimeout(p.timerId);
    const next = { ...prev };
    delete next[id];
    return next;
  });
};
```

### 3. Countdown ticker (only when toasts are active)

```tsx
const [nowMs, setNowMs] = useState(Date.now());
useEffect(() => {
  if (Object.keys(pendingThings).length === 0) return;
  const id = setInterval(() => setNowMs(Date.now()), 250);
  return () => clearInterval(id);
}, [pendingThings]);
```

### 4. Optimistic UI

The simplest: filter the row out of the visible list during grace:

```tsx
const visibleThings = things.filter((t) => !pendingThings[t.id]);
```

OR override its display state without hiding it:

```tsx
const displayThings = things.map((t) => {
  if (pendingThings[t.id]) return { ...t, status: 'doneOptimistic' };
  return t;
});
```

(See housey `app/admin/page.tsx` line ~1191 for the latter approach — used for Confirm/Decline so the badge flips while the row stays visible.)

### 5. Toast

Reuse a single fixed-position container — don't make a new one per action type. All toasts share one bottom-right "stack":

```tsx
{(pendingDeletes.length || pendingThings.length || ...) > 0 && (
  <div data-testid="undo-toast-container"
       className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
    {Object.values(pendingThings).map((p) => {
      const secondsLeft = Math.max(0, Math.ceil((p.deadline - nowMs) / 1000));
      return (
        <div
          key={`thing-${p.payload.id}`}
          data-testid={`undo-thing-toast-${p.payload.id}`}
          className="bg-surface-800 border border-brand-400/50 shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-4 min-w-[320px]"
        >
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              {/* icon */} {t.thingDoneToast}: <span className="text-slate-300 font-normal">{p.payload.label}</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{secondsLeft}s</p>
          </div>
          <button
            onClick={() => handleUndoThing(p.payload.id)}
            data-testid={`undo-thing-btn-${p.payload.id}`}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-semibold rounded-xl transition whitespace-nowrap"
          >
            ↶ {t.undo}
          </button>
        </div>
      );
    })}
  </div>
)}
```

The `data-testid` is non-optional — selenium tests key off it (see housey `test/e2e/confirm-decline-undo-selenium.mjs`).

### 6. Translations

```ts
// add to translations type + dict
thingDoneToast: string;
doThingConfirm: string;
doThingConfirm2: string;
undo: string; // already exists
```

### 7. Test it (mandatory)

Mirror this test from housey: `test/e2e/confirm-decline-undo-selenium.mjs`. The 20-assertion shape is:

1. Click triggers TWO confirm() dialogs (both auto-accept = true in test)
2. Toast appears with the right testid
3. UI shows optimistic state (badge/row updated)
4. Server is STILL unchanged
5. Click Undo
6. Toast vanishes
7. UI reverts to original state
8. Server is STILL unchanged 11 seconds later (proves the timer was cancelled)
9. Click again, do NOT undo, wait 11s
10. Server now reflects the change

## The hard rules

- **Two confirm() dialogs**: don't skimp to one. Muggles click through one without reading.
- **Optimistic UI**: the action must feel done, otherwise the user clicks again.
- **No "Are you really sure?"** modal — use the toast. Modals are claustrophobic; toasts are passive.
- **Tab close = action doesn't happen**: do NOT use Resend `scheduledAt` or any "survive tab close" mechanism. Safer failure mode for an uncertain user.
- **Update the docs**: every undo-able action must be reflected in `docs/ADMIN-GUIDE.md` and any localized variants.
- **Update the screenshot generator**: capture the toast mid-grace and reference it in the docs (`scripts/generate-admin-guide-screenshots.mjs` pattern).

## Common pitfalls

- **`UnexpectedAlertOpenError` in Selenium tests**: the first or second `confirm()` was still open when Selenium tried to click something else. Stub `window.confirm` early: `await driver.executeScript('window.confirm = () => true')`.
- **`ElementClickInterceptedError` after the toast appears**: the fixed-position toast covers the next button the test wants to click. Scroll or wait for the toast to clear (or use JS click: `driver.executeScript('arguments[0].click()', el)`).
- **Stale `nowMs` after toast dismisses**: the ticker `useEffect` returns to no-op when `pendingThings` is empty, but on remount it should re-fire. Watch for missing dependency in the effect array.
- **Memory leak in dev (HMR)**: each hot-reload spawns a new ticker if React state doesn't clear cleanly. Confirm the `useEffect` cleanup actually runs (`clearInterval`).

## Where to look in housey for live examples

- `app/admin/page.tsx` — every undo flow is in there (delete, edit, image-delete, confirm, decline)
- `docs/ADMIN-GUIDE.md` and `docs/ADMIN-HR.md` — how to document the undo to a non-technical user
- `test/e2e/confirm-decline-undo-selenium.mjs` — the canonical 20-assertion shape
