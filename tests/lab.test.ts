import { describe, expect, it } from 'vitest';
import { contactRatio, gearOutline, matingPhase, type Pt } from '../src/core/involute';
import { layoutFor, tipThickness } from '../src/mechanisms/spur-gear/layout';
import { spurGear } from '../src/mechanisms/spur-gear';
import { gearDims } from '../src/core/involute';

const lab = spurGear.lab!;
const run = (v: Record<string, number>) => lab.evaluate(v);
const levels = (v: Record<string, number>) => run(v).warnings.map((w) => w.level);
const texts = (v: Record<string, number>) => run(v).warnings.map((w) => w.text.bg).join('\n');

function inside(p: Pt, poly: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

describe('spur gear layout', () => {
  it('default design: standard dimensions, no special cases', () => {
    const L = layoutFor({ m: 2, z1: 20, z2: 40, x1: 0 });
    expect(L.a).toBe(60);
    expect(L.g1.da).toBe(44);
    expect(L.integral1).toBe(false);
    expect(L.integral2).toBe(false);
    expect(L.bearingsClash).toBe(false);
    expect(L.eps).toBeCloseTo(contactRatio(2, 20, 40, 20), 9);
    expect(L.eps).toBeGreaterThan(1.6);
  });

  it('tip thickness of a standard 20-tooth pinion is about 0.67 m', () => {
    expect(tipThickness(gearDims(2, 20, 20, 0)) / 2).toBeCloseTo(0.67, 1);
  });

  it('positive shift thickens the root and thins the tip', () => {
    const a = gearDims(2, 12, 20, 0);
    const b = gearDims(2, 12, 20, 0.5);
    expect(b.s).toBeGreaterThan(a.s);
    expect(tipThickness(b)).toBeLessThan(tipThickness(a));
  });

  it('shifted pair (x1 = +0.45, x2 = -0.45) still meshes without overlap at the same centre distance', () => {
    const g1 = gearOutline({ m: 2, z: 10, x: 0.45, backlash: 0.08, flankSegments: 16 });
    const g2 = gearOutline({ m: 2, z: 40, x: -0.45, backlash: 0.08, phase: matingPhase(40), flankSegments: 16 });
    const rot = (pts: Pt[], a: number, dx = 0): Pt[] =>
      pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a) + dx, x * Math.sin(a) + y * Math.cos(a)]);
    let overlaps = 0;
    for (let k = 0; k < 40; k++) {
      const phi = (k / 40) * ((2 * Math.PI) / 10);
      const p1 = rot(g1, phi);
      const p2 = rot(g2, (-phi * 10) / 40, 50);
      for (const p of p1) if (p[0] > 5 && inside(p, p2)) overlaps++;
    }
    expect(overlaps).toBe(0);
  });
});

describe('parameter lab checks', () => {
  it('default design passes all checks', () => {
    expect(levels({ m: 2, z1: 20, z2: 40, x1: 0 })).toEqual(['ok']);
  });

  it('z1 = 12 without shift is flagged as undercut, x1 = 0.35 fixes it with no warnings left', () => {
    expect(texts({ m: 2, z1: 12, z2: 40, x1: 0 })).toMatch(/Подрязване на z₁/);
    expect(levels({ m: 2, z1: 12, z2: 40, x1: 0 })).toContain('error');
    const fixed = levels({ m: 2, z1: 12, z2: 40, x1: 0.35 });
    expect(fixed).toContain('ok');
    expect(fixed).not.toContain('warn');
    expect(fixed).not.toContain('error');
  });

  it('every preset evaluates without throwing', () => {
    for (const p of lab.presets) expect(() => run(p.values)).not.toThrow();
  });

  it('too much positive shift gives pointed teeth', () => {
    expect(texts({ m: 2, z1: 12, z2: 40, x1: 0.8 })).toMatch(/Заострени зъби на z₁/);
  });

  it('a too small centre distance is reported as a bearing clash', () => {
    expect(texts({ m: 1, z1: 24, z2: 30, x1: 0 })).toMatch(/не се побират/);
  });

  it('small pinion becomes a pinion shaft and its key is removed from the model', () => {
    const r = run({ m: 1.5, z1: 14, z2: 40, x1: 0.2 });
    expect(r.warnings.some((w) => w.level === 'info' && /вал-зъбно/.test(w.text.bg))).toBe(true);
    expect(r.mechanism.parts.some((p) => p.id === 'key1')).toBe(false);
    expect(r.mechanism.parts.some((p) => p.id === 'pinion')).toBe(true);
  });

  it('regenerated mechanism follows the parameters', () => {
    const r = run({ m: 2.5, z1: 18, z2: 54, x1: 0 });
    const s2 = r.mechanism.kinematics.bodies.find((b) => b.id === 's2')!;
    expect(s2.origin[0]).toBeCloseTo(2.5 * (18 + 54) / 2, 9);
    expect(r.mechanism.kinematics.links[0]).toMatchObject({ zFrom: 18, zTo: 54 });
  });
});
