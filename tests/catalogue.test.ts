import { describe, expect, it } from 'vitest';
import '../src/mechanisms';
import { catalogue, categories, entriesIn, getCategory, registerEntry } from '../src/core/registry';

describe('catalogue folders', () => {
  it('has the gear drives and mechanisms folders, in that order', () => {
    expect(categories().map((c) => c.id)).toEqual(['gears', 'mechanisms']);
  });

  it('every entry sits in a known folder and every folder has entries', () => {
    for (const e of catalogue()) expect(getCategory(e.category)).toBeDefined();
    for (const c of categories()) expect(entriesIn(c.id).length).toBeGreaterThan(0);
  });

  it('the spur gear pair is a gear drive; the helical-bevel gearbox is a mechanism', () => {
    expect(entriesIn('gears').map((e) => e.id)).toContain('spur-gear');
    const mech = entriesIn('mechanisms').map((e) => e.id);
    expect(mech).toContain('helical-bevel-gearbox');
    expect(mech).toContain('planetary');
  });

  it('refuses an entry in an unknown folder', () => {
    expect(() =>
      registerEntry({ kind: 'teaser', id: 'x-test', category: 'nope', title: { bg: 'x' }, subtitle: { bg: 'x' }, thumbnail: '', pro: false }),
    ).toThrow(/unknown category/);
  });
});
