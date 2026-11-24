import { describe, expect, it } from 'vitest';
import { ballContactPressure, buildToothModel, iso6336YFYS, sampleTooth } from '../src/mechanisms/spur-gear/stress';
import { lewisY } from '../src/mechanisms/spur-gear/forces';
import { spurGear } from '../src/mechanisms/spur-gear';
import { gearDims, lineOfAction, rootFillet } from '../src/core/involute';
import { OVERLOAD, rainbow, scaleValue, srgbToLinear } from '../src/three/colormap';

describe('tooth FEM model', () => {
  const g = gearDims(2, 20, 20, 0);
  const ra = g.da / 2;
  const tip = buildToothModel(2, 20, 0, 18, ra - 0.1);

  it('the solver converges', () => {
    expect(tip.unit.converged).toBe(true);
  });

  it('root bending stress with a tip load is higher than Lewis (fillet concentration) but of the same order', () => {
    // Lewis: σ = Ft/(b·m·Y) for a tip load; Ft is the tangential part of the normal force.
    const Fn = 1000;
    const alphaTip = Math.acos(g.db / g.da);
    const Ft = Fn * Math.cos(alphaTip);
    const lewis = Ft / (18 * 2 * lewisY(20));
    const fem = tip.rootMaxUnit * Fn;
    expect(fem / lewis).toBeGreaterThan(1.0);
    expect(fem / lewis).toBeLessThan(3.0);
  });

  it('the maximum root stress sits in the fillet region, not at the load point', () => {
    const n = tip.rootMaxNode;
    const r = Math.hypot(tip.mesh.x[n], tip.mesh.y[n]);
    expect(r).toBeGreaterThan(tip.rf - 0.5);
    expect(r).toBeLessThan(tip.flankStart + 1.5);
  });

  it('stress grows linearly with the load and is low far down in the rim', () => {
    const root = sampleTooth(tip, tip.flankStart, tip.span(tip.flankStart) * 0.95)!;
    const rim = sampleTooth(tip, tip.rIn + 0.2, 0)!;
    expect(root).toBeGreaterThan(3 * rim);
  });

  it('a load nearer the root gives a lower root stress (shorter lever arm)', () => {
    const low = buildToothModel(2, 20, 0, 18, g.d / 2);
    expect(low.rootMaxUnit).toBeLessThan(tip.rootMaxUnit);
  });
});

describe('tooth root vs ISO 6336-3 (method B)', () => {
  it('ISO factors match the hand calculation for z = 20, x = 0 (YF ≈ 1.60, YS ≈ 1.82)', () => {
    const { YF, YS } = iso6336YFYS(2, 20, 0, 1.635);
    expect(YF).toBeCloseTo(1.595, 2);
    expect(YS).toBeCloseTo(1.815, 2);
  });

  const femFactor = (z: number, z2: number): { fem: number; iso: number } => {
    const loa = lineOfAction(2, z, z2, 20, 0, 0);
    const pb = Math.PI * 2 * Math.cos(loa.alpha);
    const eps = (loa.sE - loa.sA) / pb;
    const rL = Math.hypot(gearDims(2, z, 20, 0).db / 2, loa.sA + pb);
    const tm = buildToothModel(2, z, 0, 18, rL);
    const { YF, YS } = iso6336YFYS(2, z, 0, eps);
    return { fem: tm.rootMaxUnit / (Math.cos(loa.alpha) / (18 * 2)), iso: YF * YS };
  };

  it('FEM root stress agrees with ISO within the usual +/- band for several tooth counts', () => {
    for (const [z, z2] of [
      [14, 40],
      [20, 40],
      [30, 60],
      [60, 30],
    ]) {
      const { fem, iso } = femFactor(z, z2);
      expect(fem / iso).toBeGreaterThan(0.9);
      expect(fem / iso).toBeLessThan(1.3);
    }
  });

  it('fewer teeth give a higher root stress (thinner root, like ISO)', () => {
    expect(femFactor(14, 40).fem).toBeGreaterThan(femFactor(20, 40).fem);
    expect(femFactor(20, 40).fem).toBeGreaterThan(femFactor(30, 60).fem);
  });
});

describe('generated root fillet', () => {
  const half = (z: number, r: number): { fil: number; inv: number } => {
    const g = gearDims(2, z, 20, 0);
    const rb = g.db / 2;
    const psiP = g.s / g.d;
    const invA = Math.tan(g.alpha) - g.alpha;
    const a = Math.acos(rb / r);
    return { fil: rootFillet(2, z, 0).halfAngle(r), inv: psiP + invA - (Math.tan(a) - a) };
  };

  it('meets the involute without cutting it for z = 20', () => {
    const rb = gearDims(2, 20, 20, 0).db / 2;
    for (const dr of [0.05, 0.3, 0.6]) {
      const { fil, inv } = half(20, rb + dr);
      expect(fil).toBeGreaterThanOrEqual(inv - 1e-4);
    }
  });

  it('cuts into the involute (undercut) for z = 10', () => {
    const rb = gearDims(2, 10, 20, 0).db / 2;
    const { fil, inv } = half(10, rb + 0.01);
    expect(fil).toBeLessThan(inv);
  });

  it('reaches the root land at almost half a pitch', () => {
    const f = rootFillet(2, 20, 0);
    expect(f.halfAngle(17.52)).toBeGreaterThan(0.8 * (Math.PI / 20));
    expect(f.halfAngle(17.52)).toBeLessThan(Math.PI / 20);
  });
});

describe('colour scale', () => {
  it('runs from blue through green to red, with a distinct overload colour', () => {
    const [r0, , b0] = rainbow(0);
    const [r1, , b1] = rainbow(1);
    const [, g5] = rainbow(0.5);
    expect(b0).toBeGreaterThan(r0);
    expect(r1).toBeGreaterThan(b1);
    expect(g5).toBeGreaterThan(0.6);
    expect(rainbow(1.2)).toEqual(OVERLOAD);
  });

  it('absolute mode never shows the overload colour; utilisation does', () => {
    expect(scaleValue('absolute', 500, 100, 300)).toBe(1);
    expect(scaleValue('utilisation', 150, 100, 300)).toBeCloseTo(1.5, 9);
  });

  it('converts sRGB to linear light for WebGL', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1, 9);
    expect(srgbToLinear(0.5)).toBeCloseTo(0.214, 3);
  });
});

describe('bearing contact (Hamrock–Brewe)', () => {
  it('outer raceway (concave) has a lower pressure than the inner one', () => {
    expect(ballContactPressure(123, 6.35, 31, 0.52, 'outer')).toBeLessThan(ballContactPressure(123, 6.35, 31, 0.52, 'inner'));
  });

  it('matches the hand calculation for a 6004 ball under 123 N (≈ 1490 MPa)', () => {
    expect(ballContactPressure(123, 6.35, 31)).toBeGreaterThan(1400);
    expect(ballContactPressure(123, 6.35, 31)).toBeLessThan(1580);
  });

  it('scales with Q^(1/3)', () => {
    const p1 = ballContactPressure(100, 6.35, 31);
    const p8 = ballContactPressure(800, 6.35, 31);
    expect(p8 / p1).toBeCloseTo(2, 6);
  });
});

describe('stress analysis definition', () => {
  const def = spurGear.stress!;
  const res = def.evaluate({ P: 2, KA: 1.25 }, 1000, { s1: 0, s2: 0 });

  it('default load: every element is below its allowable stress', () => {
    expect(res.checks.length).toBeGreaterThanOrEqual(8);
    expect(res.checks.every((c) => c.stress < c.limit)).toBe(true);
    expect(res.warnings[0].level).toBe('ok');
  });

  it('colours the loaded tooth much more than a tooth on the other side', () => {
    const pinion = res.fields.find((f) => f.partId === 'pinion')!;
    const r = 17.6; // near the root circle (df/2 = 17.5)
    const loaded = Math.max(...[-0.12, -0.08, 0.08, 0.12].map((a) => pinion.stress([r * Math.cos(a), r * Math.sin(a), 0])));
    const far = pinion.stress([-r, 0, 0]);
    expect(loaded).toBeGreaterThan(10 * far);
  });

  it('shaft stress is highest between the bearings, not on the free end', () => {
    const shaft = res.fields.find((f) => f.partId === 'shaft1')!;
    const at = (z: number): number => Math.max(...Array.from({ length: 12 }, (_, k) => shaft.stress([10 * Math.cos(k / 2), 10 * Math.sin(k / 2), z])));
    expect(at(-2)).toBeGreaterThan(at(35));
  });

  it('overload is detected', () => {
    const over = def.evaluate({ P: 8, KA: 1.75 }, 1000, { s1: 0, s2: 0 });
    expect(over.warnings.some((w) => w.level === 'error')).toBe(true);
  });

  it('the plots draw without errors', () => {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, p) => (p in { fillStyle: 1, strokeStyle: 1, lineWidth: 1, font: 1 } ? '' : () => calls.push(String(p))), set: () => true }) as unknown as CanvasRenderingContext2D;
    for (const p of res.plots) p.draw(ctx, 320, 260, () => '#000');
    expect(calls.filter((c) => c === 'fill').length).toBeGreaterThan(300);
  });
});
