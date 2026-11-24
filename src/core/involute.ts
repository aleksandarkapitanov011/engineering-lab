/**
 * Involute spur gear geometry (pure math, no rendering).
 * Used by the 3D builder (THREE.Shape), the SVG drawings and the theory illustrations.
 */

export type Pt = [number, number];

export const deg = (d: number): number => (d * Math.PI) / 180;

/** Involute function inv(a) = tan(a) - a. */
export const inv = (a: number): number => Math.tan(a) - a;

export interface GearDims {
  m: number;
  z: number;
  alpha: number; // rad
  x: number;
  d: number; // pitch diameter m*z
  db: number; // base diameter d*cos(alpha)
  da: number; // tip diameter d + 2m(1+x)
  df: number; // root diameter d - 2m(1.25-x)
  p: number; // circular pitch pi*m
  pb: number; // base pitch p*cos(alpha)
  s: number; // tooth thickness on pitch circle
}

export function gearDims(m: number, z: number, alphaDeg = 20, x = 0): GearDims {
  const alpha = deg(alphaDeg);
  const d = m * z;
  return {
    m,
    z,
    alpha,
    x,
    d,
    db: d * Math.cos(alpha),
    da: d + 2 * m * (1 + x),
    df: d - 2 * m * (1.25 - x),
    p: Math.PI * m,
    pb: Math.PI * m * Math.cos(alpha),
    s: (Math.PI / 2 + 2 * x * Math.tan(alpha)) * m,
  };
}

/** Centre distance of an external pair without profile shift. */
export const centreDistance = (m: number, z1: number, z2: number): number => (m * (z1 + z2)) / 2;

/** Minimum number of teeth without undercut for a standard rack, x = 0. */
export const minTeethNoUndercut = (alphaDeg: number): number => 2 / Math.sin(deg(alphaDeg)) ** 2;

/** Base tangent length (span measurement) over k teeth. */
export function spanMeasurement(m: number, z: number, alphaDeg = 20): { k: number; W: number } {
  const a = deg(alphaDeg);
  const k = Math.max(2, Math.round((z * alphaDeg) / 180 + 0.5));
  const W = m * Math.cos(a) * (Math.PI * (k - 0.5) + z * inv(a));
  return { k, W };
}

/** Transverse contact ratio of an external pair (x = 0). */
export function contactRatio(m: number, z1: number, z2: number, alphaDeg = 20): number {
  const g1 = gearDims(m, z1, alphaDeg);
  const g2 = gearDims(m, z2, alphaDeg);
  const a = centreDistance(m, z1, z2);
  const ra1 = g1.da / 2;
  const rb1 = g1.db / 2;
  const ra2 = g2.da / 2;
  const rb2 = g2.db / 2;
  const ga = Math.sqrt(ra1 * ra1 - rb1 * rb1) + Math.sqrt(ra2 * ra2 - rb2 * rb2) - a * Math.sin(g1.alpha);
  return ga / g1.pb;
}

export interface OutlineOptions {
  m: number;
  z: number;
  alphaDeg?: number;
  x?: number;
  /** Circumferential backlash on the pitch circle (mm), removed from the tooth thickness. */
  backlash?: number;
  /** Angle of the centre of tooth 0 (rad). */
  phase?: number;
  flankSegments?: number;
  tipSegments?: number;
  rootSegments?: number;
}

/**
 * Closed counter-clockwise outline of a spur gear (no duplicate closing point).
 * Tooth i is centred at phase + i*2π/z. Below the base circle the flank continues radially to the root.
 */
export function gearOutline(o: OutlineOptions): Pt[] {
  const alphaDeg = o.alphaDeg ?? 20;
  const g = gearDims(o.m, o.z, alphaDeg, o.x ?? 0);
  const rp = g.d / 2;
  const rb = g.db / 2;
  const ra = g.da / 2;
  const rf = g.df / 2;
  const phase = o.phase ?? 0;
  const nf = o.flankSegments ?? 8;
  const nt = o.tipSegments ?? 3;
  const nr = o.rootSegments ?? 4;
  const psiP = g.s / (2 * rp) - (o.backlash ?? 0) / 2 / rp;
  const psi = (r: number): number => psiP + inv(g.alpha) - inv(Math.acos(Math.min(1, rb / r)));
  const rStart = Math.max(rb, rf);
  // Sample the flank uniformly in roll angle (denser near the base circle where curvature is high).
  const tA = Math.sqrt((ra / rb) ** 2 - 1);
  const tS = Math.sqrt(Math.max(0, (rStart / rb) ** 2 - 1));
  const radii: number[] = [];
  for (let k = 0; k <= nf; k++) {
    const t = tS + ((tA - tS) * k) / nf;
    radii.push(rb * Math.sqrt(1 + t * t));
  }
  const pol = (r: number, a: number): Pt => [r * Math.cos(a), r * Math.sin(a)];
  const pts: Pt[] = [];
  const step = (2 * Math.PI) / o.z;
  for (let i = 0; i < o.z; i++) {
    const th = phase + i * step;
    if (rf < rStart - 1e-6) pts.push(pol(rf, th - psi(rStart)));
    for (const r of radii) pts.push(pol(r, th - psi(r)));
    const tip = psi(ra);
    for (let k = 1; k < nt; k++) pts.push(pol(ra, th - tip + (2 * tip * k) / nt));
    for (let k = radii.length - 1; k >= 0; k--) pts.push(pol(radii[k], th + psi(radii[k])));
    if (rf < rStart - 1e-6) pts.push(pol(rf, th + psi(rStart)));
    const a0 = th + psi(rStart);
    const a1 = th + step - psi(rStart);
    for (let k = 1; k < nr; k++) pts.push(pol(rf, a0 + ((a1 - a0) * k) / nr));
  }
  return pts;
}

export interface LineOfAction {
  /** Base radius of the pinion. */
  rb1: number;
  /** Tangent point on the pinion base circle (pinion centre at the origin, gear on +x). */
  T1: Pt;
  /** Unit direction of the line of action from T1 towards T2 (pinion turning counter-clockwise). */
  dir: Pt;
  /** Length T1–T2 = a·sin α. */
  L: number;
  /** Start (gear tip circle) and end (pinion tip circle) of the active path, measured from T1. */
  sA: number;
  sE: number;
  /** Half angle of a pinion tooth at the base circle (incl. backlash and profile shift). */
  psiB: number;
  alpha: number;
  z1: number;
}

/** Line of action of an external pair with x1 = −x2 (standard centre distance). */
export function lineOfAction(m: number, z1: number, z2: number, alphaDeg = 20, x1 = 0, backlash = 0): LineOfAction {
  const g1 = gearDims(m, z1, alphaDeg, x1);
  const g2 = gearDims(m, z2, alphaDeg, -x1);
  const a = centreDistance(m, z1, z2);
  const al = g1.alpha;
  const rb1 = g1.db / 2;
  const rb2 = g2.db / 2;
  const L = a * Math.sin(al);
  const rp1 = g1.d / 2;
  return {
    rb1,
    T1: [rb1 * Math.cos(al), -rb1 * Math.sin(al)],
    dir: [Math.sin(al), Math.cos(al)],
    L,
    sA: L - Math.sqrt((g2.da / 2) ** 2 - rb2 * rb2),
    sE: Math.sqrt((g1.da / 2) ** 2 - rb1 * rb1),
    psiB: g1.s / (2 * rp1) - backlash / 2 / rp1 + inv(al),
    alpha: al,
    z1,
  };
}

/**
 * Distances (from T1 along the line of action) of the contact points on the driving flanks
 * when the pinion has turned by `phi` (rad, counter-clockwise). Only points on the active path A–E.
 */
export function contactDistances(loa: LineOfAction, phi: number): number[] {
  const out: number[] = [];
  const step = (2 * Math.PI) / loa.z1;
  for (let k = 0; k < loa.z1; k++) {
    let t = (loa.psiB + phi + loa.alpha + k * step) % (2 * Math.PI);
    if (t < -Math.PI) t += 2 * Math.PI;
    if (t > Math.PI) t -= 2 * Math.PI;
    const s = loa.rb1 * t;
    if (s >= loa.sA - 1e-9 && s <= loa.sE + 1e-9) out.push(s);
  }
  return out.sort((p, q) => p - q);
}

export interface RootFillet {
  /** Tooth half-angle allowed by the generated root fillet at radius r (Infinity above the fillet). */
  halfAngle(r: number): number;
  /** Highest radius of the fillet curve that is still relevant (top of the sampled branch). */
  rTop: number;
  rf: number;
}

/**
 * Root fillet generated by a standard rack cutter (ISO 53: addendum 1.25·m, tip radius ρ = 0.38·m).
 * The tip-rounding centre of the rack describes a trochoid relative to the gear; the fillet is the curve
 * at distance ρ from it on the material side (envelope of the rounding circles). Includes undercut.
 * Tooth 0 is centred on +x; returned half-angles are measured from the tooth centre line.
 */
export function rootFillet(m: number, z: number, x = 0, alphaDeg = 20, rhoFactor = 0.38): RootFillet {
  const al = deg(alphaDeg);
  const rp = (m * z) / 2;
  const ha0 = 1.25 * m;
  const rho = rhoFactor * m;
  // Rack frame: u along the rolling line, v outward (v = 0 is the rolling line, reference line at v = x·m).
  const vc = x * m - ha0 + rho; // centre of the tip rounding
  const hw = (v: number): number => (Math.PI * m) / 4 + (v - x * m) * Math.tan(al); // half width of the rack tooth
  const uc = hw(vc) - rho / Math.cos(al);
  // Gear frame (space centred on +y, gear rotated by φ): C(φ) = R(−φ)·(uc − rp·φ, rp + vc)
  const C = (phi: number): Pt => {
    const X = uc - rp * phi;
    const Y = rp + vc;
    const c = Math.cos(-phi);
    const s = Math.sin(-phi);
    return [X * c - Y * s, X * s + Y * c];
  };
  const toothCentre = Math.PI / 2 - Math.PI / z; // the tooth on the right of the space
  const pts: [number, number][] = []; // (r, half-angle)
  const h = 1e-5;
  for (let i = 0; i <= 2400; i++) {
    const phi = -1.2 + (2.4 * i) / 2400;
    const p = C(phi);
    const p1 = C(phi + h);
    const p0 = C(phi - h);
    let tx = p1[0] - p0[0];
    let ty = p1[1] - p0[1];
    const tl = Math.hypot(tx, ty);
    if (tl < 1e-12) continue;
    tx /= tl;
    ty /= tl;
    // Two candidates C ± ρ·n; keep the one on the tooth side (smaller polar angle = closer to the tooth).
    const a: Pt = [p[0] - ty * rho, p[1] + tx * rho];
    const b: Pt = [p[0] + ty * rho, p[1] - tx * rho];
    const pa = Math.atan2(a[1], a[0]);
    const pb = Math.atan2(b[1], b[0]);
    const q = pa < pb ? a : b;
    const r = Math.hypot(q[0], q[1]);
    const half = Math.atan2(q[1], q[0]) - toothCentre;
    if (half > 0 && half < (2 * Math.PI) / z) pts.push([r, half]);
  }
  const rf = rp - ha0 + x * m;
  // Envelope: for every radius, the material boundary is the most-cut (smallest) half-angle.
  const bins = 400;
  const rMax = rp + 0.2 * m + x * m;
  const env = new Float64Array(bins + 1).fill(Infinity);
  for (const [r, half] of pts) {
    if (r < rf || r > rMax) continue;
    const k = Math.round(((r - rf) / (rMax - rf)) * bins);
    if (half < env[k]) env[k] = half;
  }
  // Fill gaps by interpolation; the top end stays Infinity (no constraint there).
  let last = -1;
  for (let k = 0; k <= bins; k++) {
    if (env[k] !== Infinity) {
      if (last >= 0 && k - last > 1) for (let j = last + 1; j < k; j++) env[j] = env[last] + ((env[k] - env[last]) * (j - last)) / (k - last);
      last = k;
    }
  }
  const rTop = rf + ((rMax - rf) * Math.max(0, last)) / bins;
  return {
    rf,
    rTop,
    halfAngle(r: number): number {
      if (r > rTop) return Infinity;
      const f = ((Math.max(rf, r) - rf) / (rMax - rf)) * bins;
      const k = Math.min(bins - 1, Math.floor(f));
      const a = env[k];
      const b = env[k + 1];
      if (a === Infinity || b === Infinity) return Math.min(a, b);
      return a + (b - a) * (f - k);
    },
  };
}

/** Phase for the mating gear placed on the +x side so that a tooth space faces tooth 0 of the pinion. */
export const matingPhase = (z2: number): number => Math.PI + Math.PI / z2;

/** SVG path data for a closed polygon. */
export function polygonPath(pts: Pt[], flipY = false): string {
  const f = (n: number): string => n.toFixed(3);
  return (
    pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(flipY ? -p[1] : p[1])}`).join('') + 'Z'
  );
}
