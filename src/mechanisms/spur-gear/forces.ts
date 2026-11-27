/**
 * Forces and a simplified strength check for the spur gear pair.
 * Units: N, mm, MPa (N/mm²), N·mm internally; N·m for display.
 *
 * Simplifications (stated in the UI): Lewis bending without stress concentration,
 * Hertz contact with Z_E, Z_H, Z_ε only, K = K_A·K_v (Barth), shafts checked for torsion only.
 */
import type { ForcesDef, ForcesResult, LabWarning, StrengthCheck } from '../../core/types';
import { deg } from '../../core/involute';
import type { Layout } from './layout';
import { ALPHA, B1, B2, BRG1, BRG1A_Z, BRG1B_Z, BRG2, BRG2A_Z, BRG2B_Z, KEY1, KEY2 } from './params';

export const ETA = 0.98;
/** Steel on steel elasticity factor, √MPa. */
export const Z_E = 189.8;

/** Materials: limits used for the safety factors. */
export const MATERIALS = {
  pinion: { name: '40Cr, закалени зъби', sHlim: 1150, sFlim: 350 },
  gear: { name: 'C45, подобрена', sHlim: 560, sFlim: 210 },
  key: { name: 'C45 / стоманена главина', sCrAllow: 100 },
  shaft: { name: 'C45 (предварително оразмеряване)', tauAllow: 25 },
};

export const REQUIRED = { bending: 1.5, contact: 1.1, key: 1.0, torsion: 1.0 };

/** Lewis form factor Y for 20° full-depth teeth (Shigley, table 14-2). */
const LEWIS: [number, number][] = [
  [12, 0.245], [13, 0.261], [14, 0.277], [15, 0.29], [16, 0.296], [17, 0.303], [18, 0.309], [19, 0.314],
  [20, 0.322], [21, 0.328], [22, 0.331], [24, 0.337], [26, 0.346], [28, 0.353], [30, 0.359], [34, 0.371],
  [38, 0.384], [43, 0.397], [50, 0.409], [60, 0.422], [75, 0.435], [100, 0.447], [150, 0.46], [300, 0.472],
];

export function lewisY(z: number): number {
  if (z <= LEWIS[0][0]) return LEWIS[0][1];
  for (let i = 1; i < LEWIS.length; i++) {
    const [z1, y1] = LEWIS[i];
    if (z <= z1) {
      const [z0, y0] = LEWIS[i - 1];
      return y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
    }
  }
  return LEWIS[LEWIS.length - 1][1];
}

export interface ForceInputs {
  /** Input power, kW. */
  P: number;
  /** Input speed, min⁻¹. */
  n1: number;
  /** Application factor (shocks). */
  KA: number;
}

export interface ForceResults {
  M1: number; // N·mm
  M2: number; // N·mm
  n2: number;
  v: number; // m/s
  Ft: number;
  Fr: number;
  Fn: number;
  Kv: number;
  K: number;
  b: number;
  Y1: number;
  Y2: number;
  sF1: number;
  sF2: number;
  zEps: number;
  sH: number;
  sCr1: number | null;
  sCr2: number | null;
  tau1: number;
  tau2: number;
  /** Bearing reactions (N) and L10h life (h). */
  RA1: number;
  RB1: number;
  RA2: number;
  RB2: number;
  L10h1: number;
  L10h2: number;
}

/** Pure calculation, independent of rendering (unit tested). */
export function computeForces(L: Layout, inp: ForceInputs): ForceResults {
  const { m, z1, z2 } = L.cfg;
  const a = deg(ALPHA);
  const d1 = L.g1.d; // x1 + x2 = 0: operating pitch diameter = reference diameter
  const i = z2 / z1;
  const omega1 = (2 * Math.PI * inp.n1) / 60;
  const M1 = ((inp.P * 1000) / omega1) * 1000; // N·mm
  const M2 = M1 * i * ETA;
  const Ft = (2 * M1) / d1;
  const Fr = Ft * Math.tan(a);
  const Fn = Ft / Math.cos(a);
  const v = (Math.PI * d1 * inp.n1) / 60000;
  const Kv = (6.1 + v) / 6.1;
  const K = inp.KA * Kv;
  const b = Math.min(B1, B2); // load is carried over the narrower face
  const Y1 = lewisY(z1);
  const Y2 = lewisY(z2);
  const sF1 = (K * Ft) / (b * m * Y1);
  const sF2 = (K * Ft) / (b * m * Y2);
  const ZH = Math.sqrt(2 / (Math.sin(a) * Math.cos(a)));
  const zEps = Math.sqrt((4 - Math.min(L.eps, 2)) / 3);
  const u = i;
  const sH = Z_E * ZH * zEps * Math.sqrt(((K * Ft) / (b * d1)) * ((u + 1) / u));
  const keyStress = (M: number, d: number, k: { h: number; t1: number; L: number }): number => (2 * M) / (d * (k.h - k.t1) * k.L);
  const sCr1 = L.integral1 ? null : keyStress(M1, BRG1.d, KEY1);
  const sCr2 = L.integral2 ? null : keyStress(M2, BRG2.d, KEY2);
  const tau1 = (16 * M1) / (Math.PI * BRG1.d ** 3);
  const tau2 = (16 * M2) / (Math.PI * BRG2.d ** 3);
  // Simply supported shaft, gear force Fn at z = 0, bearings at zA < 0 < zB.
  const RA1 = (Fn * BRG1B_Z) / (BRG1B_Z - BRG1A_Z);
  const RB1 = (Fn * -BRG1A_Z) / (BRG1B_Z - BRG1A_Z);
  const RA2 = (Fn * BRG2B_Z) / (BRG2B_Z - BRG2A_Z);
  const RB2 = (Fn * -BRG2A_Z) / (BRG2B_Z - BRG2A_Z);
  const n2 = inp.n1 / i;
  const life = (C: number, R: number, n: number): number => ((C / R) ** 3 * 1e6) / (60 * n);
  return {
    M1,
    M2,
    n2,
    v,
    Ft,
    Fr,
    Fn,
    Kv,
    K,
    b,
    Y1,
    Y2,
    sF1,
    sF2,
    zEps,
    sH,
    sCr1,
    sCr2,
    tau1,
    tau2,
    RA1,
    RB1,
    RA2,
    RB2,
    L10h1: life(BRG1.C, Math.max(RA1, RB1), inp.n1),
    L10h2: life(BRG2.C, Math.max(RA2, RB2), n2),
  };
}

const bg = (s: string): { bg: string } => ({ bg: s });
const n = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });

export function createForces(L: Layout): ForcesDef {
  return {
    title: bg('Сили и якостна проверка'),
    intro: bg('Задай мощността и коефициента на натоварване. Оборотите n₁ се вземат от плъзгача на модела. Проверката е опростена – за учебни цели.'),
    groups: [
      { id: 'mesh', label: { bg: 'Зацепване', en: 'Mesh' }, focus: ['pinion', 'gear2', 'shaft1', 'shaft2'], view: { target: [L.g1.d / 2, L.axisY, 0], dir: [0.35, 0.4, 1], radius: 78 } },
      { id: 'brg', label: { bg: 'Реакции в лагерите', en: 'Bearing reactions' }, focus: ['shaft1', 'shaft2', 'pinion', 'gear2', 'brg1A', 'brg1B', 'brg2A', 'brg2B'] },
      { id: 'all', label: { bg: 'Всички', en: 'All' } },
    ],
    params: [
      { id: 'P', label: bg('Мощност P'), kind: 'range', min: 0.1, max: 10, step: 0.05, default: 0.75, format: (v) => `${n(v, 2)} kW` },
      {
        id: 'KA',
        label: bg('Коефициент на натоварване KA'),
        kind: 'choice',
        options: [1, 1.25, 1.5, 1.75],
        default: 1.25,
        format: (v) => n(v, 2),
        hint: bg('1,0 – равномерно (ел. двигател, вентилатор) · 1,25 – леки удари · 1,5 – средни · 1,75 – силни удари'),
      },
    ],
    evaluate(inputs, inputRpm): ForcesResult {
      const warnings: LabWarning[] = [];
      if (inputRpm < 10) {
        return {
          values: [],
          checks: [],
          arrows: [],
          warnings: [{ level: 'warn', text: bg('Задай входящи обороти n₁ > 0 с плъзгача на модела – при n = 0 моментът е неопределен.') }],
        };
      }
      const r = computeForces(L, { P: inputs.P, n1: inputRpm, KA: inputs.KA });
      const { m, z1, z2 } = L.cfg;

      const checks: StrengthCheck[] = [
        {
          label: bg(`Огъване на зъба, z₁ = ${z1} (${MATERIALS.pinion.name})`),
          formula: `σF = K·Ft / (b·m·Y) , Y = ${n(r.Y1, 3)}`,
          stress: r.sF1,
          limit: MATERIALS.pinion.sFlim,
          unit: 'MPa',
          safety: MATERIALS.pinion.sFlim / r.sF1,
          required: REQUIRED.bending,
        },
        {
          label: bg(`Огъване на зъба, z₂ = ${z2} (${MATERIALS.gear.name})`),
          formula: `σF = K·Ft / (b·m·Y) , Y = ${n(r.Y2, 3)}`,
          stress: r.sF2,
          limit: MATERIALS.gear.sFlim,
          unit: 'MPa',
          safety: MATERIALS.gear.sFlim / r.sF2,
          required: REQUIRED.bending,
        },
        {
          label: bg(`Контактно напрежение – z₂ (${MATERIALS.gear.name})`),
          formula: 'σH = ZE·ZH·Zε·√(K·Ft/(b·d₁)·(u+1)/u)',
          stress: r.sH,
          limit: MATERIALS.gear.sHlim,
          unit: 'MPa',
          safety: MATERIALS.gear.sHlim / r.sH,
          required: REQUIRED.contact,
          note: bg('По-мекото колело определя контактната якост.'),
        },
        {
          label: bg(`Контактно напрежение – z₁ (${MATERIALS.pinion.name})`),
          formula: 'същото σH, по-висока граница σHlim',
          stress: r.sH,
          limit: MATERIALS.pinion.sHlim,
          unit: 'MPa',
          safety: MATERIALS.pinion.sHlim / r.sH,
          required: REQUIRED.contact,
        },
      ];
      if (r.sCr1 !== null) {
        checks.push({
          label: bg(`Смачкване на шпонка ${KEY1.b}×${KEY1.h}×${KEY1.L}`),
          formula: 'σсм = 2M₁ / (d·(h − t₁)·l)',
          stress: r.sCr1,
          limit: MATERIALS.key.sCrAllow,
          unit: 'MPa',
          safety: MATERIALS.key.sCrAllow / r.sCr1,
          required: REQUIRED.key,
        });
      }
      if (r.sCr2 !== null) {
        checks.push({
          label: bg(`Смачкване на шпонка ${KEY2.b}×${KEY2.h}×${KEY2.L}`),
          formula: 'σсм = 2M₂ / (d·(h − t₁)·l)',
          stress: r.sCr2,
          limit: MATERIALS.key.sCrAllow,
          unit: 'MPa',
          safety: MATERIALS.key.sCrAllow / r.sCr2,
          required: REQUIRED.key,
        });
      }
      checks.push(
        {
          label: bg(`Усукване на вал 1, ø${BRG1.d}`),
          formula: 'τ = 16·M₁ / (π·d³)',
          stress: r.tau1,
          limit: MATERIALS.shaft.tauAllow,
          unit: 'MPa',
          safety: MATERIALS.shaft.tauAllow / r.tau1,
          required: REQUIRED.torsion,
          note: bg('Ниско допустимо [τ] = 25 MPa, защото огъването още не е отчетено.'),
        },
        {
          label: bg(`Усукване на вал 2, ø${BRG2.d}`),
          formula: 'τ = 16·M₂ / (π·d³)',
          stress: r.tau2,
          limit: MATERIALS.shaft.tauAllow,
          unit: 'MPa',
          safety: MATERIALS.shaft.tauAllow / r.tau2,
          required: REQUIRED.torsion,
        },
      );

      const failed = checks.filter((c) => c.safety < c.required);
      if (failed.length === 0) {
        warnings.push({ level: 'ok', text: bg('Всички проверки минават при тези мощност и обороти.') });
      } else {
        for (const c of failed) {
          warnings.push({ level: 'error', text: bg(`${c.label.bg}: S = ${n(c.safety, 2)} < ${n(c.required, 1)}.`) });
        }
        warnings.push({
          level: 'info',
          text: bg('Как да се поправи: по-голям модул или ширина b, по-твърд материал, по-малка мощност или по-високи обороти при същата мощност.'),
        });
      }
      if (Math.min(r.L10h1, r.L10h2) < 10000) {
        warnings.push({ level: 'warn', text: bg(`Ресурсът на лагерите е под 10 000 h (${n(Math.min(r.L10h1, r.L10h2))} h).`) });
      }

      // ----- 3D arrows -----
      const rp1 = L.g1.d / 2;
      const y = L.axisY;
      const zF = 14; // in front of the gear faces
      const P: [number, number, number] = [rp1, y, zF];
      const fmtN = (v: number): string => `${n(v)} N`;
      const shaft1Reaction: [number, number, number] = [r.Fr, r.Ft, 0];
      const shaft2Reaction: [number, number, number] = [-r.Fr, -r.Ft, 0];
      const arrows = [
        { at: P, dir: [0, 1, 0], magnitude: r.Ft, label: `Ft₂ = ${fmtN(r.Ft)}`, color: '#ff5a3c', group: 'mesh' },
        { at: P, dir: [1, 0, 0], magnitude: r.Fr, label: `Fr₂ = ${fmtN(r.Fr)}`, color: '#3c9dff', group: 'mesh' },
        { at: P, dir: [0, -1, 0], magnitude: r.Ft, label: 'Ft₁', color: '#ff5a3c', group: 'mesh' },
        { at: P, dir: [-1, 0, 0], magnitude: r.Fr, label: 'Fr₁', color: '#3c9dff', group: 'mesh' },
        { at: [0, y, BRG1A_Z], dir: shaft1Reaction, magnitude: r.RA1, label: `RA₁ = ${fmtN(r.RA1)}`, color: '#2fbf71', mode: 'to', gap: BRG1.D / 2 + 1, group: 'brg' },
        { at: [0, y, BRG1B_Z], dir: shaft1Reaction, magnitude: r.RB1, label: `RB₁ = ${fmtN(r.RB1)}`, color: '#2fbf71', mode: 'to', gap: BRG1.D / 2 + 1, labelAt: 0.45, group: 'brg' },
        { at: [L.a, y, BRG2A_Z], dir: shaft2Reaction, magnitude: r.RA2, label: `RA₂ = ${fmtN(r.RA2)}`, color: '#2fbf71', mode: 'to', gap: BRG2.D / 2 + 1, group: 'brg' },
        { at: [L.a, y, BRG2B_Z], dir: shaft2Reaction, magnitude: r.RB2, label: `RB₂ = ${fmtN(r.RB2)}`, color: '#2fbf71', mode: 'to', gap: BRG2.D / 2 + 1, labelAt: 0.45, group: 'brg' },
      ] as ForcesResult['arrows'];

      const rows = [
        { label: bg('Моменти M₁ / M₂'), value: `${n(r.M1 / 1000, 1)} / ${n(r.M2 / 1000, 1)} N·m` },
        { label: bg('Обороти n₁ / n₂'), value: `${n(inputRpm)} / ${n(r.n2)} min⁻¹` },
        { label: bg('Обиколна сила Ft = 2M₁/d₁'), value: fmtN(r.Ft) },
        { label: bg('Радиална сила Fr = Ft·tg α'), value: fmtN(r.Fr) },
        { label: bg('Нормална сила Fₙ = Ft/cos α'), value: fmtN(r.Fn) },
        { label: bg('Скорост v / Kv'), value: `${n(r.v, 2)} m/s / ${n(r.Kv, 2)}` },
        { label: bg('Реакции вал 1: RA₁ / RB₁'), value: `${n(r.RA1)} / ${n(r.RB1)} N` },
        { label: bg('Реакции вал 2: RA₂ / RB₂'), value: `${n(r.RA2)} / ${n(r.RB2)} N` },
        { label: bg(`Ресурс L10h: ${BRG1.code} / ${BRG2.code}`), value: `${n(r.L10h1)} / ${n(r.L10h2)} h` },
        { label: bg('m, b, η'), value: `${n(m, 2)} mm, ${r.b} mm, ${n(ETA, 2)}` },
      ];
      return { values: rows, checks, arrows, warnings };
    },
  };
}
