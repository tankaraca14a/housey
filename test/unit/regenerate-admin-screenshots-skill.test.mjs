// Tests for the /regenerate-admin-screenshots skill.
//
// The skill is a markdown procedure — there's no JS to unit-test per se.
// What we CAN test, and what these assertions exist to guarantee:
//
//   1. The skill file is structurally valid (frontmatter + name + description).
//   2. Every script the skill tells you to run actually exists on disk.
//      (So a renamed/deleted generator can't drift the skill into lying.)
//   3. The skill's CENTRAL CONTRACT — "after running this, the docs/screenshots
//      pair is pristine" — is enforced as a doc invariant. Every PNG in the
//      admin-screenshots dirs is referenced by its doc, and every doc
//      image reference resolves to a real file on disk.
//
// Test 3 is the value-add: it makes the pristine state a CI-enforced
// invariant. A PR that adds an orphan PNG or breaks a doc reference
// fails this test, with a message pointing at the skill as the remedy.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const SKILL_PATH = join(REPO, '.claude/skills/regenerate-admin-screenshots/SKILL.md');
const SKILL = readFileSync(SKILL_PATH, 'utf8');

// Doc <-> screenshot-dir pairs the skill is responsible for.
const PAIRS = /** @type {const} */ ([
  { doc: 'docs/ADMIN-GUIDE.md', dir: 'docs/admin-screenshots'    },
  { doc: 'docs/ADMIN-HR.md',    dir: 'docs/admin-screenshots-hr' },
]);

describe('regenerate-admin-screenshots skill — file structure', () => {
  it('has YAML frontmatter with name + description', () => {
    const fm = SKILL.match(/^---\n([\s\S]+?)\n---/);
    expect(fm, 'SKILL.md must open with a YAML frontmatter block').not.toBeNull();
    const block = fm[1];
    expect(block).toMatch(/^name:\s*regenerate-admin-screenshots\s*$/m);
    expect(block).toMatch(/^description:\s*.+/m);
  });

  it('description is short enough to render in the skill picker', () => {
    const desc = SKILL.match(/^description:\s*(.+)$/m)?.[1] ?? '';
    expect(desc.length).toBeGreaterThan(20);
    expect(desc.length).toBeLessThan(400);
  });

  it('documents all three generator scripts', () => {
    // Order matters in the skill — EN admin → HR admin → feature shots.
    // We only assert presence here (order would be brittle to wording
    // changes), but each script MUST appear somewhere in the body.
    for (const script of [
      'scripts/generate-admin-guide-screenshots.mjs',
      'scripts/generate-admin-guide-screenshots-hr.mjs',
      'scripts/generate-feature-screenshots.mjs',
    ]) {
      expect(SKILL, `skill must reference ${script}`).toContain(script);
    }
  });

  it('documents the seed script with both --lang flags', () => {
    expect(SKILL).toContain('scripts/seed-admin-guide.mjs');
    expect(SKILL).toMatch(/--lang=en/);
    expect(SKILL).toMatch(/--lang=hr/);
  });

  it('documents the postflight reset for the three seeded data files', () => {
    // Without postflight, the regen commits fake "Anna Schmidt" bookings.
    for (const f of ['data/bookings.json', 'data/images.json', 'data/reviews.json']) {
      expect(SKILL, `skill must reset ${f} in postflight`).toContain(f);
    }
  });
});

describe('regenerate-admin-screenshots skill — referenced files exist', () => {
  // Pull every `scripts/<name>.mjs` reference out of the skill and assert
  // each one is a real file. Catches drift if a generator gets renamed.
  const referencedScripts = [...new Set(
    [...SKILL.matchAll(/scripts\/[\w-]+\.mjs/g)].map((m) => m[0]),
  )];

  it('references at least four scripts (seed + 3 generators)', () => {
    expect(referencedScripts.length).toBeGreaterThanOrEqual(4);
  });

  it.each(referencedScripts.map((s) => [s]))('%s exists on disk', (script) => {
    expect(existsSync(join(REPO, script)), `${script} referenced by skill but missing`).toBe(true);
  });

  it.each(PAIRS.map((p) => [p.doc]))('%s exists', (doc) => {
    expect(existsSync(join(REPO, doc))).toBe(true);
  });

  it.each(PAIRS.map((p) => [p.dir]))('%s exists', (dir) => {
    expect(existsSync(join(REPO, dir))).toBe(true);
  });
});

describe('regenerate-admin-screenshots skill — docs/screenshots pristine invariant', () => {
  // This is the skill's central contract, enforced as a static doc check.
  // If this fails, run `/regenerate-admin-screenshots` (or add a doc reference
  // for the orphan, or remove the broken reference).

  for (const { doc, dir } of PAIRS) {
    describe(`${dir} ↔ ${doc}`, () => {
      const docText = readFileSync(join(REPO, doc), 'utf8');
      const pngs = readdirSync(join(REPO, dir)).filter((f) => f.endsWith('.png'));
      const docRefs = [...docText.matchAll(/\.\/[\w-]+\/([\w.-]+\.png)/g)]
        .map((m) => m[1]);

      it(`has ≥ 1 PNG in ${dir}`, () => {
        expect(pngs.length).toBeGreaterThan(0);
      });

      it(`${doc} embeds ≥ 1 screenshot from ${dir}`, () => {
        expect(docRefs.length).toBeGreaterThan(0);
      });

      it.each(pngs.map((p) => [p]))(
        `${dir}/%s is referenced by ${doc} (no orphans)`,
        (png) => {
          expect(
            docText.includes(png),
            `${png} is in ${dir} but ${doc} never references it. ` +
            `Either add ![alt](./${dir.split('/').pop()}/${png}) to the doc, ` +
            `or remove the shot from its generator.`,
          ).toBe(true);
        },
      );

      it.each(docRefs.map((r) => [r]))(
        `${doc} → %s resolves to a real file (no broken refs)`,
        (png) => {
          expect(
            existsSync(join(REPO, dir, png)),
            `${doc} links ${dir}/${png} but the file does not exist. ` +
            `Run /regenerate-admin-screenshots, or fix the filename in the doc.`,
          ).toBe(true);
        },
      );
    });
  }
});
