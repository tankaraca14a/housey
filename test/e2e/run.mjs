// Run every e2e suite (browser-driven) against a local server on :3457.
// Assumes the server is ALREADY started.
//
// Each suite runs against a guaranteed-clean data state — we reset
// data/bookings.json and data/images.json to `[]` between suites so a
// leaked row from any prior failed suite can never poison the next one
// via the overlap-conflict guard. data/blocked-dates.json is left alone
// (some suites assume specific dates are blocked there).

import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));

function resetState() {
  writeFileSync(join(REPO, 'data', 'bookings.json'), '[]\n');
  writeFileSync(join(REPO, 'data', 'images.json'), '[]\n');
}
const FILES = [
  'scheduling-playwright.mjs',
  'booking-flow-playwright.mjs',
  'admin-crud-selenium.mjs',
  'scheduling-selenium.mjs',
  'delete-undo-selenium.mjs',
  'image-undo-selenium.mjs',
  'confirm-decline-undo-selenium.mjs',
  'admin-reviews-stars-selenium.mjs',
  'admin-reviews-mobile-playwright.mjs',
  'admin-reviews-mobile-hr-playwright.mjs',
  'admin-reviews-keyboard-playwright.mjs',
  'reviews-cross-browser-playwright.mjs',
  'admin-reviews-undo-playwright.mjs',
  'admin-reviews-cancel-validation-playwright.mjs',
  'calendar-dirty-playwright.mjs',
  'mobile-admin-playwright.mjs',
  'heic-conversion-playwright.mjs',
  'gallery-lightbox-playwright.mjs',
];

let failed = 0;
for (const f of FILES) {
  resetState(); // hard isolation between suites
  console.log(`\n━━━━ ${f} ━━━━`);
  const r = spawnSync('node', [join(HERE, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
resetState(); // clean exit

console.log('');
console.log(failed === 0 ? `PASS — all ${FILES.length} e2e suites green` : `FAIL — ${failed}/${FILES.length} suite(s) failed`);
process.exit(failed === 0 ? 0 : 1);
