// Integration tests for the image management API.
// Skips the actual Vercel Blob upload (needs cloud credentials); instead
// drives the metadata-side endpoints directly with a synthetic Blob URL.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const IMAGES_FILE = join(REPO, 'data', 'images.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initial = existsSync(IMAGES_FILE) ? JSON.parse(readFileSync(IMAGES_FILE, 'utf-8')) : [];
function restore() {
  writeFileSync(IMAGES_FILE, JSON.stringify(initial, null, 2));
}

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
async function api(method, path, { body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['x-admin-password'] = PASS;
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const validRow = {
  url: 'https://test.blob.local/housey/probe.jpg',
  blobPathname: 'housey/probe.jpg',
  alt: 'Test image',
  categories: ['exterior'],
  featured: false,
  sortOrder: 1,
  width: 1920,
  height: 1280,
};

try {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  log('=== 1. Auth ===');
  for (const [m, p, b] of [
    ['GET',    '/api/admin/images',           null],
    ['POST',   '/api/admin/images',           {}],
    ['PATCH',  '/api/admin/images/anyid',     { alt: 'x' }],
    ['DELETE', '/api/admin/images/anyid',     null],
  ]) {
    const r = await api(m, p, { auth: false, body: b });
    ok(r.status === 401, `1-${m} ${p} without password → 401 (got ${r.status})`);
  }

  // Public read endpoint should NOT require auth
  const pub = await fetch(`${BASE}/api/images`).then((r) => r.status);
  ok(pub === 200, `1-GET /api/images public → 200 (got ${pub})`);

  // ── 2. POST validation ────────────────────────────────────────────────────
  log('\n=== 2. POST /api/admin/images validation ===');
  for (const [label, mutate, want] of [
    ['no url',        (b) => { delete b.url; }, 'url required'],
    ['bad url',       (b) => { b.url = 'not-a-url'; }, 'url required'],
    ['no pathname',   (b) => { delete b.blobPathname; }, 'blobPathname required'],
    ['bad alt type',  (b) => { b.alt = 42; }, 'alt must be a string'],
    ['non-array cats',(b) => { b.categories = 'aerial'; }, 'categories must be an array'],
    ['bad category',  (b) => { b.categories = ['kitchen']; }, /categories must be from/],
    ['non-bool featured', (b) => { b.featured = 'yes'; }, 'featured must be boolean'],
    ['non-number width',  (b) => { b.width = '1920'; }, 'width must be positive number'],
    ['zero width',    (b) => { b.width = 0; }, 'width must be positive number'],
  ]) {
    const body = { ...validRow };
    mutate(body);
    const r = await api('POST', '/api/admin/images', { body });
    const matches = typeof want === 'string' ? r.body.error === want : want.test(r.body.error ?? '');
    ok(r.status === 400 && matches, `2-${label} → 400 (${r.body.error})`);
  }

  // ── 3. Happy path: create → list → patch → delete ─────────────────────────
  log('\n=== 3. Create / list / patch / delete ===');
  const before3 = (await api('GET', '/api/admin/images')).body.images.length;
  const c = await api('POST', '/api/admin/images', { body: validRow });
  ok(c.status === 200 && c.body.image?.id, `3a: create returns 200 with id (${c.body.image?.id})`);
  const id = c.body.image.id;
  ok(c.body.image.featured === false, `3b: featured defaults to value passed (false)`);
  ok(typeof c.body.image.uploadedAt === 'string', `3c: uploadedAt timestamp set`);

  const list = (await api('GET', '/api/admin/images')).body.images;
  ok(list.some((i) => i.id === id), `3d: row visible in admin list`);
  ok(list.length === before3 + 1, `3e: list grew by 1 (${before3} → ${list.length})`);

  const pubList = (await fetch(`${BASE}/api/images`).then((r) => r.json())).images;
  ok(pubList.some((i) => i.id === id), `3f: row visible in public /api/images list`);

  // PATCH alt + featured
  const p1 = await api('PATCH', `/api/admin/images/${id}`, { body: { alt: 'Renamed', featured: true } });
  ok(p1.status === 200 && p1.body.image?.alt === 'Renamed', `3g: PATCH renames alt`);
  ok(p1.body.image?.featured === true, `3h: PATCH toggles featured`);

  // PATCH categories
  const p2 = await api('PATCH', `/api/admin/images/${id}`, { body: { categories: ['interior', 'terrace'] } });
  ok(p2.status === 200 && JSON.stringify(p2.body.image.categories) === JSON.stringify(['interior', 'terrace']),
    `3i: PATCH updates categories`);

  // PATCH with bogus category fails
  const p3 = await api('PATCH', `/api/admin/images/${id}`, { body: { categories: ['kitchen'] } });
  ok(p3.status === 400, `3j: PATCH with invalid category → 400`);

  // PATCH unknown id → 404
  const p4 = await api('PATCH', '/api/admin/images/00000000-0000-0000-0000-000000000000', { body: { alt: 'x' } });
  ok(p4.status === 404, `3k: PATCH unknown id → 404`);

  // DELETE
  const d = await api('DELETE', `/api/admin/images/${id}`);
  ok(d.status === 200 && d.body.deleted === id, `3l: DELETE → 200`);
  const after = (await api('GET', '/api/admin/images')).body.images;
  ok(!after.some((i) => i.id === id), `3m: row removed from KV/file`);

  // DELETE again → 404
  const d2 = await api('DELETE', `/api/admin/images/${id}`);
  ok(d2.status === 404, `3n: re-delete → 404`);
} finally {
  restore();
}

log('');
log(failures === 0 ? 'PASS — image API surface verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
