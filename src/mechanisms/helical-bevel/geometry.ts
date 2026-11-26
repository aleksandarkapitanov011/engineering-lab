/**
 * Geometry builders for the helical-bevel gearbox.
 *  - Helical gear: the transverse involute outline is stacked in slices along the axis and turned a little
 *    in every slice (helix). Holes (bore, rim) stay straight.
 *  - Straight bevel gear: the heel outline is lofted towards the cone apex (every point scaled about the
 *    apex), so tips, roots and flanks all converge there, as on a real bevel gear. The heel face is on the
 *    back cone, so the tip and root cones get the correct angles δ ± θ.
 *  - Housing walls: flat plates with bearing bores.
 */
import * as THREE from 'three';
import { creased, merge } from '../../three/geom';
import type { Pt } from '../../core/involute';

type V3 = [number, number, number];

const area = (pts: Pt[]): number => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};
const ccw = (pts: Pt[]): Pt[] => (area(pts) >= 0 ? pts : [...pts].reverse());
const cw = (pts: Pt[]): Pt[] => (area(pts) < 0 ? pts : [...pts].reverse());
const pathPoints = (p: THREE.Path, n = 48): Pt[] => p.getPoints(n).map((v) => [v.x, v.y] as Pt).filter((q, i, arr) => i === 0 || Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) > 1e-6);

/** Builds a mesh from triangles given as vertex triples. */
function fromTriangles(tris: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  return g;
}

/** Side surface between consecutive rings of points (same count). Outward normals for CCW rings going up in z. */
function sides(rings: V3[][], flip: boolean, out: number[]): void {
  for (let k = 0; k < rings.length - 1; k++) {
    const a = rings[k];
    const b = rings[k + 1];
    const n = a.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const quad = flip ? [a[i], b[j], a[j], a[i], b[i], b[j]] : [a[i], a[j], b[j], a[i], b[j], b[i]];
      for (const v of quad) out.push(...v);
    }
  }
}

/** Flat cap: outline (+ holes) at height z, facing +z (up) or −z. */
function cap(outer: Pt[], holes: Pt[][], z: number, up: boolean, map: (p: Pt) => V3, out: number[]): void {
  const contour = outer.map(([x, y]) => new THREE.Vector2(x, y));
  const hs = holes.map((h) => h.map(([x, y]) => new THREE.Vector2(x, y)));
  const faces = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = [...contour, ...hs.flat()];
  for (const f of faces) {
    const [p, q, r] = f.map((i) => all[i]);
    const cross = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const tri = (cross > 0) === up ? [p, q, r] : [p, r, q];
    for (const v of tri) out.push(...map([v.x, v.y]));
  }
  void z;
}

/** Straight wall of a hole from z0 to z1 (normals into the hole). */
function holeWall(hole: Pt[], z0: number, z1: number, out: number[]): void {
  const h = cw(hole);
  sides([h.map(([x, y]) => [x, y, z0] as V3), h.map(([x, y]) => [x, y, z1] as V3)], false, out);
}

/**
 * Helical gear: `outline` is the transverse profile at the mid-plane (z = 0); the profile turns by
 * `twist` rad per mm of z (sign = hand of the helix). `holes` are straight through.
 */
export function helicalGear(outline: Pt[], width: number, twist: number, holes: THREE.Path[] = [], slices = 14): THREE.BufferGeometry {
  const o = ccw(outline);
  const hp = holes.map((h) => cw(pathPoints(h)));
  const ringAt = (z: number): V3[] => {
    const c = Math.cos(twist * z);
    const s = Math.sin(twist * z);
    return o.map(([x, y]) => [x * c - y * s, x * s + y * c, z]);
  };
  const rings: V3[][] = [];
  for (let k = 0; k <= slices; k++) rings.push(ringAt(-width / 2 + (width * k) / slices));
  const tris: number[] = [];
  sides(rings, false, tris);
  for (const [z, up] of [
    [width / 2, true],
    [-width / 2, false],
  ] as [number, boolean][]) {
    const r = ringAt(z).map(([x, y]) => [x, y] as Pt);
    cap(r, hp, z, up, ([x, y]) => [x, y, z], tris);
  }
  for (const h of hp) holeWall(h, -width / 2, width / 2, tris);
  return creased(fromTriangles(tris), 32);
}

/**
 * Straight bevel gear, local frame: apex at the origin, axis +z. `heel` is the tooth outline seen along the
 * axis at the heel, with the radial tooth heights already projected (× cos δ).
 * The heel face lies on the back cone (perpendicular to the pitch cone): a point at radius r sits at
 * z = zHeel − (r − rp)·tan δ, so tooth tips are pulled back and roots pushed out, as on a real gear.
 * Inside the root circle (r < rMin) the face is flat. The solid is scaled about the apex down to
 * `toeScale` (toe), so every tooth line runs to the apex.
 */
export function bevelGear(
  heel: Pt[],
  zHeel: number,
  toeScale: number,
  cone: { rp: number; tanDelta: number; rMin: number },
  holes: THREE.Path[] = [],
  slices = 6,
): THREE.BufferGeometry {
  const o = ccw(heel);
  const hp = holes.map((h) => cw(pathPoints(h)));
  const zAt = (x: number, y: number): number => zHeel - (Math.max(Math.hypot(x, y), cone.rMin) - cone.rp) * cone.tanDelta;
  const zFlat = zAt(0, 0);
  const rings: V3[][] = [];
  // From toe to heel, so the CCW rings go up in z.
  for (let k = 0; k <= slices; k++) {
    const s = toeScale + ((1 - toeScale) * k) / slices;
    rings.push(o.map(([x, y]) => [x * s, y * s, zAt(x, y) * s]));
  }
  const tris: number[] = [];
  sides(rings, false, tris);
  cap(o, hp, zFlat, true, ([x, y]) => [x, y, zAt(x, y)], tris);
  const t = toeScale;
  cap(
    o.map(([x, y]) => [x * t, y * t] as Pt),
    hp,
    zFlat * t,
    false,
    ([x, y]) => [x, y, zAt(x / t, y / t) * t],
    tris,
  );
  for (const h of hp) holeWall(h, zFlat * t, zFlat, tris);
  return creased(fromTriangles(tris), 32);
}

/**
 * Flat plate from an outline in its own (u, v) plane, extruded by `t` along w and placed in the world.
 * `plane`: 'x' → wall perpendicular to X (u = −z, v = y, w = x); 'z' → perpendicular to Z (u = x, v = y, w = z).
 */
export function wallPlate(shape: THREE.Shape, t: number, plane: 'x' | 'z', at: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 40 });
  g.translate(0, 0, at - t / 2);
  if (plane === 'x') {
    // (u, v, w) → (w, v, −u)
    const m = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(m);
  }
  return g;
}

/** Rectangle shape [u0, u1] × [v0, v1]. */
export function rectShape(u0: number, u1: number, v0: number, v1: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(u0, v0);
  s.lineTo(u1, v0);
  s.lineTo(u1, v1);
  s.lineTo(u0, v1);
  s.lineTo(u0, v0);
  return s;
}

export { merge };
