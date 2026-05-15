// Regenerates screenshots 24, 25, 30–37 for both ADMIN-GUIDE.md (EN)
// and ADMIN-HR.md (HR). The original generate-admin-guide-screenshots
// scripts cover 01–23 of the admin flow; this one covers the newer
// feature surfaces: RTL reviews, public-page shots, review lang +
// translations, the public-side badge/toggle, the /submit-review form,
// the translation inbox + publish panel.
//
// Run with:
//   node scripts/generate-feature-screenshots.mjs
//
// Prereqs: local server on :3457. The script seeds its own sample data
// (sentinel-tagged), drives the UI, takes shots, then cleans up. Safe
// to re-run; nothing it creates leaks past the script's lifetime.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const OUT_EN = join(ROOT, 'docs', 'admin-screenshots');
const OUT_HR = join(ROOT, 'docs', 'admin-screenshots-hr');
mkdirSync(OUT_EN, { recursive: true });
mkdirSync(OUT_HR, { recursive: true });

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';

// Per-language output dir + the one filename that differs between EN
// and HR (the RTL review shot uses a Croatian filename in the HR dir).
const SCHEME = {
  en: { out: OUT_EN, rtl: '24-reviews-rtl.png' },
  hr: { out: OUT_HR, rtl: '24-recenzije-rtl.png' },
};

// Track every row we create so finally{} can sweep them.
const created = { reviews: [], inbox: [] };

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-password': PASS },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function setLang(page, code) {
  // Cookie + localStorage written here mirror what the production
  // LangPicker does; both server-side (cookies + SSR) and client-side
  // (LangProvider) honour the choice on the next request / mount.
  await page.evaluate((l) => {
    window.localStorage.setItem('housey-lang', l);
    document.cookie = `housey-lang=${l}; max-age=31536000; path=/; SameSite=Lax`;
  }, code);
}

async function clip(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  return await locator.boundingBox();
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 2, // retina-crisp
});
const page = await ctx.newPage();

try {
  // ─────────────────────────────────────────────────────────────────────
  // Seed data: a Croatian-original review with EN/DE translations (for
  // 33 badge + 34 toggle), an Arabic review (for 24 RTL), a quoted
  // English review (for 30-site-reviews to show real content), and an
  // inbox submission (for 36 + 37).
  // ─────────────────────────────────────────────────────────────────────
  console.log('Seeding sample data…');

  const seedReviews = [
    {
      author: 'Marko Horvat',
      source: 'Direct',
      rating: 5,
      quote: 'Divno mjesto, mirno i čisto. Vraćamo se sigurno.',
      date: '2025-07-22',
      featured: true,
      sortOrder: 40,
      lang: 'hr',
      // No translations — this row is the "badge appears when visitor
      // lang differs" shot 33.
    },
    {
      author: 'Lukas M.',
      source: 'Airbnb',
      rating: 5,
      quote: 'Beautiful place, peaceful and clean. We will be back.',
      date: '2025-08-04',
      featured: true,
      sortOrder: 50,
      lang: 'en',
      translations: {
        hr: 'Prelijepo mjesto, mirno i čisto. Vraćamo se.',
        de: 'Wunderschöner Ort, ruhig und sauber. Wir kommen wieder.',
      },
    },
    {
      author: 'Anna Müller',
      source: 'Booking.com',
      rating: 5,
      quote: 'Stunning views, easy parking, great hosts. Recommended.',
      date: '2025-09-10',
      featured: true,
      sortOrder: 60,
      lang: 'en',
    },
    {
      author: 'أحمد المهندس',
      source: 'Airbnb',
      rating: 5,
      quote: 'مكان رائع على البحر، الإطلالة لا تنسى.',
      date: '2025-08-15',
      featured: false,
      sortOrder: 70,
      lang: 'fr', // tagged fr just to exercise non-default; not Arabic in our set
    },
  ];
  for (const r of seedReviews) {
    const res = await api('POST', '/api/admin/reviews', r);
    if (res.body.review?.id) created.reviews.push(res.body.review.id);
  }

  const inbox = await api('POST', '/api/admin/submitted-reviews', {
    author: 'Anna Müller',
    source: 'Booking.com',
    rating: 5,
    quote: 'Wonderful stay, easy parking, hosts very welcoming. Five stars.',
    date: '2025-09-12',
    lang: 'en',
    notes: 'Stayed 7 nights in September. Cleaning rating maxed out.',
  });
  const inboxId = inbox.body.submission?.id;
  if (inboxId) created.inbox.push(inboxId);

  // ─────────────────────────────────────────────────────────────────────
  // Iterate per language: shots that depend on UI chrome get taken in
  // BOTH; shots that are inherently bilingual (like RTL side-by-side)
  // get taken once per language with the same content.
  // ─────────────────────────────────────────────────────────────────────
  for (const lang of /** @type {const} */ (['en', 'hr'])) {
    const out = SCHEME[lang].out;
    console.log(`\n=== ${lang.toUpperCase()} pass ===`);

    // First navigate to origin so we can set localStorage/cookie.
    await page.goto(`${BASE}/`);
    await setLang(page, lang);

    // ── 25-public-* (set 1, 4 shots) ────────────────────────────────────
    // home + booking shown in non-default langs to prove SSR rendering.
    // We keep this set per-output-dir but they're language-tagged in
    // their filenames, so they're the same shots in both EN + HR dirs.
    for (const [pickLang, file] of /** @type {const} */ ([
      ['hr', '25-public-home-hr.png'],
      ['fr', '25-public-home-fr.png'],
    ])) {
      await page.goto(`${BASE}/`);
      await setLang(page, pickLang);
      await page.goto(`${BASE}/`);
      await page.waitForSelector('h1');
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, file), fullPage: false });
      console.log(`  ✓ ${file}`);
    }
    for (const [pickLang, file] of /** @type {const} */ ([
      ['de', '25-public-booking-de.png'],
      ['it', '25-public-booking-it.png'],
    ])) {
      await page.goto(`${BASE}/`);
      await setLang(page, pickLang);
      await page.goto(`${BASE}/booking`);
      await page.waitForSelector('h1');
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(out, file), fullPage: false });
      console.log(`  ✓ ${file}`);
    }

    // Reset to the iteration's lang for everything below.
    await page.goto(`${BASE}/`);
    await setLang(page, lang);

    // ── 30-site-* (7 pages) ─────────────────────────────────────────────
    for (const [path, file] of [
      ['/',         '30-site-home.png'],
      ['/about',    '30-site-about.png'],
      ['/gallery',  '30-site-gallery.png'],
      ['/booking',  '30-site-booking.png'],
      ['/location', '30-site-location.png'],
      ['/reviews',  '30-site-reviews.png'],
      ['/contact',  '30-site-contact.png'],
    ]) {
      await page.goto(`${BASE}${path}`);
      await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(out, file), fullPage: false });
      console.log(`  ✓ ${file}`);
    }

    // ── 24 RTL: /reviews showing Arabic alongside Latin reviews ─────────
    // The HR dir uses a Croatian filename for this one.
    await page.goto(`${BASE}/reviews`);
    await page.waitForSelector('h1');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, SCHEME[lang].rtl), fullPage: false });
    console.log(`  ✓ ${SCHEME[lang].rtl}`);

    // ── 33 review-badge: a card whose lang ≠ visitor lang ──────────────
    // For EN visitors, the Croatian Marko Horvat row shows "in Croatian".
    // For HR visitors, the English Anna Müller row shows "na engleskom".
    const badgeAuthor = lang === 'en' ? 'Marko Horvat' : 'Anna Müller';
    const badgeRowId = created.reviews[seedReviews.findIndex((r) => r.author === badgeAuthor)];
    if (badgeRowId) {
      const card = page.locator(`[data-testid="review-${badgeRowId}"]`);
      const box = await clip(page, card);
      if (box) {
        await page.screenshot({ path: join(out, '33-review-badge.png'), clip: box });
        console.log(`  ✓ 33-review-badge.png`);
      }
    }

    // ── 34 review-toggle: card with translation in visitor's lang ──────
    // Lukas M. has HR + DE translations. EN visitor → DE iteration uses
    // its own iter; we want a card showing the translation, so for both
    // EN doc (showing DE example chrome) and HR doc (showing HR example
    // chrome) we pick DE / HR respectively.
    const togglePickLang = lang === 'en' ? 'de' : 'hr';
    await page.goto(`${BASE}/`);
    await setLang(page, togglePickLang);
    await page.goto(`${BASE}/reviews`);
    await page.waitForSelector('h1');
    await page.waitForTimeout(400);
    const toggleRowId = created.reviews[seedReviews.findIndex((r) => r.author === 'Lukas M.')];
    if (toggleRowId) {
      const card = page.locator(`[data-testid="review-${toggleRowId}"]`);
      const box = await clip(page, card);
      if (box) {
        await page.screenshot({ path: join(out, '34-review-toggle.png'), clip: box });
        console.log(`  ✓ 34-review-toggle.png`);
      }
    }
    // Restore iteration lang.
    await page.goto(`${BASE}/`);
    await setLang(page, lang);

    // ── 35 /submit-review with sample content ──────────────────────────
    await page.goto(`${BASE}/submit-review`);
    await page.locator('[data-testid="submit-password"]').fill(PASS);
    await page.locator('[data-testid="submit-unlock"]').click();
    await page.waitForSelector('[data-testid="submit-author"]');
    await page.locator('[data-testid="submit-author"]').fill('Marko Horvat');
    await page.locator('[data-testid="submit-source"]').fill('Direct');
    await page.locator('[data-testid="submit-rating-5"]').click();
    await page.locator('[data-testid="submit-lang"]').selectOption('hr');
    await page.locator('[data-testid="submit-quote"]').fill('Divan boravak, mirno i čisto. Vraćamo se sigurno.');
    await page.locator('[data-testid="submit-notes"]').fill('Iz Zagreba, prvi put. Posebno hvale terasu.');
    await page.waitForTimeout(200);
    const submitForm = page.locator('main > div').first();
    const submitBox = await clip(page, submitForm);
    if (submitBox) {
      await page.screenshot({ path: join(out, '35-submit-review-form.png'), clip: submitBox });
      console.log(`  ✓ 35-submit-review-form.png`);
    }

    // ── /admin shots: 31, 32, 36, 37 ────────────────────────────────────
    await page.goto(`${BASE}/admin`);
    await page.locator('input[type="password"]').fill(PASS);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForSelector('h1');
    await page.waitForTimeout(600);

    // ── 31 admin review form with lang dropdown visible ────────────────
    await page.locator('[data-testid="review-add-trigger"]').click();
    await page.waitForSelector('[data-testid="review-edit-panel"]');
    await page.locator('[data-testid="review-author"]').fill('Maria S.');
    await page.locator('[data-testid="review-source"]').fill('Airbnb');
    await page.locator('[data-testid="review-rating-5"]').click();
    await page.locator('[data-testid="review-quote"]').fill('Beautiful place, peaceful and clean. We will be back.');
    await page.waitForTimeout(200);
    const editPanel = page.locator('[data-testid="review-edit-panel"]');
    const editBox = await clip(page, editPanel);
    if (editBox) {
      await page.screenshot({ path: join(out, '31-review-form-lang.png'), clip: editBox });
      console.log(`  ✓ 31-review-form-lang.png`);
    }

    // ── 32 admin review form translations panel expanded ───────────────
    await page.locator('[data-testid="review-lang"]').selectOption('en');
    const transPanel = page.locator('[data-testid="review-translations-panel"]');
    await transPanel.evaluate((el) => { el.open = true; });
    await page.locator('[data-testid="review-translation-hr"]').fill('Prelijepo mjesto, mirno i čisto. Vraćamo se.');
    await page.locator('[data-testid="review-translation-de"]').fill('Wunderschöner Ort, ruhig und sauber. Wir kommen wieder.');
    await page.waitForTimeout(200);
    const editBox2 = await clip(page, editPanel);
    if (editBox2) {
      await page.screenshot({ path: join(out, '32-review-form-translations.png'), clip: editBox2 });
      console.log(`  ✓ 32-review-form-translations.png`);
    }
    // Close the form so the inbox section below is uncluttered.
    await page.locator('[data-testid="review-cancel"]').click();
    await page.waitForTimeout(200);

    // ── 36 translation inbox section ────────────────────────────────────
    const inboxSection = page.locator('[data-testid="inbox-section"]');
    const inboxBox = await clip(page, inboxSection);
    if (inboxBox) {
      await page.screenshot({ path: join(out, '36-translation-inbox.png'), clip: inboxBox });
      console.log(`  ✓ 36-translation-inbox.png`);
    }

    // ── 37 publish-with-translations panel ──────────────────────────────
    if (inboxId) {
      await page.locator(`[data-testid="inbox-publish-${inboxId}"]`).click();
      await page.waitForSelector(`[data-testid="inbox-publish-panel-${inboxId}"]`);
      await page.locator('[data-testid="inbox-translation-hr"]').fill('Predivan boravak, lako parkiranje, domaćini vrlo srdačni. Pet zvjezdica.');
      await page.locator('[data-testid="inbox-translation-de"]').fill('Wundervoller Aufenthalt, einfaches Parken, sehr herzliche Gastgeber. Fünf Sterne.');
      await page.locator('[data-testid="inbox-translation-it"]').fill('Soggiorno meraviglioso, parcheggio facile, padroni di casa molto accoglienti. Cinque stelle.');
      await page.locator('[data-testid="inbox-translation-fr"]').fill('Séjour merveilleux, parking facile, hôtes très accueillants. Cinq étoiles.');
      await page.waitForTimeout(200);
      const publishPanel = page.locator(`[data-testid="inbox-publish-panel-${inboxId}"]`);
      const publishBox = await clip(page, publishPanel);
      if (publishBox) {
        await page.screenshot({ path: join(out, '37-publish-panel.png'), clip: publishBox });
        console.log(`  ✓ 37-publish-panel.png`);
      }
      // Cancel so the NEXT iteration sees the same closed-queue state.
      await page.locator(`[data-testid="inbox-publish-cancel-${inboxId}"]`).click();
      await page.waitForTimeout(200);
    }
  }

  console.log('\nDone.');
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  process.exitCode = 1;
} finally {
  // Sweep every row we seeded so the data file ends up where it started.
  for (const id of created.reviews) {
    try { await api('DELETE', `/api/admin/reviews/${id}`); } catch {}
  }
  for (const id of created.inbox) {
    try { await api('DELETE', `/api/admin/submitted-reviews/${id}`); } catch {}
  }
  await browser.close();
  console.log(`  (cleaned ${created.reviews.length} review rows + ${created.inbox.length} inbox rows)`);
}
