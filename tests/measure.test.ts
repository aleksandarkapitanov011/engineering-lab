import { describe, expect, it } from 'vitest';
import { spurGear } from '../src/mechanisms/spur-gear';
import { spanFor } from '../src/mechanisms/spur-gear/measure';
import { readMicrometer } from '../src/ui/micrometer';
import { measureStars, parseReading } from '../src/tabs/measurePanel';
import { deg, gearDims } from '../src/core/involute';

/** Deterministic pseudo-random numbers for the batches. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('span measurement W_k', () => {
  it('W₃ = 15,32 mm for m = 2, z = 20, α = 20° (as on the pinion drawing)', () => {
    const { k, W } = spanFor(2, 20, 0, deg(20));
    expect(k).toBe(3);
    expect(W).toBeCloseTo(15.321, 3);
  });

  it('the disc faces touch the flanks on the involute (between base and tip circle)', () => {
    const g = gearDims(2, 20, 20, 0);
    const { W } = spanFor(2, 20, 0, g.alpha);
    const r = Math.hypot(g.db / 2, W / 2);
    expect(r).toBeGreaterThan(g.db / 2);
    expect(r).toBeLessThan(g.da / 2);
  });

  it('a positive profile shift makes the teeth thicker: W grows by 2·x·m·sin α', () => {
    const a = spanFor(2, 20, 0, deg(20)).W;
    const b = spanFor(2, 20, 0.3, deg(20)).W;
    expect(b - a).toBeCloseTo(2 * 0.3 * 2 * Math.sin(deg(20)), 9);
  });
});

describe('micrometer scale', () => {
  it('splits a reading into sleeve, half line and thimble', () => {
    expect(readMicrometer(15.25)).toEqual({ mm: 15, half: false, thimble: 25, value: 15.25 });
    expect(readMicrometer(15.78)).toEqual({ mm: 15, half: true, thimble: 28, value: 15.78 });
    expect(readMicrometer(7.5)).toEqual({ mm: 7, half: true, thimble: 0, value: 7.5 });
  });

  it('parses comma and dot decimals', () => {
    expect(parseReading('15,25')).toBeCloseTo(15.25, 9);
    expect(parseReading(' 15.3 ')).toBeCloseTo(15.3, 9);
    expect(parseReading('')).toBeNaN();
    expect(parseReading('abc')).toBeNaN();
  });

  it('stars: all right = 3, 80 % = 2, half = 1', () => {
    expect(measureStars(10, 10)).toBe(3);
    expect(measureStars(8, 10)).toBe(2);
    expect(measureStars(5, 10)).toBe(1);
    expect(measureStars(4, 10)).toBe(0);
  });
});

describe('measuring exercise definition', () => {
  const def = spurGear.measure!;
  const lo = Math.round((def.spec.nominal + def.spec.ei) * 100) / 100;
  const hi = Math.round((def.spec.nominal + def.spec.es) * 100) / 100;

  it('spec W₃ = 15,32 −0,04/−0,08 → good from 15,24 to 15,28', () => {
    expect(def.spec.nominal).toBeCloseTo(15.32, 9);
    expect(lo).toBeCloseTo(15.24, 9);
    expect(hi).toBeCloseTo(15.28, 9);
  });

  it('the first piece is the 3D model pinion, which is within tolerance', () => {
    const s = def.samples(5, rng(1))[0];
    expect(s.actual).toBeCloseTo(15.25, 9);
    expect(s.verdict).toBe('ok');
  });

  it('every batch has a good, a rework and a scrap piece, all on whole hundredths with the right verdict', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const batch = def.samples(5, rng(seed));
      expect(batch).toHaveLength(5);
      const kinds = new Set(batch.map((b) => b.verdict));
      expect(kinds).toEqual(new Set(['ok', 'rework', 'scrap']));
      for (const b of batch) {
        expect(Math.abs(b.actual * 100 - Math.round(b.actual * 100))).toBeLessThan(1e-9);
        const expected = b.actual > hi + 1e-9 ? 'rework' : b.actual < lo - 1e-9 ? 'scrap' : 'ok';
        expect(b.verdict).toBe(expected);
        expect(b.actual).toBeGreaterThan(def.range[0]);
        expect(b.actual).toBeLessThan(def.range[1]);
      }
    }
  });

  it('verdict ids are the ones offered as buttons', () => {
    const ids = def.verdicts.map((v) => v.id);
    for (const b of def.samples(5, rng(7))) expect(ids).toContain(b.verdict);
  });
});
