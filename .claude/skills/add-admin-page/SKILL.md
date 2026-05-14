---
name: add-admin-page
description: Add a password-protected /admin route with bilingual toggle, refresh button, and the standard housey-style layout (calendar at top, content sections below, undo toast container, logout). Hand-rolled — no Clerk/Auth.js needed for owner-operator sites.
---

# add-admin-page

Use when the site has a single trusted owner who needs to manage data. NOT for multi-user auth — switch to Clerk / Auth.js for that.

## The threat model this handles

- One owner, on a Mac or phone they trust.
- Password stored in `process.env.ADMIN_PASSWORD`. Sent on every admin API call via `x-admin-password` header.
- No JWTs, no sessions, no cookies. The password lives in React state from login until tab close.
- Anyone who sniffs the password gets full access — that's why the URL must be HTTPS-only and the password should be 12+ random characters.

For a one-user site this is enough. Don't over-engineer.

## Structure

```
app/admin/
  page.tsx                 # the whole admin UI (single page component, ~1500 lines is fine)
app/api/admin/
  <thing>/
    route.ts               # GET/POST/PATCH/DELETE with password gate
```

## The password gate (server side)

Every admin route MUST check the header. Centralize the check, or repeat it — but never skip it.

```ts
// app/api/admin/<thing>/route.ts
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';

export async function GET(request: Request) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... do the work
}
```

For mutating routes (POST/PATCH/DELETE), the check goes BEFORE any body parsing.

## The admin client (React)

A single client component handles login + content. Skeleton (housey-derived):

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';

type Lang = 'hr' | 'en';
const translations: Record<Lang, Translations> = { hr: {...}, en: {...} };

export default function AdminPage() {
  const [lang, setLang] = useState<Lang>('hr');
  const t = translations[lang];

  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authPassword, setAuthPassword] = useState(''); // verified-good
  const [loggingIn, setLoggingIn] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setPasswordError('');
    try {
      const res = await fetch('/api/admin/<some-thing>', {
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        setAuthPassword(password);
        setAuthenticated(true);
      } else if (res.status === 401) {
        setPasswordError(t.wrongPassword);
      } else {
        setPasswordError(t.saveFailedShort);
      }
    } catch {
      setPasswordError(t.saveFailedShort);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    // If there's a dirty unsaved state (e.g. calendar changes), prompt first.
    if (dirty && !confirm(t.unsavedWarning)) return;
    setAuthPassword('');
    setPassword('');
    setAuthenticated(false);
  };

  // Lang toggle — fixed top-right corner on desktop, below the nav header on mobile
  // (mobile fix is mandatory; see housey commit cb44917).
  const LangToggle = () => (
    <button
      onClick={() => setLang((l) => (l === 'hr' ? 'en' : 'hr'))}
      className="fixed top-20 right-3 sm:top-4 sm:right-4 z-50 px-3 py-1.5 text-xs font-bold bg-surface-700 hover:bg-surface-600 text-slate-300 border border-white/10 rounded-lg transition"
      title={lang === 'hr' ? 'Switch to English' : 'Prebaci na Hrvatski'}
    >
      {lang === 'hr' ? 'EN' : 'HR'}
    </button>
  );

  if (!authenticated) {
    return (
      <>
        <LangToggle />
        <div className="min-h-[60vh] flex items-center justify-center container py-16">
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-8 w-full max-w-sm">
            <h1 className="text-2xl font-bold text-white mb-2 text-center">{t.adminLogin}</h1>
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.password}
                className="w-full px-4 py-3 bg-surface-700 border border-white/10 rounded-xl text-white"
                required
              />
              {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
              <button type="submit" disabled={loggingIn}
                className="w-full py-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl disabled:opacity-50">
                {loggingIn ? '...' : t.login}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // Authenticated content — sections, undo toast container, logout button.
  return (
    <>
      <LangToggle />
      {/* Undo toast container — see /add-undo-pattern */}
      <div className="container py-16">
        {/* Calendar, lists, forms here. Each uses `authPassword` in fetch headers. */}
      </div>
    </>
  );
}
```

## Patterns that ALWAYS go in an admin page

- **i18n dict**: at least HR/EN if the user is non-English-native. In-file `translations: Record<Lang, Translations>`.
- **Lang toggle**: top-right, repositioned for mobile (see housey commit cb44917). The toggle shows the OTHER language ("EN" when in HR, "HR" when in EN).
- **Refresh button**: per section. Beats waiting for SWR/React Query.
- **Undo toast container**: bottom-right, shared across all undo flows. See `/add-undo-pattern`.
- **Logout**: top-right, ALWAYS prompts if there's unsaved work (`calendarDirty` pattern in housey).
- **`beforeunload` guard** when there's unsaved state: see housey `app/admin/page.tsx` line ~782.

## What NOT to put in an admin page

- **Server-side rendering of admin content**: the page is `'use client'`. The login flow stays simple.
- **Cookies / JWTs / sessions**: not for one-user sites.
- **A separate auth page**: one component handles both states (`!authenticated` vs `authenticated`).
- **A framework UI library**: hand-rolled Tailwind keeps deps minimal. Reach for shadcn only if the user explicitly asks for it.

## Verify

```bash
# Login flow
curl -X GET http://localhost:3000/api/admin/things -H "x-admin-password: wrong"   # → 401
curl -X GET http://localhost:3000/api/admin/things -H "x-admin-password: <real>"  # → 200
```

Then `/check-everything` (the existing skill) drives a real browser through the full flow including login.

## Next steps

- `/add-undo-pattern` for every destructive button on the admin page.
- `/write-admin-guide` once the admin is feature-complete — generates a non-technical user guide with screenshots.
- `/setup-test-stack` if not done yet — every admin page needs at least a selenium test.
