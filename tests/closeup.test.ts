import { describe, expect, it } from 'vitest';
import { contactDistances, contactRatio, gearOutline, lineOfAction, matingPhase, type Pt } from '../src/core/involute';
import { meshFrequency } from '../src/mechanisms/spur-gear/closeup';
import { spurGear } from '../src/mechanisms/spur-gear';

function distToPolygon(p: Pt, poly: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)));
  }
  return best;
}

const rot = (pts: Pt[], a: number, dx = 0): Pt[] =>
  pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a) + dx, x * Math.sin(a) + y * Math.cos(a)]);

describe('contact points on the line of action', () => {
  const cases = [
    { m: 2, z1: 20, z2: 40, x1: 0 },
    { m: 2, z1: 12, z2: 40, x1: 0.35 },
    { m: 1.5, z1: 18, z2: 90, x1: 0 },
  ];

  for (const c of cases) {
    it(`lie on the rotated pinion flank and touch the gear (m=${c.m}, z=${c.z1}/${c.z2}, x1=${c.x1})`, () => {
      const loa = lineOfAction(c.m, c.z1, c.z2, 20, c.x1, 0);
      const pin = gearOutline({ m: c.m, z: c.z1, x: c.x1, flankSegments: 60, tipSegments: 8 });
      const gear = gearOutline({ m: c.m, z: c.z2, x: -c.x1, phase: matingPhase(c.z2), flankSegments: 60, tipSegments: 8 });
      const a = (c.m * (c.z1 + c.z2)) / 2;
      let checked = 0;
      for (let k = 0; k < 25; k++) {
        const phi = (k / 25) * ((2 * Math.PI) / c.z1);
        const ds = contactDistances(loa, phi);
        expect(ds.length).toBeGreaterThanOrEqual(1);
        const p1 = rot(pin, phi);
        const p2 = rot(gear, (-phi * c.z1) / c.z2, a);
        for (const s of ds) {
          const P: Pt = [loa.T1[0] + loa.dir[0] * s, loa.T1[1] + loa.dir[1] * s];
          expect(distToPolygon(P, p1)).toBeLessThan(0.03 * c.m);
          expect(distToPolygon(P, p2)).toBeLessThan(0.03 * c.m);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(25);
    });
  }

  it('the average number of tooth pairs in contact equals the contact ratio ε', () => {
    const loa = lineOfAction(2, 20, 40, 20, 0, 0);
    const N = 4000;
    let sum = 0;
    for (let k = 0; k < N; k++) sum += contactDistances(loa, (k / N) * ((2 * Math.PI) / 20)).length;
    expect(sum / N).toBeCloseTo(contactRatio(2, 20, 40, 20), 2);
  });

  it('a single pair carries the load only part of the time (1 or 2 pairs)', () => {
    const loa = lineOfAction(2, 20, 40);
    const counts = new Set<number>();
    for (let k = 0; k < 200; k++) counts.add(contactDistances(loa, k * 0.0017).length);
    expect([...counts].sort()).toEqual([1, 2]);
  });
});

describe('mesh sound', () => {
  it('gear mesh frequency f = z1·n1/60', () => {
    expect(meshFrequency(20, 1000)).toBeCloseTo(333.33, 2);
    const s = spurGear.closeUp!.sound!(1500);
    expect(s.fundamental).toBeCloseTo(500, 9);
    expect(s.modulation).toBeCloseTo(25, 9);
  });

  it('close-up follows the lab configuration', () => {
    const v = spurGear.lab!.evaluate({ m: 1.5, z1: 18, z2: 90, x1: 0 }).mechanism;
    expect(v.closeUp!.sound!(1000).fundamental).toBeCloseTo(300, 9);
    expect(v.closeUp!.camera.target[0]).toBeCloseTo(13.5, 9);
  });
});
