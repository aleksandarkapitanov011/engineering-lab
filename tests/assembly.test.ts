import { describe, expect, it } from 'vitest';
import { AssemblyEngine, computeStars, isBetterScore, validateSteps } from '../src/core/assembly';
import { finalScore } from '../src/tabs/assemble';
import type { AssemblyStep } from '../src/core/types';
import { assembly } from '../src/mechanisms/spur-gear/assembly';

const hint = { bg: '' };

describe('assembly engine', () => {
  it('spur gear step data is valid (known parts, no cycles)', () => {
    expect(validateSteps(assembly.steps, ['base'])).toEqual([]);
  });

  it('a gear without its key is accepted, but the key is lost for good', () => {
    const e = new AssemblyEngine(assembly.steps, ['base']);
    expect(e.tryInstall('shaft1').ok).toBe(true);
    const r = e.tryInstall('pinion');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.skipped).toEqual(['key1']);
    expect(e.isSkipped('key1')).toBe(true);
    expect(e.tryInstall('key1')).toEqual({ ok: false, reason: 'skipped' });
    expect(e.mistakes).toBe(1);
    // The rest can still be finished: the skipped key counts as done.
    for (const id of ['brg1A', 'brg1B', 'shaft2', 'key2', 'gear2', 'brg2A', 'brg2B']) expect(e.tryInstall(id).ok).toBe(true);
    expect(e.isComplete()).toBe(true);
    expect(e.skipped()).toEqual(['key1']);
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
    expect(e.available().sort()).toEqual(['brg1A', 'key1', 'pinion', 'shaft2']);
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

describe('disassembly', () => {
  it('starts fully assembled and works from the outside in', () => {
    const e = new AssemblyEngine(assembly.steps, ['base'], 'disassemble');
    expect(e.isInstalled('pinion')).toBe(true);
    const r = e.tryRemove('shaft1');
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === 'blocked') expect(r.blockers.sort()).toEqual(['brg1A', 'key1', 'pinion']);
    expect(e.mistakes).toBe(1);
  });

  it('the key comes out only after the gear, the gear only after bearing B', () => {
    const e = new AssemblyEngine(assembly.steps, ['base'], 'disassemble');
    expect(e.canRemove('key1')).toBe(false);
    expect(e.canRemove('pinion')).toBe(false);
    expect(e.tryRemove('brg1B').ok).toBe(true);
    expect(e.tryRemove('pinion').ok).toBe(true);
    expect(e.tryRemove('key1').ok).toBe(true);
  });

  it('reverse of a valid assembly order takes everything apart without mistakes', () => {
    const e = new AssemblyEngine(assembly.steps, ['base'], 'disassemble');
    const order = ['shaft2', 'brg2A', 'shaft1', 'key1', 'key2', 'gear2', 'pinion', 'brg1A', 'brg2B', 'brg1B'].reverse();
    order.forEach((id, i) => {
      const r = e.tryRemove(id);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.complete).toBe(i === order.length - 1);
    });
    expect(e.mistakes).toBe(0);
    expect(e.tryRemove('base')).toEqual({ ok: false, reason: 'unknown-part' });
  });
});

describe('tools and forgotten parts', () => {
  it('every bearing, gear and key step asks for a tool with at least one right and one wrong choice', () => {
    for (const s of assembly.steps.filter((x) => !x.partId.startsWith('shaft'))) {
      for (const list of [s.mount, s.dismount]) {
        expect(list?.some((c) => c.ok)).toBe(true);
        expect(list?.some((c) => !c.ok)).toBe(true);
      }
    }
  });

  it('a hammer on the outer ring is the wrong way to mount a bearing', () => {
    const brg = assembly.steps.find((s) => s.partId === 'brg1A')!;
    const hammer = brg.mount!.find((c) => /чук/.test(c.label.bg))!;
    expect(hammer.ok).toBe(false);
    expect(hammer.why.bg).toMatch(/сачмите/);
  });

  it('a forgotten key stops the parts it should drive', () => {
    const key1 = assembly.steps.find((s) => s.partId === 'key1')!;
    expect(key1.optional!.stops).toContain('pinion');
    expect(key1.optional!.stops).toContain('shaft2');
    const key2 = assembly.steps.find((s) => s.partId === 'key2')!;
    expect(key2.optional!.stops).toContain('shaft2');
    expect(key2.optional!.stops).not.toContain('gear2');
  });

  it('a forgotten part caps the result at one star and counts as a mistake', () => {
    expect(finalScore(0, 0, 60, 120).stars).toBe(3);
    expect(finalScore(0, 1, 60, 120)).toEqual({ stars: 1, timeSec: 60, mistakes: 1 });
  });
});
