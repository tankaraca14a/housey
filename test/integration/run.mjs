// Run every integration test in sequence against a local server on :3457.
// Assumes the server is ALREADY started (`PORT=3457 npm run start`).
// Exits non-zero on the first failure.

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = [
  'admin-api.mjs',
  'booking-guards.mjs',
  'book-and-delete.mjs',
  'booking-make.mjs',
  'stress.mjs',
  'social-links.mjs',
  'images-api.mjs',
  'contact-api.mjs',
  'blocked-dates-edge.mjs',
  'meta-tags.mjs',
  'admin-login.mjs',
  'booking-injection.mjs',
  'images-edge.mjs',
  'security-headers.mjs',
  'nav-404.mjs',
];

let failed = 0;
for (const f of FILES) {
  console.log(`\n━━━━ ${f} ━━━━`);
  const r = spawnSync('node', [join(HERE, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log('');
console.log(failed === 0 ? `PASS — all ${FILES.length} integration suites green` : `FAIL — ${failed}/${FILES.length} suite(s) failed`);
process.exit(failed === 0 ? 0 : 1);
