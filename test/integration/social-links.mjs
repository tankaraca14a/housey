// Integration test: the rendered HTML of / and /contact contains the
// Open Graph + Twitter meta tags, and (in the default no-env-var build)
// does NOT contain any social-link anchors.
//
// This is the "is it set up correctly even though Ivana hasn't added URLs
// yet?" check — when she sets the env vars in Vercel later, the same
// markers WILL appear (covered by SocialLinks unit tests).

const BASE = 'http://localhost:3457';

let failures = 0;
const log = (...a) => console.log(...a);
function ok(c, m) { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } }

const homeHtml    = await fetch(`${BASE}/`).then((r) => r.text());
const contactHtml = await fetch(`${BASE}/contact`).then((r) => r.text());

// ── 1. Open Graph + Twitter card meta tags are always present ────────────────
log('=== 1. OG + Twitter meta on / ===');
ok(homeHtml.includes('property="og:title"'),       '1a: og:title meta present');
ok(homeHtml.includes('property="og:description"'), '1b: og:description meta present');
ok(homeHtml.includes('property="og:url"'),         '1c: og:url meta present');
ok(homeHtml.includes('property="og:image"'),       '1d: og:image meta present');
ok(homeHtml.includes('property="og:site_name"'),   '1e: og:site_name meta present');
ok(homeHtml.includes('property="og:type"'),        '1f: og:type meta present');
ok(homeHtml.includes('name="twitter:card"'),       '1g: twitter:card meta present');
ok(homeHtml.includes('name="twitter:title"'),      '1h: twitter:title meta present');
ok(homeHtml.includes('name="twitter:image"'),      '1i: twitter:image meta present');
ok(homeHtml.includes('summary_large_image'),       '1j: twitter:card type=summary_large_image');
ok(homeHtml.includes('WhatsApp Image 2025-11-07'), '1k: og:image points to a real gallery photo');

// ── 2. Same OG meta on /contact (every page should have it) ──────────────────
log('\n=== 2. OG meta on /contact ===');
ok(contactHtml.includes('property="og:title"'), '2a: og:title present on /contact');
ok(contactHtml.includes('property="og:image"'), '2b: og:image present on /contact');

// ── 3. No social-link anchors when env vars are unset ────────────────────────
log('\n=== 3. No social anchors when env vars unset (current state) ===');
ok(!homeHtml.includes('data-testid="social-link-instagram"'),
   '3a: footer has no Instagram anchor');
ok(!homeHtml.includes('data-testid="social-link-facebook"'),
   '3b: footer has no Facebook anchor');
ok(!homeHtml.includes('data-testid="social-links-footer"'),
   '3c: footer container is also absent (whole component returns null)');
ok(!contactHtml.includes('data-testid="social-links-contact"'),
   '3d: contact page has no social-links container');

// ── 4. The wrapper "Follow us" heading on /contact is hidden ─────────────────
//      (it's inside SocialOnContact which only renders SocialLinks; the
//       heading SHOULD still render but the link list will be empty)
log('\n=== 4. /contact "Follow us" heading appears even when URLs are empty ===');
// The heading is unconditional in SocialOnContact, that's a design choice — verify it
ok(contactHtml.includes('Follow us'), '4a: "Follow us" heading present on /contact (placeholder UI)');
ok(contactHtml.includes('data-testid="contact-social-block"'),
   '4b: contact-social-block test id present');

log('');
log(failures === 0 ? 'PASS — social-link plumbing wired correctly, OG meta present, no broken hrefs ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
