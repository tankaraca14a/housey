---
name: setup-storage
description: Pick + provision persistent storage. Defaults to Upstash KV via Vercel Marketplace for housey-style apps (small structured data, low write rate, free tier ample). Includes the file-backend-locally / KV-in-prod abstraction pattern.
---

# setup-storage

Use when the app needs persistence between requests AND the data shape is light enough for KV / Blob / a small Postgres.

## Decision tree

| Data shape | Use |
|---|---|
| A few JSON documents, < 100 KB each, single-writer | **Upstash KV (Redis)** via Vercel Marketplace |
| Tens-of-thousands of rows, relational queries needed | Neon Postgres via Vercel Marketplace |
| Image / video bytes, public URLs | **Vercel Blob** |
| User-uploaded structured files (PDFs, docs) | Vercel Blob (private mode) |
| Full-text search over many docs | Upstash Search or Algolia |

For most small-business sites (booking, contact form, gallery): **Upstash KV + Vercel Blob is the answer.**

## Provisioning via Marketplace

The user's preferred path is `/marketplace` (the Vercel skill auto-loaded in this environment). It runs the agentic apply-guide loop:

```bash
vercel integration add upstash-kv
# or
vercel integration add vercel-blob
```

Interactive prompts ask: existing store or create new, environment scopes. For Upstash specifically, the CLI sometimes bounces to the dashboard mid-flow — `vercel integration open upstash-kv` opens that page directly.

After install:

```bash
vercel env ls   # confirm KV_REST_API_URL and KV_REST_API_TOKEN exist
vercel env pull .env.local --yes
```

## The repository pattern (so the app works locally AND in serverless)

Vercel functions have read-only filesystems at runtime, so you cannot use `fs.writeFile` in production. But for local dev a JSON file on disk is fastest. Solution: behind an interface, two backends auto-selected by env.

```ts
// app/lib/repository.ts
export interface BookingsRepository {
  list(): Promise<Booking[]>;
  get(id: string): Promise<Booking | null>;
  insert(b: Booking): Promise<Booking>;
  update(id: string, patch: Partial<Booking>): Promise<Booking | null>;
  delete(id: string): Promise<boolean>;
}
```

```ts
// app/lib/store-factory.ts
function kvConfigured(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL) &&
    (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

export const STORAGE_BACKEND: 'kv' | 'file' = kvConfigured() ? 'kv' : 'file';

export const bookings: BookingsRepository = STORAGE_BACKEND === 'kv'
  ? kvBookingsRepository
  : fileBookingsRepository;
```

Locally: file backend reads/writes `data/bookings.json` via atomic tmp+rename (see housey `app/lib/data-store.ts`). In production: KV backend uses `@upstash/redis`.

API routes only import from `store-factory.ts` — they never know which backend is active.

## File backend essentials

- **Atomic writes** via `writeFile(tmp) + rename(tmp, real)` — POSIX rename is atomic. Naive `fs.writeFile` can leave a half-written file on crash.
- **In-process mutex** to serialise read-modify-write within a single Node process. Use a `Promise<void>` chain keyed by filename.
- **Schema validation on read** — if the file is missing or contains invalid JSON, return `[]` (don't crash).

See `app/lib/data-store.ts` in housey for the canonical implementation.

## KV backend essentials

- Use `@upstash/redis` (REST client). It works in edge and node runtimes.
- For collections, use one Redis key per entity (`booking:<uuid>`) plus an index SET (`bookings:index`) of all ids. Avoids the cost of fetching unrelated entities.
- For small sets like blocked-dates: a single Redis SET works (`SADD`, `SREM`, `SMEMBERS`).

## Audit logging

If state-change provenance matters (who set this, when, from where), bolt on an audit log. See housey `app/lib/blocked-dates-audit.ts` — append-only with `{ts, action, source, ip, ua}` per change, capped at 5000 entries in KV, JSONL locally.

## Local dev environment

`.env.local` should have `KV_REST_API_URL` + `KV_REST_API_TOKEN` so dev mirrors prod. If you want to force the file backend locally for tests, move `.env.local` aside (see `/test-everything` preflight).

## Verify

```bash
# Locally with KV env
curl http://localhost:3000/api/<thing>            # → [] from KV
# Without KV env
mv .env.local .env.local.disabled
curl http://localhost:3000/api/<thing>            # → [] from file
mv .env.local.disabled .env.local
```

## Common errors

- **`KV not configured`**: env vars missing. `vercel env pull .env.local --yes`.
- **`Lost update` symptoms** (concurrent requests overwrite each other): file backend missing the mutex. Add it.
- **JSON file is `{}` instead of `[]`**: schema-validate-on-read should normalize to the expected shape rather than crash.

## Next steps

- `/add-admin-page` to expose CRUD.
- `/add-form-with-route` for guest-facing submission.
- `/setup-test-stack` so the repository pattern is tested in both backends.
