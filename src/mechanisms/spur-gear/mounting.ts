/**
 * Mounting errors of the spur gear pair: wrong centre distance, inclination of the shafts in their
 * common plane (δ) and deviation out of that plane (β, "skew").
 *
 * Model (rigid gears plus a linear mesh stiffness, as in ISO 6336-1 for K_Hβ):
 *  - The face width is cut into thin slices. In every slice the local centre distance a(ζ) = a' + ζ·tan δ
 *    gives the exact normal backlash j_n(a) of the involute pair; the out-of-plane deviation moves the
 *    gear tangentially by ζ·tan β, which opens one flank and closes the other by ζ·tan β·cos α_w.
 *  - The gear turns until its driven flanks touch the pinion somewhere (load). If the two flanks cannot
 *    both be free, the teeth jam: the overlap is shown as interference.
 *  - Under the load F_t the flanks approach by δ₀ (mesh stiffness c_γ); the slices where the gap is smaller
 *    than δ₀ carry load q(ζ) = c_γ·(δ₀ − g(ζ)). That gives the contact width and K_Hβ = q_max / (F_t/b).
 * Units: mm, N, rad internally; µm for small gaps in the UI.
 */
import * as THREE from 'three';
import type { LabValue, LabWarning, MountingDef, MountingOverlay, MountingResult, StressPlot } from '../../core/types';
import { inv } from '../../core/involute';
import { labelSprite } from '../../three/forceArrows';
import { rainbow, srgbToLinear } from '../../three/colormap';
import type { Layout } from './layout';
import { B1, B2, BACKLASH } from './params';

const bg = (s: string): { bg: string } => ({ bg: s });
const n = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v: number, d: number): string => (v > 0 ? '+' : v < 0 ? '−' : '') + n(Math.abs(v), d);
const DEG = Math.PI / 180;

/** Common face width that is in contact. */
export const faceWidth = (): number => Math.min(B1, B2);

/** Geometry of the pair at a given (actual) centre distance. */
export interface MeshAt {
  a: number;
  /** Working pressure angle, rad. */
  alphaW: number;
  /** Normal backlash along the line of action (mm); negative = the teeth overlap. */
  jn: number;
  /** Circumferential backlash on the working pitch circle (mm). */
  jt: number;
  /** Transverse contact ratio. */
  eps: number;
  /** Tip clearances: pinion tip – gear root, gear tip – pinion root (mm). */
  c1: number;
  c2: number;
  /** Line of action: length N₁N₂ and the active path A–E measured from N₁. */
  Lw: number;
  sA: number;
  sE: number;
}

/** Exact involute mesh at centre distance `a` (x₁ + x₂ = 0, built-in backlash BACKLASH per gear). */
export function meshAt(L: Layout, a: number): MeshAt {
  const { g1, g2 } = L;
  const rb1 = g1.db / 2;
  const rb2 = g2.db / 2;
  const ra1 = g1.da / 2;
  const ra2 = g2.da / 2;
  const cw = Math.min(1, (rb1 + rb2) / a);
  const alphaW = Math.acos(cw);
  const rw1 = rb1 / cw;
  const rw2 = rb2 / cw;
  const psi1 = g1.s / g1.d - BACKLASH / g1.d; // half-angles of the tooth on the reference circle
  const psi2 = g2.s / g2.d - BACKLASH / g2.d;
  const dInv = inv(g1.alpha) - inv(alphaW);
  const jt = rw1 * ((2 * Math.PI) / g1.z - 2 * (psi1 + dInv)) - 2 * rw2 * (psi2 + dInv);
  const Lw = a * Math.sin(alphaW);
  const e1 = Math.sqrt(ra1 * ra1 - rb1 * rb1);
  const e2 = Math.sqrt(ra2 * ra2 - rb2 * rb2);
  return {
    a,
    alphaW,
    jn: jt * cw,
    jt,
    eps: (e1 + e2 - Lw) / g1.pb,
    c1: a - ra1 - g2.df / 2,
    c2: a - ra2 - g1.df / 2,
    Lw,
    sA: Lw - e2,
    sE: e1,
  };
}

export interface MountInputs {
  /** Centre distance error a' − a, mm. */
  da: number;
  /** Inclination of the shafts in their common plane, degrees. */
  delta: number;
  /** Deviation out of the common plane (skew), degrees. */
  beta: number;
  /** Transmitted power, kW. */
  P: number;
}

export interface MountAnalysis {
  inputs: MountInputs;
  b: number;
  /** Slice positions across the face width (mm, 0 = middle, + = front face). */
  zeta: number[];
  /** Mesh geometry per slice. */
  mesh: MeshAt[];
  mid: MeshAt;
  /** Gaps on the driving and the coast flanks per slice (mm, unloaded, after the gear has turned). */
  gD: number[];
  gC: number[];
  /** Line load per slice, N/mm. */
  q: number[];
  /** Extra rotation of the gear (rad, counter-clockwise) that closes the drive side. */
  phase2: number;
  jam: boolean;
  /** Largest overlap of the jammed teeth (mm). */
  overlap: number;
  Ft: number;
  /** Mean line load F_t/b, N/mm. */
  w: number;
  /** Mesh stiffness, N/(mm·µm). */
  cGamma: number;
  /** Elastic approach under load, mm. */
  delta0: number;
  /** Misalignment across the face in the plane of action, mm. */
  Fby: number;
  KHb: number;
  /** Loaded share of the face width, 0…1. */
  contactShare: number;
  /** Middle of the loaded zone (mm from the face middle). */
  contactCentre: number;
  /** Smallest tip clearance over the face (mm). */
  cMin: number;
  /** Smallest contact ratio over the face. */
  epsMin: number;
  jnMin: number;
  jnMax: number;
}

const NZ = 73;

export function analyseMounting(L: Layout, inp: MountInputs, n1: number): MountAnalysis {
  const b = faceWidth();
  const rb2 = L.g2.db / 2;
  const aMid = L.a + inp.da;
  const mid = meshAt(L, aMid);
  const tanD = Math.tan(inp.delta * DEG);
  const tanB = Math.tan(inp.beta * DEG);
  const cosW = Math.cos(mid.alphaW);
  const zeta: number[] = [];
  const mesh: MeshAt[] = [];
  const D: number[] = [];
  const C: number[] = [];
  for (let i = 0; i < NZ; i++) {
    const z = -b / 2 + (b * i) / (NZ - 1);
    const mz = meshAt(L, aMid + z * tanD);
    const t = z * tanB * cosW;
    zeta.push(z);
    mesh.push(mz);
    D.push(mz.jn / 2 + t);
    C.push(mz.jn / 2 - t);
  }
  const minD = Math.min(...D);
  const minC = Math.min(...C);
  const jam = minD + minC < 0;
  const shift = jam ? (minD - minC) / 2 : minD;
  const gD = D.map((v) => v - shift);
  const gC = C.map((v) => v + shift);
  const overlap = jam ? -(minD + minC) / 2 : 0;

  // Load and mesh stiffness (ISO 6336-1, method B values for solid steel spur gears).
  const omega = (2 * Math.PI * Math.max(50, n1)) / 60;
  const T1 = ((inp.P * 1000) / omega) * 1000; // N·mm
  const Ft = (2 * T1) / L.g1.d;
  const w = Ft / b;
  const cGamma = 0.85 * 14 * (0.75 * Math.max(1, mid.eps) + 0.25);
  const k = cGamma * 1000; // N/mm per mm of approach, per mm of width
  const dz = b / (NZ - 1);
  const loadFor = (d0: number): number => {
    let s = 0;
    for (let i = 0; i < NZ; i++) {
      const v = Math.max(0, d0 - gD[i]) * k * (i === 0 || i === NZ - 1 ? dz / 2 : dz);
      s += v;
    }
    return s;
  };
  let lo = 0;
  let hi = Math.max(...gD) + (2 * Ft) / (k * b) + 1e-6;
  for (let it = 0; it < 60; it++) {
    const m = (lo + hi) / 2;
    if (loadFor(m) < Ft) lo = m;
    else hi = m;
  }
  const delta0 = jam ? 0 : (lo + hi) / 2;
  const q = gD.map((g) => (jam ? 0 : Math.max(0, delta0 - g) * k));
  const qMax = Math.max(...q);
  // Loaded width with linear interpolation of the gap between slices.
  let loaded = 0;
  let moment = 0;
  for (let i = 0; i < NZ - 1; i++) {
    const a0 = delta0 - gD[i];
    const a1 = delta0 - gD[i + 1];
    let len = 0;
    let c = 0;
    if (a0 >= 0 && a1 >= 0) {
      len = dz;
      c = (zeta[i] + zeta[i + 1]) / 2;
    } else if (a0 > 0 || a1 > 0) {
      const f = a0 / (a0 - a1);
      len = a0 > 0 ? f * dz : (1 - f) * dz;
      c = a0 > 0 ? zeta[i] + len / 2 : zeta[i + 1] - len / 2;
    }
    loaded += len;
    moment += len * c;
  }
  const cMin = Math.min(...mesh.map((m) => Math.min(m.c1, m.c2)));
  return {
    inputs: inp,
    b,
    zeta,
    mesh,
    mid,
    gD,
    gC,
    q,
    phase2: shift / rb2,
    jam,
    overlap,
    Ft,
    w,
    cGamma,
    delta0,
    Fby: Math.max(...gD) - Math.min(...gD),
    KHb: jam ? Infinity : qMax / w,
    contactShare: jam ? 0 : Math.min(1, loaded / b),
    contactCentre: loaded > 0 ? moment / loaded : 0,
    cMin,
    epsMin: Math.min(...mesh.map((m) => m.eps)),
    jnMin: Math.min(...mesh.map((m) => m.jn)),
    jnMax: Math.max(...mesh.map((m) => m.jn)),
  };
}

/**
 * Contact distances (from N₁ along the line of action) on the driving (+θ) or coast (−θ) flanks of the
 * pinion turned by `phi`, for a working pressure angle αw. Only points on the active path A–E.
 */
export function flankContacts(L: Layout, m: MeshAt, phi: number, side: 1 | -1): number[] {
  const rb1 = L.g1.db / 2;
  const psiB = L.g1.s / L.g1.d - BACKLASH / L.g1.d + inv(L.g1.alpha);
  const step = (2 * Math.PI) / L.g1.z;
  const out: number[] = [];
  for (let k = 0; k < L.g1.z; k++) {
    let t = (psiB + side * phi + m.alphaW + k * step) % (2 * Math.PI);
    if (t < -Math.PI) t += 2 * Math.PI;
    if (t > Math.PI) t -= 2 * Math.PI;
    const s = rb1 * t;
    if (s >= m.sA - 1e-9 && s <= m.sE + 1e-9) out.push(s);
  }
  return out.sort((p, q) => p - q);
}

/** Point on the drive (side = 1) or coast (side = −1) line of action, pinion frame (pinion centre at 0). */
export function loaPoint(L: Layout, alphaW: number, s: number, side: 1 | -1): [number, number] {
  const rb1 = L.g1.db / 2;
  const T: [number, number] = [rb1 * Math.cos(alphaW), -side * rb1 * Math.sin(alphaW)];
  const d: [number, number] = [Math.sin(alphaW), side * Math.cos(alphaW)];
  return [T[0] + d[0] * s, T[1] + d[1] * s];
}

// ------------------------------------------------------------------ 2D plot: contact pattern

const INTERFERENCE = '#ff2d55';

function patternPlot(L: Layout, A: MountAnalysis): StressPlot {
  return {
    label: bg('Отпечатък на контакта'),
    draw(ctx, w, h, colour) {
      ctx.clearRect(0, 0, w, h);
      const pad = 12;
      const gap = 18;
      const top = 30;
      const bottom = h - 46;
      const pw = (w - 2 * pad - gap) / 2;
      const rb1 = L.g1.db / 2;
      const ra1 = L.g1.da / 2;
      const rLow = Math.max(rb1, L.g1.df / 2 + 0.25 * L.cfg.m); // bottom of the drawn flank
      const yOf = (r: number): number => bottom - ((r - rLow) / (ra1 - rLow)) * (bottom - top);
      const rOf = (s: number): number => Math.hypot(rb1, s);
      const xOf = (x0: number, z: number): number => x0 + ((z + A.b / 2) / A.b) * pw;
      const zs = A.zeta;
      const flank = (x0: number, title: string): void => {
        ctx.fillStyle = '#2a2f37';
        ctx.fillRect(x0, top, pw, bottom - top);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, top + 0.5, pw - 1, bottom - top - 1);
        ctx.fillStyle = '#e8ecf1';
        ctx.font = '600 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, x0 + pw / 2, top - 10);
      };
      const leftX = pad;
      const rightX = pad + pw + gap;
      flank(leftX, 'Работен фланк');
      flank(rightX, 'Обратен фланк');

      const column = (x0: number, i: number, r0: number, r1: number, style: string): void => {
        const xa = xOf(x0, i === 0 ? zs[0] : (zs[i - 1] + zs[i]) / 2);
        const xb = xOf(x0, i === zs.length - 1 ? zs[i] : (zs[i] + zs[i + 1]) / 2);
        ctx.fillStyle = style;
        ctx.fillRect(xa, yOf(r1), xb - xa + 0.6, yOf(r0) - yOf(r1));
      };
      // Drive flank: load intensity, or interference if the teeth jam.
      for (let i = 0; i < zs.length; i++) {
        const m = A.mesh[i];
        const rA = rOf(Math.max(0, m.sA));
        if (A.jam) {
          if (A.gD[i] < 0) column(leftX, i, rA, ra1, INTERFERENCE);
        } else if (A.q[i] > 0) {
          column(leftX, i, rA, ra1, colour(Math.min(1, A.q[i] / (2 * A.w))));
        }
        if (A.gC[i] < 0) column(rightX, i, rA, ra1, INTERFERENCE);
        if (m.c1 < 0) {
          // The pinion tip runs into the root of the gear.
          column(leftX, i, ra1 - 0.12 * L.cfg.m, ra1, INTERFERENCE);
          column(rightX, i, ra1 - 0.12 * L.cfg.m, ra1, INTERFERENCE);
        }
      }
      // Active profile limits (A at the middle of the face) and labels.
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      for (const x0 of [leftX, rightX]) {
        const y = yOf(rOf(Math.max(0, A.mid.sA)));
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + pw, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(16,18,22,0.85)';
      ctx.fillStyle = '#ffffff';
      for (const [txt, y] of [['връх', top + 13], ['основа', bottom - 6]] as [string, number][]) {
        ctx.strokeText(txt, leftX + 5, y);
        ctx.fillText(txt, leftX + 5, y);
      }
      // Coast flank: backlash text when free.
      ctx.textAlign = 'center';
      if (!A.jam) {
        const lo = Math.min(...A.gC) * 1000;
        const hi = Math.max(...A.gC) * 1000;
        ctx.fillStyle = '#7fd3ff';
        ctx.font = '600 12px system-ui, sans-serif';
        const txt = Math.abs(hi - lo) < 3 ? `луфт ${n(lo)} µm` : `луфт ${n(lo)}…${n(hi)} µm`;
        ctx.fillText(txt, rightX + pw / 2, (top + bottom) / 2 + 4);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.fillText('заклинване', rightX + pw / 2, (top + bottom) / 2 + 4);
      }
      // Face-width axis.
      ctx.fillStyle = '#aeb8c4';
      ctx.font = '11px system-ui, sans-serif';
      for (const x0 of [leftX, rightX]) {
        ctx.textAlign = 'left';
        ctx.fillText('отзад', x0, bottom + 15);
        ctx.textAlign = 'right';
        ctx.fillText('отпред', x0 + pw, bottom + 15);
      }
      ctx.textAlign = 'center';
      ctx.fillText(`← ширина на зъба b = ${n(A.b)} mm →`, w / 2, bottom + 33);
    },
  };
}

// ------------------------------------------------------------------ 3D overlay

const CONTACT_W = 0.75; // visual width of a contact line on the flank, mm
const GAP_COLOR = '#38c6ff';

function ribbon(nz: number): { mesh: THREE.Mesh; pos: Float32Array; col: Float32Array } {
  const pos = new Float32Array(nz * 2 * 3);
  const col = new Float32Array(nz * 2 * 4);
  const idx: number[] = [];
  for (let i = 0; i < nz - 1; i++) {
    const a = 2 * i;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 42;
  mesh.visible = false;
  return { mesh, pos, col };
}

function lens(c1: [number, number], r1: number, c2: [number, number], r2: number): [number, number][] | null {
  const d = Math.hypot(c2[0] - c1[0], c2[1] - c1[1]);
  if (d >= r1 + r2 || d <= Math.abs(r1 - r2)) return null;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hh = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2[0] - c1[0]) / d;
  const uy = (c2[1] - c1[1]) / d;
  const half1 = Math.atan2(hh, a);
  const half2 = Math.atan2(hh, d - a);
  const base1 = Math.atan2(uy, ux);
  const base2 = base1 + Math.PI;
  const pts: [number, number][] = [];
  const N = 24;
  for (let k = 0; k <= N; k++) {
    const t = -half1 + (2 * half1 * k) / N;
    pts.push([c1[0] + r1 * Math.cos(base1 + t), c1[1] + r1 * Math.sin(base1 + t)]);
  }
  for (let k = 1; k < N; k++) {
    const t = -half2 + (2 * half2 * k) / N;
    pts.push([c2[0] + r2 * Math.cos(base2 + t), c2[1] + r2 * Math.sin(base2 + t)]);
  }
  return pts;
}

function createOverlay(L: Layout, A: MountAnalysis): MountingOverlay {
  const group = new THREE.Group();
  group.name = 'mounting-overlay';
  const y0 = L.axisY;
  const nz = A.zeta.length;
  const disposables: { dispose(): void }[] = [];
  const pool = (count: number): ReturnType<typeof ribbon>[] =>
    Array.from({ length: count }, () => {
      const r = ribbon(nz);
      group.add(r.mesh);
      disposables.push(r.mesh.geometry, r.mesh.material as THREE.Material);
      return r;
    });
  const drive = pool(3);
  const coast = pool(3);
  const qRef = 2 * A.w;

  // Interference zones: tip circle of one gear inside the root circle of the other.
  const red = new THREE.MeshBasicMaterial({ color: INTERFERENCE, transparent: true, opacity: 0.55, depthTest: false });
  disposables.push(red);
  const aMid = A.mid.a;
  for (const [c1, r1, c2, r2] of [
    [[0, 0], L.g1.da / 2, [aMid, 0], L.g2.df / 2],
    [[aMid, 0], L.g2.da / 2, [0, 0], L.g1.df / 2],
  ] as [[number, number], number, [number, number], number][]) {
    const pts = lens(c1, r1, c2, r2);
    if (!pts) continue;
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y + y0)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: A.b, bevelEnabled: false });
    geo.translate(0, 0, -A.b / 2);
    const m = new THREE.Mesh(geo, red);
    m.renderOrder = 41;
    group.add(m);
    disposables.push(geo);
  }

  // Backlash marker on the coast side.
  const gapMat = new THREE.MeshBasicMaterial({ color: GAP_COLOR, depthTest: false, transparent: true });
  disposables.push(gapMat);
  const gapBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), gapMat);
  disposables.push(gapBar.geometry);
  gapBar.renderOrder = 43;
  const capGeo = new THREE.SphereGeometry(0.13, 12, 8);
  disposables.push(capGeo);
  const capA = new THREE.Mesh(capGeo, gapMat);
  const capB = new THREE.Mesh(capGeo, gapMat);
  capA.renderOrder = capB.renderOrder = 43;
  const gapGroup = new THREE.Group();
  gapGroup.add(gapBar, capA, capB);
  group.add(gapGroup);
  const lh = 0.19 * (0.45 * A.b + 2 * L.cfg.m); // ~19 % of the view radius
  const zF = -A.b / 2 - 0.4; // labels and the backlash bar sit at the back face (top of the view)
  const midIdx = (nz - 1) / 2;
  const gapLabel = A.jam
    ? labelSprite(`заклинване: застъпване ${n(A.overlap * 1000)} µm`, INTERFERENCE, lh)
    : labelSprite(`луфт jₙ = ${n(A.gC[midIdx] * 1000)} µm`, GAP_COLOR, lh);
  group.add(gapLabel);
  const contactLabel = A.jam ? null : labelSprite(A.contactShare > 0.98 ? 'контакт по цялата ширина' : `контакт ${n(A.contactShare * 100)} % от ширината`, '#ffd23f', lh);
  if (contactLabel) group.add(contactLabel);

  const setColour = (col: Float32Array, i: number, rgb: [number, number, number], alpha: number): void => {
    for (const k of [2 * i, 2 * i + 1]) {
      col[4 * k] = srgbToLinear(rgb[0]);
      col[4 * k + 1] = srgbToLinear(rgb[1]);
      col[4 * k + 2] = srgbToLinear(rgb[2]);
      col[4 * k + 3] = alpha;
    }
  };
  const redRgb: [number, number, number] = [1, 0.18, 0.33];
  const greyRgb: [number, number, number] = [0.85, 0.88, 0.92];

  /** Fills one ribbon along the contact line of a pinion flank; returns the point at the face middle. */
  const fill = (r: ReturnType<typeof ribbon>, s0: number, side: 1 | -1): THREE.Vector3 => {
    const aW = A.mid.alphaW;
    // Tangent of the flank (perpendicular to the line of action) in the transverse plane.
    const tx = Math.cos(aW);
    const ty = -side * Math.sin(aW);
    let midPt = new THREE.Vector3();
    for (let i = 0; i < nz; i++) {
      const m = A.mesh[i];
      // The contact point of the same flank moves with the local working pressure angle.
      const s = s0 + (L.g1.db / 2) * (m.alphaW - aW);
      const [px, py] = loaPoint(L, m.alphaW, s, side);
      const z = A.zeta[i];
      for (let e = 0; e < 2; e++) {
        const o = (e === 0 ? -1 : 1) * CONTACT_W * 0.5;
        const k = 3 * (2 * i + e);
        r.pos[k] = px + tx * o;
        r.pos[k + 1] = py + ty * o + y0;
        r.pos[k + 2] = z;
      }
      if (i === Math.round(midIdx)) midPt = new THREE.Vector3(px, py + y0, z);
      const g = side === 1 ? A.gD[i] : A.gC[i];
      if (g < 0 && (A.jam || side === -1)) setColour(r.col, i, redRgb, 0.95);
      else if (side === 1 && A.q[i] > 0) setColour(r.col, i, rainbow(Math.min(1, A.q[i] / qRef)), 0.95);
      else if (side === 1) setColour(r.col, i, greyRgb, 0.28);
      else setColour(r.col, i, greyRgb, 0);
    }
    r.mesh.geometry.attributes.position.needsUpdate = true;
    r.mesh.geometry.attributes.color.needsUpdate = true;
    r.mesh.visible = true;
    return midPt;
  };

  const up = new THREE.Vector3(0, 1, 0);
  group.traverse((o) => {
    (o as THREE.Mesh).raycast = () => undefined;
  });

  return {
    object: group,
    update(inputAngle) {
      const dS = flankContacts(L, A.mid, inputAngle, 1);
      const cS = flankContacts(L, A.mid, inputAngle, -1);
      let driveNear: THREE.Vector3 | null = null;
      let bestD = Infinity;
      const sP = (L.g1.db / 2) * Math.tan(A.mid.alphaW); // pitch point
      drive.forEach((r, i) => {
        if (i >= dS.length) {
          r.mesh.visible = false;
          return;
        }
        const p = fill(r, dS[i], 1);
        if (Math.abs(dS[i] - sP) < bestD) {
          bestD = Math.abs(dS[i] - sP);
          driveNear = p;
        }
      });
      let coastNear: { p: THREE.Vector3; s: number } | null = null;
      let bestC = Infinity;
      coast.forEach((r, i) => {
        if (i >= cS.length) {
          r.mesh.visible = false;
          return;
        }
        const p = fill(r, cS[i], -1);
        if (Math.abs(cS[i] - sP) < bestC) {
          bestC = Math.abs(cS[i] - sP);
          coastNear = { p, s: cS[i] };
        }
      });
      // Backlash bar: from the pinion coast flank along the coast line of action to the gear flank.
      const cn = coastNear as { p: THREE.Vector3; s: number } | null;
      const g = A.gC[Math.round(midIdx)];
      gapGroup.visible = !!cn && g > 0;
      if (cn && g > 0) {
        const dir = new THREE.Vector3(Math.sin(A.mid.alphaW), -Math.cos(A.mid.alphaW), 0);
        const a = cn.p.clone().setZ(zF);
        const b = a.clone().addScaledVector(dir, g);
        gapBar.position.copy(a).add(b).multiplyScalar(0.5);
        gapBar.scale.set(1, Math.max(1e-3, g), 1);
        gapBar.quaternion.setFromUnitVectors(up, dir);
        capA.position.copy(a);
        capB.position.copy(b);
      }
      const anchor = cn ? cn.p : new THREE.Vector3(L.g1.d / 2, y0, 0);
      gapLabel.position.set(anchor.x - lh * 4.4, anchor.y, zF + lh * 1.2);
      const dn = driveNear as THREE.Vector3 | null;
      if (contactLabel) {
        contactLabel.visible = !!dn;
        if (dn) contactLabel.position.set(dn.x - lh * 4.4, dn.y, zF - lh * 1.2);
      }
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      for (const s of [gapLabel, contactLabel]) {
        if (!s) continue;
        s.material.map?.dispose();
        s.material.dispose();
      }
      group.removeFromParent();
    },
  };
}

// ------------------------------------------------------------------ Definition

export function createMounting(L: Layout): MountingDef {
  const b = faceWidth();
  const rb2 = L.g2.db / 2;
  const um = (deg: number): number => b * Math.tan(deg * DEG) * 1000;
  const fmtDeg = (v: number): string => `${signed(v, 2)}° (${n(Math.abs(um(v)))} µm на b)`;
  return {
    title: bg('Монтажни грешки'),
    intro: bg(
      'Колелата са изработени точно, но корпусът – не. Промени междуосието и наклона на вал 2 и виж какво става в зацепването: луфтът, отпечатъкът на контакта по ширината на зъба и зоните на интерференция (червено). Цветната ивица е натоварването по контактната линия: зелено = равномерно, червено = двойно над средното.',
    ),
    params: [
      {
        id: 'da',
        label: bg("Грешка на междуосието Δa = a' − a"),
        kind: 'range',
        min: -0.6,
        max: 1,
        step: 0.01,
        default: 0,
        format: (v) => `${signed(v, 2)} mm`,
        hint: bg('По-малко междуосие изяжда луфта и може да заклини зъбите; по-голямо дава луфт и намалява препокриването.'),
      },
      {
        id: 'delta',
        label: bg('Наклон в равнината на осите f_Σδ'),
        kind: 'range',
        min: -0.3,
        max: 0.3,
        step: 0.01,
        default: 0,
        format: fmtDeg,
        hint: bg('Двата вала остават в една равнина, но не са успоредни: междуосието е различно в двата края на зъба.'),
      },
      {
        id: 'beta',
        label: bg('Кръстосване на осите f_Σβ'),
        kind: 'range',
        min: -0.3,
        max: 0.3,
        step: 0.01,
        default: 0,
        format: fmtDeg,
        hint: bg('Вал 2 е завъртян извън общата равнина. Това е най-опасната грешка: контактът бяга към края на зъба.'),
      },
      {
        id: 'P',
        label: bg('Предавана мощност P'),
        kind: 'range',
        min: 0.2,
        max: 8,
        step: 0.1,
        default: 2,
        format: (v) => `${n(v, 1)} kW`,
      },
    ],
    presets: [
      { label: bg('Точен монтаж'), values: { da: 0, delta: 0, beta: 0 } },
      { label: bg('Голямо междуосие'), values: { da: 0.6, delta: 0, beta: 0 } },
      { label: bg('Заклинване'), values: { da: -0.3, delta: 0, beta: 0 } },
      { label: bg('Наклонени валове'), values: { da: 0, delta: 0.1, beta: 0 } },
      { label: bg('Кръстосани валове'), values: { da: 0, delta: 0, beta: 0.05 } },
    ],
    camera: { target: [L.g1.d / 2, L.axisY + 0.5, 0], dir: [0.12, 0.8, 0.6], radius: 0.45 * faceWidth() + 2 * L.cfg.m },
    focusParts: ['pinion', 'gear2'],
    evaluate(values, inputRpm): MountingResult {
      const inp: MountInputs = { da: values.da ?? 0, delta: values.delta ?? 0, beta: values.beta ?? 0, P: values.P ?? 2 };
      const A = analyseMounting(L, inp, inputRpm);
      const tanD = Math.tan(inp.delta * DEG);
      const tanB = Math.tan(inp.beta * DEG);
      const axis = new THREE.Vector3(tanD, tanB, 1).normalize();
      const nominal = meshAt(L, L.a);
      const vals: LabValue[] = [
        { label: bg("Действително междуосие a'"), value: `${n(A.mid.a, 2)} mm (номинално ${n(L.a, 2)})` },
        { label: bg('Работен ъгъл на зацепване αw'), value: `${n(A.mid.alphaW / DEG, 2)}°` },
        {
          label: bg('Нормален луфт jₙ'),
          value: Math.abs(A.jnMax - A.jnMin) < 0.002 ? `${n(A.mid.jn * 1000)} µm (номинално ${n(nominal.jn * 1000)})` : `${n(A.jnMin * 1000)}…${n(A.jnMax * 1000)} µm по ширината`,
        },
        { label: bg('Радиална хлабина c (най-малка)'), value: `${n(A.cMin, 2)} mm (номинално ${n(nominal.c1, 2)})` },
        { label: bg('Коефициент на препокриване εα'), value: `${n(A.epsMin, 2)} (номинално ${n(nominal.eps, 2)})` },
        { label: bg('Разлика в хлабината по ширината F_βy'), value: `${n(A.Fby * 1000)} µm` },
        { label: bg('Обиколна сила Ft / средно натоварване'), value: `${n(A.Ft)} N / ${n(A.w)} N/mm` },
        { label: bg('Твърдост на зацепването cγ'), value: `${n(A.cGamma, 1)} N/(mm·µm)` },
        { label: bg('Контактна ширина b_cal / b'), value: A.jam ? '–' : `${n(A.contactShare * 100)} %` },
        { label: bg('Коефициент на разпределение KHβ'), value: A.jam ? '–' : n(A.KHb, 2) },
        { label: bg('Ръст на контактното напрежение √KHβ'), value: A.jam ? '–' : `+${n((Math.sqrt(A.KHb) - 1) * 100)} %` },
        { label: bg('Завъртане на колело 2 до контакт'), value: `${n((A.phase2 * rb2) * 1000)} µm по дъгата` },
      ];
      const warnings: LabWarning[] = [];
      if (A.jam) {
        warnings.push({
          level: 'error',
          text: bg(`Заклинване: двата фланка на зъба нямат място (застъпване ${n(A.overlap * 1000)} µm). Предавката няма да се завърти или ще се задере.`),
        });
      }
      if (A.cMin < 0) {
        warnings.push({ level: 'error', text: bg(`Върхът на зъба удря в дъното на впадината (хлабина c = ${signed(A.cMin, 2)} mm).`) });
      }
      if (A.epsMin < 1) {
        warnings.push({ level: 'error', text: bg(`Препокриването падна до ${n(A.epsMin, 2)} < 1: има моменти без зъб в контакт – удари и шум.`) });
      } else if (A.epsMin < 1.2) {
        warnings.push({ level: 'warn', text: bg(`Препокриването е само ${n(A.epsMin, 2)}: по-голямо натоварване на един зъб и по-силен шум.`) });
      }
      if (!A.jam && A.jnMax > 0.35) {
        warnings.push({ level: 'warn', text: bg('Голям луфт: при реверс и при пускане зъбите се удрят, точността на позициониране пада.') });
      }
      if (!A.jam && A.KHb > 1.5) {
        warnings.push({
          level: A.KHb > 2.5 ? 'error' : 'warn',
          text: bg(
            `Контактът се събира към ${A.contactCentre > 0 ? 'предния' : 'задния'} край на зъба (${n(A.contactShare * 100)} % от ширината). Там натоварването е ${n(A.KHb, 1)} пъти над средното: питинг и счупване на ъгъла на зъба.`,
          ),
        });
      } else if (!A.jam && A.KHb > 1.15) {
        warnings.push({ level: 'info', text: bg(`Натоварването не е равномерно (KHβ = ${n(A.KHb, 2)}). Разработването и бомбирането на зъбите го намаляват.`) });
      }
      if (!warnings.length) {
        warnings.push({ level: 'ok', text: bg('Монтажът е в ред: има луфт, контактът е по цялата ширина на зъба.') });
      }
      return {
        values: vals,
        warnings,
        poses: {
          s2: { origin: [L.a + inp.da, L.axisY, 0], axis: [axis.x, axis.y, axis.z], phase: A.phase2 },
        },
        plot: patternPlot(L, A),
        createOverlay: () => createOverlay(L, A),
      };
    },
  };
}
