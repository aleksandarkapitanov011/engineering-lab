/**
 * Procedural geometry helpers shared by mechanism modules. Everything is built in mm,
 * with the rotation axis along +Z.
 */
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pt } from '../core/involute';

/** Merges geometries after converting them to non-indexed (attributes must match: position, normal, uv). */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  // Keep only the attributes every part has (e.g. procedural gears carry no uv).
  const common = Object.keys(list[0]?.attributes ?? {}).filter((name) => list.every((g) => g.getAttribute(name)));
  for (const g of list) for (const name of Object.keys(g.attributes)) if (!common.includes(name)) g.deleteAttribute(name);
  for (const g of list) if (!g.getAttribute('normal')) g.computeVertexNormals();
  const merged = mergeGeometries(list, false);
  for (const g of geos) g.dispose();
  for (const g of list) g.dispose();
  if (!merged) throw new Error('mergeGeometries failed (attribute mismatch)');
  return merged;
}

/** Smooth normals across shallow angles, hard edges across sharp ones. */
export function creased(geo: THREE.BufferGeometry, angleDeg = 35): THREE.BufferGeometry {
  const out = toCreasedNormals(geo, (angleDeg * Math.PI) / 180);
  if (out !== geo) geo.dispose();
  return out;
}

/**
 * Solid of revolution from a profile of [radius, z] points, traversed counter-clockwise in the (r, z)
 * plane (solid on the left). Each edge becomes its own lathe so steps and shoulders keep hard edges.
 * `skip(i)` lets the caller leave out edge i (e.g. where a keyway extrusion replaces it).
 */
export function revolve(profile: Pt[], segments = 48, skip?: (i: number) => boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, z0] = profile[i];
    const [r1, z1] = profile[i + 1];
    if (r0 < 1e-6 && r1 < 1e-6) continue;
    if (Math.abs(r0 - r1) < 1e-9 && Math.abs(z0 - z1) < 1e-9) continue;
    if (skip?.(i)) continue;
    const g = new THREE.LatheGeometry([new THREE.Vector2(r0, z0), new THREE.Vector2(r1, z1)], segments);
    g.rotateX(Math.PI / 2);
    parts.push(g);
  }
  return merge(parts);
}

/** Closed rectangular ring profile with optional chamfers, for revolve(). */
export function ringProfile(ri: number, ro: number, z0: number, z1: number, c = 0.5): Pt[] {
  return [
    [ri + c, z0],
    [ro - c, z0],
    [ro, z0 + c],
    [ro, z1 - c],
    [ro - c, z1],
    [ri + c, z1],
    [ri, z1 - c],
    [ri, z0 + c],
    [ri + c, z0],
  ];
}

export interface ExtrudeOpts {
  bevel?: number;
  curveSegments?: number;
}

/** Extrudes a shape along +Z, centred on z = 0, total thickness `width` (bevel included). */
export function extrudeCentered(shape: THREE.Shape, width: number, o: ExtrudeOpts = {}): THREE.BufferGeometry {
  const bevel = o.bevel ?? 0;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, width - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: o.curveSegments ?? 48,
    steps: 1,
  });
  g.translate(0, 0, -(width - 2 * bevel) / 2);
  return g;
}

export function shapeFromPoints(pts: Pt[]): THREE.Shape {
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}

export function circlePath(r: number, cx = 0, cy = 0): THREE.Path {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, true);
  return p;
}

/** Bore of radius r with a hub keyway (width b, depth t2 beyond the bore) on the +X side, as a hole path. */
export function keyedBorePath(r: number, b: number, t2: number): THREE.Path {
  const a0 = Math.asin(b / 2 / r);
  const xc = r * Math.cos(a0);
  const p = new THREE.Path();
  p.moveTo(xc, -b / 2);
  p.lineTo(r + t2, -b / 2);
  p.lineTo(r + t2, b / 2);
  p.lineTo(xc, b / 2);
  p.absarc(0, 0, r, a0, Math.PI * 2 - a0, false);
  return p;
}

export interface ShaftSegment {
  z0: number;
  z1: number;
  r: number;
}

export interface ShaftKeyway {
  z0: number;
  z1: number;
  b: number;
  t1: number;
}

/**
 * Stepped shaft along Z from segments of constant radius, with end chamfers and an optional
 * flat-ended (form B) keyway on the +X side. Segments must be contiguous and sorted.
 */
export function steppedShaft(segs: ShaftSegment[], chamfer: number, key?: ShaftKeyway | ShaftKeyway[]): THREE.BufferGeometry {
  const keys = (Array.isArray(key) ? key : key ? [key] : []).slice().sort((p, q) => p.z0 - q.z0);
  const first = segs[0];
  const last = segs[segs.length - 1];
  const prof: Pt[] = [
    [0, first.z0],
    [first.r - chamfer, first.z0],
    [first.r, first.z0 + chamfer],
  ];
  const keyEdges = new Set<number>();
  segs.forEach((s, i) => {
    for (const k of keys) {
      if (k.z0 >= s.z0 && k.z1 <= s.z1) {
        prof.push([s.r, k.z0]);
        keyEdges.add(prof.length - 1); // edge from this point to the next is replaced by the extrusion
        prof.push([s.r, k.z1]);
      }
    }
    if (i < segs.length - 1) {
      prof.push([s.r, s.z1]);
      prof.push([segs[i + 1].r, s.z1]);
    }
  });
  prof.push([last.r, last.z1 - chamfer], [last.r - chamfer, last.z1], [0, last.z1]);
  const parts = [revolve(prof, 48, (i) => keyEdges.has(i))];

  for (const k of keys) {
    const seg = segs.find((s) => k.z0 >= s.z0 && k.z1 <= s.z1);
    if (!seg) continue;
    const r = seg.r;
    const a0 = Math.asin(k.b / 2 / r);
    const xc = r * Math.cos(a0);
    // Cross-section: circle with a rectangular notch on +X.
    const cs = new THREE.Shape();
    cs.moveTo(xc, k.b / 2);
    cs.absarc(0, 0, r, a0, Math.PI * 2 - a0, false);
    cs.lineTo(r - k.t1, -k.b / 2);
    cs.lineTo(r - k.t1, k.b / 2);
    cs.lineTo(xc, k.b / 2);
    const ex = new THREE.ExtrudeGeometry(cs, { depth: k.z1 - k.z0, bevelEnabled: false, curveSegments: 48 });
    ex.translate(0, 0, k.z0);
    parts.push(creased(ex, 30));
    // End walls of the keyway.
    const notch = new THREE.Shape();
    notch.moveTo(r - k.t1, -k.b / 2);
    notch.lineTo(xc, -k.b / 2);
    notch.absarc(0, 0, r, -a0, a0, false);
    notch.lineTo(r - k.t1, k.b / 2);
    notch.lineTo(r - k.t1, -k.b / 2);
    const capA = new THREE.ShapeGeometry(notch, 8);
    capA.translate(0, 0, k.z0);
    const capB = new THREE.ShapeGeometry(notch, 8);
    capB.rotateX(Math.PI);
    capB.translate(0, 0, k.z1);
    parts.push(capA, capB);
  }
  return merge(parts);
}

/** Rounded rectangle shape centred on the origin. */
export function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Simple deep-groove ball bearing as a group with children 'inner', 'outer', 'balls' (axis = Z). */
export function ballBearing(
  d: number,
  D: number,
  B: number,
  nBalls: number,
  ballD: number,
  mats: { ring: () => THREE.Material; ball: () => THREE.Material },
): THREE.Group {
  const g = new THREE.Group();
  const pitchR = (d + D) / 4;
  const br = ballD / 2;
  const innerRo = pitchR - br * 0.55;
  const outerRi = pitchR + br * 0.55;
  const inner = new THREE.Mesh(revolve(ringProfile(d / 2, innerRo, -B / 2, B / 2, 0.6), 48), mats.ring());
  inner.name = 'inner';
  const outer = new THREE.Mesh(revolve(ringProfile(outerRi, D / 2, -B / 2, B / 2, 0.6), 56), mats.ring());
  outer.name = 'outer';
  const balls: THREE.BufferGeometry[] = [];
  for (let i = 0; i < nBalls; i++) {
    const s = new THREE.SphereGeometry(br, 14, 10);
    const a = (i / nBalls) * Math.PI * 2;
    s.translate(pitchR * Math.cos(a), pitchR * Math.sin(a), 0);
    balls.push(s);
  }
  const ballMesh = new THREE.Mesh(merge(balls), mats.ball());
  ballMesh.name = 'balls';
  g.add(inner, outer, ballMesh);
  return g;
}
