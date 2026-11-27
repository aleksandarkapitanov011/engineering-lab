/**
 * Forces and a simplified strength check of the helical-bevel gearbox.
 * Units: N, mm, MPa (N/mm²), N·mm internally; N·m for display.
 *
 * Forces are built as 3D vectors in the world frame (see params.ts), so the bearing reactions follow from
 * plain statics of each shaft: radial reactions from the moment balance, the axial force taken by one
 * ("fixed") bearing per shaft.
 *
 * Simplifications (stated in the UI):
 *  - helical stage: Lewis bending on the virtual spur gear zv = z/cos³β with Yβ; Hertz contact with
 *    Z_E, Z_H, Z_ε, Z_β; K = K_A·K_v (Barth);
 *  - bevel stage: the virtual spur gear on the back cone at the mean cone distance, with the usual 0.85
 *    factor for the lower load capacity of straight bevel gears;
 *  - shafts: von Mises stress from bending + torsion at the worst section, without stress concentration
 *    (covered by the low allowable stress).
 */
import type { ForceArrow, ForcesDef, ForcesResult, LabValue, LabWarning, LText, StrengthCheck, Vec3 } from '../../core/types';
import { deg } from '../../core/involute';
import { lewisY, Z_E } from '../spur-gear/forces';
import { lt } from '../../i18n';
import {
  ALPHA_N,
  ALPHA_T,
  AXIS_Y,
  B1,
  B2,
  BB,
  BETA,
  BRG_6004,
  BRG_6005,
  BRG_6006,
  D1,
  D2,
  DELTA3,
  DELTA4,
  I1,
  I2,
  KEY2,
  KEY3,
  KEY_OUT,
  MB,
  MN,
  MT,
  RE,
  S1_BRG_A,
  S1_BRG_B,
  S1_Z,
  S2_BRG_A,
  S2_BRG_B,
  S3_BRG_A,
  S3_BRG_B,
  SHAFT1,
  SHAFT1_KEYWAY,
  SHAFT2,
  SHAFT3,
  SHAFT3_OUT_KEYWAY,
  STAGE1_Z,
  Z1,
  Z2,
  Z3,
  Z4,
} from './params';

// ------------------------------------------------------------------------------------------ data
export const ETA1 = 0.98; // helical stage (with its bearings)
export const ETA2 = 0.97; // bevel stage

export const MATERIALS = {
  caseHardened: { name: { bg: '18CrNiMo7-6, циментирана', en: '18CrNiMo7-6, case-hardened' } as LText, sHlim: 1500, sFlim: 500 },
  nitrided: { name: { bg: '42CrMo4, азотирана', en: '42CrMo4, nitrided' } as LText, sHlim: 1000, sFlim: 400 },
  key: { sCrAllow: 100 },
  /** Allowable equivalent stress of the shafts in this preliminary check (no stress concentration). */
  shaft: { sAllow: 100 },
};

export const REQUIRED = { bending: 1.5, contact: 1.1, key: 1.0, shaft: 1.0 };

/** Standard IEC motor powers, kW. */
export const MOTOR_KW = [0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3];

/** Bevel stage at the mean cone distance. */
export const RM = RE - BB / 2;
export const DM3 = 2 * RM * Math.sin(DELTA3);
export const DM4 = 2 * RM * Math.sin(DELTA4);
export const MM = (MB * RM) / RE;

/** Points where the forces act (world frame): helical pitch point and bevel mean point. */
export const P_HEL: Vec3 = [-STAGE1_Z, AXIS_Y, D2 / 2];
export const P_BEV: Vec3 = [-RM * Math.cos(DELTA3), AXIS_Y, RM * Math.sin(DELTA3)];

// ------------------------------------------------------------------------------------------ vectors
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
const ZERO: Vec3 = [0, 0, 0];

// ------------------------------------------------------------------------------------------ shafts
type Bearing = typeof BRG_6004;

export interface ShaftDef {
  id: 's1' | 's2' | 's3';
  /** A point on the axis and the axis direction (= body axis, local z = s). */
  O: Vec3;
  u: Vec3;
  segs: [number, number, number][];
  A: { s: number; brg: Bearing };
  B: { s: number; brg: Bearing };
  /** The bearing that takes the axial force. */
  fixed: 'A' | 'B';
  /** Where the external torque enters / leaves (coupling), local s. */
  coupling?: number;
}

export const SHAFTS: ShaftDef[] = [
  {
    id: 's1',
    O: [0, AXIS_Y, S1_Z],
    u: [-1, 0, 0],
    segs: SHAFT1,
    A: { s: S1_BRG_A, brg: BRG_6004 },
    B: { s: S1_BRG_B, brg: BRG_6004 },
    fixed: 'A',
    coupling: (SHAFT1_KEYWAY.z0 + SHAFT1_KEYWAY.z1) / 2,
  },
  { id: 's2', O: [0, AXIS_Y, 0], u: [-1, 0, 0], segs: SHAFT2, A: { s: S2_BRG_A, brg: BRG_6004 }, B: { s: S2_BRG_B, brg: BRG_6006 }, fixed: 'B' },
  {
    id: 's3',
    O: [0, AXIS_Y, 0],
    u: [0, 0, 1],
    segs: SHAFT3,
    A: { s: S3_BRG_A, brg: BRG_6006 },
    B: { s: S3_BRG_B, brg: BRG_6005 },
    fixed: 'A',
    coupling: (SHAFT3_OUT_KEYWAY.z0 + SHAFT3_OUT_KEYWAY.z1) / 2,
  },
];

const along = (sh: ShaftDef, s: number): Vec3 => add(sh.O, mul(sh.u, s));
const sOf = (sh: ShaftDef, p: Vec3): number => dot(sub(p, sh.O), sh.u);
/** Component of `v` perpendicular to the axis. */
const perp = (sh: ShaftDef, v: Vec3): Vec3 => sub(v, mul(sh.u, dot(v, sh.u)));

export interface Load {
  at: Vec3;
  F: Vec3;
}

export interface BearingLoad {
  code: string;
  s: number;
  /** Radial reaction vector (force of the bearing on the shaft), N. */
  R: Vec3;
  Fr: number;
  Fa: number;
  /** Equivalent dynamic load and life. */
  P: number;
  L10h: number;
}

export interface ShaftResult {
  A: BearingLoad;
  B: BearingLoad;
  /** Axial reaction on the shaft (signed along u), taken by the fixed bearing. */
  axial: number;
  /** Worst section: von Mises stress (nominal loads), position, diameter, bending moment and torque. */
  crit: { sEq: number; s: number; d: number; M: number; T: number };
  /** Internal bending moment vector (world, N·mm, perpendicular to the axis) and torque at section s. */
  internal(s: number): { Mv: Vec3; M: number; T: number };
}

/** ISO 281 table for deep groove ball bearings: Fa/C0 → e, Y. */
const XY: [number, number, number][] = [
  [0.014, 0.19, 2.3],
  [0.028, 0.22, 1.99],
  [0.056, 0.26, 1.71],
  [0.084, 0.28, 1.55],
  [0.11, 0.3, 1.45],
  [0.17, 0.34, 1.31],
  [0.28, 0.38, 1.15],
  [0.42, 0.42, 1.04],
  [0.56, 0.44, 1.0],
];

/** Equivalent dynamic load P = X·Fr + Y·Fa of a deep groove ball bearing. */
export function equivalentLoad(Fr: number, Fa: number, C0: number): number {
  if (Fa <= 0) return Fr;
  const q = Math.min(Math.max(Fa / C0, XY[0][0]), XY[XY.length - 1][0]);
  let e = XY[0][1];
  let Y = XY[0][2];
  for (let i = 1; i < XY.length; i++) {
    if (q <= XY[i][0]) {
      const t = (q - XY[i - 1][0]) / (XY[i][0] - XY[i - 1][0]);
      e = XY[i - 1][1] + t * (XY[i][1] - XY[i - 1][1]);
      Y = XY[i - 1][2] + t * (XY[i][2] - XY[i - 1][2]);
      break;
    }
  }
  return Fa / Math.max(Fr, 1e-9) <= e ? Fr : 0.56 * Fr + Y * Fa;
}

/** Statics of one shaft under the gear loads; `n` is its speed (min⁻¹) for the bearing life. */
export function solveShaft(sh: ShaftDef, loads: Load[], n: number): ShaftResult {
  const pA = along(sh, sh.A.s);
  let M: Vec3 = ZERO;
  let F: Vec3 = ZERO;
  for (const l of loads) {
    M = add(M, cross(sub(l.at, pA), l.F));
    F = add(F, l.F);
  }
  const L = sh.B.s - sh.A.s;
  const RB = mul(cross(sh.u, perp(sh, M)), 1 / L);
  const RA = sub(mul(perp(sh, F), -1), RB);
  const axial = -dot(F, sh.u);

  const bearing = (key: 'A' | 'B', R: Vec3): BearingLoad => {
    const b = sh[key];
    const Fr = len(R);
    const Fa = sh.fixed === key ? Math.abs(axial) : 0;
    const P = equivalentLoad(Fr, Fa, b.brg.C0);
    const L10h = P > 0 && n > 0 ? ((b.brg.C / P) ** 3 * 1e6) / (60 * n) : Infinity;
    return { code: b.brg.code, s: b.s, R, Fr, Fa, P, L10h };
  };

  // Internal moment at a section: everything on the side of smaller s, including reactions and the
  // coupling torque (which balances the gear torques of shafts 1 and 3).
  const items: { s: number; at: Vec3; F: Vec3; C?: Vec3 }[] = loads.map((l) => ({ s: sOf(sh, l.at), at: l.at, F: l.F }));
  items.push({ s: sh.A.s, at: pA, F: add(RA, sh.fixed === 'A' ? mul(sh.u, axial) : ZERO) });
  items.push({ s: sh.B.s, at: along(sh, sh.B.s), F: add(RB, sh.fixed === 'B' ? mul(sh.u, axial) : ZERO) });
  if (sh.coupling !== undefined) {
    const T = loads.reduce((acc, l) => acc + dot(cross(sub(l.at, sh.O), l.F), sh.u), 0);
    items.push({ s: sh.coupling, at: along(sh, sh.coupling), F: ZERO, C: mul(sh.u, -T) });
  }
  const internal = (s: number): { Mv: Vec3; M: number; T: number } => {
    const c = along(sh, s);
    let m: Vec3 = ZERO;
    for (const it of items) if (it.s < s) m = add(add(m, cross(sub(it.at, c), it.F)), it.C ?? ZERO);
    const Mv = perp(sh, m);
    return { Mv, M: len(Mv), T: Math.abs(dot(m, sh.u)) };
  };
  const s0 = sh.segs[0][0];
  const s1 = sh.segs[sh.segs.length - 1][1];
  const probes = new Set<number>();
  const eps = 1e-3;
  for (const [a, b] of sh.segs) for (const s of [a + eps, b - eps, (a + b) / 2]) probes.add(s);
  for (const it of items) for (const s of [it.s - eps, it.s + eps]) if (s > s0 && s < s1) probes.add(s);
  let crit = { sEq: 0, s: s0, d: sh.segs[0][2], M: 0, T: 0 };
  for (const s of probes) {
    const seg = sh.segs.find(([a, b]) => s >= a && s < b);
    if (!seg) continue;
    const d = seg[2];
    const { M: Mb, T } = internal(s);
    const sEq = (32 / (Math.PI * d ** 3)) * Math.sqrt(Mb * Mb + 0.75 * T * T);
    if (sEq > crit.sEq) crit = { sEq, s, d, M: Mb, T };
  }
  return { A: bearing('A', RA), B: bearing('B', RB), axial, crit, internal };
}

// ------------------------------------------------------------------------------------------ gears
/** Transverse contact ratio of a pair (pitch radii r1, r2, addendum ha, transverse module m and angle α). */
export function contactRatio(r1: number, r2: number, ha: number, m: number, alpha: number): number {
  const path = (r: number): number => Math.sqrt((r + ha) ** 2 - (r * Math.cos(alpha)) ** 2);
  return (path(r1) + path(r2) - (r1 + r2) * Math.sin(alpha)) / (Math.PI * m * Math.cos(alpha));
}

export interface GearboxInputs {
  /** Input power, kW. */
  P: number;
  /** Input speed, min⁻¹ (> 0). */
  n1: number;
  KA: number;
}

export interface GearboxForces {
  M1: number;
  M2: number;
  M3: number;
  n2: number;
  n3: number;
  hel: { Ft: number; Fr: number; Fa: number; v: number; Kv: number; K: number; onPinion: Vec3; parts: { t: Vec3; r: Vec3; a: Vec3 } };
  bev: { Ft: number; Fr3: number; Fa3: number; v: number; Kv: number; K: number; onPinion: Vec3; parts: { t: Vec3; r: Vec3; a: Vec3 } };
  /** Helical stage strength. */
  sF1: number;
  sF2: number;
  sH12: number;
  epsA1: number;
  epsB1: number;
  /** Bevel stage strength. */
  sF3: number;
  sF4: number;
  sH34: number;
  epsAv: number;
  keys: { key2: number; key3: number; out: number };
  shafts: Record<'s1' | 's2' | 's3', ShaftResult>;
}

/** Pure calculation, independent of rendering (unit tested). */
export function computeGearbox(inp: GearboxInputs): GearboxForces {
  const [sh1, sh2, sh3] = SHAFTS;
  const n1 = inp.n1;
  const n2 = -n1 / I1; // external mesh: the sign flips (body axes point away from the meshes)
  const n3 = n1 / (I1 * I2);
  const omega1 = (2 * Math.PI * n1) / 60;
  const M1 = ((inp.P * 1000) / omega1) * 1000;
  const M2 = M1 * I1 * ETA1;
  const M3 = M2 * I2 * ETA2;

  // ----- helical stage
  const tanB = Math.tan(BETA);
  const Ft1 = (2 * M1) / D1;
  const Fr1 = Ft1 * Math.tan(ALPHA_T);
  const Fa1 = Ft1 * tanB;
  const w1 = mul(sh1.u, n1);
  const rH = unit(perp(sh1, sub(P_HEL, sh1.O))); // from axis 1 to the pitch point
  const vH = unit(cross(w1, sub(P_HEL, sh1.O))); // direction the pinion flank moves
  const theta1 = unit(cross(sh1.u, rH)); // +θ of the pinion's own (right-hand) frame
  const ftP = mul(vH, -Ft1); // the driven gear brakes the driving pinion
  // Right-hand helix: the flank force is normal to the tooth line s = z·tan β, so F_axial = −tan β · F_θ.
  const faP = mul(sh1.u, -tanB * dot(ftP, theta1));
  const frP = mul(rH, -Fr1); // towards the pinion axis
  const helPinion = add(add(ftP, frP), faP);

  const v1 = (Math.PI * D1 * n1) / 60000;
  const Kv1 = (6.1 + v1) / 6.1;
  const K1 = inp.KA * Kv1;
  const b1 = Math.min(B1, B2);
  const epsB1 = (b1 * Math.sin(BETA)) / (Math.PI * MN);
  const Ybeta = 1 - (Math.min(epsB1, 1) * ((BETA * 180) / Math.PI)) / 120;
  const zv = (z: number): number => z / Math.cos(BETA) ** 3;
  const sF1 = ((K1 * Ft1) / (b1 * MN * lewisY(zv(Z1)))) * Ybeta;
  const sF2 = ((K1 * Ft1) / (b1 * MN * lewisY(zv(Z2)))) * Ybeta;
  const epsA1 = contactRatio(D1 / 2, D2 / 2, MN, MT, ALPHA_T);
  const zEps1 = epsB1 < 1 ? Math.sqrt(((4 - epsA1) / 3) * (1 - epsB1) + epsB1 / epsA1) : Math.sqrt(1 / epsA1);
  const betaB = Math.atan(tanB * Math.cos(ALPHA_T));
  const ZH1 = Math.sqrt((2 * Math.cos(betaB)) / (Math.cos(ALPHA_T) ** 2 * Math.tan(ALPHA_T)));
  const Zb = Math.sqrt(Math.cos(BETA));
  const u1 = I1;
  const sH12 = Z_E * ZH1 * zEps1 * Zb * Math.sqrt(((K1 * Ft1) / (b1 * D1)) * ((u1 + 1) / u1));

  // ----- bevel stage
  const a = deg(ALPHA_N);
  const Ft2 = (2 * M2) / DM3;
  const Fr3 = Ft2 * Math.tan(a) * Math.cos(DELTA3);
  const Fa3 = Ft2 * Math.tan(a) * Math.sin(DELTA3);
  const w2 = mul(sh2.u, n2);
  const rB = unit(perp(sh2, sub(P_BEV, sh2.O)));
  const vB = unit(cross(w2, sub(P_BEV, sh2.O)));
  const ftB = mul(vB, -Ft2);
  const frB = mul(rB, -Fr3);
  const faB = mul(sh2.u, Fa3); // away from the apex (the axis of shaft 2 points away from it)
  const bevPinion = add(add(ftB, frB), faB);

  const v2 = (Math.PI * DM3 * Math.abs(n2)) / 60000;
  const Kv2 = (6.1 + v2) / 6.1;
  const K2 = inp.KA * Kv2;
  const zv3 = Z3 / Math.cos(DELTA3);
  const zv4 = Z4 / Math.cos(DELTA4);
  const sF3 = (K2 * Ft2) / (0.85 * BB * MM * lewisY(zv3));
  const sF4 = (K2 * Ft2) / (0.85 * BB * MM * lewisY(zv4));
  const epsAv = contactRatio(DM3 / (2 * Math.cos(DELTA3)), DM4 / (2 * Math.cos(DELTA4)), MM, MM, a);
  const zEps2 = Math.sqrt((4 - Math.min(epsAv, 2)) / 3);
  const ZH2 = Math.sqrt(2 / (Math.sin(a) * Math.cos(a)));
  const u2 = I2;
  const sH34 = Z_E * ZH2 * zEps2 * Math.sqrt((K2 * Ft2 * Math.sqrt(u2 * u2 + 1)) / (0.85 * BB * DM3 * u2));

  // ----- keys (peak torque K_A·M)
  const keyStress = (M: number, d: number, k: { h: number; t1: number; L: number }): number => (2 * inp.KA * M) / (d * (k.h - k.t1) * k.L);
  const keys = { key2: keyStress(M2, 26, KEY2), key3: keyStress(M3, 26, KEY3), out: keyStress(M3, KEY_OUT.d, KEY_OUT) };

  // ----- shafts
  const shafts = {
    s1: solveShaft(sh1, [{ at: P_HEL, F: helPinion }], Math.abs(n1)),
    s2: solveShaft(
      sh2,
      [
        { at: P_HEL, F: mul(helPinion, -1) },
        { at: P_BEV, F: bevPinion },
      ],
      Math.abs(n2),
    ),
    s3: solveShaft(sh3, [{ at: P_BEV, F: mul(bevPinion, -1) }], Math.abs(n3)),
  };

  return {
    M1,
    M2,
    M3,
    n2,
    n3,
    hel: { Ft: Ft1, Fr: Fr1, Fa: Fa1, v: v1, Kv: Kv1, K: K1, onPinion: helPinion, parts: { t: ftP, r: frP, a: faP } },
    bev: { Ft: Ft2, Fr3, Fa3, v: v2, Kv: Kv2, K: K2, onPinion: bevPinion, parts: { t: ftB, r: frB, a: faB } },
    sF1,
    sF2,
    sH12,
    epsA1,
    epsB1,
    sF3,
    sF4,
    sH34,
    epsAv,
    keys,
    shafts,
  };
}

// ------------------------------------------------------------------------------------------ panel
type Fmt = (v: number, d?: number) => string;
const nb: Fmt = (v, d = 0) => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });
const ne: Fmt = (v, d = 0) => v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
/** LText from one template written for both languages: `f(n, lang)` gets the number formatter. */
const LL = (f: (n: Fmt, en: boolean) => string): LText => ({ bg: f(nb, false), en: f(ne, true) });
const L = (bg: string, en: string): LText => ({ bg, en });
const life = (h: number): string => (h > 1e7 ? '> 10⁷' : nb(h));

const C_FT = '#ff5a3c';
const C_FR = '#3c9dff';
const C_FA = '#b072ff';
const C_R = '#2fbf71';
const SUB = ['', '₁', '₂', '₃', '₄'];

export function createForces(): ForcesDef {
  return {
    title: L('Сили и якостна проверка', 'Forces and strength check'),
    intro: L(
      'Избери двигател и коефициента на натоварване. Оборотите n₁ идват от плъзгача на модела. Силите се показват в 3D: на колелата и като реакции в лагерите. Проверката е опростена – за учебни цели.',
      'Choose the motor and the application factor. The speed n₁ comes from the model slider. The forces are shown in 3D: on the gears and as bearing reactions. The check is simplified – for teaching.',
    ),
    params: [
      {
        id: 'P',
        label: L('Мощност на двигателя P', 'Motor power P'),
        kind: 'choice',
        options: MOTOR_KW,
        default: 0.37,
        format: (v) => `${nb(v, 2)} kW`,
        hint: L('Стандартният ред мощности на електродвигателите (IEC).', 'The standard series of electric motor powers (IEC).'),
      },
      {
        id: 'KA',
        label: L('Коефициент на натоварване KA', 'Application factor KA'),
        kind: 'choice',
        options: [1, 1.25, 1.5, 1.75],
        default: 1.25,
        format: (v) => nb(v, 2),
        hint: L(
          '1,0 – равномерно (ел. двигател, вентилатор) · 1,25 – леки удари · 1,5 – средни · 1,75 – силни удари',
          '1.0 – uniform (electric motor, fan) · 1.25 – light shocks · 1.5 – moderate · 1.75 – heavy shocks',
        ),
      },
    ],
    // One group at a time: the forces of the two meshes and the reactions would otherwise crowd each other.
    groups: [
      {
        id: 'hel',
        label: L('Стъпало 1: косозъбо', 'Stage 1: helical'),
        focus: ['shaft1', 'gear2', 'shaft2', 'key2'],
        view: { target: P_HEL, dir: [0.55, 0.55, 1], radius: 82 },
      },
      {
        id: 'bev',
        label: L('Стъпало 2: конично', 'Stage 2: bevel'),
        focus: ['shaft2', 'gear4', 'shaft3', 'key3'],
        view: { target: P_BEV, dir: [0.85, 0.75, -0.6], radius: 78 },
      },
      {
        id: 'brg',
        label: L('Реакции в лагерите', 'Bearing reactions'),
        focus: ['shaft1', 'shaft2', 'shaft3', 'brg1A', 'brg1B', 'brg2A', 'brg2B', 'brg3A', 'brg3B'],
      },
      { id: 'all', label: L('Всички', 'All') },
    ],
    legend: [
      { color: C_FT, label: L('Ft – обиколна', 'Ft – tangential') },
      { color: C_FR, label: L('Fr – радиална', 'Fr – radial') },
      { color: C_FA, label: L('Fa – осова', 'Fa – axial') },
      { color: C_R, label: L('Реакции в лагерите', 'Bearing reactions') },
    ],
    evaluate(inputs, inputRpm): ForcesResult {
      if (inputRpm < 10) {
        return {
          values: [],
          checks: [],
          arrows: [],
          warnings: [
            {
              level: 'warn',
              text: L(
                'Задай входящи обороти n₁ > 0 с плъзгача на модела – при n = 0 моментът е неопределен.',
                'Set an input speed n₁ > 0 with the model slider – at n = 0 the torque is undefined.',
              ),
            },
          ],
        };
      }
      const r = computeGearbox({ P: inputs.P, n1: inputRpm, KA: inputs.KA });
      const { caseHardened: CH, nitrided: NI } = MATERIALS;
      const check = (label: LText, formula: LText, stress: number, limit: number, required: number, note?: LText): StrengthCheck => ({
        label,
        formula: lt(formula),
        stress,
        limit,
        unit: 'MPa',
        safety: limit / stress,
        required,
        note,
      });

      const checks: StrengthCheck[] = [
        check(
          LL((_n, en) => (en ? `Tooth bending z₁ = ${Z1} (${CH.name.en})` : `Огъване на зъба z₁ = ${Z1} (${CH.name.bg})`)),
          LL((n) => `σF = K·Ft·Yβ / (b·mₙ·Y) , zv = ${n(Z1 / Math.cos(BETA) ** 3, 1)}`),
          r.sF1,
          CH.sFlim,
          REQUIRED.bending,
        ),
        check(
          LL((_n, en) => (en ? `Tooth bending z₂ = ${Z2} (${NI.name.en})` : `Огъване на зъба z₂ = ${Z2} (${NI.name.bg})`)),
          LL((n) => `σF = K·Ft·Yβ / (b·mₙ·Y) , zv = ${n(Z2 / Math.cos(BETA) ** 3, 1)}`),
          r.sF2,
          NI.sFlim,
          REQUIRED.bending,
        ),
        check(
          L(`Контакт, косозъбо стъпало (${NI.name.bg})`, `Contact, helical stage (${NI.name.en})`),
          L('σH = ZE·ZH·Zε·Zβ·√(K·Ft/(b·d₁)·(u+1)/u)', 'σH = ZE·ZH·Zε·Zβ·√(K·Ft/(b·d₁)·(u+1)/u)'),
          r.sH12,
          NI.sHlim,
          REQUIRED.contact,
          L('По-мекото колело z₂ определя контактната якост.', 'The softer gear z₂ governs the contact strength.'),
        ),
        check(
          LL((_n, en) => (en ? `Tooth bending z₃ = ${Z3}, bevel (${CH.name.en})` : `Огъване на зъба z₃ = ${Z3}, конично (${CH.name.bg})`)),
          LL((n) => `σF = K·Ft / (${n(0.85, 2)}·b·mₘ·Y) , zv = ${n(Z3 / Math.cos(DELTA3), 1)}`),
          r.sF3,
          CH.sFlim,
          REQUIRED.bending,
          L(
            'Коничното колело се смята като цилиндрично на допълнителния конус (zv = z/cos δ) при средното конусно разстояние; 0,85 отчита по-малката му товароносимост.',
            'A bevel gear is checked as a spur gear on the back cone (zv = z/cos δ) at the mean cone distance; 0.85 accounts for its lower load capacity.',
          ),
        ),
        check(
          LL((_n, en) => (en ? `Tooth bending z₄ = ${Z4}, bevel (${CH.name.en})` : `Огъване на зъба z₄ = ${Z4}, конично (${CH.name.bg})`)),
          LL((n) => `σF = K·Ft / (${n(0.85, 2)}·b·mₘ·Y) , zv = ${n(Z4 / Math.cos(DELTA4), 1)}`),
          r.sF4,
          CH.sFlim,
          REQUIRED.bending,
        ),
        check(
          L(`Контакт, конично стъпало (${CH.name.bg})`, `Contact, bevel stage (${CH.name.en})`),
          LL((n) => `σH = ZE·ZH·Zε·√(K·Ft·√(u²+1) / (${n(0.85, 2)}·b·dₘ₁·u))`),
          r.sH34,
          CH.sHlim,
          REQUIRED.contact,
        ),
        check(
          L(`Смачкване на шпонка ${KEY2.b}×${KEY2.h}×${KEY2.L} (колело z₂)`, `Key ${KEY2.b}×${KEY2.h}×${KEY2.L} crushing (gear z₂)`),
          L('σсм = 2·KA·M₂ / (d·(h − t₁)·l)', 'σc = 2·KA·M₂ / (d·(h − t₁)·l)'),
          r.keys.key2,
          MATERIALS.key.sCrAllow,
          REQUIRED.key,
        ),
        check(
          L(`Смачкване на шпонка ${KEY3.b}×${KEY3.h}×${KEY3.L} (колело z₄)`, `Key ${KEY3.b}×${KEY3.h}×${KEY3.L} crushing (gear z₄)`),
          L('σсм = 2·KA·M₃ / (d·(h − t₁)·l)', 'σc = 2·KA·M₃ / (d·(h − t₁)·l)'),
          r.keys.key3,
          MATERIALS.key.sCrAllow,
          REQUIRED.key,
        ),
        check(
          L(
            `Смачкване на шпонка ${KEY_OUT.b}×${KEY_OUT.h}×${KEY_OUT.L} (изходящ край)`,
            `Key ${KEY_OUT.b}×${KEY_OUT.h}×${KEY_OUT.L} crushing (output end)`,
          ),
          L('σсм = 2·KA·M₃ / (d·(h − t₁)·l)', 'σc = 2·KA·M₃ / (d·(h − t₁)·l)'),
          r.keys.out,
          MATERIALS.key.sCrAllow,
          REQUIRED.key,
        ),
      ];
      const shaftName = [L('Вал 1', 'Shaft 1'), L('Вал 2', 'Shaft 2'), L('Вал 3', 'Shaft 3')];
      (['s1', 's2', 's3'] as const).forEach((id, i) => {
        const c = r.shafts[id].crit;
        checks.push(
          check(
            LL((n, en) =>
              en
                ? `${shaftName[i].en} – bending + torsion, ø${c.d} at z = ${n(c.s)} mm`
                : `${shaftName[i].bg} – огъване + усукване, ø${c.d} при z = ${n(c.s)} mm`,
            ),
            LL((n) => `σeq = KA·32·√(M² + ${n(0.75, 2)}·T²) / (π·d³) , M = ${n(c.M / 1000, 1)}, T = ${n(c.T / 1000, 1)} N·m`),
            inputs.KA * c.sEq,
            MATERIALS.shaft.sAllow,
            REQUIRED.shaft,
            i === 0
              ? L(
                  'Най-натовареното сечение се търси по целия вал (z е по оста на вала). Концентрацията на напрежения при стъпалата и каналите не е отчетена – затова допустимото е ниско.',
                  'The worst section is searched along the whole shaft (z runs along the shaft axis). Stress concentration at steps and keyways is not included – hence the low allowable stress.',
                )
              : undefined,
          ),
        );
      });

      // ----- warnings
      const warnings: LabWarning[] = [];
      const failed = checks.filter((c) => c.safety < c.required);
      if (failed.length === 0) {
        warnings.push({ level: 'ok', text: L('Всички проверки минават при тези мощност и обороти.', 'All checks pass at this power and speed.') });
      } else {
        for (const c of failed) {
          warnings.push({
            level: 'error',
            text: LL((n, en) => `${en ? c.label.en : c.label.bg}: S = ${n(c.safety, 2)} < ${n(c.required, 1)}.`),
          });
        }
        warnings.push({
          level: 'info',
          text: L(
            'Как да се поправи: по-слаб двигател, по-високи обороти при същата мощност (по-малък момент), по-голям модул или ширина, по-дълга шпонка.',
            'How to fix it: a smaller motor, a higher speed at the same power (less torque), a larger module or face width, a longer key.',
          ),
        });
      }
      const bearings = (['s1', 's2', 's3'] as const).flatMap((id) => [r.shafts[id].A, r.shafts[id].B]);
      const minLife = Math.min(...bearings.map((b) => b.L10h));
      if (minLife < 10000) {
        warnings.push({
          level: 'warn',
          text: LL((n, en) =>
            en ? `The life of a bearing is below 10,000 h (${n(minLife)} h).` : `Ресурсът на лагер е под 10 000 h (${n(minLife)} h).`,
          ),
        });
      }
      const s2Axial = Math.abs(r.shafts.s2.axial);
      warnings.push({
        level: 'info',
        text: LL((n, en) =>
          en
            ? `On shaft 2 the axial force of the helical gear (${n(r.hel.Fa)} N) acts against that of the bevel pinion (${n(r.bev.Fa3)} N), so bearing B₂ takes only ${n(s2Axial)} N. That is why the hand of the helix is chosen together with the direction of rotation.`
            : `На вал 2 осовата сила на косозъбото колело (${n(r.hel.Fa)} N) е срещу тази на коничното (${n(r.bev.Fa3)} N) и лагер B₂ поема само ${n(s2Axial)} N. Затова посоката на наклона на зъбите се избира заедно с посоката на въртене.`,
        ),
      });

      // ----- 3D arrows
      const fN = (v: number): string => `${nb(v)} N`;
      const comp = (at: Vec3, v: Vec3, color: string, label: string): ForceArrow => ({ at, dir: v, magnitude: len(v), label, color, group: at === P_HEL ? 'hel' : 'bev' });
      const hp = r.hel.parts;
      const bp = r.bev.parts;
      const arrows: ForceArrow[] = [
        comp(P_HEL, mul(hp.t, -1), C_FT, `Ft₂ = ${fN(r.hel.Ft)}`),
        comp(P_HEL, mul(hp.r, -1), C_FR, `Fr₂ = ${fN(r.hel.Fr)}`),
        comp(P_HEL, mul(hp.a, -1), C_FA, `Fa₂ = ${fN(r.hel.Fa)}`),
        comp(P_HEL, hp.t, C_FT, 'Ft₁'),
        comp(P_HEL, hp.r, C_FR, 'Fr₁'),
        comp(P_HEL, hp.a, C_FA, 'Fa₁'),
        comp(P_BEV, mul(bp.t, -1), C_FT, `Ft₄ = ${fN(r.bev.Ft)}`),
        comp(P_BEV, mul(bp.r, -1), C_FA, `Fa₄ = ${fN(r.bev.Fr3)}`),
        comp(P_BEV, mul(bp.a, -1), C_FR, `Fr₄ = ${fN(r.bev.Fa3)}`),
        comp(P_BEV, bp.t, C_FT, 'Ft₃'),
        comp(P_BEV, bp.r, C_FR, `Fr₃`),
        comp(P_BEV, bp.a, C_FA, `Fa₃`),
      ];
      SHAFTS.forEach((sh, i) => {
        const res = r.shafts[sh.id];
        for (const key of ['A', 'B'] as const) {
          const b = res[key];
          const D = sh[key].brg.D;
          const at = along(sh, b.s);
          arrows.push({ at, dir: b.R, magnitude: b.Fr, label: `R${key}${SUB[i + 1]} = ${fN(b.Fr)}`, color: C_R, mode: 'to', gap: D / 2 + 1, labelAt: 0.45, group: 'brg' });
          if (b.Fa > 0) {
            const top = add(at, [0, D / 2 + 5, 0]);
            arrows.push({ at: top, dir: mul(sh.u, Math.sign(res.axial)), magnitude: b.Fa, label: `Fa,${key}${SUB[i + 1]} = ${fN(b.Fa)}`, color: C_R, mode: 'to', gap: sh[key].brg.B / 2 + 1, labelAt: 0.3, group: 'brg' });
          }
        }
      });

      // ----- values
      const s = r.shafts;
      const rows: LabValue[] = [
        { label: L('Моменти M₁ / M₂ / M₃', 'Torques M₁ / M₂ / M₃'), value: `${nb(r.M1 / 1000, 1)} / ${nb(r.M2 / 1000, 1)} / ${nb(r.M3 / 1000, 1)} N·m` },
        { label: L('Обороти n₁ / n₂ / n₃', 'Speeds n₁ / n₂ / n₃'), value: `${nb(inputRpm)} / ${nb(Math.abs(r.n2))} / ${nb(r.n3)} min⁻¹` },
        { label: L('Косозъбо: Ft / Fr / Fa', 'Helical: Ft / Fr / Fa'), value: `${nb(r.hel.Ft)} / ${nb(r.hel.Fr)} / ${nb(r.hel.Fa)} N` },
        { label: L('Ft = 2M₁/d₁, Fr = Ft·tg αt, Fa = Ft·tg β', 'Ft = 2M₁/d₁, Fr = Ft·tan αt, Fa = Ft·tan β'), value: `εα = ${nb(r.epsA1, 2)}, εβ = ${nb(r.epsB1, 2)}` },
        { label: L('Конично: Ft / Fr₃ / Fa₃', 'Bevel: Ft / Fr₃ / Fa₃'), value: `${nb(r.bev.Ft)} / ${nb(r.bev.Fr3)} / ${nb(r.bev.Fa3)} N` },
        {
          label: L('Fr₃ = Ft·tg α·cos δ₃ = Fa₄, Fa₃ = Ft·tg α·sin δ₃ = Fr₄', 'Fr₃ = Ft·tan α·cos δ₃ = Fa₄, Fa₃ = Ft·tan α·sin δ₃ = Fr₄'),
          value: `dₘ₁ = ${nb(DM3, 1)} mm, mₘ = ${nb(MM, 2)} mm`,
        },
        { label: L('Скорост v / Kv: стъпало 1, 2', 'Speed v / Kv: stage 1, 2'), value: `${nb(r.hel.v, 2)} / ${nb(r.hel.Kv, 2)}, ${nb(r.bev.v, 2)} / ${nb(r.bev.Kv, 2)}` },
        ...(['s1', 's2', 's3'] as const).map((id, i) => ({
          label: LL((_n, en) => (en ? `Shaft ${i + 1}: RA${SUB[i + 1]} / RB${SUB[i + 1]} / axial` : `Вал ${i + 1}: RA${SUB[i + 1]} / RB${SUB[i + 1]} / осова`)),
          value: `${nb(s[id].A.Fr)} / ${nb(s[id].B.Fr)} / ${nb(Math.abs(s[id].axial))} N`,
        })),
        ...(['s1', 's2', 's3'] as const).map((id, i) => ({
          label: LL((_n, en) => `${en ? 'Life L10h, shaft' : 'Ресурс L10h, вал'} ${i + 1} (${s[id].A.code} / ${s[id].B.code})`),
          value: `${life(s[id].A.L10h)} / ${life(s[id].B.L10h)} h`,
        })),
        { label: L('η = η₁·η₂', 'η = η₁·η₂'), value: `${nb(ETA1, 2)} · ${nb(ETA2, 2)} = ${nb(ETA1 * ETA2, 3)}` },
      ];
      return { values: rows, checks, arrows, warnings };
    },
  };
}
