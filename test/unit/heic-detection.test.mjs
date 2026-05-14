// Unit tests for the HEIC-detection logic used by the admin upload flow.
// The real conversion via heic2any only runs in a browser (needs WASM +
// canvas), so we just verify the detection path: filenames + MIME types
// that should be flagged as HEIC for conversion.

import { describe, it, expect } from 'vitest';

// Mirror of the inline detection used in app/admin/page.tsx so it can be
// unit-tested independently. If the detection logic in the component
// changes, update both.
function isHeicFile({ type, name }) {
  return type === 'image/heic' || type === 'image/heif' || /\.heic$|\.heif$/i.test(name);
}

describe('isHeicFile', () => {
  it('detects by MIME type image/heic', () => {
    expect(isHeicFile({ type: 'image/heic', name: 'photo.HEIC' })).toBe(true);
  });
  it('detects by MIME type image/heif', () => {
    expect(isHeicFile({ type: 'image/heif', name: 'whatever' })).toBe(true);
  });
  it('detects by .heic extension (case-insensitive)', () => {
    expect(isHeicFile({ type: '', name: 'IMG_0001.heic' })).toBe(true);
    expect(isHeicFile({ type: '', name: 'IMG_0001.HEIC' })).toBe(true);
    expect(isHeicFile({ type: '', name: 'IMG_0001.HeIc' })).toBe(true);
  });
  it('detects by .heif extension (case-insensitive)', () => {
    expect(isHeicFile({ type: '', name: 'photo.heif' })).toBe(true);
    expect(isHeicFile({ type: '', name: 'photo.HEIF' })).toBe(true);
  });
  it('handles the iPhone-edge-case where type is empty string', () => {
    // Older Safari sets file.type to "" for HEIC because the browser
    // doesn't recognize the MIME natively. Extension fallback must work.
    expect(isHeicFile({ type: '', name: 'IMG_1234.heic' })).toBe(true);
  });
  it('does NOT flag JPEG / PNG / WebP', () => {
    expect(isHeicFile({ type: 'image/jpeg', name: 'photo.jpg' })).toBe(false);
    expect(isHeicFile({ type: 'image/png', name: 'photo.png' })).toBe(false);
    expect(isHeicFile({ type: 'image/webp', name: 'photo.webp' })).toBe(false);
  });
  it('does NOT flag files that merely contain "heic" in the basename', () => {
    expect(isHeicFile({ type: 'image/jpeg', name: 'my_heic_collection.jpg' })).toBe(false);
    expect(isHeicFile({ type: 'image/jpeg', name: 'heic-conversion.jpg' })).toBe(false);
  });
  it('does NOT flag empty / weird input', () => {
    expect(isHeicFile({ type: '', name: '' })).toBe(false);
    expect(isHeicFile({ type: 'image/jpeg', name: 'noext' })).toBe(false);
  });
});
