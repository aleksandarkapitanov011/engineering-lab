import { describe, expect, it } from 'vitest';
import { GDT_NOTES } from '../src/ui/gdt';
import { helicalBevel } from '../src/mechanisms/helical-bevel';
import { bevelProfile } from '../src/mechanisms/helical-bevel/drawings/derived';
import { DELTA3, DELTA4, RE, Z3, Z4 } from '../src/mechanisms/helical-bevel/params';
import { setLang } from '../src/i18n';

const sheets = helicalBevel.drawings;

describe('helical-bevel gearbox: drawings', () => {
  it('has the diagram, the assembly, three shafts and two gears', () => {
    expect(sheets.map((d) => d.id)).toEqual(['scheme', 'assembly', 'shaft1', 'shaft2', 'shaft3', 'gear2', 'gear4']);
  });

  for (const lang of ['bg', 'en'] as const) {
    for (const d of sheets) {
      it(`${d.id} (${lang}): renders an A3 sheet and every tappable element has an explanation`, () => {
        setLang(lang);
        const svg = d.render();
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg).toContain('viewBox="0 0 420 297"');
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        const keys = [...svg.matchAll(/data-note="([^"]+)"/g)].map((m) => m[1]);
        expect(keys.length).toBeGreaterThan(5);
        expect([...new Set(keys)].filter((k) => !d.notes[k] && !GDT_NOTES[k])).toEqual([]);
        expect(svg).toContain(`${sheets.indexOf(d) + 1}/7`);
        if (lang === 'en') expect(svg.replace(/<[^>]+>/g, ' ')).not.toMatch(/[Ѐ-ӿ]/);
        setLang('bg');
      });
    }
  }

  it('drawing numbers are unique', () => {
    const nums = sheets.map((d) => [...d.render().matchAll(/EL-HB-\d{3}/g)].pop()![0]);
    expect(new Set(nums).size).toBe(nums.length);
  });

  it('bevel geometry on the drawings: tip and root cones δ ± θ, both pitch cones end at Rₑ', () => {
    for (const [z, d] of [
      [Z3, DELTA3],
      [Z4, DELTA4],
    ] as [number, number][]) {
      const p = bevelProfile(z, d);
      expect(Math.atan2(p.tipHeel[1], p.tipHeel[0])).toBeCloseTo(d + p.thetaA, 9);
      expect(Math.atan2(p.rootHeel[1], p.rootHeel[0])).toBeCloseTo(d - p.thetaF, 9);
      expect(Math.hypot(...p.pitchHeel)).toBeCloseTo(RE, 9);
    }
  });
});
