// Run every e2e suite (browser-driven) against a local server on :3457.
// Assumes the server is ALREADY started.

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = [
  'scheduling-playwright.mjs',
  'booking-flow-playwright.mjs',
  'admin-crud-selenium.mjs',
  'scheduling-selenium.mjs',
  'delete-undo-selenium.mjs',
  'image-undo-selenium.mjs',
  'calendar-dirty-playwright.mjs',
  'gallery-lightbox-playwright.mjs',
];

let failed = 0;
for (const f of FILES) {
  console.log(`\n━━━━ ${f} ━━━━`);
  const r = spawnSync('node', [join(HERE, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log('');
console.log(failed === 0 ? `PASS — all ${FILES.length} e2e suites green` : `FAIL — ${failed}/${FILES.length} suite(s) failed`);
process.exit(failed === 0 ? 0 : 1);
