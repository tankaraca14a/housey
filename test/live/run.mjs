// Run every live smoke test against https://www.tankaraca.com.
// These suites are non-destructive and use sentinel-tagged data + admin
// DELETE for cleanup. Safe to run any time.

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILES = [
  'scheduling-smoke.mjs',
  'scheduling-deep.mjs',
  'admin-live.mjs',
  'lifecycle-live.mjs',
  'confirm-undo-live.mjs',
  'images-lifecycle-live.mjs',
];

let failed = 0;
for (const f of FILES) {
  console.log(`\n━━━━ ${f} ━━━━`);
  const r = spawnSync('node', [join(HERE, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log('');
console.log(failed === 0 ? `PASS — all ${FILES.length} live suites green` : `FAIL — ${failed}/${FILES.length} suite(s) failed`);
process.exit(failed === 0 ? 0 : 1);
