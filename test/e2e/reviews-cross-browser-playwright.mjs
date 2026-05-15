// Cross-browser e2e: render the public /reviews page in Chromium, Firefox,
// and WebKit (the Safari engine), assert the star character paints with
// the right colors in all three engines.
//
// Why this exists: Safari handles font fallbacks for the ★ character
// differently from Chromium-family browsers; the amber-vs-slate spans
// have non-trivial CSS that needs to actually compute a visible color
// in every engine. If the stars came out invisible or grey-on-grey in
// Safari, Ivana's iPhone visitors wouldn't see ratings.
//
// We POST a review with rating=3 via API, then for each engine:
//   * load /reviews
//   * find the rendered card
//   * for each star span, read computed color and confirm it's
//     "amber-ish" (warm yellow) for stars 1..3 and "slate-ish" (cool
//     grey) for stars 4..5
// Cleanup deletes the seeded row.

import { chromium, firefox, webkit } from 'playwright';

const BASE = 'http://localhost:3457';
const PASS = 'ivana2026';
let failures = 0;
const log = (...a) => console.log(...a);
const ok = (c, m) => { if (c) log(`  ✓ ${m}`); else { log(`  ✗ ${m}`); failures++; } };

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json', 'x-admin-password': PASS };
  const r = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function rgbToHsl(rgbStr) {
  // "rgb(251, 191, 36)" or "rgba(…)" or "oklch(…)" etc.
  const m = rgbStr.match(/(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let r = parseFloat(m[1]) / 255, g = parseFloat(m[2]) / 255, b = parseFloat(m[3]) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

// Amber = warm (hue ~40-60°), saturated, not too dark
function isAmberish(rgb) {
  const hsl = rgbToHsl(rgb);
  return hsl != null && hsl.h >= 30 && hsl.h <= 70 && hsl.s >= 50 && hsl.l >= 40;
}
// Slate = cool grey (hue 200-230 or hue=0 with low saturation)
function isSlateish(rgb) {
  const hsl = rgbToHsl(rgb);
  return hsl != null && (hsl.s < 30 || (hsl.h >= 200 && hsl.h <= 240));
}

const ENGINES = [
  { name: 'Chromium', launcher: chromium },
  { name: 'Firefox',  launcher: firefox  },
  { name: 'WebKit',   launcher: webkit   },
];

let seededId = null;
try {
  log('=== 1. Seed one rating=3 review ===');
  const c = await api('POST', '/api/admin/reviews', {
    author: 'CrossBrowserProbe',
    source: 'X',
    rating: 3,
    quote: 'Cross-browser render check.',
    date: '2025-08-15',
    featured: true,
    sortOrder: 100,
  });
  ok(c.status === 200, `1a: created (status ${c.status})`);
  seededId = c.body.review.id;

  for (const eng of ENGINES) {
    log(`\n=== 2.${eng.name} ===`);
    const browser = await eng.launcher.launch({ headless: true });
    try {
      const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/reviews`, { waitUntil: 'networkidle' });

      // ReviewCard wraps each row in <div data-testid="review-<id>"> with
      // a <ReviewStars> child that emits 5 spans whose textContent is "★".
      const starColors = await page.evaluate((authorName) => {
        const cards = Array.from(document.querySelectorAll('[data-testid^="review-"]'));
        const card = cards.find((c) => (c.textContent || '').includes(authorName));
        if (!card) return null;
        const stars = Array.from(card.querySelectorAll('span')).filter((s) => s.textContent === '★');
        return stars.slice(0, 5).map((s) => getComputedStyle(s).color);
      }, 'CrossBrowserProbe');
      ok(starColors && starColors.length === 5, `2.${eng.name}.a: 5 star spans found (got ${starColors?.length ?? 0})`);
      if (starColors && starColors.length === 5) {
        for (let i = 0; i < 5; i++) {
          const shouldAmber = i < 3;
          if (shouldAmber) {
            ok(isAmberish(starColors[i]), `2.${eng.name}.b${i + 1}: star ${i + 1} amber (color=${starColors[i]})`);
          } else {
            ok(isSlateish(starColors[i]), `2.${eng.name}.b${i + 1}: star ${i + 1} slate (color=${starColors[i]})`);
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
} catch (e) {
  log(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  if (seededId) {
    try { await api('DELETE', `/api/admin/reviews/${seededId}`); } catch {}
  }
}

log('');
log(failures === 0 ? 'PASS — stars render correctly in Chromium + Firefox + WebKit ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
