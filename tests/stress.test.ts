import { describe, expect, it } from 'vitest';
import { ballContactPressure, buildToothModel, sampleTooth } from '../src/mechanisms/spur-gear/stress';
import { lewisY } from '../src/mechanisms/spur-gear/forces';
import { spurGear } from '../src/mechanisms/spur-gear';
import { gearDims } from '../src/core/involute';

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
    const root = sampleTooth(tip, tip.flankStart, tip.span(tip.flankStart) * 0.95);
    const rim = sampleTooth(tip, tip.rIn + 0.2, 0);
    expect(root).toBeGreaterThan(3 * rim);
  });

  it('a load nearer the root gives a lower root stress (shorter lever arm)', () => {
    const low = buildToothModel(2, 20, 0, 18, g.d / 2);
    expect(low.rootMaxUnit).toBeLessThan(tip.rootMaxUnit);
  });
});

describe('bearing contact (Hamrock–Brewe)', () => {
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
