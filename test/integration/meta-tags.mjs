// OG + Twitter card metadata on every public page. Plus sanity checks
// for <title>, <meta name="description">, language attr, etc.

const BASE = 'http://localhost:3457';
const PAGES = ['/', '/about', '/gallery', '/location', '/booking', '/contact', '/admin'];

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

for (const path of PAGES) {
  log(`\n━━━━ ${path} ━━━━`);
  const html = await fetch(`${BASE}${path}`).then((r) => r.text());
  // Some metadata is inherited from layout — every page should have it.
  ok(html.includes('property="og:title"'),       `${path}: og:title present`);
  ok(html.includes('property="og:image"'),       `${path}: og:image present`);
  ok(html.includes('property="og:url"'),         `${path}: og:url present`);
  ok(html.includes('name="twitter:card"'),       `${path}: twitter:card present`);
  ok(html.includes('summary_large_image'),       `${path}: card type=summary_large_image`);
  ok(/<title>[^<]*<\/title>/.test(html),         `${path}: <title> tag present`);
  ok(/<meta name="description"/.test(html),      `${path}: meta description present`);
  ok(html.includes('<html lang="en">'),          `${path}: html lang="en"`);
  // No accidentally-rendered server error
  ok(!html.includes('Application error'),        `${path}: no client-side React error visible`);
}

log('');
log(failures === 0 ? `PASS — meta tags + page health on all ${PAGES.length} pages ✓` : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
