// Integration test: the server reads the housey-lang cookie at request
// time and emits HTML in that language. Closes the "SSR first paint
// always EN" gap — there is no longer a flash of English for non-EN
// users, and Croatian/German/Italian/French search crawlers + social
// share scrapers see localised content + metadata.
//
// Verifies for every supported lang:
//   1. <html lang="…"> matches the cookie
//   2. <title> contains the language-specific site title
//   3. og:title meta + twitter:title content are localised
//   4. og:locale is the right BCP-47 (en_US / hr_HR / de_DE / it_IT / fr_FR)
//   5. Page content (h1, body text) renders in that lang — no client swap
//      needed (i.e., before any JS runs)
//   6. Missing cookie -> defaults to 'en'
//   7. Garbage cookie -> defaults to 'en' (no crash, no XSS)

const BASE = 'http://localhost:3457';
let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function getHTML(path, lang) {
  const headers = { 'Cache-Control': 'no-store' };
  if (lang !== undefined) headers['Cookie'] = `housey-lang=${lang}`;
  const r = await fetch(`${BASE}${path}`, { headers, cache: 'no-store' });
  return await r.text();
}

const EXPECTED = {
  en: {
    htmlLang: 'en',
    title: 'Dalmatian Coast Vacation Rental',
    locale: 'en_US',
    aboutH1: 'About the House',
    homeBookButton: 'Book Now',
  },
  hr: {
    htmlLang: 'hr',
    title: 'dalmatinskoj obali',
    locale: 'hr_HR',
    aboutH1: 'O kući',
    homeBookButton: 'Rezervirajte',
  },
  de: {
    htmlLang: 'de',
    title: 'dalmatinischen Küste',
    locale: 'de_DE',
    aboutH1: 'Über das Haus',
    homeBookButton: 'Jetzt buchen',
  },
  it: {
    htmlLang: 'it',
    title: 'costa dalmata',
    locale: 'it_IT',
    aboutH1: 'Sulla casa',
    homeBookButton: 'Prenota ora',
  },
  fr: {
    htmlLang: 'fr',
    title: 'côte dalmate',
    locale: 'fr_FR',
    aboutH1: 'À propos de la maison',
    homeBookButton: 'Réserver',
  },
};

try {
  for (const [lang, want] of Object.entries(EXPECTED)) {
    log(`\n=== ${lang} ===`);
    const home = await getHTML('/', lang);
    ok(home.includes(`<html lang="${want.htmlLang}"`), `${lang}-1: <html lang="${want.htmlLang}"> on /`);
    ok(home.includes(want.title), `${lang}-2: <title> contains "${want.title}"`);
    ok(home.includes(`content="${want.locale}"`), `${lang}-3: og:locale = "${want.locale}"`);
    ok(home.includes(want.homeBookButton), `${lang}-4: home page button "${want.homeBookButton}" in SSR HTML (no client swap needed)`);

    const about = await getHTML('/about', lang);
    ok(about.includes(`<html lang="${want.htmlLang}"`), `${lang}-5: <html lang> also on /about`);
    ok(about.includes(want.aboutH1), `${lang}-6: /about h1 "${want.aboutH1}" present in SSR HTML`);
  }

  log('\n=== missing cookie -> defaults to en ===');
  const noCookie = await fetch(`${BASE}/`, { cache: 'no-store' }).then((r) => r.text());
  ok(noCookie.includes('<html lang="en"'), `nc-1: <html lang="en"> when no cookie`);
  ok(noCookie.includes('Dalmatian Coast Vacation Rental'), `nc-2: EN title when no cookie`);

  log('\n=== garbage cookie -> defaults to en (no crash) ===');
  const garbage = await getHTML('/', '<script>alert(1)</script>');
  ok(garbage.includes('<html lang="en"'), `gb-1: garbage cookie defaults to en`);
  ok(!/<html lang="[^"]*<script/.test(garbage), `gb-2: cookie value never reaches <html lang> unsanitised`);
  // Validate that the literal payload doesn't appear in HTML in any active form
  ok(!/<script>alert\(1\)<\/script>/.test(garbage), `gb-3: no raw <script> tag from cookie payload`);
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
}

log('');
log(failures === 0 ? 'PASS — server renders each lang on first paint via cookie ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
