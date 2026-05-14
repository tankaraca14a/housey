// Image edge cases at the metadata API level. We don't try to drive an
// actual Blob upload here (covered by the live lifecycle test); these
// hit /api/admin/images directly with synthetic URLs to verify input
// rejection paths the live test glosses over.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const FILE = join(REPO, 'data', 'images.json');
const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

const initial = JSON.parse(readFileSync(FILE, 'utf-8'));

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }
async function api(method, path, { body } = {}) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const valid = {
  url: 'https://x.public.blob.vercel-storage.com/housey/probe.jpg',
  blobPathname: 'housey/probe.jpg',
  alt: 'Probe',
  categories: ['exterior'],
  featured: false,
  sortOrder: 1,
  width: 1200,
  height: 800,
};

try {
  // ── 1. Each known category accepted ───────────────────────────────────────
  log('=== 1. All 5 known categories accepted on POST ===');
  const ids1 = [];
  for (const cat of ['aerial', 'coast', 'exterior', 'terrace', 'interior']) {
    const r = await api('POST', '/api/admin/images', { body: { ...valid, categories: [cat] } });
    ok(r.status === 200, `1-${cat}: got ${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
    if (r.body.image?.id) ids1.push(r.body.image.id);
  }
  for (const id of ids1) await api('DELETE', `/api/admin/images/${id}`);

  // ── 2. Multi-category accepted ───────────────────────────────────────────
  log('\n=== 2. Multi-category ===');
  const r2 = await api('POST', '/api/admin/images', { body: { ...valid, categories: ['exterior', 'terrace', 'interior'] } });
  ok(r2.status === 200, '2a: 3 categories accepted');
  if (r2.body.image?.id) {
    await api('DELETE', `/api/admin/images/${r2.body.image.id}`);
  }

  // ── 3. Empty categories array accepted ───────────────────────────────────
  log('\n=== 3. Empty categories array ===');
  const r3 = await api('POST', '/api/admin/images', { body: { ...valid, categories: [] } });
  ok(r3.status === 200, '3a: empty categories accepted');
  if (r3.body.image?.id) {
    await api('DELETE', `/api/admin/images/${r3.body.image.id}`);
  }

  // ── 4. PATCH unknown field is ignored ────────────────────────────────────
  log('\n=== 4. PATCH unknown / immutable fields ===');
  const r4 = await api('POST', '/api/admin/images', { body: valid });
  const id = r4.body.image.id;
  // Try to overwrite immutable id (server should ignore — id stays the same)
  const p1 = await api('PATCH', `/api/admin/images/${id}`, { body: { id: 'hijack', alt: 'after-hijack' } });
  ok(p1.status === 200 && p1.body.image.id === id, `4a: cannot overwrite id via PATCH (still ${id})`);
  ok(p1.body.image.alt === 'after-hijack', `4b: other fields still patched`);
  // url / blobPathname / uploadedAt also immutable
  const p2 = await api('PATCH', `/api/admin/images/${id}`, { body: { url: 'https://evil.com/x.jpg' } });
  ok(p2.status === 400 || (p2.status === 200 && p2.body.image.url === valid.url),
    `4c: cannot overwrite url via PATCH`);
  await api('DELETE', `/api/admin/images/${id}`);

  // ── 5. Concurrent create race (5 simultaneous POSTs) ─────────────────────
  log('\n=== 5. Concurrent metadata create race ===');
  const before5 = (await api('GET', '/api/admin/images')).body.images.length;
  const racers = Array.from({ length: 5 }, (_, i) =>
    api('POST', '/api/admin/images', { body: { ...valid, alt: `race-${i}`, sortOrder: 100 + i } })
  );
  const results = await Promise.all(racers);
  const succ = results.filter((r) => r.status === 200);
  ok(succ.length === 5, `5a: 5/5 concurrent creates 200 (got ${succ.length})`);
  const ids5 = new Set(succ.map((r) => r.body.image.id));
  ok(ids5.size === 5, `5b: all 5 ids unique`);
  const after5 = (await api('GET', '/api/admin/images')).body.images.length;
  ok(after5 === before5 + 5, `5c: image count grew by exactly 5 (${before5} → ${after5})`);
  for (const r of succ) await api('DELETE', `/api/admin/images/${r.body.image.id}`);
} finally {
  writeFileSync(FILE, JSON.stringify(initial, null, 2));
}

log('');
log(failures === 0 ? 'PASS — image edge-case behavior verified ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
