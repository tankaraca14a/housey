---
name: add-page
description: Add a public route (`/about`, `/location`, `/gallery`, etc.) with the standard layout (hero + content + nav integration), responsive mobile-first, and the canonical content marker for `/check-everything` to detect.
---

# add-page

Use for any non-admin, non-form route. The pattern is intentionally minimal.

## Structure

```
app/<route>/page.tsx     # the page
public/images/<route>/   # static images for it (optional)
```

## Server component by default

```tsx
// app/<route>/page.tsx
import Image from 'next/image';

export const metadata = {
  title: '<Page name> — <Sitename>',
  description: '<one-sentence summary used in search results>',
};

export default function Page() {
  return (
    <div className="min-h-screen bg-surface-900">
      <div className="container pt-16 pb-10 text-center">
        <p className="uppercase text-xs tracking-[0.3em] text-slate-500 mb-4">
          <Eyebrow text — Dalmatian Coast / About us / etc.>
        </p>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4">
          <Page name>
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          <One-paragraph intro.>
        </p>
      </div>

      <div className="container pb-24">
        {/* Content sections */}
      </div>
    </div>
  );
}
```

Server component unless the page genuinely needs client state (booking calendar, admin, gallery lightbox). Each `'use client'` adds JS to the bundle — avoid by default.

## Canonical content marker

`/check-everything` greps the rendered HTML for a fixed string per page (`Housey` for `/`, `About` for `/about`, `Vela Luka` for `/location`). Make sure your page contains this string in its rendered output so the watchdog test stays green.

If you change the page's main heading drastically, update the marker in `scripts/check-everything.mjs`.

## Nav integration

If the page should appear in the top nav, update `app/layout.tsx`:

```tsx
<ul className="hidden sm:flex gap-6 text-sm text-slate-200">
  {/* ... existing links ... */}
  <li><Link href="/<route>" className="hover:text-brand-300 transition-colors">{linkLabel}</Link></li>
</ul>
```

Mobile fallback (`<Link href="/<route>" className="sm:hidden ...">Menu</Link>`) only shows if you have a single primary CTA — usually it's enough to point to one destination.

Footer link: optional, depends on the site's IA.

## Responsive baseline

Every page MUST pass the mobile-admin-style invariants at 375×667:

- No horizontal scroll (`document.documentElement.scrollWidth ≤ 380`)
- All primary buttons reachable (`x ≥ 0 && x + width ≤ 375`)
- Tap targets ≥ 28×28 px

Verify with `node test/e2e/mobile-admin-playwright.mjs` (or extend it to cover your new page).

## Image handling

Static images in `public/images/<route>/` and reference with absolute paths:

```tsx
<Image
  src="/images/<route>/hero.jpg"
  alt="Descriptive alt text"
  width={1600}
  height={900}
  className="rounded-2xl"
/>
```

For lots of photos (e.g. a gallery), see `/add-image-upload` skill. Sized them down to ≤ 1600 px long edge before committing — see housey `scripts/generate-admin-guide-screenshots.mjs` for a sips-based pipeline.

## Tests

Three layers per page:

1. **Integration**: GET returns 200, contains the canonical marker, no console errors.
2. **E2E**: page loads in headless chromium, no JavaScript errors, screenshot captured.
3. **Live**: same as integration but against production URL.

Already covered for housey's pages in `test/integration/nav-404.mjs` and `test/integration/meta-tags.mjs`. To add a new page:

```js
// test/integration/nav-404.mjs (append to the existing array)
'/<new-route>',
```

That's the minimum — the integration test will fetch + grep for "200" and check that the page doesn't 404.

## Verify

```bash
npm run dev
open http://localhost:3000/<route>     # eyeball it
node scripts/check-everything.mjs      # integrates the page into the watchdog
```

## Next steps

- `/add-form-with-route` if the page has a form.
- `/regenerate-admin-screenshots` is unrelated — that's admin-only.
- After deploy: `/post-deploy-verify` to confirm the page lives at the right URL.
