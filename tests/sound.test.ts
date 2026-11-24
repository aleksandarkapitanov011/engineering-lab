import { describe, expect, it } from 'vitest';
import { MeshExcitation } from '../src/audio/meshExcitation';

const SR = 48000;

function render(fz: number, seconds: number, z1 = 20, z2 = 40, duty = 0.635): Float64Array {
  const g = new MeshExcitation(SR);
  g.setTeeth(z1, z2);
  g.meshFrequency = fz;
  g.duty = duty;
  g.load = 0.6;
  // Let the DC blocker settle.
  for (let i = 0; i < SR * 0.2; i++) g.next();
  const out = new Float64Array(Math.round(SR * seconds));
  for (let i = 0; i < out.length; i++) out[i] = g.next();
  return out;
}

/** Amplitude of one frequency component (Goertzel, Hann window). */
function amp(x: Float64Array, f: number): number {
  const n = x.length;
  const w = (2 * Math.PI * f) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const win = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const s0 = x[i] * win + c * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / n;
}

describe('gear mesh excitation', () => {
  const n1 = 1000;
  const fz = (20 * n1) / 60; // 333.3 Hz
  const x = render(fz, 2.4); // 20 full "hunting" periods of the 20/40 pair (40 teeth = 0.12 s)

  it('has its strongest line at the tooth mesh frequency f = z1·n1/60', () => {
    const a1 = amp(x, fz);
    for (const f of [fz * 0.71, fz * 1.37, fz * 1.5 + 4, 211, 777]) expect(a1).toBeGreaterThan(5 * amp(x, f));
  });

  it('is not a pure tone: mesh harmonics are present (sharp-cornered transmission error)', () => {
    const a1 = amp(x, fz);
    expect(amp(x, 2 * fz)).toBeGreaterThan(0.1 * a1);
    expect(amp(x, 3 * fz)).toBeGreaterThan(0.05 * a1);
  });

  it('tooth errors repeating once per revolution create sidebands at the shaft frequencies', () => {
    const shaft1 = n1 / 60; // pinion: 16.7 Hz
    const shaft2 = n1 / 2 / 60; // gear: 8.33 Hz (all lines sit on multiples of this)
    const between = amp(x, fz + shaft2 * 0.5); // halfway between two lines: background only
    expect(amp(x, fz + shaft1)).toBeGreaterThan(2 * between);
    expect(amp(x, fz - shaft1)).toBeGreaterThan(2 * between);
    expect(amp(x, fz + shaft2)).toBeGreaterThan(2 * between);
    expect(amp(x, fz - shaft2)).toBeGreaterThan(2 * between);
  });

  it('the mesh frequency follows the speed', () => {
    const y = render(500, 1.2);
    expect(amp(y, 500)).toBeGreaterThan(5 * amp(y, 333.3));
  });

  it('is silent when the gears stand still', () => {
    const y = render(0, 0.2);
    expect(Math.max(...Array.from(y).map(Math.abs))).toBeLessThan(1e-3);
  });

  it('stays bounded (no blow-up of the filters)', () => {
    const peak = Math.max(...Array.from(x).map(Math.abs));
    expect(peak).toBeLessThan(4);
    expect(peak).toBeGreaterThan(0.1);
  });

  it('worn teeth: larger tooth errors give stronger shaft sidebands relative to the mesh line', () => {
    const renderWith = (errorScale: number, rattle: number): Float64Array => {
      const g = new MeshExcitation(SR);
      g.setTeeth(20, 40);
      g.meshFrequency = fz;
      g.duty = 0.635;
      g.errorScale = errorScale;
      g.rattle = rattle;
      for (let i = 0; i < SR * 0.2; i++) g.next();
      const out = new Float64Array(SR * 2.4);
      for (let i = 0; i < out.length; i++) out[i] = g.next();
      return out;
    };
    const fresh = renderWith(1, 0);
    const worn = renderWith(2.6, 1);
    const side = (y: Float64Array): number => (amp(y, fz + n1 / 60) + amp(y, fz - n1 / 60)) / amp(y, fz);
    expect(side(worn)).toBeGreaterThan(1.5 * side(fresh));
  });

  it('sliding friction makes the signal noisy, not a clean periodic tone', () => {
    const g = new MeshExcitation(SR);
    g.meshFrequency = fz;
    for (let i = 0; i < SR * 0.2; i++) g.next();
    const period = Math.round((40 * SR) / fz); // the full tooth pattern repeats every 40 teeth
    const a = new Float64Array(period);
    const b = new Float64Array(period);
    for (let i = 0; i < period; i++) a[i] = g.next();
    for (let i = 0; i < period; i++) b[i] = g.next();
    let diff = 0;
    let energy = 0;
    for (let i = 0; i < period; i++) {
      diff += (a[i] - b[i]) ** 2;
      energy += a[i] ** 2;
    }
    // Periodic structure plus a clearly random part (friction, roughness, drift).
    expect(diff / energy).toBeGreaterThan(0.08);
    expect(diff / energy).toBeLessThan(0.6);
  });

  it('its source is self-contained, so it can be injected into an AudioWorklet', () => {
    const C = new Function(`return ${MeshExcitation.toString()};`)() as typeof MeshExcitation;
    const g = new C(SR);
    g.meshFrequency = 300;
    let e = 0;
    for (let i = 0; i < 4800; i++) e += Math.abs(g.next());
    expect(Number.isFinite(e) && e > 0).toBe(true);
  });
});
