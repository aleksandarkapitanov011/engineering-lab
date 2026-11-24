import { describe, expect, it } from 'vitest';
import { AssemblyEngine, computeStars, isBetterScore, validateSteps } from '../src/core/assembly';
import type { AssemblyStep } from '../src/core/types';
import { assembly } from '../src/mechanisms/spur-gear/assembly';

const hint = { bg: '' };

describe('assembly engine', () => {
  it('spur gear step data is valid (known parts, no cycles)', () => {
    expect(validateSteps(assembly.steps, ['base'])).toEqual([]);
  });

  it('rejects the pinion before the key and explains why', () => {
    const e = new AssemblyEngine(assembly.steps, ['base']);
    expect(e.tryInstall('shaft1').ok).toBe(true);
    const r = e.tryInstall('pinion');
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'missing-prerequisites') {
      expect(r.missing).toEqual(['key1']);
      expect(r.step.hint.bg).toMatch(/шпонката/);
    } else {
      throw new Error('expected missing-prerequisites');
    }
    expect(e.mistakes).toBe(1);
    expect(e.isInstalled('pinion')).toBe(false);
  });

  it('rejects bearing B before the gear it must sit next to', () => {
    const e = new AssemblyEngine(assembly.steps, ['base']);
    e.tryInstall('shaft1');
    e.tryInstall('key1');
    const r = e.tryInstall('brg1B');
    expect(r.ok).toBe(false);
    expect(e.tryInstall('pinion').ok).toBe(true);
    expect(e.tryInstall('brg1B').ok).toBe(true);
  });

  it('completes with a valid order and reports completion on the last part', () => {
    const e = new AssemblyEngine(assembly.steps, ['base']);
    const order = ['shaft2', 'brg2A', 'shaft1', 'key1', 'key2', 'gear2', 'pinion', 'brg1A', 'brg2B', 'brg1B'];
    order.forEach((id, i) => {
      const r = e.tryInstall(id);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.complete).toBe(i === order.length - 1);
    });
    expect(e.isComplete()).toBe(true);
    expect(e.mistakes).toBe(0);
  });

  it('available() lists only parts whose prerequisites are met', () => {
    const e = new AssemblyEngine(assembly.steps, ['base']);
    expect(e.available().sort()).toEqual(['shaft1', 'shaft2']);
    e.tryInstall('shaft1');
    expect(e.available().sort()).toEqual(['brg1A', 'key1', 'shaft2']);
  });

  it('does not install twice or unknown parts', () => {
    const e = new AssemblyEngine(assembly.steps, ['base']);
    e.tryInstall('shaft1');
    expect(e.tryInstall('shaft1')).toEqual({ ok: false, reason: 'already-installed' });
    expect(e.tryInstall('nope')).toEqual({ ok: false, reason: 'unknown-part' });
    expect(e.mistakes).toBe(0);
  });

  it('validateSteps finds cycles and unknown prerequisites', () => {
    const steps: AssemblyStep[] = [
      { partId: 'a', requires: ['b'], hint },
      { partId: 'b', requires: ['a'], hint },
      { partId: 'c', requires: ['zzz'], hint },
    ];
    const problems = validateSteps(steps);
    expect(problems.some((p) => p.includes('unknown part zzz'))).toBe(true);
    expect(problems.some((p) => p.includes('cycle'))).toBe(true);
  });
});

describe('scoring', () => {
  it('stars', () => {
    expect(computeStars(0, 60, 90)).toBe(3);
    expect(computeStars(0, 120, 90)).toBe(2);
    expect(computeStars(2, 100, 90)).toBe(2);
    expect(computeStars(3, 30, 90)).toBe(1);
    expect(computeStars(1, 500, 90)).toBe(1);
  });

  it('best score comparison', () => {
    expect(isBetterScore({ stars: 2, mistakes: 0, timeSec: 50 }, null)).toBe(true);
    expect(isBetterScore({ stars: 3, mistakes: 0, timeSec: 80 }, { stars: 2, mistakes: 0, timeSec: 10 })).toBe(true);
    expect(isBetterScore({ stars: 2, mistakes: 1, timeSec: 10 }, { stars: 2, mistakes: 0, timeSec: 99 })).toBe(false);
    expect(isBetterScore({ stars: 2, mistakes: 0, timeSec: 40 }, { stars: 2, mistakes: 0, timeSec: 50 })).toBe(true);
  });
});
