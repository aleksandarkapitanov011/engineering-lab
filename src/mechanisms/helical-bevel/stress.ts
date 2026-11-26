/**
 * Stress map of the helical-bevel gearbox.
 *
 *  - Teeth: 2D finite element model of the VIRTUAL spur gear of each stage (as in ISO 6336 / ISO 10300):
 *    a helical gear is replaced by the spur gear in its normal section, zᵥ = z/cos³β, module mₙ; a bevel
 *    gear by the spur gear on its back cone at the mean cone distance, zᵥ = z/cos δ, module mₘ. Loaded at
 *    the highest point of single tooth contact; the result is mapped onto the 3D tooth in mesh.
 *  - Shafts: beam theory from the 3D statics of forces.ts (bending moment vector + torque along the
 *    shaft), with stress concentration at the shoulders and keyways.
 *  - Bearings: Stribeck load distribution + Hertz contact; keys: crushing stress.
 * Units: N, mm, MPa.
 */
import * as THREE from 'three';
import type { LabValue, LabWarning, LText, StrengthCheck, StressDef, StressField, StressPlot, StressResult, Vec3 } from '../../core/types';
import { lineOfAction } from '../../core/involute';
import { lt } from '../../i18n';
import { ballContactPressure, buildToothModel, sampleTooth, toothPlot, type ToothModel } from '../spur-gear/stress';
import { computeGearbox, MM, MOTOR_KW, SHAFTS, type ShaftDef, type ShaftResult } from './forces';
import {
  B1,
  B2,
  BB,
  BETA,
  D1,
  D2,
  DELTA3,
  DELTA4,
  GEAR2_BODY,
  MN,
  RE,
  SHAFT1,
  SHAFT1_KEYWAY,
  SHAFT2,
  SHAFT2_KEYWAY,
  SHAFT3,
  SHAFT3_KEYWAY,
  SHAFT3_OUT_KEYWAY,
  STAGE1_Z,
  Z1,
  Z2,
  Z3,
  Z4,
} from './params';

export const ALLOWABLE = {
  caseTooth: 650, // 18CrNiMo7-6 case-hardened: σFE ≈ 1000 MPa, safety 1.5 (root stress incl. concentration)
  nitrTooth: 560, // 42CrMo4 nitrided: σFE ≈ 840 MPa
  shaft: 160, // alloy steel, endurance limit ≈ 350 MPa with a safety of ≈ 2.2 (concentration included in σ)
  key: 100,
  bearing: 4200, // ISO 76: permissible static contact stress for ball bearings
};

const L = (bg: string, en: string): LText => ({ bg, en });
const nb = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const A20 = (20 * Math.PI) / 180;

// ------------------------------------------------------------------ virtual gears
const ZV1 = Z1 / Math.cos(BETA) ** 3;
const ZV2 = Z2 / Math.cos(BETA) ** 3;
const ZV3 = Z3 / Math.cos(DELTA3);
const ZV4 = Z4 / Math.cos(DELTA4);
const RM = RE - BB / 2;
export const VIRTUAL = { ZV1, ZV2, ZV3, ZV4 };

/** Load radii at the highest point of single tooth contact (HPSTC) of a virtual pair. */
function hpstc(m: number, z1: number, z2: number): [number, number] {
  const loa = lineOfAction(m, z1, z2, 20, 0, 0);
  const pb = Math.PI * m * Math.cos(A20);
  const s1 = Math.min(loa.sE, Math.max(loa.sA, loa.sA + pb));
  const s2 = Math.min(loa.sE, Math.max(loa.sA, loa.sE - pb));
  const rb1 = (m * z1 * Math.cos(A20)) / 2;
  const rb2 = (m * z2 * Math.cos(A20)) / 2;
  return [Math.hypot(rb1, s1), Math.hypot(rb2, loa.L - s2)];
}

interface Models {
  t1: ToothModel;
  t2: ToothModel;
  t3: ToothModel;
  t4: ToothModel;
}
let models: Models | null = null;
/** The four tooth models are solved once (they depend only on the geometry; stress scales with the load). */
export function toothModels(): Models {
  if (models) return models;
  const bH = Math.min(B1, B2);
  const bB = 0.85 * BB; // the usual 0.85 for the lower load capacity of straight bevel gears
  const [r1, r2] = hpstc(MN, ZV1, ZV2);
  const [r3, r4] = hpstc(MM, ZV3, ZV4);
  models = {
    t1: buildToothModel(MN, ZV1, 0, bH, r1),
    t2: buildToothModel(MN, ZV2, 0, bH, r2),
    t3: buildToothModel(MM, ZV3, 0, bB, r3),
    t4: buildToothModel(MM, ZV4, 0, bB, r4),
  };
  return models;
}

/** Centre angle (axis frame) of the tooth closest to `target`. */
function loadedTooth(phase: number, z: number, target: number): number {
  const step = (2 * Math.PI) / z;
  return phase + Math.round(wrap(target - phase) / step) * step;
}

/**
 * Helical teeth: a point (axis frame, s along the axis) is turned back by the helix to the mid-plane and
 * mapped to the virtual gear in the normal section.
 */
function helicalTooth(tm: ToothModel, load: number, centre: number, twist: number, rpT: number, zv: number): (p: Vec3) => number | null {
  const rpV = (MN * zv) / 2;
  const cap = tm.rootMaxUnit * 1.15;
  return ([x, y, s]) => {
    const dth = wrap(Math.atan2(y, x) - centre - twist * (s - STAGE1_Z));
    const u = sampleTooth(tm, Math.hypot(x, y) - rpT + rpV, (dth * rpT * Math.cos(BETA)) / rpV);
    return u === null ? null : Math.min(u, cap) * load;
  };
}

/** Bevel teeth: a point is mapped to the back cone at its cone distance, then scaled to the mean section. */
function bevelTooth(tm: ToothModel, load: number, centre: number, delta: number, zv: number): (p: Vec3) => number | null {
  const rpV = (MM * zv) / 2;
  const cap = tm.rootMaxUnit * 1.15;
  const c = Math.cos(delta);
  const sn = Math.sin(delta);
  return ([x, y, s]) => {
    const r = Math.hypot(x, y);
    const R = s * c + r * sn; // along the pitch cone generator
    if (R < RE - BB - 0.5 || R > RE + 0.5) return null;
    const h = r * c - s * sn; // out of the pitch cone
    const k = RM / R;
    const dth = wrap(Math.atan2(y, x) - centre);
    const u = sampleTooth(tm, rpV + h * k, (dth * R * sn * k) / rpV);
    return u === null ? null : Math.min(u, cap) * load;
  };
}

// ------------------------------------------------------------------ shafts and bearings
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const axisQuat = (sh: ShaftDef): THREE.Quaternion => new THREE.Quaternion().setFromUnitVectors(Z_AXIS, new THREE.Vector3(...sh.u));

interface ShaftGeom {
  segs: [number, number, number][];
  keyways: { z0: number; z1: number }[];
}
const GEOM: Record<'s1' | 's2' | 's3', ShaftGeom> = {
  s1: { segs: SHAFT1, keyways: [SHAFT1_KEYWAY] },
  s2: { segs: SHAFT2, keyways: [SHAFT2_KEYWAY] },
  s3: { segs: SHAFT3, keyways: [SHAFT3_KEYWAY, SHAFT3_OUT_KEYWAY] },
};

function diameterAt(g: ShaftGeom, s: number): number {
  for (const [a, b, d] of g.segs) if (s >= a - 1e-6 && s <= b + 1e-6) return d;
  return g.segs[0][2];
}

/** Von Mises stress at a point of a shaft (axis frame), incl. stress concentration. `angle`: body angle. */
function shaftField(sh: ShaftDef, res: ShaftResult, angle: number, KA: number): (p: Vec3) => number {
  const g = GEOM[sh.id];
  const q = axisQuat(sh);
  const u = new THREE.Vector3(...sh.u);
  const steps = g.segs.slice(1).map(([a]) => a);
  const cache = new Map<number, { Mv: THREE.Vector3; T: number }>();
  const internal = (s: number): { Mv: THREE.Vector3; T: number } => {
    const key = Math.round(s * 4);
    let v = cache.get(key);
    if (!v) {
      const r = res.internal(key / 4);
      v = { Mv: new THREE.Vector3(...r.Mv), T: r.T };
      cache.set(key, v);
    }
    return v;
  };
  const rho = new THREE.Vector3();
  return ([x, y, s]) => {
    const d = diameterAt(g, s);
    const R = d / 2;
    const rr = Math.min(R, Math.hypot(x, y));
    const { Mv, T } = internal(s);
    rho.set(x, y, 0).setLength(rr).applyQuaternion(q);
    const I = (Math.PI * d ** 4) / 64;
    const sb = Math.abs(new THREE.Vector3().crossVectors(Mv, rho).dot(u)) / I;
    const tau = (T * rr) / (2 * I);
    let kb = 1;
    for (const st of steps) kb = Math.max(kb, 1 + 0.9 * Math.exp(-(((s - st) / 1.2) ** 2)));
    for (const k of g.keyways) {
      if (s >= k.z0 - 1 && s <= k.z1 + 1) kb = Math.max(kb, Math.abs(wrap(Math.atan2(y, x) - angle)) < 0.6 ? 2.0 : 1.3);
    }
    const kt = 1 + 0.7 * (kb - 1);
    return KA * Math.sqrt((sb * kb) ** 2 + 3 * (tau * kt) ** 2);
  };
}

/** Contact pressure in a bearing (axis frame): the load zone faces the force the shaft puts on it. */
function bearingField(sh: ShaftDef, Rworld: Vec3, brg: { d: number; D: number; n: number; ball: number }, sc: number, KA: number): (p: Vec3) => number {
  const Fr = Math.hypot(...Rworld);
  const dir = new THREE.Vector3(...Rworld).negate().applyQuaternion(axisQuat(sh).invert());
  const Qmax = (5 * Fr * KA) / brg.n; // Stribeck
  const dm = (brg.d + brg.D) / 2;
  const a0 = Math.atan2(dir.y, dir.x);
  return ([x, y, s]) => {
    if (Math.abs(s - sc) > 20 || Fr <= 0) return 0;
    const c = Math.cos(Math.atan2(y, x) - a0);
    if (c <= 0) return 0;
    const race = Math.hypot(x, y) > dm / 2 + 0.3 * brg.ball ? 'outer' : 'inner';
    return ballContactPressure(Qmax * c ** 1.5, brg.ball, dm, 0.52, race);
  };
}

/** Surface maximum of a field over a shaft (sampled). */
function shaftMax(sh: ShaftDef, f: (p: Vec3) => number): { s: number; v: number } {
  const g = GEOM[sh.id];
  let best = { s: g.segs[0][0], v: 0 };
  for (let s = g.segs[0][0] + 0.25; s < g.segs[g.segs.length - 1][1]; s += 0.5) {
    const r = diameterAt(g, s) / 2;
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const v = f([r * Math.cos(a), r * Math.sin(a), s]);
      if (v > best.v) best = { s, v };
    }
  }
  return best;
}

// ------------------------------------------------------------------ diagrams of M and T along the shafts
function shaftDiagrams(res: Record<'s1' | 's2' | 's3', ShaftResult>, KA: number): StressPlot {
  return {
    label: L('Огъващ момент M и въртящ момент T по валовете', 'Bending moment M and torque T along the shafts'),
    draw(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      const names = [L('Вал 1', 'Shaft 1'), L('Вал 2', 'Shaft 2'), L('Вал 3', 'Shaft 3')];
      const data = SHAFTS.map((sh) => {
        const g = GEOM[sh.id];
        const s0 = g.segs[0][0];
        const s1 = g.segs[g.segs.length - 1][1];
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 240; i++) {
          const s = s0 + ((s1 - s0) * i) / 240;
          const r = res[sh.id].internal(s);
          pts.push([s, (KA * r.M) / 1000, (KA * r.T) / 1000]);
        }
        return { sh, s0, s1, pts };
      });
      const top = Math.max(1e-6, ...data.flatMap((d) => d.pts.flatMap((p) => [p[1], p[2]])));
      const rowH = h / 3;
      const padL = 54;
      const padR = 12;
      ctx.font = '600 12px system-ui, sans-serif';
      data.forEach((d, i) => {
        const y0 = i * rowH + rowH - 16;
        const sx = (s: number): number => padL + ((s - d.s0) / (d.s1 - d.s0)) * (w - padL - padR);
        const sy = (v: number): number => y0 - (v / top) * (rowH - 30);
        // Shaft outline as a reference strip.
        ctx.fillStyle = 'rgba(154,166,178,0.25)';
        for (const [a, b, dd] of GEOM[d.sh.id].segs) ctx.fillRect(sx(a), y0 + 3, sx(b) - sx(a), Math.max(2, dd / 6));
        // Bending moment (filled), torque (line).
        ctx.beginPath();
        ctx.moveTo(sx(d.s0), y0);
        for (const [s, M] of d.pts) ctx.lineTo(sx(s), sy(M));
        ctx.lineTo(sx(d.s1), y0);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255,122,26,0.45)';
        ctx.fill();
        ctx.strokeStyle = '#ff7a1a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        d.pts.forEach(([s, , T], k) => (k ? ctx.lineTo(sx(s), sy(T)) : ctx.moveTo(sx(s), sy(T))));
        ctx.strokeStyle = '#3c9dff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(154,166,178,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, y0);
        ctx.lineTo(w - padR, y0);
        ctx.stroke();
        const Mmax = Math.max(...d.pts.map((p) => p[1]));
        const Tmax = Math.max(...d.pts.map((p) => p[2]));
        ctx.fillStyle = '#9aa6b2';
        ctx.fillText(lt(names[i]), 4, y0 - (rowH - 30) / 2);
        ctx.fillStyle = '#ff7a1a';
        ctx.fillText(`M ${nb(Mmax, 1)}`, 4, y0 - (rowH - 30) / 2 + 15);
        ctx.fillStyle = '#3c9dff';
        ctx.fillText(`T ${nb(Tmax, 1)}`, 4, y0 - (rowH - 30) / 2 + 30);
      });
      ctx.fillStyle = '#9aa6b2';
      ctx.fillText('N·m', w - 40, 12);
    },
  };
}

// ------------------------------------------------------------------ definition
export function createStress(): StressDef {
  return {
    title: L('Напрежения (FEM)', 'Stresses (FEM)'),
    intro: L(
      'Зъбите се смятат с метода на крайните елементи върху еквивалентните цилиндрични колела: за косозъбите – в нормалното сечение (zᵥ = z/cos³β), за коничните – на допълнителния конус (zᵥ = z/cos δ). Валовете – по теория на гредата от пространствената статика, с концентратори; лагерите – по Херц. Анимацията спира: това е статичен анализ.',
      'The teeth are solved with finite elements on the equivalent spur gears: helical ones in the normal section (zᵥ = z/cos³β), bevel ones on the back cone (zᵥ = z/cos δ). The shafts follow beam theory from the 3D statics, with stress concentration; the bearings Hertz. The animation stops: this is a static analysis.',
    ),
    params: [
      { id: 'P', label: L('Мощност на двигателя P', 'Motor power P'), kind: 'choice', options: MOTOR_KW, default: 0.37, format: (v) => `${nb(v, 2)} kW` },
      { id: 'KA', label: L('Коефициент на натоварване KA', 'Application factor KA'), kind: 'choice', options: [1, 1.25, 1.5, 1.75], default: 1.25, format: (v) => nb(v, 2) },
    ],
    evaluate(inputs, n1, angles): StressResult {
      if (n1 < 10) {
        return {
          fields: [],
          checks: [],
          plots: [],
          values: [],
          warnings: [{ level: 'warn', text: L('Задай входящи обороти n₁ > 0 с плъзгача на модела.', 'Set an input speed n₁ > 0 with the model slider.') }],
        };
      }
      const KA = inputs.KA;
      const r = computeGearbox({ P: inputs.P, n1, KA });
      const tm = toothModels();
      const epsB = (Math.min(B1, B2) * Math.sin(BETA)) / (Math.PI * MN);
      const Ybeta = 1 - (Math.min(epsB, 1) * ((BETA * 180) / Math.PI)) / 120;
      // Normal force in the normal section (helical) / on the back cone (bevel), with K = KA·Kv.
      const Fhel = (r.hel.K * r.hel.Ft * Ybeta) / (Math.cos(A20) * Math.cos(BETA));
      const Fbev = (r.bev.K * r.bev.Ft) / Math.cos(A20);
      const s1 = tm.t1.rootMaxUnit * Fhel;
      const s2 = tm.t2.rootMaxUnit * Fhel;
      const s3 = tm.t3.rootMaxUnit * Fbev;
      const s4 = tm.t4.rootMaxUnit * Fbev;

      const a1 = angles.s1 ?? 0;
      const a2 = angles.s2 ?? 0;
      const a3 = angles.s3 ?? 0;
      const tanB = Math.tan(BETA);
      // Teeth facing the mesh (axis frames): shaft 1 → π, gear z₂ → 0, bevel pinion → 0, gear z₄ → π.
      const t1 = helicalTooth(tm.t1, Fhel, loadedTooth(Math.PI + a1, Z1, Math.PI), tanB / (D1 / 2), D1 / 2, ZV1);
      const t2 = helicalTooth(tm.t2, Fhel, loadedTooth(Math.PI / Z2 + a2, Z2, 0), -tanB / (D2 / 2), D2 / 2, ZV2);
      const t3 = bevelTooth(tm.t3, Fbev, loadedTooth(a2, Z3, 0), DELTA3, ZV3);
      const t4 = bevelTooth(tm.t4, Fbev, loadedTooth(Math.PI + Math.PI / Z4 + a3, Z4, Math.PI), DELTA4, ZV4);

      const [sh1, sh2, sh3] = SHAFTS;
      const f1 = shaftField(sh1, r.shafts.s1, a1, KA);
      const f2 = shaftField(sh2, r.shafts.s2, a2, KA);
      const f3 = shaftField(sh3, r.shafts.s3, a3, KA);
      const m1 = shaftMax(sh1, f1);
      const m2 = shaftMax(sh2, f2);
      const m3 = shaftMax(sh3, f3);
      const bodyTorsion = (T: number, rr: number, b: number): number => (Math.sqrt(3) * KA * T) / (2 * Math.PI * rr * rr * b);

      const fields: StressField[] = [
        {
          partId: 'shaft1',
          allowable: ALLOWABLE.shaft,
          // Teeth cut on the shaft: the tooth field outside the core, the shaft field inside.
          stress: (p) => (p[2] > 70 && p[2] < 96 && Math.hypot(p[0], p[1]) > 13.2 ? (t1(p) ?? bodyTorsion(r.M1, 14, B1)) : f1(p)),
        },
        {
          partId: 'shaft2',
          allowable: ALLOWABLE.shaft,
          stress: (p) => (p[2] < 40 && Math.hypot(p[0], p[1]) > 11.1 ? (t3(p) ?? bodyTorsion(r.M2, 12, BB)) : f2(p)),
        },
        { partId: 'shaft3', allowable: ALLOWABLE.shaft, stress: f3 },
        {
          partId: 'gear2',
          allowable: ALLOWABLE.nitrTooth,
          stress: (p) => (Math.hypot(p[0], p[1]) > GEAR2_BODY.rimInner ? (t2(p) ?? bodyTorsion(r.M2, GEAR2_BODY.rimInner, B2)) : bodyTorsion(r.M2, Math.max(15, Math.hypot(p[0], p[1])), GEAR2_BODY.web)),
        },
        {
          partId: 'gear4',
          allowable: ALLOWABLE.caseTooth,
          stress: (p) => t4(p) ?? bodyTorsion(r.M3, Math.max(15, Math.hypot(p[0], p[1])), 10),
        },
        { partId: 'key2', allowable: ALLOWABLE.key, stress: () => r.keys.key2 },
        { partId: 'key3', allowable: ALLOWABLE.key, stress: () => r.keys.key3 },
      ];
      const brgIds: Record<string, [string, string]> = { s1: ['brg1A', 'brg1B'], s2: ['brg2A', 'brg2B'], s3: ['brg3A', 'brg3B'] };
      let pMax = 0;
      for (const sh of SHAFTS) {
        const res = r.shafts[sh.id];
        (['A', 'B'] as const).forEach((k, i) => {
          const f = bearingField(sh, res[k].R, sh[k].brg, sh[k].s, KA);
          const b = sh[k].brg;
          pMax = Math.max(pMax, ballContactPressure((5 * res[k].Fr * KA) / b.n, b.ball, (b.d + b.D) / 2));
          fields.push({ partId: brgIds[sh.id][i], allowable: ALLOWABLE.bearing, stress: f });
        });
      }

      const check = (label: LText, formula: string, stress: number, limit: number, note?: LText): StrengthCheck => ({
        label,
        formula,
        stress,
        limit,
        unit: 'MPa',
        safety: limit / stress,
        required: 1,
        note,
      });
      const ch = (s: number): string => nb(s, 0);
      const checks: StrengthCheck[] = [
        check(L(`Зъб z₁ = ${Z1} – FEM в корена`, `Tooth z₁ = ${Z1} – FEM at the root`), `zᵥ = ${nb(ZV1, 1)}, mₙ = ${MN}`, s1, ALLOWABLE.caseTooth),
        check(L(`Зъб z₂ = ${Z2} – FEM в корена`, `Tooth z₂ = ${Z2} – FEM at the root`), `zᵥ = ${nb(ZV2, 1)}, mₙ = ${MN}`, s2, ALLOWABLE.nitrTooth),
        check(L(`Зъб z₃ = ${Z3} (конично) – FEM`, `Tooth z₃ = ${Z3} (bevel) – FEM`), `zᵥ = ${nb(ZV3, 1)}, mₘ = ${nb(MM, 2)}`, s3, ALLOWABLE.caseTooth),
        check(L(`Зъб z₄ = ${Z4} (конично) – FEM`, `Tooth z₄ = ${Z4} (bevel) – FEM`), `zᵥ = ${nb(ZV4, 1)}, mₘ = ${nb(MM, 2)}`, s4, ALLOWABLE.caseTooth),
        check(L('Вал 1 – максимум с концентратори', 'Shaft 1 – maximum with concentration'), `z = ${nb(m1.s, 0)} mm`, m1.v, ALLOWABLE.shaft),
        check(L('Вал 2 – максимум с концентратори', 'Shaft 2 – maximum with concentration'), `z = ${nb(m2.s, 0)} mm`, m2.v, ALLOWABLE.shaft),
        check(L('Вал 3 – максимум с концентратори', 'Shaft 3 – maximum with concentration'), `z = ${nb(m3.s, 0)} mm`, m3.v, ALLOWABLE.shaft),
        check(
          L('Лагери – най-голямо контактно налягане', 'Bearings – highest contact pressure'),
          'p₀ (Hertz, Stribeck Qmax = 5Fr/Z)',
          pMax,
          ALLOWABLE.bearing,
          L('Статична граница по ISO 76 за сачмени лагери.', 'Static limit to ISO 76 for ball bearings.'),
        ),
      ];

      const warnings: LabWarning[] = [];
      const failed = checks.filter((c) => c.safety < 1);
      if (failed.length === 0) warnings.push({ level: 'ok', text: L('Всички елементи са под допустимите напрежения.', 'All parts are below the allowable stresses.') });
      else for (const c of failed) warnings.push({ level: 'error', text: { bg: `${c.label.bg}: ${ch(c.stress)} > ${ch(c.limit)} MPa`, en: `${c.label.en}: ${ch(c.stress)} > ${ch(c.limit)} MPa` } });
      warnings.push({
        level: 'info',
        text: L(
          'Най-натоварено е коничното стъпало: моментът там е 3 пъти по-голям, а модулът – само малко по-голям. Сравни огъващия момент на вал 2 – малкото конично колело стои конзолно.',
          'The bevel stage is the most loaded: the torque there is 3 times larger, but the module only a little larger. Compare the bending moment of shaft 2 – the bevel pinion is overhung.',
        ),
      });

      const values: LabValue[] = [
        { label: L('Еквивалентни колела zᵥ: z₁ / z₂ / z₃ / z₄', 'Virtual gears zᵥ: z₁ / z₂ / z₃ / z₄'), value: `${nb(ZV1, 1)} / ${nb(ZV2, 1)} / ${nb(ZV3, 1)} / ${nb(ZV4, 1)}` },
        { label: L('Сила върху зъба K·Fₙ: косозъбо / конично', 'Tooth force K·Fₙ: helical / bevel'), value: `${nb(Fhel)} / ${nb(Fbev)} N` },
        { label: L('FEM / Люис: z₁, z₂', 'FEM / Lewis: z₁, z₂'), value: `${ch(s1)} / ${ch(r.sF1)}, ${ch(s2)} / ${ch(r.sF2)} MPa` },
        { label: L('FEM / Люис: z₃, z₄', 'FEM / Lewis: z₃, z₄'), value: `${ch(s3)} / ${ch(r.sF3)}, ${ch(s4)} / ${ch(r.sF4)} MPa` },
        { label: L('FEM мрежа на зъб z₁: възли / елементи', 'FEM mesh of tooth z₁: nodes / elements'), value: `${tm.t1.mesh.x.length} / ${tm.t1.mesh.tri.length / 3}` },
        { label: L('Контактно налягане в лагерите, макс.', 'Bearing contact pressure, max.'), value: `${ch(pMax)} MPa` },
      ];
      const plots = [
        toothPlot(L(`Зъб z₁ = ${Z1} (zᵥ = ${nb(ZV1, 1)})`, `Tooth z₁ = ${Z1} (zᵥ = ${nb(ZV1, 1)})`), tm.t1, Fhel),
        toothPlot(L(`Зъб z₃ = ${Z3}, конично (zᵥ = ${nb(ZV3, 1)})`, `Tooth z₃ = ${Z3}, bevel (zᵥ = ${nb(ZV3, 1)})`), tm.t3, Fbev),
        shaftDiagrams(r.shafts, KA),
      ];
      return { fields, checks, plots, values, warnings };
    },
  };
}
