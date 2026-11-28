import { describe, expect, it } from 'vitest';
import { GDT_NOTES } from '../src/ui/gdt';
import { spurGear } from '../src/mechanisms/spur-gear';
import { FITS, fitResult } from '../src/mechanisms/spur-gear/drawings/fits';
import { GEAR2_BODY } from '../src/mechanisms/spur-gear/drawings/gear2';

describe('technical drawings', () => {
  it('has the assembly, both shafts, both gears and the fits sheet', () => {
    expect(spurGear.drawings.map((d) => d.id)).toEqual(['assembly', 'shaft1', 'pinion', 'shaft2', 'gear2', 'fits']);
  });

  for (const d of spurGear.drawings) {
    it(`${d.id}: renders an A3 sheet and every tappable element has an explanation`, () => {
      const svg = d.render();
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('viewBox="0 0 420 297"');
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
      const keys = [...svg.matchAll(/data-note="([^"]+)"/g)].map((m) => m[1]);
      expect(keys.length).toBeGreaterThan(8);
      // The drawing tab falls back to the shared explanations of the tolerancing elements.
      const missing = [...new Set(keys)].filter((k) => !d.notes[k] && !GDT_NOTES[k]);
      expect(missing).toEqual([]);
      expect(svg).toContain(`${spurGear.drawings.indexOf(d) + 1}/6`);
    });
  }

  it('sheet numbers and drawing numbers are unique', () => {
    const nums = spurGear.drawings.map((d) => [...d.render().matchAll(/EL-SG-\d{3}/g)].pop()![0]);
    expect(new Set(nums).size).toBe(nums.length);
  });
});

describe('fits (ISO 286)', () => {
  const byKey = Object.fromEntries(FITS.map((s) => [s.key, fitResult(s)]));

  it('H7/k6 is a transition fit: 19 µm clearance … 15 µm interference', () => {
    expect(byKey.f1).toEqual({ Smax: 19, Nmax: 15, kind: 'transition' });
  });

  it('a bearing bore on k6 always has interference', () => {
    expect(byKey.f2.kind).toBe('interference');
    expect(byKey.f2.Nmax).toBe(25);
  });

  it('a bearing outer ring in H7 always has clearance', () => {
    expect(byKey.f3.kind).toBe('clearance');
    expect(byKey.f3.Smax).toBe(36);
  });

  it('H7/g6 is a clearance fit (7 … 41 µm)', () => {
    expect(byKey.f6.kind).toBe('clearance');
    expect(byKey.f6.Smax).toBe(41);
    expect(-byKey.f6.Nmax).toBe(7);
  });
});

describe('gear z2 drawing matches the 3D model', () => {
  it('rim, web holes and hub have the 3D proportions', () => {
    expect(GEAR2_BODY.rimInner).toBeCloseTo(32.5, 9);
    expect(GEAR2_BODY.holeR).toBeCloseTo(3.75, 9);
    expect(GEAR2_BODY.holePitchR).toBeCloseTo(26.25, 9);
  });
});
