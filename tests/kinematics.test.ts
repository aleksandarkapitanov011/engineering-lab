import { describe, expect, it } from 'vitest';
import { solveSpeeds, transmissionRatio } from '../src/core/kinematics';
import type { Kinematics } from '../src/core/types';
import { gearOutline, matingPhase, type Pt } from '../src/core/involute';

const pair = (z1: number, z2: number): Kinematics => ({
  input: 's1',
  output: 's2',
  bodies: [
    { id: 's1', label: { bg: '1' }, origin: [0, 0, 0], axis: [0, 0, 1] },
    { id: 's2', label: { bg: '2' }, origin: [60, 0, 0], axis: [0, 0, 1] },
  ],
  links: [{ kind: 'external-gear', from: 's1', to: 's2', zFrom: z1, zTo: z2 }],
});

describe('kinematics', () => {
  it('n2 = n1 * z1 / z2 for the 20/40 pair', () => {
    for (const n1 of [0, 1, 750, 1500, 3000]) {
      const s = solveSpeeds(pair(20, 40), n1);
      expect(Math.abs(s.get('s2')!)).toBeCloseTo((n1 * 20) / 40, 9);
    }
  });

  it('external mesh reverses the direction of rotation', () => {
    const s = solveSpeeds(pair(20, 40), 1500);
    expect(s.get('s1')).toBe(1500);
    expect(s.get('s2')).toBeCloseTo(-750, 9);
    expect(Math.sign(s.get('s1')!)).toBe(-Math.sign(s.get('s2')!));
  });

  it('negative input reverses both shafts', () => {
    const s = solveSpeeds(pair(20, 40), -1000);
    expect(s.get('s2')).toBeCloseTo(500, 9);
  });

  it('transmission ratio i = z2/z1 = 2.00', () => {
    expect(transmissionRatio(pair(20, 40))).toBeCloseTo(2, 12);
  });

  it('two external meshes in series restore the direction (idler)', () => {
    const k: Kinematics = {
      input: 'a',
      output: 'c',
      bodies: ['a', 'b', 'c'].map((id) => ({ id, label: { bg: id }, origin: [0, 0, 0], axis: [0, 0, 1] })),
      links: [
        { kind: 'external-gear', from: 'a', to: 'b', zFrom: 20, zTo: 30 },
        { kind: 'external-gear', from: 'b', to: 'c', zFrom: 30, zTo: 40 },
      ],
    };
    const s = solveSpeeds(k, 1200);
    expect(s.get('c')).toBeCloseTo(600, 9);
  });

  it('internal mesh keeps the direction', () => {
    const k: Kinematics = {
      input: 'a',
      output: 'b',
      bodies: ['a', 'b'].map((id) => ({ id, label: { bg: id }, origin: [0, 0, 0], axis: [0, 0, 1] })),
      links: [{ kind: 'internal-gear', from: 'a', to: 'b', zFrom: 20, zTo: 60 }],
    };
    expect(solveSpeeds(k, 900).get('b')).toBeCloseTo(300, 9);
  });

  it('detects an inconsistent loop', () => {
    const k = pair(20, 40);
    k.links.push({ kind: 'coupling', from: 's1', to: 's2' });
    expect(() => solveSpeeds(k, 100)).toThrow();
  });
});

// --- Geometric check: the procedural involute gears mesh without overlapping. ---

function inside(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

const rot = (pts: Pt[], a: number, dx = 0): Pt[] =>
  pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a) + dx, x * Math.sin(a) + y * Math.cos(a)]);

describe('involute mesh', () => {
  it('pinion z=20 and gear z=40 at a = 60 do not overlap while rotating', () => {
    const g1 = gearOutline({ m: 2, z: 20, backlash: 0.08, flankSegments: 16 });
    const g2 = gearOutline({ m: 2, z: 40, backlash: 0.08, phase: matingPhase(40), flankSegments: 16 });
    let overlaps = 0;
    for (let k = 0; k < 40; k++) {
      const phi1 = (k / 40) * ((2 * Math.PI) / 20); // one tooth pitch
      const p1 = rot(g1, phi1);
      const p2 = rot(g2, (-phi1 * 20) / 40, 60);
      // Only test points near the mesh zone.
      for (const p of p1) if (p[0] > 15 && inside(p, p2)) overlaps++;
    }
    expect(overlaps).toBe(0);
  });

  it('without the half-pitch phase the teeth would collide', () => {
    const g1 = gearOutline({ m: 2, z: 20 });
    const g2 = gearOutline({ m: 2, z: 40, phase: Math.PI + Math.PI / 40 + Math.PI / 40 });
    const p2 = rot(g2, 0, 60);
    expect(g1.some((p) => p[0] > 15 && inside(p, p2))).toBe(true);
  });
});
