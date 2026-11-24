/**
 * Parameter lab for the spur gear pair: module, tooth counts and profile shift.
 * Every change regenerates the 3D model and runs the classic design checks.
 */
import type { LabDef, LabWarning, Mechanism } from '../../core/types';
import { deg } from '../../core/involute';
import { DEFAULT_CONFIG, MODULES, layoutFor, type Layout } from './layout';
import { ALPHA, BRG1, BRG2, KEY1 } from './params';

const bg = (s: string): { bg: string } => ({ bg: s });
const n = (v: number, d = 2): string => {
  const r = Math.round(v * 10 ** d) / 10 ** d;
  return r.toString().replace('.', ',');
};

export function createLab(build: (L: Layout) => Mechanism): LabDef {
  return {
    title: bg('Лаборатория: параметри'),
    intro: bg('Промени модула, броя на зъбите и изместването и виж как се променя предавката. Проверките отдолу показват кога проектът става неправилен.'),
    params: [
      {
        id: 'm',
        label: bg('Модул m'),
        kind: 'choice',
        options: MODULES,
        default: DEFAULT_CONFIG.m,
        format: (v) => `${n(v)} mm`,
        hint: bg('Стандартен ред по ISO 54'),
      },
      { id: 'z1', label: bg('Зъби на малкото колело z₁'), kind: 'range', min: 8, max: 40, step: 1, default: DEFAULT_CONFIG.z1, format: (v) => String(v) },
      { id: 'z2', label: bg('Зъби на голямото колело z₂'), kind: 'range', min: 12, max: 100, step: 1, default: DEFAULT_CONFIG.z2, format: (v) => String(v) },
      {
        id: 'x1',
        label: bg('Изместване x₁ (x₂ = −x₁)'),
        kind: 'range',
        min: -0.5,
        max: 0.8,
        step: 0.05,
        default: DEFAULT_CONFIG.x1,
        format: (v) => (v > 0 ? '+' : '') + n(v),
        hint: bg('Равно и противоположно изместване: междуосието не се променя'),
      },
    ],
    presets: [
      { label: bg('Стандарт 20/40'), values: { m: 2, z1: 20, z2: 40, x1: 0 } },
      { label: bg('Подрязване z₁ = 12'), values: { m: 2, z1: 12, z2: 40, x1: 0 } },
      { label: bg('Лек: x₁ = +0,35'), values: { m: 2, z1: 12, z2: 40, x1: 0.35 } },
      { label: bg('Заострен зъб'), values: { m: 2, z1: 12, z2: 40, x1: 0.8 } },
      { label: bg('Голямо i = 5'), values: { m: 1.5, z1: 18, z2: 90, x1: 0 } },
      { label: bg('Лагерите не се побират'), values: { m: 1, z1: 24, z2: 30, x1: 0 } },
    ],
    evaluate(v) {
      const cfg = { m: v.m, z1: Math.round(v.z1), z2: Math.round(v.z2), x1: Math.round(v.x1 * 100) / 100 };
      const L = layoutFor(cfg);
      const { m, z1, z2, x1 } = cfg;
      const s2a = Math.sin(deg(ALPHA)) ** 2;
      const warnings: LabWarning[] = [];

      // Undercut (theoretical limit for a standard rack; about 14 teeth are acceptable in practice at x = 0).
      if (z1 < L.zLim1 - 1e-6) {
        const xmin = 1 - (z1 * s2a) / 2;
        const strong = z1 < L.zLim1 * 0.82;
        warnings.push({
          level: strong ? 'error' : 'warn',
          text: bg(
            `${strong ? 'Подрязване' : 'Леко подрязване'} на z₁: при x₁ = ${n(x1)} без подрязване са нужни z ≥ ${n(L.zLim1, 1)}${strong ? '' : ' (на практика се допуска до ≈ 14)'}. Изместване x₁ ≥ ${n(xmin)} го премахва.`,
          ),
        });
      }
      if (z2 < L.zLim2 - 1e-6) {
        warnings.push({
          level: z2 < L.zLim2 * 0.82 ? 'error' : 'warn',
          text: bg(`Подрязване на z₂: отрицателното изместване x₂ = ${n(-x1)} подрязва голямото колело (без подрязване са нужни z ≥ ${n(L.zLim2, 1)}).`),
        });
      }
      // Pointed teeth.
      for (const [sa, name, sign] of [
        [L.sa1, 'z₁', 1],
        [L.sa2, 'z₂', -1],
      ] as const) {
        if (sa < 0.25 * m) {
          warnings.push({
            level: 'error',
            text: bg(`Заострени зъби на ${name}: дебелината на върха е ${n(Math.max(sa, 0))} mm (< 0,25·m = ${n(0.25 * m)} mm). ${sign > 0 ? 'Намали x₁.' : 'Намали отрицателното изместване.'}`),
          });
        } else if (sa < 0.4 * m) {
          warnings.push({ level: 'warn', text: bg(`Тънки върхове на ${name}: sa = ${n(sa)} mm. Препоръчва се sa ≥ 0,4·m при закалени зъби.`) });
        }
      }
      // Contact ratio.
      if (L.eps < 1) {
        warnings.push({ level: 'error', text: bg(`ε = ${n(L.eps)} < 1: има моменти без зъби в контакт – зацепването е ударно.`) });
      } else if (L.eps < 1.2) {
        warnings.push({ level: 'warn', text: bg(`ε = ${n(L.eps)} < 1,2: работата е шумна, препоръчва се поне 1,2.`) });
      }
      // Housing and bearings.
      if (L.bearingsClash) {
        warnings.push({
          level: 'error',
          text: bg(`Лагерите ${BRG1.code} и ${BRG2.code} не се побират: a = ${n(L.a)} mm, а са нужни поне ${n((BRG1.D + BRG2.D) / 2 + 4, 1)} mm. Увеличи модула или броя на зъбите.`),
        });
      }
      if (z2 / z1 > 7) {
        warnings.push({ level: 'warn', text: bg(`i = ${n(z2 / z1)} е много за едно стъпало: голямото колело става тежко. Обикновено се прави двустепенен редуктор.`) });
      }
      // Design consequences (not errors).
      if (L.integral1) {
        warnings.push({
          level: 'info',
          text: bg(
            L.rim1 <= 0
              ? `Малкото колело е вал-зъбно колело: df₁ = ${n(L.g1.df)} mm е по-малък от отвора ø20 с шпонков канал (${n(BRG1.d + 2 * KEY1.t2, 1)} mm), затова зъбите се нарязват директно върху вала.`
              : `Малкото колело е вал-зъбно колело: под шпонковия канал остават само ${n(L.rim1)} mm (< 2·m), затова зъбите се нарязват директно върху вала.`,
          ),
        });
      }
      if (L.integral2) {
        warnings.push({ level: 'info', text: bg(`Голямото колело също е твърде малко за отвор ø25 с шпонка и се изработва заедно с вала.`) });
      }
      if (!warnings.some((w) => w.level === 'error' || w.level === 'warn')) {
        warnings.unshift({ level: 'ok', text: bg('Всички проверки минават – предавката е проектирана правилно.') });
      }

      const values = [
        { label: bg('d₁ / d₂'), value: `${n(L.g1.d)} / ${n(L.g2.d)} mm` },
        { label: bg('da₁ / da₂'), value: `${n(L.g1.da)} / ${n(L.g2.da)} mm` },
        { label: bg('df₁ / df₂'), value: `${n(L.g1.df)} / ${n(L.g2.df)} mm` },
        { label: bg('Междуосие a'), value: `${n(L.a)} mm` },
        { label: bg('Предавателно отношение i'), value: n(z2 / z1) },
        { label: bg('Препокриване ε'), value: n(L.eps) },
        { label: bg('Връх sa₁ / sa₂'), value: `${n(L.sa1)} / ${n(L.sa2)} mm` },
        { label: bg('Без подрязване'), value: `z₁ ≥ ${n(Math.max(0, L.zLim1), 1)}, z₂ ≥ ${n(Math.max(0, L.zLim2), 1)}` },
      ];
      return { values, warnings, mechanism: build(L) };
    },
  };
}
