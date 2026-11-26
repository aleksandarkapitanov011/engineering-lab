import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { lt, missing, normalise, enNumber, setLang, tr, registerDictionary } from '../src/i18n';
import { spurGear } from '../src/mechanisms/spur-gear';
import { catalogue, categories } from '../src/core/registry';
import '../src/mechanisms';
import type { Mechanism } from '../src/core/types';

const CYR = /[Ѐ-ӿ]/;

/** Calls lt() on every LText and tr() on every displayed plain string reachable from `obj`. */
function walk(obj: unknown, out: string[], seen = new WeakSet<object>()): void {
  if (!obj || typeof obj !== 'object') return;
  if (seen.has(obj as object)) return;
  seen.add(obj as object);
  const o = obj as Record<string, unknown>;
  if (typeof o.bg === 'string') {
    out.push(lt(o as { bg: string; en?: string }));
    return;
  }
  if (o.label && typeof o.value === 'string') out.push(tr(o.value));
  if (typeof o.formula === 'string') out.push(tr(o.formula));
  for (const v of Array.isArray(obj) ? obj : Object.values(o)) walk(v, out, seen);
}

/** A 2D canvas stand-in that records the text drawn (through tr, as the app does). */
function textCtx(out: string[]): CanvasRenderingContext2D {
  return new Proxy(
    {},
    {
      get: (_t, p) => {
        if (p === 'fillText' || p === 'strokeText') return (s: string) => out.push(tr(s));
        if (p === 'measureText') return (s: string) => ({ width: s.length * 6 });
        if (['fillStyle', 'strokeStyle', 'lineWidth', 'font', 'textAlign', 'textBaseline', 'globalAlpha'].includes(String(p))) return '';
        return () => undefined;
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
}

function exercise(m: Mechanism, out: string[]): void {
  walk(m, out);
  for (const r of m.readouts) out.push(r.value(new Map([['s1', 1000], ['s2', -500]])));
  for (const d of m.drawings) out.push(d.render().replace(/<[^>]+>/g, ' '));
  if (m.forces) {
    for (const [v, n] of [[{ P: 2, KA: 1.25 }, 1000], [{ P: 15, KA: 1.75 }, 1000], [{ P: 0.3, KA: 1 }, 1000], [{ P: 2, KA: 1.25 }, 3000], [{ P: 2, KA: 1.25 }, 100], [{ P: 0.5, KA: 1 }, 2500]] as [Record<string, number>, number][]) {
      const r = m.forces.evaluate(v, n);
      walk(r, out);
      for (const a of r.arrows) out.push(tr(a.label));
    }
    for (const p of m.forces.params) if (p.format) out.push(tr(p.format(p.default)));
  }
  if (m.closeUp) walk(m.closeUp.facts(1000), out);
  if (m.stress) {
    for (const [v, n] of [[{ P: 2, KA: 1.25 }, 1000], [{ P: 8, KA: 1.75 }, 1000], [{ P: 0.3, KA: 1 }, 3000], [{ P: 4, KA: 1.5 }, 100]] as [Record<string, number>, number][]) {
      const r = m.stress.evaluate(v, n, { s1: 0, s2: 0 });
      walk(r, out);
      for (const p of r.plots) p.draw(textCtx(out), 320, 260, () => '#000');
    }
    for (const p of m.stress.params) if (p.format) out.push(tr(p.format(p.default)));
  }
  if (m.mounting) {
    const vals = Object.fromEntries(m.mounting.params.map((p) => [p.id, p.default]));
    const cases = [vals, ...m.mounting.presets.map((p) => ({ ...vals, ...p.values })), { ...vals, da: -0.55 }, { ...vals, da: 0.9 }, { ...vals, beta: -0.2 }];
    for (const c of cases) {
      for (const n of [1000, 100, 3000]) {
      const r = m.mounting.evaluate(c, n);
      walk({ values: r.values, warnings: r.warnings, label: r.plot.label }, out);
      r.plot.draw(textCtx(out), 330, 230, () => '#000');
      }
    }
    for (const p of m.mounting.params) if (p.format) for (const v of p.kind === 'choice' ? p.options! : [p.min!, 0, p.max!]) out.push(tr(p.format(v)));
  }
  if (m.measure) {
    let s = 1;
    const rng = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5; i++) walk(m.measure.samples(5, rng), out);
  }
}

describe('English translation', () => {
  setLang('en');
  const out: string[] = [];
  exercise(spurGear, out);
  if (spurGear.lab) {
    for (const p of spurGear.lab.params) if (p.format) for (const v of p.options ?? [p.min!, p.default, p.max!]) out.push(tr(p.format(v)));
    for (const pr of spurGear.lab.presets) {
      const r = spurGear.lab.evaluate({ ...Object.fromEntries(spurGear.lab.params.map((p) => [p.id, p.default])), ...pr.values });
      walk({ values: r.values, warnings: r.warnings }, out);
      exercise(r.mechanism, out);
    }
  }
  walk(catalogue(), out);
  walk(categories(), out);
  for (const e of catalogue()) if (e.kind === 'mechanism' && e.id !== 'spur-gear') exercise(e, out);

  afterAll(() => {
    if (process.env.DUMP_MISSING) writeFileSync(process.env.DUMP_MISSING, JSON.stringify([...missing].sort(), null, 1));
    setLang('bg');
  });

  it('every text of the mechanism has an English translation', () => {
    expect([...missing].slice(0, 20)).toEqual([]);
  });

  it('nothing shown in English contains Cyrillic letters', () => {
    const bad = out.filter((s) => CYR.test(s));
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

describe('translation mechanics', () => {
  it('numbers are parameters and get English decimals', () => {
    registerDictionary({ 'Препокриването е само {0}.': 'The contact ratio is only {0}.' });
    setLang('en');
    expect(tr('Препокриването е само 1,35.')).toBe('The contact ratio is only 1.35.');
    setLang('bg');
    expect(tr('Препокриването е само 1,35.')).toBe('Препокриването е само 1,35.');
  });

  it('normalises numbers and converts grouping', () => {
    expect(normalise('ø20 k6 и 1,25·m').key).toBe('ø{0} k{1} и {2}·m');
    expect(enNumber('11 900,5')).toBe('11,900.5');
  });
});
