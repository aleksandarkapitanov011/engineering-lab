/**
 * Stress analysis of the spur gear drive.
 *
 *  - Teeth: real 2D finite element analysis (plane stress, CST) of one tooth + rim sector per gear,
 *    loaded with the normal force along the line of action at the highest point of single tooth
 *    contact (HPSTC, as in ISO 6336), fixed at the rim. Results are mapped onto the 3D tooth in mesh.
 *  - Shafts: beam theory (bending from the bearing reactions + torsion) with stress-concentration
 *    factors at the shoulders and the keyway, varying along the shaft and around it.
 *  - Keys: crushing stress. Bearings: Stribeck load distribution + Hertz elliptical contact
 *    (Hamrock–Brewe) on the inner raceway.
 * Units: N, mm, MPa.
 */
import type { LabWarning, StrengthCheck, StressDef, StressField, StressPlot, StressResult, Vec3 } from '../../core/types';
import { gearDims, inv, lineOfAction, matingPhase } from '../../core/involute';
import { solvePlaneStress, type FemResult, type Mesh2D } from '../../core/fem2d';
import { computeForces, lewisY } from './forces';
import type { Layout } from './layout';
import {
  ALPHA,
  B1,
  B2,
  BRG1,
  BRG1A_Z,
  BRG1B_Z,
  BRG2,
  BRG2A_Z,
  BRG2B_Z,


  SHAFT1_KEYWAY,
  SHAFT1_OFFSET,
  SHAFT1_SEGMENTS,
  SHAFT2_KEYWAY,
  SHAFT2_OFFSET,
  SHAFT2_SEGMENTS,
} from './params';

export const ALLOWABLE = {
  pinionTooth: 450, // 40Cr, induction hardened teeth: root stress incl. concentration
  gearTooth: 260, // C45 quenched & tempered
  shaft: 120, // C45: endurance limit ≈ 270 MPa with a safety of ≈ 2.2
  key: 100,
  bearing: 4200, // ISO 76: permissible static contact stress for ball bearings
};

const E_STEEL = 210000;
const NU = 0.3;

// ------------------------------------------------------------------ Tooth FE model

export interface ToothModel {
  mesh: Mesh2D;
  radii: number[];
  nc: number;
  span(r: number): number;
  rIn: number;
  rf: number;
  flankStart: number;
  ra: number;
  /** Load application radius and direction (tooth frame, tooth axis along +x). */
  rLoad: number;
  loadDir: [number, number];
  /** FEM result for a unit normal force (1 N). */
  unit: FemResult;
  /** Max nodal stress in the root region for a unit load. */
  rootMaxUnit: number;
  rootMaxNode: number;
  fixedNodes: number[];
  loadNodes: number[];
}

/** Builds and solves the 2D tooth model for a unit normal force at radius `rLoad`. */
export function buildToothModel(m: number, z: number, x: number, b: number, rLoad: number): ToothModel {
  const g = gearDims(m, z, ALPHA, x);
  const rp = g.d / 2;
  const rb = g.db / 2;
  const ra = g.da / 2;
  const rf = g.df / 2;
  const psiP = g.s / (2 * rp);
  const psi = (r: number): number => psiP + inv(g.alpha) - inv(Math.acos(Math.min(1, rb / Math.max(r, rb))));
  const half = (Math.PI / z) * 0.98;
  const rho = 0.38 * m; // root fillet radius of the standard rack
  const flankStart = Math.min(ra - 0.5 * m, Math.max(rf + rho, rb));
  const rIn = rf - 2.2 * m;
  const span = (r: number): number => {
    if (r <= rf) return half;
    if (r >= flankStart) return Math.min(half, psi(r));
    const s = (r - rf) / (flankStart - rf);
    const w = 1 - (1 - s) ** 2; // steep near the flank, flat near the root land: a concave fillet
    const top = Math.min(half, psi(flankStart));
    return top + (half - top) * (1 - w);
  };
  // Radial levels: rim, fillet (denser), flank.
  const radii: number[] = [];
  const pushRange = (a: number, bEnd: number, n: number, incl: boolean): void => {
    for (let i = 0; i < n; i++) radii.push(a + ((bEnd - a) * i) / n);
    if (incl) radii.push(bEnd);
  };
  pushRange(rIn, rf, 6, false);
  pushRange(rf, flankStart, 6, false);
  pushRange(flankStart, ra, 14, true);
  const nc = 16;
  const nr = radii.length;
  const x0 = new Float64Array(nr * (nc + 1));
  const y0 = new Float64Array(nr * (nc + 1));
  for (let i = 0; i < nr; i++) {
    const r = radii[i];
    const sp = span(r);
    for (let j = 0; j <= nc; j++) {
      const u = -1 + (2 * j) / nc;
      const th = u * sp;
      x0[i * (nc + 1) + j] = r * Math.cos(th);
      y0[i * (nc + 1) + j] = r * Math.sin(th);
    }
  }
  const tri = new Int32Array((nr - 1) * nc * 6);
  let k = 0;
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < nc; j++) {
      const n0 = i * (nc + 1) + j;
      const n1 = n0 + 1;
      const n2 = n0 + nc + 1;
      const n3 = n2 + 1;
      if ((i + j) % 2 === 0) tri.set([n0, n1, n3, n0, n3, n2], k);
      else tri.set([n0, n1, n2, n1, n3, n2], k);
      k += 6;
    }
  }
  const mesh: Mesh2D = { x: x0, y: y0, tri };

  // Boundary: rim fixed at the inner radius; sector sides of the rim held by the neighbouring teeth.
  const fixedNodes: number[] = [];
  for (let j = 0; j <= nc; j++) fixedNodes.push(j);
  for (let i = 1; i < nr; i++) {
    if (radii[i] < rf - 1e-9) fixedNodes.push(i * (nc + 1), i * (nc + 1) + nc);
  }
  const fixedDofs = fixedNodes.flatMap((n) => [2 * n, 2 * n + 1]);

  // Load: unit normal force on the +θ flank at rLoad, along the line of action (pressing into the tooth).
  const rL = Math.min(ra - 0.05 * m, Math.max(flankStart, rLoad));
  const t = Math.sqrt(Math.max(0, (rL / rb) ** 2 - 1));
  const uT = psiP + inv(g.alpha) - t;
  const loadDir: [number, number] = [Math.sin(uT), -Math.cos(uT)];
  const load = new Float64Array(nr * (nc + 1) * 2);
  let iL = 0;
  while (iL < nr - 2 && radii[iL + 1] < rL) iL++;
  const f = Math.min(1, Math.max(0, (rL - radii[iL]) / (radii[iL + 1] - radii[iL])));
  const nA = iL * (nc + 1) + nc;
  const nB = (iL + 1) * (nc + 1) + nc;
  load[2 * nA] += loadDir[0] * (1 - f);
  load[2 * nA + 1] += loadDir[1] * (1 - f);
  load[2 * nB] += loadDir[0] * f;
  load[2 * nB + 1] += loadDir[1] * f;

  const unit = solvePlaneStress(mesh, { E: E_STEEL, nu: NU, t: b }, fixedDofs, load);

  // Root region: the fillet, excluding the neighbourhood of the load point (a point force gives a
  // local singularity in FEM that says nothing about the root bending stress).
  const rootTop = flankStart + 0.25 * m;
  const lx = (x0[nA] + x0[nB]) / 2;
  const ly = (y0[nA] + y0[nB]) / 2;
  let rootMaxUnit = 0;
  let rootMaxNode = 0;
  for (let i = 0; i < nr; i++) {
    if (radii[i] < rf - 0.2 * m || radii[i] > rootTop) continue;
    for (let j = 0; j <= nc; j++) {
      const n = i * (nc + 1) + j;
      if (Math.hypot(x0[n] - lx, y0[n] - ly) < 1.2 * m) continue;
      if (unit.nodalVm[n] > rootMaxUnit) {
        rootMaxUnit = unit.nodalVm[n];
        rootMaxNode = n;
      }
    }
  }
  return { mesh, radii, nc, span, rIn, rf, flankStart, ra, rLoad: rL, loadDir, unit, rootMaxUnit, rootMaxNode, fixedNodes, loadNodes: [nA, nB] };
}

/** Nodal von Mises stress (unit load) at polar position (r, Δθ) of the tooth frame, bilinear. */
export function sampleTooth(tm: ToothModel, r: number, dth: number): number {
  const R = tm.radii;
  const nr = R.length;
  const rc = Math.min(R[nr - 1], Math.max(R[0], r));
  let i = 0;
  while (i < nr - 2 && R[i + 1] < rc) i++;
  const fr = Math.min(1, Math.max(0, (rc - R[i]) / (R[i + 1] - R[i])));
  const u = Math.min(1, Math.max(-1, dth / tm.span(rc)));
  const jf = ((u + 1) / 2) * tm.nc;
  const j = Math.min(tm.nc - 1, Math.floor(jf));
  const fj = jf - j;
  const v = tm.unit.nodalVm;
  const w = tm.nc + 1;
  const a = v[i * w + j] * (1 - fj) + v[i * w + j + 1] * fj;
  const c = v[(i + 1) * w + j] * (1 - fj) + v[(i + 1) * w + j + 1] * fj;
  return a * (1 - fr) + c * fr;
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Centre angle (body frame) of the tooth closest to `target`. */
function loadedToothCentre(phase: number, z: number, target: number): number {
  const step = (2 * Math.PI) / z;
  const k = Math.round(wrap(target - phase) / step);
  return phase + k * step;
}

// ------------------------------------------------------------------ Shafts

interface ShaftSpec {
  segs: { z0: number; z1: number; r: number }[];
  zA: number;
  zB: number;
  RA: number;
  RB: number;
  /** Unit direction of the gear force acting on this shaft (body frame). */
  dir: [number, number];
  torque(z: number): number;
  shoulders: number[];
  keyway: { z0: number; z1: number };
}

function shaftRadius(s: ShaftSpec, z: number): number {
  for (const seg of s.segs) if (z >= seg.z0 - 1e-6 && z <= seg.z1 + 1e-6) return seg.r;
  return s.segs[0].r;
}

function shaftStress(s: ShaftSpec, p: Vec3, keyAngle: number): number {
  const [x, y, z] = p;
  const r = shaftRadius(s, z);
  const rho = Math.min(r, Math.hypot(x, y));
  const d = 2 * r;
  let M = 0;
  if (z >= s.zA && z <= 0) M = s.RA * (z - s.zA);
  else if (z > 0 && z <= s.zB) M = s.RB * (s.zB - z);
  const I = (Math.PI * d ** 4) / 64;
  const J = 2 * I;
  // Tension on the side the load points to.
  const along = rho > 1e-6 ? (x * s.dir[0] + y * s.dir[1]) / Math.hypot(x, y) : 0;
  let sb = (M * rho * along) / I;
  let tau = (s.torque(z) * rho) / J;
  // Stress concentration: shoulder fillets and the keyway.
  let kb = 1;
  for (const zs of s.shoulders) kb = Math.max(kb, 1 + 1.0 * Math.exp(-(((z - zs) / 1.2) ** 2)));
  if (z >= s.keyway.z0 - 1 && z <= s.keyway.z1 + 1) {
    const dAng = Math.abs(wrap(Math.atan2(y, x) - keyAngle));
    kb = Math.max(kb, dAng < 0.6 ? 2.0 : 1.3);
  }
  const kt = 1 + 0.7 * (kb - 1);
  sb *= kb;
  tau *= kt;
  return Math.sqrt(sb * sb + 3 * tau * tau);
}

// ------------------------------------------------------------------ Bearings (Hamrock–Brewe)

/** Max contact pressure (MPa) of a ball on the inner raceway for ball load Q (N). */
export function ballContactPressure(Q: number, Dw: number, dm: number, conformity = 0.52): number {
  if (Q <= 0) return 0;
  const Rx = 1 / (2 / Dw + 2 / (dm - Dw));
  const Ry = 1 / (2 / Dw - 1 / (conformity * Dw));
  const Ep = E_STEEL / (1 - NU * NU);
  const kk = 1.0339 * (Ry / Rx) ** 0.636;
  const Ek = 1.0003 + (0.5968 * Rx) / Ry;
  const Rp = 1 / (1 / Rx + 1 / Ry);
  const Dy = 2 * ((6 * kk * kk * Ek * Q * Rp) / (Math.PI * Ep)) ** (1 / 3);
  const Dx = 2 * ((6 * Ek * Q * Rp) / (Math.PI * kk * Ep)) ** (1 / 3);
  return (6 * Q) / (Math.PI * Dx * Dy);
}

function bearingField(R: number, brg: { d: number; D: number; n: number; ball: number }, dir: [number, number], zc: number): (p: Vec3) => number {
  const Qmax = (5 * R) / brg.n; // Stribeck
  const dm = (brg.d + brg.D) / 2;
  return ([x, y, z]) => {
    if (Math.abs(z - zc) > 20) return 0;
    const ang = Math.atan2(y, x) - Math.atan2(dir[1], dir[0]);
    const c = Math.cos(ang);
    if (c <= 0) return 0;
    return ballContactPressure(Qmax * c ** 1.5, brg.ball, dm);
  };
}

// ------------------------------------------------------------------ Plot of the tooth FE mesh

function toothPlot(label: string, tm: ToothModel, scale: number): StressPlot {
  return {
    label: { bg: label },
    draw(ctx, w, h, colour) {
      const { x, y, tri } = tm.mesh;
      // Tooth pointing up: screen X = −y, screen Y = −x.
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < x.length; i++) {
        minX = Math.min(minX, -y[i]);
        maxX = Math.max(maxX, -y[i]);
        minY = Math.min(minY, -x[i]);
        maxY = Math.max(maxY, -x[i]);
      }
      const pad = 26;
      const s = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxY - minY));
      const ox = (w - (maxX - minX) * s) / 2 - minX * s;
      const oy = (h - (maxY - minY) * s) / 2 - minY * s;
      const P = (n: number): [number, number] => [ox + -y[n] * s, oy + -x[n] * s];
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 0.6;
      // Own scale: red slightly above the root maximum, so the gradient in the tooth is visible
      // (the elements under the point load saturate, as expected).
      const top = tm.rootMaxUnit * 1.15;
      for (let e = 0; e < tri.length / 3; e++) {
        const [a, b, c] = [tri[3 * e], tri[3 * e + 1], tri[3 * e + 2]];
        ctx.beginPath();
        ctx.moveTo(...P(a));
        ctx.lineTo(...P(b));
        ctx.lineTo(...P(c));
        ctx.closePath();
        ctx.fillStyle = colour(Math.min(1, tm.unit.vm[e] / top));
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.stroke();
      }
      // Fixed boundary marks.
      ctx.fillStyle = '#9aa6b2';
      for (const n of tm.fixedNodes) {
        const [px, py] = P(n);
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      // Load arrow (pointing along the force, ending at the flank).
      const [lx, ly] = P(tm.loadNodes[0]);
      const dx = -tm.loadDir[1];
      const dy = -tm.loadDir[0];
      const len = 46;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lx - dx * len, ly - dy * len);
      ctx.lineTo(lx - dx * 6, ly - dy * 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - dx * 11 - dy * 5, ly - dy * 11 + dx * 5);
      ctx.lineTo(lx - dx * 11 + dy * 5, ly - dy * 11 - dx * 5);
      ctx.closePath();
      ctx.fill();
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText('Fₙ', lx - dx * len - 8, ly - dy * len - 6);
      // Max root stress marker.
      const [mx, my] = P(tm.rootMaxNode);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(`σmax = ${Math.round(tm.rootMaxUnit * scale)} MPa`, Math.min(w - 120, mx + 10), my + 4);
    },
  };
}

// ------------------------------------------------------------------ Definition

export function createStress(L: Layout): StressDef {
  const { m, z1, z2, x1 } = L.cfg;
  const loa = lineOfAction(m, z1, z2, ALPHA, x1, 0);
  const pb = Math.PI * m * Math.cos(loa.alpha);
  // Highest point of single tooth contact, as a distance along the line of action from N1.
  const s1 = Math.min(loa.sE, Math.max(loa.sA, loa.sA + pb));
  const s2 = Math.min(loa.sE, Math.max(loa.sA, loa.sE - pb));
  const rb1 = L.g1.db / 2;
  const rb2 = L.g2.db / 2;
  const rL1 = Math.hypot(rb1, s1);
  const rL2 = Math.hypot(rb2, loa.L - s2);
  const b = Math.min(B1, B2);
  let models: { p: ToothModel; g: ToothModel } | null = null;
  const getModels = (): { p: ToothModel; g: ToothModel } => {
    if (!models) models = { p: buildToothModel(m, z1, x1, b, rL1), g: buildToothModel(m, z2, -x1, b, rL2) };
    return models;
  };
  const bg = (s: string): { bg: string } => ({ bg: s });
  const nf = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });

  return {
    title: bg('Напрежения (FEM)'),
    intro: bg(
      'Зъбите се изчисляват с метода на крайните елементи (2D, равнинно напрегнато състояние) при натоварване в най-високата точка на единичен контакт. Валовете – по теория на гредата с концентратори, лагерите – по Херц. Анимацията спира: това е статичен анализ.',
    ),
    params: [
      { id: 'P', label: bg('Мощност P'), kind: 'range', min: 0.1, max: 10, step: 0.05, default: 2, format: (v) => `${nf(v, 2)} kW` },
      { id: 'KA', label: bg('Коефициент на натоварване KA'), kind: 'choice', options: [1, 1.25, 1.5, 1.75], default: 1.25, format: (v) => nf(v, 2) },
    ],
    evaluate(inputs, n1, angles): StressResult {
      const warnings: LabWarning[] = [];
      if (n1 < 10) {
        return {
          fields: [],
          checks: [],
          plots: [],
          values: [],
          warnings: [{ level: 'warn', text: bg('Задай входящи обороти n₁ > 0 с плъзгача на модела.') }],
        };
      }
      const F = computeForces(L, { P: inputs.P, n1, KA: inputs.KA });
      const { p: tp, g: tg } = getModels();
      const Fdesign = F.K * F.Fn; // dynamic normal force on the tooth
      const sPin = tp.rootMaxUnit * Fdesign;
      const sGear = tg.rootMaxUnit * Fdesign;

      const a1 = angles.s1 ?? 0;
      const a2 = angles.s2 ?? 0;
      const c1 = loadedToothCentre(a1, z1, 0);
      const c2 = loadedToothCentre(a2 + matingPhase(z2), z2, Math.PI);
      const toothField = (tm: ToothModel, centre: number, z: number, hubTorque: number, hubR: number) =>
        (p: Vec3): number => {
          const r = Math.hypot(p[0], p[1]);
          const d = wrap(Math.atan2(p[1], p[0]) - centre);
          if (Math.abs(d) <= Math.PI / z && r >= tm.rIn) return sampleTooth(tm, r, d) * Fdesign;
          // Away from the loaded tooth: only the torsion of the body (small).
          return (2 * hubTorque) / (Math.PI * Math.max(hubR, 5) ** 2 * b);
        };

      const fDir1: [number, number] = [-F.Fr / F.Fn, -F.Ft / F.Fn]; // force of the gear on the pinion
      const fDir2: [number, number] = [F.Fr / F.Fn, F.Ft / F.Fn];
      const seg = (s: readonly { z0: number; z1: number; d: number }[], off: number) => s.map((q) => ({ z0: q.z0 - off, z1: q.z1 - off, r: q.d / 2 }));
      const ramp = (z: number, half: number): number => Math.min(1, Math.max(0, (half - z) / (2 * half)));
      const shaft1: ShaftSpec = {
        segs: seg(SHAFT1_SEGMENTS, SHAFT1_OFFSET),
        zA: BRG1A_Z,
        zB: BRG1B_Z,
        RA: F.RA1,
        RB: F.RB1,
        dir: fDir1,
        torque: (z) => F.M1 * ramp(z, B1 / 2), // input coupling on the −z end
        shoulders: [58 - SHAFT1_OFFSET, 64 - SHAFT1_OFFSET],
        keyway: { z0: SHAFT1_KEYWAY.z0 - SHAFT1_OFFSET, z1: SHAFT1_KEYWAY.z1 - SHAFT1_OFFSET },
      };
      const shaft2: ShaftSpec = {
        segs: seg(SHAFT2_SEGMENTS, SHAFT2_OFFSET),
        zA: BRG2A_Z,
        zB: BRG2B_Z,
        RA: F.RA2,
        RB: F.RB2,
        dir: fDir2,
        torque: (z) => F.M2 * (1 - ramp(z, B2 / 2)), // output on the +z end
        shoulders: [36 - SHAFT2_OFFSET, 42 - SHAFT2_OFFSET],
        keyway: { z0: SHAFT2_KEYWAY.z0 - SHAFT2_OFFSET, z1: SHAFT2_KEYWAY.z1 - SHAFT2_OFFSET },
      };
      // Max shaft stress (sampled on the surface).
      const shaftMax = (s: ShaftSpec, keyAngle: number): number => {
        let mx = 0;
        for (let z = s.segs[0].z0; z <= s.segs[s.segs.length - 1].z1; z += 0.5) {
          const r = shaftRadius(s, z);
          for (let k = 0; k < 24; k++) {
            const a = (k / 24) * Math.PI * 2;
            mx = Math.max(mx, shaftStress(s, [r * Math.cos(a), r * Math.sin(a), z], keyAngle));
          }
        }
        return mx;
      };
      const sShaft1 = shaftMax(shaft1, a1);
      const sShaft2 = shaftMax(shaft2, a2);
      const pB = (R: number, brg: typeof BRG1): number => ballContactPressure((5 * R) / brg.n, brg.ball, (brg.d + brg.D) / 2);

      const fields: StressField[] = [
        { partId: 'pinion', allowable: ALLOWABLE.pinionTooth, stress: toothField(tp, c1, z1, F.M1, L.g1.df / 2 - 2.2 * m) },
        { partId: 'gear2', allowable: ALLOWABLE.gearTooth, stress: toothField(tg, c2, z2, F.M2, 20) },
        { partId: 'shaft1', allowable: ALLOWABLE.shaft, stress: (p) => shaftStress(shaft1, p, a1) },
        { partId: 'shaft2', allowable: ALLOWABLE.shaft, stress: (p) => shaftStress(shaft2, p, a2) },
        { partId: 'brg1A', allowable: ALLOWABLE.bearing, stress: bearingField(F.RA1, BRG1, fDir1, BRG1A_Z) },
        { partId: 'brg1B', allowable: ALLOWABLE.bearing, stress: bearingField(F.RB1, BRG1, fDir1, BRG1B_Z) },
        { partId: 'brg2A', allowable: ALLOWABLE.bearing, stress: bearingField(F.RA2, BRG2, fDir2, BRG2A_Z) },
        { partId: 'brg2B', allowable: ALLOWABLE.bearing, stress: bearingField(F.RB2, BRG2, fDir2, BRG2B_Z) },
      ];
      if (F.sCr1 !== null) fields.push({ partId: 'key1', allowable: ALLOWABLE.key, stress: () => F.sCr1! });
      if (F.sCr2 !== null) fields.push({ partId: 'key2', allowable: ALLOWABLE.key, stress: () => F.sCr2! });

      const check = (label: string, formula: string, stress: number, limit: number): StrengthCheck => ({
        label: bg(label),
        formula,
        stress,
        limit,
        unit: 'MPa',
        safety: limit / stress,
        required: 1,
      });
      const checks: StrengthCheck[] = [
        check(`Зъб z₁ – основа (FEM, ${tp.mesh.tri.length / 3} елемента)`, 'σvM при Fₙ·K в HPSTC', sPin, ALLOWABLE.pinionTooth),
        check(`Зъб z₂ – основа (FEM, ${tg.mesh.tri.length / 3} елемента)`, 'σvM при Fₙ·K в HPSTC', sGear, ALLOWABLE.gearTooth),
        check('Вал 1 – огъване + усукване', 'σe = √((Kσ·σb)² + 3(Kτ·τ)²)', sShaft1, ALLOWABLE.shaft),
        check('Вал 2 – огъване + усукване', 'σe = √((Kσ·σb)² + 3(Kτ·τ)²)', sShaft2, ALLOWABLE.shaft),
      ];
      if (F.sCr1 !== null) checks.push(check('Шпонка 1 – смачкване', 'σсм = 2M₁/(d(h − t₁)l)', F.sCr1, ALLOWABLE.key));
      if (F.sCr2 !== null) checks.push(check('Шпонка 2 – смачкване', 'σсм = 2M₂/(d(h − t₁)l)', F.sCr2, ALLOWABLE.key));
      checks.push(
        check(`Лагер ${BRG1.code} – контакт (Херц)`, 'p₀ при Qmax = 5R/Z', pB(Math.max(F.RA1, F.RB1), BRG1), ALLOWABLE.bearing),
        check(`Лагер ${BRG2.code} – контакт (Херц)`, 'p₀ при Qmax = 5R/Z', pB(Math.max(F.RA2, F.RB2), BRG2), ALLOWABLE.bearing),
      );

      const failed = checks.filter((c) => c.safety < 1);
      if (failed.length) for (const c of failed) warnings.push({ level: 'error', text: bg(`${c.label.bg}: σ = ${nf(c.stress)} MPa > ${nf(c.limit)} MPa.`) });
      else warnings.push({ level: 'ok', text: bg('Всички елементи са под допустимите напрежения.') });
      if (!tp.unit.converged || !tg.unit.converged) warnings.push({ level: 'warn', text: bg('Решението на FEM не е сходимо напълно.') });

      const lewis1 = (F.K * F.Ft) / (b * m * lewisY(z1));
      const rows = [
        { label: bg('Сила върху зъба Fₙ·K'), value: `${nf(Fdesign)} N` },
        { label: bg('Радиус на натоварване (HPSTC) z₁ / z₂'), value: `${nf(rL1, 2)} / ${nf(rL2, 2)} mm` },
        { label: bg('FEM мрежа на зъб: възли / елементи'), value: `${tp.mesh.x.length} / ${tp.mesh.tri.length / 3}` },
        { label: bg('Итерации на решателя (CG) z₁ / z₂'), value: `${tp.unit.iterations} / ${tg.unit.iterations}` },
        { label: bg('FEM z₁ (в HPSTC) спрямо Люис (сила на върха)'), value: `${nf(sPin, 0)} / ${nf(lewis1, 0)} MPa = ×${nf(sPin / lewis1, 2)}` },
      ];
      const plots = [toothPlot(`Зъб z₁ = ${z1}`, tp, Fdesign), toothPlot(`Зъб z₂ = ${z2}`, tg, Fdesign)];
      return { fields, checks, plots, values: rows, warnings };
    },
  };
}
