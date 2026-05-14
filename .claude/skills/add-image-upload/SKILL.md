---
name: add-image-upload
description: Add a Vercel Blob client-direct-upload flow with HEIC conversion (iPhone-friendly), metadata-side persistence, and admin grid rendering. Handles the 4.5 MB function body limit by uploading bytes directly browser → Blob.
---

# add-image-upload

Use when the admin needs to upload photos that show up on a public gallery / page. The user's housey project is the canonical example.

## What this avoids

- **Vercel function body limit (4.5 MB)** — naive POST-the-file uploads break above this. Client-direct-upload routes the bytes straight to Vercel Blob, only a tiny JSON metadata POST goes to your function.
- **iPhone HEIC files** — Safari uploads them as `.heic`; your `<img>` can't render them. We convert client-side via heic2any before upload.
- **Image dimensions roundtrip** — read them once on the client during upload; store with the metadata so the gallery doesn't need to load every image to lay out the grid.

## Stack

- `@vercel/blob` — client-direct-upload + server-side cleanup
- `heic2any` — browser-only HEIC → JPEG conversion (dynamic-imported so it doesn't bloat the initial JS bundle)
- The repository pattern from `/setup-storage` for the metadata layer (KV in prod, JSON file locally)

```bash
npm install @vercel/blob heic2any
```

## File layout

```
app/admin/page.tsx                       # the upload UI
app/api/admin/images/route.ts            # GET + POST (metadata)
app/api/admin/images/[id]/route.ts       # PATCH + DELETE (metadata + blob)
app/api/admin/images/upload/route.ts     # `handleUpload` for Blob's client-direct flow
app/lib/image-repository.ts              # ImageRepository interface + file/kv backends
```

## Server: the upload-token route

Blob's client SDK needs to fetch a one-time upload token from your server. The handler validates the request, then returns the token Blob will use to authorize the direct PUT.

```ts
// app/api/admin/images/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // The admin client passes the password in clientPayload (JSON-stringified).
        const payload = clientPayload ? JSON.parse(clientPayload) : null;
        if (payload?.password !== ADMIN_PASSWORD) {
          throw new Error('unauthorized');
        }
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 12 * 1024 * 1024, // 12 MB — HEIC re-encodes can be chunky
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Optional: react to upload finish (we don't persist metadata here —
        // the client makes a separate POST to /api/admin/images for that).
        console.log('blob uploaded:', blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

## Server: metadata routes

`POST /api/admin/images` accepts the Blob URL + dimensions + alt text and persists via the repository. `DELETE /api/admin/images/[id]` removes both the metadata row AND the Blob bytes:

```ts
// app/api/admin/images/[id]/route.ts (DELETE excerpt)
import { del as blobDelete } from '@vercel/blob';
import { images as imagesRepo } from '@/app/lib/store-factory';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (request.headers.get('x-admin-password') !== ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const deleted = await imagesRepo.delete(params.id);
  if (!deleted) return Response.json({ error: 'not found' }, { status: 404 });

  // Best-effort Blob cleanup. If this fails, the KV row is already gone —
  // log + continue so we don't leak orphan rows on transient Blob errors.
  try { await blobDelete(deleted.url); }
  catch (e) { console.warn('blob delete failed (KV row still removed):', e); }

  return Response.json({ success: true });
}
```

## Client: the upload flow

```tsx
// inside admin page.tsx
import { upload } from '@vercel/blob/client';

const handleImageUpload = useCallback(async (fileList: FileList) => {
  setImageError(null);
  const files = Array.from(fileList).filter(
    (f) => f.type.startsWith('image/') || /\.heic$|\.heif$/i.test(f.name)
  );
  if (files.length === 0) {
    setImageError('Pick JPEG, PNG, WebP, or HEIC files.');
    return;
  }
  setUploadingImages(files.length);
  try {
    for (const raw of files) {
      try {
        // HEIC detection: file.type can be empty on some Safari versions,
        // so fall back to the extension.
        const isHeic = raw.type === 'image/heic' || raw.type === 'image/heif'
                    || /\.heic$|\.heif$/i.test(raw.name);
        let file: File | Blob = raw;
        let outName = raw.name;
        if (isHeic) {
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({
            blob: raw,
            toType: 'image/jpeg',
            quality: 0.9,
          });
          const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
          outName = raw.name.replace(/\.(heic|heif)$/i, '.jpg');
          file = new File([jpegBlob as BlobPart], outName, { type: 'image/jpeg' });
        }

        // 1. Upload bytes directly to Vercel Blob
        const contentType = (file as File).type || 'image/jpeg';
        const blob = await upload(`sitename/${Date.now()}-${outName}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/images/upload',
          clientPayload: JSON.stringify({ password: authPassword }),
          contentType,
        });

        // 2. Read dimensions client-side
        const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = document.createElement('img');
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error("Couldn't read image dimensions"));
          img.src = URL.createObjectURL(file);
        });

        // 3. Save metadata
        const res = await fetch('/api/admin/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-password': authPassword },
          body: JSON.stringify({
            url: blob.url,
            blobPathname: blob.pathname,
            alt: outName.replace(/\.[^.]+$/, ''),
            categories: [],
            featured: false,
            sortOrder: Date.now(),
            width: dims.width,
            height: dims.height,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'could not save image metadata');
        }
      } finally {
        setUploadingImages((n) => Math.max(0, n - 1));
      }
    }
    await fetchImages();
  } catch (e) {
    setImageError(e instanceof Error ? e.message : 'upload failed');
  } finally {
    setUploadingImages(0);
  }
}, [authPassword, fetchImages]);
```

## Public rendering

In the public gallery page, use the metadata's `url` directly with a plain `<img>` (NOT `next/image`, because Blob hosts aren't in your `images.domains` allowlist by default). Or add the Blob host to the allowlist if you want Next.js's optimization:

```ts
// next.config.ts
images: { remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }] }
```

## Tests

- **Unit** (`heic-detection.test.mjs`): pure logic — does the extension check work?
- **Unit + Playwright** (`heic-conversion-playwright.mjs`): real HEIC byte stream → heic2any in a real browser → valid JPEG with FFD8FF magic
- **Integration** (`images-api.mjs`): POST + GET + PATCH + DELETE without going through the client
- **E2E** (`image-undo-selenium.mjs`): the 10s undo on image delete (see `/add-undo-pattern`)
- **Live** (`images-lifecycle-live.mjs`): upload → render in gallery → delete cycle on real prod Blob, with sentinel cleanup in `finally`

## Common pitfalls

- **`POST /upload 400` locally**: BLOB_READ_WRITE_TOKEN isn't set. Either configure it in `.env.local` (via `vercel env pull`) or skip the full upload chain in local tests — focus on the heic2any conversion only.
- **`Vercel Blob: No token found`**: same as above.
- **`<img>` shows a broken icon after upload**: the URL hostname isn't in `images.domains`. Use plain `<img>` instead of `next/image`, or add the pattern.
- **HEIC type is empty string**: some Safari versions don't set MIME on HEIC. Fall back to extension check (`.heic`/`.heif`).
- **Orphan Blob objects**: when DELETE fails on the Blob side but succeeds in KV, orphans accumulate. Run `vercel blob ls` periodically and clean up; or build an admin "Vacuum unused blobs" button.

## Next steps

- `/add-undo-pattern` for the delete button — image-delete needs the 10s grace.
- Gallery rendering: featured vs regular split + lightbox is its own page-level pattern (housey `app/gallery/page.tsx`).
