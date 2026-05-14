// Exercises heic2any in a real chromium context against a real .heic
// byte stream (produced by sips, same format an iPhone emits).
//
// The admin page uses heic2any via dynamic import to convert iPhone HEIC
// photos to JPEG before uploading to Blob. The detection logic is unit-
// tested. THIS test covers what was previously untested: the actual
// byte-level conversion. Runs in chromium so window/Blob/File globals
// match production.
//
// We mount the library into a blank page, hand it the fixture bytes, and
// assert the output is a valid JPEG (FFD8FF magic) of reasonable size.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(dirname(HERE));
const FIXTURE = join(REPO, 'test/fixtures/iphone-sample.heic');
const HEIC2ANY_PATH = join(REPO, 'node_modules/heic2any/dist/heic2any.js');

let failures = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { console.log(`  ✗ ${m}`); failures++; } };

const heicBytes = readFileSync(FIXTURE);
ok(heicBytes.slice(4, 8).toString('utf8') === 'ftyp' &&
   /^heic|heix|hevc|mif1$/.test(heicBytes.slice(8, 12).toString('utf8')),
   `0a: fixture is a real HEIC (${heicBytes.length} bytes)`);

const heic2anyJs = readFileSync(HEIC2ANY_PATH, 'utf8');

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  // Mount a blank page so heic2any has window + DOM available.
  await page.goto('data:text/html,<!doctype html><html><body></body></html>');

  // Inject the heic2any UMD bundle directly. This is exactly the same
  // module the admin page loads via dynamic import.
  await page.evaluate(heic2anyJs);

  // Pass the HEIC bytes in (as a Uint8Array → Blob in the page context)
  // and run conversion.
  const result = await page.evaluate(async (bytes) => {
    // heic2any is loaded as window.heic2any (UMD)
    const heic2any = window.heic2any;
    if (!heic2any) return { ok: false, error: 'heic2any not loaded' };
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/heic' });
    try {
      const out = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
      const jpegBlob = Array.isArray(out) ? out[0] : out;
      const buf = new Uint8Array(await jpegBlob.arrayBuffer());
      return {
        ok: true,
        type: jpegBlob.type,
        size: buf.length,
        magic: [buf[0], buf[1], buf[2]],
      };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }, Array.from(heicBytes));

  console.log('  conversion result:', JSON.stringify({ ok: result.ok, type: result.type, size: result.size, magic: result.magic, error: result.error }));

  ok(result.ok, `1a: conversion completed without throwing`);
  ok(result.type === 'image/jpeg', `1b: output Blob type is image/jpeg (got ${result.type})`);
  // JPEG magic: FF D8 FF
  ok(result.magic && result.magic[0] === 0xff && result.magic[1] === 0xd8 && result.magic[2] === 0xff,
     `1c: output has JPEG magic bytes FFD8FF (got ${result.magic?.map((b) => b.toString(16)).join(' ')})`);
  ok(result.size > 2_000, `1d: output is non-trivially sized (${result.size} bytes)`);

  // Also verify against the smaller fixture so we have two data points.
  const smallHeic = readFileSync(join(REPO, 'test/fixtures/sample.heic'));
  const result2 = await page.evaluate(async (bytes) => {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/heic' });
    try {
      const out = await window.heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
      const jpegBlob = Array.isArray(out) ? out[0] : out;
      const buf = new Uint8Array(await jpegBlob.arrayBuffer());
      return { ok: true, type: jpegBlob.type, size: buf.length, magic: [buf[0], buf[1], buf[2]] };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }, Array.from(smallHeic));
  ok(result2.ok && result2.type === 'image/jpeg' && result2.magic?.[0] === 0xff,
     `2a: small fixture also converts cleanly (size=${result2.size})`);
} catch (e) {
  console.error(`\nFATAL: ${e.stack || e}`);
  failures++;
} finally {
  await browser.close();
}

console.log('');
console.log(failures === 0 ? 'PASS — heic2any converts real HEIC bytes to valid JPEG ✓' : `FAIL — ${failures} assertion(s) failed`);
process.exit(failures === 0 ? 0 : 1);
