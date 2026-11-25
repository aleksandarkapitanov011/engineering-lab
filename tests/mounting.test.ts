import { describe, expect, it } from 'vitest';
import { analyseMounting, flankContacts, meshAt, type MountInputs } from '../src/mechanisms/spur-gear/mounting';
import { DEFAULT_CONFIG, layoutFor } from '../src/mechanisms/spur-gear/layout';
import { ALPHA, BACKLASH } from '../src/mechanisms/spur-gear/params';
import { contactDistances, deg, lineOfAction } from '../src/core/involute';
import { spurGear } from '../src/mechanisms/spur-gear';

const L = layoutFor(DEFAULT_CONFIG);
const al = deg(ALPHA);
const run = (p: Partial<MountInputs>, n1 = 1000) => analyseMounting(L, { da: 0, delta: 0, beta: 0, P: 2, ...p }, n1);

describe('mesh geometry at a wrong centre distance', () => {
  it('nominal: built-in backlash, α_w = α, tip clearance 0.25 m', () => {
    const m0 = meshAt(L, L.a);
    expect(m0.jn).toBeCloseTo(2 * BACKLASH * Math.cos(al), 6);
    expect(m0.alphaW).toBeCloseTo(al, 9);
    expect(m0.c1).toBeCloseTo(0.25 * 2, 9);
    expect(m0.eps).toBeCloseTo(L.eps, 6);
  });

  it('backlash grows by 2·Δa·sin α_w (first order)', () => {
    const d = 1e-3;
    const slope = (meshAt(L, L.a + d).jn - meshAt(L, L.a - d).jn) / (2 * d);
    expect(slope).toBeCloseTo(2 * Math.sin(al), 3);
  });

  it('the backlash is used up at Δa ≈ −jₙ/(2 sin α)', () => {
    let lo = -1;
    let hi = 0;
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      if (meshAt(L, L.a + m).jn < 0) lo = m;
      else hi = m;
    }
    const expected = -meshAt(L, L.a).jn / (2 * Math.sin(al));
    expect(hi / expected).toBeGreaterThan(0.98);
    expect(hi / expected).toBeLessThan(1.02);
  });

  it('a larger centre distance lowers the contact ratio and raises α_w', () => {
    const m1 = meshAt(L, L.a + 0.8);
    expect(m1.eps).toBeLessThan(L.eps - 0.1);
    expect(m1.alphaW).toBeGreaterThan(al);
  });

  it('drive-side contacts match the close-up at the nominal distance', () => {
    const loa = lineOfAction(2, 20, 40, ALPHA, 0, BACKLASH);
    for (const phi of [0, 0.07, 0.21, 1.3]) {
      const a = flankContacts(L, meshAt(L, L.a), phi, 1);
      const b = contactDistances(loa, phi);
      expect(a.length).toBe(b.length);
      a.forEach((s, i) => expect(s).toBeCloseTo(b[i], 9));
    }
  });
});

describe('mounting analysis', () => {
  it('exact mounting: contact over the full width, K_Hβ = 1, drive flanks closed', () => {
    const r = run({});
    expect(r.jam).toBe(false);
    expect(r.KHb).toBeCloseTo(1, 6);
    expect(r.contactShare).toBeCloseTo(1, 6);
    expect(Math.min(...r.gD)).toBeCloseTo(0, 9);
    expect(r.gC[0]).toBeCloseTo(meshAt(L, L.a).jn, 9);
  });

  it('too small a centre distance jams the teeth', () => {
    expect(run({ da: -0.2 }).jam).toBe(false);
    const r = run({ da: -0.3 });
    expect(r.jam).toBe(true);
    expect(r.overlap).toBeCloseTo(-meshAt(L, L.a - 0.3).jn / 2, 9);
  });

  it('the tip hits the root when the clearance is used up', () => {
    expect(run({ da: -0.45 }).cMin).toBeGreaterThan(0);
    expect(run({ da: -0.55 }).cMin).toBeLessThan(0);
  });

  it('skewed shafts push the contact to one end of the tooth', () => {
    const plus = run({ beta: 0.05 });
    const minus = run({ beta: -0.05 });
    expect(plus.contactShare).toBeLessThan(0.7);
    expect(plus.contactCentre).toBeLessThan(-2);
    expect(minus.contactCentre).toBeGreaterThan(2);
    expect(plus.KHb).toBeGreaterThan(1.5);
  });

  it('inclined shafts: backlash differs between the two ends of the tooth', () => {
    const r = run({ delta: 0.2 });
    expect(r.jnMax - r.jnMin).toBeCloseTo(2 * Math.sin(al) * 18 * Math.tan(deg(0.2)), 3);
    expect(r.KHb).toBeGreaterThan(1.2);
  });

  it('K_Hβ follows ISO 6336-1 for a linear misalignment (partial and full contact)', () => {
    const iso = (r: ReturnType<typeof run>): number => {
      const F = r.Fby * 1000;
      const x = (F * r.cGamma) / (2 * r.w);
      return x <= 1 ? 1 + x : Math.sqrt((2 * F * r.cGamma) / r.w);
    };
    for (const p of [{ beta: 0.05 }, { beta: 0.004, P: 8 }, { beta: -0.1, P: 5 }]) {
      const r = run(p);
      expect(r.KHb / iso(r)).toBeGreaterThan(0.97);
      expect(r.KHb / iso(r)).toBeLessThan(1.03);
    }
  });

  it('a higher load spreads the contact (smaller K_Hβ)', () => {
    expect(run({ beta: 0.05, P: 6 }).KHb).toBeLessThan(run({ beta: 0.05, P: 1 }).KHb);
  });
});

describe('mounting definition', () => {
  const def = spurGear.mounting!;
  const vals = (o: Record<string, number> = {}): Record<string, number> => ({ da: 0, delta: 0, beta: 0, P: 2, ...o });

  it('exact mounting is ok and keeps shaft 2 on its nominal axis', () => {
    const r = def.evaluate(vals(), 1000);
    expect(r.warnings[0].level).toBe('ok');
    expect(r.poses.s2.origin).toEqual([L.a, L.axisY, 0]);
    expect(r.poses.s2.axis[2]).toBeCloseTo(1, 9);
  });

  it('every preset gives a result and the bad ones warn', () => {
    for (const p of def.presets) {
      const r = def.evaluate(vals(p.values), 1000);
      expect(r.values.length).toBeGreaterThan(5);
    }
    expect(def.evaluate(vals({ da: -0.3 }), 1000).warnings.some((w) => w.level === 'error')).toBe(true);
    expect(def.evaluate(vals({ beta: 0.05 }), 1000).warnings.some((w) => w.level === 'warn' || w.level === 'error')).toBe(true);
  });

  it('the contact pattern plot draws without errors', () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, p) => (p in { fillStyle: 1, strokeStyle: 1, lineWidth: 1, font: 1, textAlign: 1 } ? '' : () => calls.push(String(p))),
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    for (const o of [{}, { beta: 0.05 }, { da: -0.55 }] as Record<string, number>[]) def.evaluate(vals(o), 1000).plot.draw(ctx, 330, 230, () => '#000');
    expect(calls.filter((c) => c === 'fillRect').length).toBeGreaterThan(50);
  });
});
