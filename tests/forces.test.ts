import { describe, expect, it } from 'vitest';
import { computeForces, lewisY } from '../src/mechanisms/spur-gear/forces';
import { DEFAULT_CONFIG, layoutFor } from '../src/mechanisms/spur-gear/layout';
import { spurGear } from '../src/mechanisms/spur-gear';

const L = layoutFor(DEFAULT_CONFIG);
const base = { P: 0.75, n1: 1000, KA: 1.25 };

describe('gear forces (hand-checked values)', () => {
  const r = computeForces(L, base);

  it('torques: M1 = P/ω, M2 = M1·i·η', () => {
    expect(r.M1 / 1000).toBeCloseTo(7.162, 3); // N·m
    expect(r.M2 / 1000).toBeCloseTo(7.162 * 2 * 0.98, 2);
    expect(r.n2).toBeCloseTo(500, 9);
  });

  it('tooth forces: Ft = 2M1/d1, Fr = Ft·tan20°, Fn = Ft/cos20°', () => {
    expect(r.Ft).toBeCloseTo(358.1, 1);
    expect(r.Fr).toBeCloseTo(130.3, 1);
    expect(r.Fn).toBeCloseTo(381.1, 1);
    expect(Math.hypot(r.Ft, r.Fr)).toBeCloseTo(r.Fn, 6);
  });

  it('dynamic factor from pitch line velocity (Barth)', () => {
    expect(r.v).toBeCloseTo(2.094, 3);
    expect(r.Kv).toBeCloseTo(1.3433, 3);
    expect(r.K).toBeCloseTo(1.679, 3);
  });

  it('Lewis bending and Hertz contact stresses', () => {
    expect(r.Y1).toBeCloseTo(0.322, 6);
    expect(r.sF1).toBeCloseTo(51.9, 0);
    expect(r.sF2).toBeLessThan(r.sF1); // more teeth: larger Y, lower stress
    expect(r.zEps).toBeCloseTo(0.888, 2);
    expect(r.sH).toBeCloseTo(470.5, 0);
  });

  it('key crushing and shaft torsion', () => {
    expect(r.sCr1!).toBeCloseTo(17.9, 1);
    expect(r.tau1).toBeCloseTo(4.56, 2);
  });

  it('bearing reactions balance the tooth force (beam on two supports)', () => {
    expect(r.RA1).toBeCloseTo(160.5, 0);
    expect(r.RB1).toBeCloseTo(220.6, 0);
    expect(r.RA1 + r.RB1).toBeCloseTo(r.Fn, 6);
    expect(r.RA2 + r.RB2).toBeCloseTo(r.Fn, 6);
  });

  it('scales correctly: double power doubles Ft, half speed doubles M1', () => {
    expect(computeForces(L, { ...base, P: 1.5 }).Ft).toBeCloseTo(2 * r.Ft, 6);
    expect(computeForces(L, { ...base, n1: 500 }).M1).toBeCloseTo(2 * r.M1, 6);
  });

  it('contact stress grows with the square root of the load', () => {
    const r4 = computeForces(L, { ...base, P: 3, n1: 1000 });
    // Same speed, so K_v is unchanged and σH ∝ √Ft.
    expect(r4.sH / r.sH).toBeCloseTo(2, 6);
  });
});

describe('Lewis form factor table', () => {
  it('interpolates between table rows and clamps at the ends', () => {
    expect(lewisY(23)).toBeCloseTo((0.331 + 0.337) / 2, 6);
    expect(lewisY(8)).toBe(0.245);
    expect(lewisY(1000)).toBe(0.472);
  });
});

describe('forces panel definition', () => {
  const def = spurGear.forces!;

  it('default load passes every check', () => {
    const res = def.evaluate({ P: 0.75, KA: 1.25 }, 1000);
    expect(res.checks.every((c) => c.safety >= c.required)).toBe(true);
    expect(res.warnings[0].level).toBe('ok');
    expect(res.arrows.length).toBe(8);
  });

  it('high power fails the contact check of the softer gear first', () => {
    const res = def.evaluate({ P: 3, KA: 1.25 }, 1000);
    const failed = res.checks.filter((c) => c.safety < c.required).map((c) => c.label.bg);
    expect(failed.some((l) => l.startsWith('Контактно напрежение – z₂'))).toBe(true);
    expect(res.warnings.some((w) => w.level === 'error')).toBe(true);
  });

  it('zero speed gives a hint instead of infinite forces', () => {
    const res = def.evaluate({ P: 1, KA: 1 }, 0);
    expect(res.checks).toEqual([]);
    expect(res.warnings[0].level).toBe('warn');
  });

  it('an integral pinion has no key to check', () => {
    const variant = spurGear.lab!.evaluate({ m: 1.5, z1: 14, z2: 40, x1: 0.2 }).mechanism;
    const res = variant.forces!.evaluate({ P: 0.5, KA: 1.25 }, 1000);
    expect(res.checks.filter((c) => c.label.bg.includes('шпонка')).length).toBe(1);
  });
});
