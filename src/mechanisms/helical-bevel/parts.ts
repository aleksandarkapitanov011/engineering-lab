/** Parts of the helical-bevel gearbox (geometry + catalogue information, Bulgarian and English). */
import * as THREE from 'three';
import type { LText, PartDef } from '../../core/types';
import { gearOutline, type Pt } from '../../core/involute';
import { ballBearing, circlePath, extrudeCentered, keyedBorePath, roundedRect, steppedShaft } from '../../three/geom';
import { bevelGear, helicalGear, merge, wallPlate } from './geometry';
import { castLettering, decal, nameplateTexture, rotationSticker, sightGlassTexture, warningSticker } from '../../three/decals';
import {
  ALPHA_T,
  AXIS_Y,
  B1,
  B2,
  BASE_T,
  BB,
  BETA,
  BRG_6004,
  BRG_6005,
  BRG_6006,
  D1,
  D2,
  DE3,
  DE4,
  DELTA3,
  DELTA4,
  GEAR2_BODY,
  HEL_BACKLASH,
  HOUSING,
  KEY2,
  KEY3,
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

const L = (bg: string, en: string): LText => ({ bg, en });
const n = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

const HELICAL_COLOR = '#5b8bb8';
const BEVEL_COLOR = '#c27a45';

const segs = (list: [number, number, number][]) => list.map(([z0, z1, d]) => ({ z0, z1, r: d / 2 }));

/** Helical outline in the transverse plane. */
export function helicalOutline(z: number, phase: number): Pt[] {
  return gearOutline({ m: MT, z, alphaDeg: (ALPHA_T * 180) / Math.PI, backlash: HEL_BACKLASH, phase, flankSegments: 7, tipSegments: 2, rootSegments: 3 });
}

/** Heel outline of a straight bevel gear: the spur outline with the tooth height projected on the heel plane. */
export function bevelHeel(z: number, delta: number, phase: number): Pt[] {
  const rp = (MB * z) / 2;
  const c = Math.cos(delta);
  return gearOutline({ m: MB, z, backlash: 0.08, phase, flankSegments: 6, tipSegments: 2, rootSegments: 3 }).map(([x, y]) => {
    const r = Math.hypot(x, y);
    const k = (rp + (r - rp) * c) / r;
    return [x * k, y * k] as Pt;
  });
}

/** Back-cone data of a bevel gear for bevelGear(): pitch radius at the heel and its projected root radius. */
export function bevelCone(z: number, delta: number): { rp: number; tanDelta: number; rMin: number } {
  const rp = (MB * z) / 2;
  return { rp, tanDelta: Math.tan(delta), rMin: rp - 1.25 * MB * Math.cos(delta) - 0.01 };
}

function keyGeometry(shaftR: number, k: { b: number; h: number; t1: number; L: number }, zc: number): THREE.BufferGeometry {
  const g = extrudeCentered(roundedRect(k.h, k.b, 0.6), k.L, { bevel: 0.4, curveSegments: 4 });
  g.translate(shaftR - k.t1 + k.h / 2, 0, zc);
  return g;
}

function bearing(b: typeof BRG_6004, kit: Parameters<PartDef['build']>[0]['materials']): THREE.Object3D {
  return ballBearing(b.d, b.D, b.B, b.n, b.ball, { ring: kit.bearingSteel, ball: kit.chrome });
}

/**
 * Wall half of a split housing in its own (u, v) plane: from vBot up to the split plane (lower) or from the
 * split plane up to vTop (upper), with half-round notches for the bearing bores on the split line.
 */
function halfWall(u0: number, u1: number, vBot: number, vTop: number, split: number, notches: { u: number; r: number }[], lower: boolean): THREE.Shape {
  const s = new THREE.Shape();
  if (lower) {
    s.moveTo(u0, vBot);
    s.lineTo(u1, vBot);
    s.lineTo(u1, split);
    for (const n of [...notches].sort((a, b) => b.u - a.u)) {
      s.lineTo(n.u + n.r, split);
      s.absarc(n.u, split, n.r, 0, Math.PI, true); // dips down
    }
    s.lineTo(u0, split);
  } else {
    s.moveTo(u0, split);
    for (const n of [...notches].sort((a, b) => a.u - b.u)) {
      s.lineTo(n.u - n.r, split);
      s.absarc(n.u, split, n.r, Math.PI, 0, true); // arches up
    }
    s.lineTo(u1, split);
    s.lineTo(u1, vTop);
    s.lineTo(u0, vTop);
  }
  s.closePath();
  return s;
}

/** Half of a cast bearing boss around the local z axis: the half ring below (y < 0) or above the split. */
function halfBoss(rIn: number, rOut: number, len: number, lower: boolean): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const a0 = lower ? Math.PI : 0;
  s.absarc(0, 0, rOut, a0, a0 + Math.PI, false);
  s.absarc(0, 0, rIn, a0 + Math.PI, a0, true);
  s.closePath();
  return extrudeCentered(s, len, { bevel: 0.8, curveSegments: 40 });
}

/** Bolted end cap (local axis +z, centred on z = 0): a disc, optionally with a hole for the shaft, and 6 bolts. */
function endCap(r: number, hole: number, len: number): { cap: THREE.BufferGeometry; bolts: THREE.BufferGeometry } {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  if (hole > 0) s.holes.push(circlePath(hole));
  const cap = extrudeCentered(s, len, { bevel: 1, curveSegments: 48 });
  const bolts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const b = new THREE.CylinderGeometry(2.6, 2.6, 2.4, 6);
    b.rotateX(Math.PI / 2);
    b.translate((r - 5) * Math.cos(a), (r - 5) * Math.sin(a), len / 2 + 1.2);
    bolts.push(b);
  }
  return { cap, bolts: merge(bolts) };
}

/**
 * Split gearbox housing like a real one, made as a teaching model: the lower half is painted cast iron
 * (walls, inner ribs, bearing bosses, flange, base with feet), the upper half a clear acrylic cover, so the
 * gears stay visible. Bearing seats have bolted end caps; the cover has flange bolts, an inspection lid with
 * a breather and lifting eyes. Split plane = plane of the shaft axes (y = AXIS_Y), as in real gearboxes.
 */
function housingGroup(kit: Parameters<PartDef['build']>[0]['materials'], part: 'lower' | 'cover'): THREE.Group {
  const H = HOUSING;
  const g = new THREE.Group();
  const t = H.wall;
  const y0 = BASE_T;
  const split = AXIS_Y;
  const top = H.top;
  const paint = kit.paint('#4f6878', 0.28, 0.58); // machine blue-grey
  const capPaint = kit.paint('#3e5463', 0.3, 0.5);
  const steelBolt = kit.darkSteel();
  const acrylic = new THREE.MeshStandardMaterial({
    color: '#cfe6f5',
    metalness: 0,
    roughness: 0.06,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    envMapIntensity: 1.4,
  });
  const xL = H.leftWallX - t / 2; // outer face of the left wall
  const xR = H.x1; // outer face of the right wall
  const zB = H.z0; // outer face of the back wall
  const zF = H.frontWallZ + t / 2; // outer face of the front wall
  const r6004 = BRG_6004.D / 2 + 0.15;
  const r6005 = BRG_6005.D / 2 + 0.15;
  const r6006 = BRG_6006.D / 2 + 0.15;
  const lower: THREE.BufferGeometry[] = [];
  const upper: THREE.BufferGeometry[] = [];
  const both = (make: (lowerHalf: boolean) => THREE.BufferGeometry): void => {
    lower.push(make(true));
    upper.push(make(false));
  };

  // Walls, split at the axis plane (plane 'x': u = −z, v = y; plane 'z': u = x, v = y).
  both((lo) => wallPlate(halfWall(-zF, -zB, y0, top, split, [{ u: -S1_Z, r: r6004 }, { u: 0, r: r6004 }], lo), t, 'x', H.leftWallX));
  both((lo) => wallPlate(halfWall(-(H.frontWallZ - t / 2), -(zB + t), y0, top, split, [{ u: -S1_Z, r: r6004 }, { u: 0, r: r6006 }], lo), t, 'x', H.ribX));
  both((lo) => wallPlate(halfWall(-zF, -zB, y0, top, split, [], lo), t, 'x', xR - t / 2));
  both((lo) => wallPlate(halfWall(xL, xR, y0, top, split, [], lo), t, 'z', zB + t / 2));
  both((lo) => wallPlate(halfWall(xL, xR, y0, top, split, [{ u: 0, r: r6005 }], lo), t, 'z', H.frontWallZ));
  both((lo) => wallPlate(halfWall(-40, 40, y0, AXIS_Y + 42, split, [{ u: 0, r: r6006 }], lo), t, 'z', H.outRibZ));

  // Split flanges: a rim 9 mm wide around the walls, 7 mm below (iron) and above (acrylic) the split.
  const rim = (y: number): THREE.BufferGeometry => {
    const o = new THREE.Shape();
    const ox0 = xL - 9;
    const ox1 = xR + 9;
    const oz0 = zB - 9;
    const oz1 = zF + 9;
    const rr = 8;
    // Shape in (x, −z), so that rotateX(−π/2) puts it in the horizontal plane with the right orientation.
    o.moveTo(ox0 + rr, -oz1);
    o.lineTo(ox1 - rr, -oz1);
    o.quadraticCurveTo(ox1, -oz1, ox1, -oz1 + rr);
    o.lineTo(ox1, -oz0 - rr);
    o.quadraticCurveTo(ox1, -oz0, ox1 - rr, -oz0);
    o.lineTo(ox0 + rr, -oz0);
    o.quadraticCurveTo(ox0, -oz0, ox0, -oz0 - rr);
    o.lineTo(ox0, -oz1 + rr);
    o.quadraticCurveTo(ox0, -oz1, ox0 + rr, -oz1);
    const hole = new THREE.Path();
    hole.moveTo(xL, -zF);
    hole.lineTo(xL, -zB);
    hole.lineTo(xR, -zB);
    hole.lineTo(xR, -zF);
    hole.lineTo(xL, -zF);
    o.holes.push(hole);
    const geo = extrudeCentered(o, 7, { bevel: 0.6, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    return geo;
  };
  lower.push(rim(split - 3.5));
  upper.push(rim(split + 3.5));

  // Bearing bosses outside the outer walls (left wall: shafts 1 and 2; front wall: output shaft), each with a
  // bolted end cap. Built along local z, then turned onto the axis; local y stays world y, so the halves split
  // exactly at the axis plane.
  const bossLen = 12;
  const bosses: { at: THREE.Vector3; yaw: number; rIn: number; hole: number }[] = [
    { at: new THREE.Vector3(xL - bossLen / 2, AXIS_Y, S1_Z), yaw: -Math.PI / 2, rIn: r6004, hole: 10 },
    { at: new THREE.Vector3(xL - bossLen / 2, AXIS_Y, 0), yaw: -Math.PI / 2, rIn: r6004, hole: 0 },
    { at: new THREE.Vector3(0, AXIS_Y, zF + bossLen / 2), yaw: 0, rIn: r6005, hole: 12 },
  ];
  const caps: THREE.BufferGeometry[] = [];
  const capBolts: THREE.BufferGeometry[] = [];
  for (const b of bosses) {
    const m = new THREE.Matrix4().makeRotationY(b.yaw).setPosition(b.at);
    const rOut = b.rIn + 12;
    for (const lo of [true, false]) (lo ? lower : upper).push(halfBoss(b.rIn, rOut, bossLen, lo).applyMatrix4(m));
    const { cap, bolts } = endCap(rOut - 1, b.hole, 6);
    cap.translate(0, 0, bossLen / 2 + 3);
    bolts.translate(0, 0, bossLen / 2 + 3);
    caps.push(cap.applyMatrix4(m));
    capBolts.push(bolts.applyMatrix4(m));
  }

  // Roof of the cover.
  const roof = new THREE.Shape();
  roof.moveTo(xL, -zF);
  roof.lineTo(xR, -zF);
  roof.lineTo(xR, -zB);
  roof.lineTo(xL, -zB);
  roof.closePath();
  const roofGeo = extrudeCentered(roof, 8, { bevel: 1.2, curveSegments: 4 });
  roofGeo.rotateX(-Math.PI / 2);
  roofGeo.translate(0, top + 4, 0);
  upper.push(roofGeo);
  // ---- Small parts, as on a real gearbox.
  const steel: THREE.BufferGeometry[] = [];
  const washers: THREE.BufferGeometry[] = [];
  const brassParts: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  const copper: THREE.BufferGeometry[] = [];
  const painted: THREE.BufferGeometry[] = [];
  // The same small parts on the cover (it comes off as one piece in the exploded view).
  const cSteel: THREE.BufferGeometry[] = [];
  const cWashers: THREE.BufferGeometry[] = [];
  const cPainted: THREE.BufferGeometry[] = [];
  let onCover = true;
  /** Hex head + washer, standing on a surface at `at` with the bolt axis `axis` (outwards). */
  const bolt = (at: THREE.Vector3, axis: 'x' | 'y' | 'z', sign: 1 | -1, r = 2.6, h = 2.2): void => {
    const head = new THREE.CylinderGeometry(r, r, h, 6);
    const wash = new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.7, 20);
    head.translate(0, 0.7 + h / 2, 0);
    wash.translate(0, 0.35, 0);
    for (const gg of [head, wash]) {
      if (axis === 'x') gg.rotateZ(sign > 0 ? -Math.PI / 2 : Math.PI / 2);
      else if (axis === 'z') gg.rotateX(sign > 0 ? Math.PI / 2 : -Math.PI / 2);
      else if (sign < 0) gg.rotateX(Math.PI);
      gg.translate(at.x, at.y, at.z);
    }
    (onCover ? cSteel : steel).push(head);
    (onCover ? cWashers : washers).push(wash);
  };
  const yRoof = top + 8; // top face of the cover

  // Inspection lid: rubber gasket, ribbed cover, four bolts, and a vent plug in the middle.
  const lx = -60;
  const lz = 20;
  const gasket = extrudeCentered(roundedRect(74, 54, 6), 1.2, { curveSegments: 6 });
  gasket.rotateX(-Math.PI / 2);
  gasket.translate(lx, yRoof + 0.6, lz);
  rubber.push(gasket);
  const lid = extrudeCentered(roundedRect(70, 50, 5), 4, { bevel: 0.8, curveSegments: 6 });
  lid.rotateX(-Math.PI / 2);
  lid.translate(lx, yRoof + 3.2, lz);
  cPainted.push(lid);
  for (const dz of [-12, 12]) {
    const rib = new THREE.BoxGeometry(46, 2.2, 2.4);
    rib.translate(lx, yRoof + 6.3, lz + dz);
    cPainted.push(rib);
  }
  for (const [dx, dz] of [
    [-29, -19],
    [29, -19],
    [-29, 19],
    [29, 19],
  ]) bolt(new THREE.Vector3(lx + dx, yRoof + 5.2, lz + dz), 'y', 1);
  const ventHex = new THREE.CylinderGeometry(5.5, 5.5, 3.5, 6);
  ventHex.translate(lx, yRoof + 7, lz);
  const ventNeck = new THREE.CylinderGeometry(3, 3, 3, 16);
  ventNeck.translate(lx, yRoof + 10.2, lz);
  const ventDome = new THREE.SphereGeometry(6.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  ventDome.translate(lx, yRoof + 11.5, lz);
  const ventRim = new THREE.TorusGeometry(6.5, 0.7, 8, 32);
  ventRim.rotateX(Math.PI / 2);
  ventRim.translate(lx, yRoof + 11.5, lz);
  brassParts.push(ventHex, ventDome, ventRim);
  cSteel.push(ventNeck);

  // Lifting eye bolts (DIN 580): cast pad, collar, neck and a forged ring standing up.
  for (const x of [xL + 24, xR - 24]) {
    const z = (zB + zF) / 2;
    const pad = new THREE.CylinderGeometry(11, 12, 3, 32);
    pad.translate(x, yRoof + 1.5, z);
    cPainted.push(pad);
    const collar = new THREE.CylinderGeometry(8, 8.5, 3, 32);
    collar.translate(x, yRoof + 4.5, z);
    const neck = new THREE.CylinderGeometry(4.2, 5, 4, 16);
    neck.translate(x, yRoof + 8, z);
    const ring = new THREE.TorusGeometry(8, 2.7, 14, 40);
    ring.translate(x, yRoof + 9.5 + 8 + 1.2, z);
    cSteel.push(collar, neck, ring);
  }

  // Flange bolts along the split (heads on the cover flange, with washers), away from the bosses.
  const fb = (x: number, z: number): void => bolt(new THREE.Vector3(x, split + 7, z), 'y', 1, 3.2, 2.8);
  for (const x of [-105, -60, -15, 30]) {
    fb(x, zB - 4.5);
    fb(x, zF + 4.5);
  }
  for (const z of [-50, 35, 100]) fb(xR + 4.5, z);
  for (const z of [-50, 103]) fb(xL - 4.5, z);

  onCover = false;

  // Base plate with feet: studs, washers and nuts.
  const base = extrudeCentered(roundedRect(xR - xL + 44, zF - zB + 24, 10), BASE_T, { bevel: 1.2, curveSegments: 8 });
  base.rotateX(-Math.PI / 2);
  base.translate((xL + xR) / 2, BASE_T / 2, (zB + zF) / 2);
  lower.push(base);
  for (const x of [xL - 12, xR + 12]) {
    for (const z of [zB + 14, zF - 14]) {
      bolt(new THREE.Vector3(x, BASE_T, z), 'y', 1, 5, 4.2);
      const stud = new THREE.CylinderGeometry(2.6, 2.6, 5, 12);
      stud.translate(x, BASE_T + 7.5, z);
      steel.push(stud);
    }
  }

  // Oil drain plug low on the right wall, with a copper sealing ring.
  const drainRing = new THREE.CylinderGeometry(7.5, 7.5, 1.2, 24);
  drainRing.rotateZ(-Math.PI / 2);
  drainRing.translate(xR + 0.6, BASE_T + 14, 40);
  copper.push(drainRing);
  const drain = new THREE.CylinderGeometry(5.5, 5.5, 4.5, 6);
  drain.rotateZ(-Math.PI / 2);
  drain.translate(xR + 3.4, BASE_T + 14, 40);
  steel.push(drain);

  // Oil sight glass in the front wall: a chrome ring with three screws around the level glass.
  const sgX = 44;
  const sgY = 36;
  const sgRing = new THREE.Shape();
  sgRing.absarc(0, 0, 12, 0, Math.PI * 2, false);
  sgRing.holes.push(circlePath(8.2));
  const sgGeo = extrudeCentered(sgRing, 3, { bevel: 0.6, curveSegments: 40 });
  sgGeo.translate(sgX, sgY, zF + 1.5);
  steel.push(sgGeo);
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const sc = new THREE.CylinderGeometry(1.3, 1.3, 1, 12);
    sc.rotateX(Math.PI / 2);
    sc.translate(sgX + 10 * Math.cos(a), sgY + 10 * Math.sin(a), zF + 3.4);
    washers.push(sc);
  }

  if (part === 'cover') {
    g.add(new THREE.Mesh(merge(upper), acrylic));
    g.add(new THREE.Mesh(merge(cPainted), capPaint));
    g.add(new THREE.Mesh(merge(cSteel), steelBolt));
    g.add(new THREE.Mesh(merge(cWashers), kit.chrome()));
    g.add(new THREE.Mesh(merge(brassParts), kit.paint('#c8a04a', 0.85, 0.28)));
    g.add(new THREE.Mesh(merge(rubber), kit.paint('#1f2328', 0, 0.9)));
    return g;
  }
  g.add(new THREE.Mesh(merge(lower), paint));
  g.add(new THREE.Mesh(merge([...caps, ...painted]), capPaint));
  g.add(new THREE.Mesh(merge([...capBolts, ...steel]), steelBolt));
  g.add(new THREE.Mesh(merge(washers), kit.chrome()));
  g.add(new THREE.Mesh(merge(copper), kit.paint('#b87333', 0.9, 0.3)));

  // Markings: nameplate, cast lettering, rotation arrows on the shaft ends, warning sticker, sight glass.
  const decals = [
    decal(
      nameplateTexture('ENGINEERING LAB', [
        ['TYPE', 'HB 2-70 / i = 6'],
        ['n1 / n2', '1500 / 250 min-1'],
        ['OIL', 'ISO VG 220 · 0,6 l'],
      ]),
      70,
      42,
      { x: -86, y: 42, z: zF },
      { x: 0, y: 0, z: 1 },
      { metal: true },
    ),
    decal(castLettering('ENGINEERING LAB'), 150, 18.75, { x: xR, y: 46, z: (zB + zF) / 2 }, { x: 1, y: 0, z: 0 }),
    decal(rotationSticker(false, 'OUT'), 30, 30, { x: 0, y: AXIS_Y, z: zF + 18 }, { x: 0, y: 0, z: 1 }),
    decal(rotationSticker(false, 'IN'), 28, 28, { x: xL - 18, y: AXIS_Y, z: S1_Z }, { x: -1, y: 0, z: 0 }),
    decal(warningSticker('HOT'), 16, 18.75, { x: xL, y: 32, z: 35 }, { x: -1, y: 0, z: 0 }),
    decal(sightGlassTexture(), 16.4, 16.4, { x: sgX, y: sgY, z: zF + 0.6 }, { x: 0, y: 0, z: 1 }),
  ];
  for (const d of decals) if (d) g.add(d);
  return g;
}

export function makeParts(): PartDef[] {
  const tanB = Math.tan(BETA);
  const brgInfo = (b: typeof BRG_6004): PartDef['meta']['dims'] => [
    { label: L('d × D × B', 'd × D × B'), value: `${b.d} × ${b.D} × ${b.B} mm` },
    { label: L('Тела', 'Rolling elements'), value: `${b.n} × ø${n(b.ball, 2)} mm` },
  ];
  const bearingPart = (id: string, body: string, z: number, b: typeof BRG_6004, out: number, name: LText, func: LText, spread = out): PartDef => ({
    id,
    body,
    position: [0, 0, z],
    spin: { outer: 0, balls: 0.4 },
    explode: { offset: [0, 0, spread], order: 2 },
    approach: [0, 0, out],
    build: ({ materials }) => bearing(b, materials),
    meta: { name, label: L(`Лагер ${id.slice(3)}`, `Bearing ${id.slice(3)}`), material: L('Лагерна стомана 100Cr6', 'Bearing steel 100Cr6'), func, dims: brgInfo(b) },
  });

  const list: PartDef[] = [
    {
      id: 'housing',
      fixed: true,
      position: [0, 0, 0],
      explode: { offset: [0, 0, 0], order: 0 },
      build: ({ materials }) => housingGroup(materials, 'lower'),
      meta: {
        name: L('Корпус (долна половина)', 'Housing (lower half)'),
        label: L('Корпус', 'Housing'),
        material: L('Сив чугун EN-GJL-250', 'Grey cast iron EN-GJL-250'),
        func: L(
          'Разделен в равнината на осите: долната половина е от чугун, а горната тук е прозрачна (учебен модел), за да се виждат колелата. Носи лагерите на трите вала и пази точните им положения – междуосието на цилиндричното стъпало и пресичането на осите на коничното под 90°. Лагерите са затворени с капачки на болтове; отдолу е маслената вана.',
          'Split in the plane of the axes: the lower half is cast iron, the upper one is clear here (a teaching model), so the gears are visible. Holds the bearings of the three shafts and keeps their exact positions – the centre distance of the helical stage and the 90° intersection of the bevel axes. The bearings are closed with bolted end caps; the oil sump is at the bottom.',
        ),
        dims: [
          { label: L('Габарит', 'Overall size'), value: `${HOUSING.x1 - HOUSING.x0} × ${HOUSING.top} × ${HOUSING.z1 - HOUSING.z0} mm` },
          { label: L('Височина на осите', 'Axis height'), value: `${AXIS_Y} mm` },
        ],
      },
    },
    {
      id: 'cover',
      fixed: true,
      position: [0, 0, 0],
      // Comes off first: up and back, out of the way of the shafts.
      explode: { offset: [0, 190, -170], order: 0 },
      build: ({ materials }) => housingGroup(materials, 'cover'),
      meta: {
        name: L('Капак на корпуса (прозрачен)', 'Housing cover (clear)'),
        label: L('Капак', 'Cover'),
        material: L('Акрил (учебен модел); в реален редуктор – чугун', 'Acrylic (teaching model); cast iron in a real gearbox'),
        func: L(
          'Горната половина на корпуса. Затваря редуктора над равнината на осите и притиска горните половини на лагерните гнезда. Има ревизионен капак с отдушник (изравнява налягането при загряване) и два рим-болта за повдигане.',
          'The upper half of the housing. Closes the gearbox above the plane of the axes and holds the upper halves of the bearing seats. Has an inspection lid with a breather (equalises the pressure as it warms up) and two eye bolts for lifting.',
        ),
        dims: [{ label: L('Болтове по фланеца', 'Flange bolts'), value: '13 × M8' }],
      },
    },
    {
      id: 'shaft1',
      body: 's1',
      position: [0, 0, 0],
      explode: { offset: [0, 0, 0], order: 2 },
      approach: [0, 0, 90],
      build: ({ materials }) => {
        const grp = new THREE.Group();
        grp.add(new THREE.Mesh(steppedShaft(segs(SHAFT1), 0.8, SHAFT1_KEYWAY), materials.steel()));
        const teeth = helicalGear(helicalOutline(Z1, Math.PI), B1, tanB / (D1 / 2));
        teeth.translate(0, 0, STAGE1_Z);
        grp.add(new THREE.Mesh(teeth, materials.paint(HELICAL_COLOR, 0.55, 0.35)));
        return grp;
      },
      meta: {
        name: L(`Входящ вал-зъбно колело z₁ = ${Z1}`, `Input pinion shaft z₁ = ${Z1}`),
        label: L('Входящ вал z₁', 'Input shaft z₁'),
        material: L('Стомана 18CrNiMo7-6, циментирани и закалени зъби', 'Steel 18CrNiMo7-6, case-hardened teeth'),
        func: L(
          'Получава момента от двигателя. Косите зъби са нарязани направо върху вала – колелото е твърде малко за отвор с шпонка. Осовата сила от наклона на зъбите се поема от лагерите.',
          'Takes the torque from the motor. The helical teeth are cut straight on the shaft – the pinion is too small for a bore with a key. The axial force from the helix is taken by the bearings.',
        ),
        dims: [
          { label: L('Модул / наклон', 'Module / helix'), value: `mₙ = ${MN} mm, β = ${n((BETA * 180) / Math.PI, 2)}°` },
          { label: L('Зъби / ширина', 'Teeth / width'), value: `z = ${Z1}, b = ${B1} mm` },
          { label: L('Делителен диаметър', 'Pitch diameter'), value: `d = ${n(D1, 2)} mm` },
        ],
      },
    },
    bearingPart(
      'brg1A',
      's1',
      S1_BRG_A,
      BRG_6004,
      60,
      L('Лагер 6004 – вал 1, опора A', 'Bearing 6004 – shaft 1, A'),
      L('Опората до входящия край. Поема радиалната сила и част от осовата.', 'The support at the input end. Takes the radial force and part of the axial force.'),
    ),
    bearingPart(
      'brg1B',
      's1',
      S1_BRG_B,
      BRG_6004,
      -40,
      L('Лагер 6004 – вал 1, опора B', 'Bearing 6004 – shaft 1, B'),
      L('Втората опора на входящия вал, във вътрешната преграда на корпуса.', 'The second support of the input shaft, in the inner rib of the housing.'),
    ),
    {
      id: 'shaft2',
      body: 's2',
      position: [0, 0, 0],
      explode: { offset: [0, 0, 0], order: 2 },
      approach: [0, 90, 0],
      build: ({ materials }) => {
        const grp = new THREE.Group();
        grp.add(new THREE.Mesh(steppedShaft(segs(SHAFT2), 0.8, SHAFT2_KEYWAY), materials.steel()));
        const heel = bevelHeel(Z3, DELTA3, 0);
        grp.add(new THREE.Mesh(bevelGear(heel, RE * Math.cos(DELTA3), (RE - BB) / RE, bevelCone(Z3, DELTA3)), materials.paint(BEVEL_COLOR, 0.6, 0.35)));
        return grp;
      },
      meta: {
        name: L(`Междинен вал с конично колело z₃ = ${Z3}`, `Intermediate shaft with bevel pinion z₃ = ${Z3}`),
        label: L('Междинен вал z₃', 'Intermediate shaft z₃'),
        material: L('Стомана 18CrNiMo7-6, циментирани и закалени зъби', 'Steel 18CrNiMo7-6, case-hardened teeth'),
        func: L(
          'Носи голямото косозъбо колело на първото стъпало и коничното малко колело на второто. Коничното колело е изработено заедно с вала и е конзолно – извън двата лагера.',
          'Carries the large helical gear of the first stage and the bevel pinion of the second. The bevel pinion is made in one piece with the shaft and is overhung – outside the two bearings.',
        ),
        dims: [
          { label: L('Конично колело', 'Bevel pinion'), value: `m = ${n(MB, 1)} mm, z = ${Z3}, δ = ${n((DELTA3 * 180) / Math.PI, 2)}°` },
          { label: L('Седло на колелото', 'Gear seat'), value: 'ø26 k6' },
          { label: L('Лагери', 'Bearings'), value: '6006 / 6004' },
        ],
      },
    },
    bearingPart(
      'brg2B',
      's2',
      S2_BRG_B,
      BRG_6006,
      90,
      L('Лагер 6006 – вал 2, опора B', 'Bearing 6006 – shaft 2, B'),
      L(
        'Стои непосредствено зад коничното колело и поема най-голямата сила – от конзолното зацепване. Затова е по-голям от останалите.',
        'Sits right behind the bevel pinion and takes the largest force – from the overhung mesh. That is why it is larger than the others.',
      ),
      45,
    ),
    {
      id: 'key2',
      body: 's2',
      position: [0, 0, 0],
      explode: { offset: [22, 0, 0], order: 3, frame: 'spin' },
      build: ({ materials }) => new THREE.Mesh(keyGeometry(13, KEY2, (SHAFT2_KEYWAY.z0 + SHAFT2_KEYWAY.z1) / 2), materials.darkSteel()),
      meta: {
        name: L('Призматична шпонка 8×7×16', 'Parallel key 8×7×16'),
        label: L('Шпонка', 'Key'),
        material: L('Стомана C45, калибрирана', 'Steel C45, bright drawn'),
        func: L('Предава момента от голямото косозъбо колело към междинния вал.', 'Transmits the torque from the large helical gear to the intermediate shaft.'),
        dims: [{ label: L('b × h × l', 'b × h × l'), value: '8 × 7 × 16 mm' }],
      },
    },
    {
      id: 'gear2',
      body: 's2',
      position: [0, 0, STAGE1_Z],
      explode: { offset: [0, 0, 72], order: 2 },
      approach: [0, 0, 60],
      build: ({ materials }) => {
        const b = GEAR2_BODY;
        const rim = helicalGear(helicalOutline(Z2, Math.PI / Z2), B2, -tanB / (D2 / 2), [circlePath(b.rimInner)]);
        const web = new THREE.Shape();
        web.absarc(0, 0, b.rimInner + 1, 0, Math.PI * 2, false);
        web.holes.push(circlePath(b.hubR - 0.5));
        for (let i = 0; i < b.holes; i++) {
          const a = ((i + 0.5) / b.holes) * Math.PI * 2;
          web.holes.push(circlePath(b.holeR, b.holePitchR * Math.cos(a), b.holePitchR * Math.sin(a)));
        }
        const hub = new THREE.Shape();
        hub.absarc(0, 0, b.hubR, 0, Math.PI * 2, false);
        hub.holes.push(keyedBorePath(b.bore, KEY2.b, KEY2.t2));
        const geo = merge([rim, extrudeCentered(web, b.web, { bevel: 0.3, curveSegments: 40 }), extrudeCentered(hub, B2, { bevel: 0.5, curveSegments: 40 })]);
        return new THREE.Mesh(geo, materials.paint(HELICAL_COLOR, 0.55, 0.38));
      },
      meta: {
        name: L(`Косозъбо колело z₂ = ${Z2}`, `Helical gear z₂ = ${Z2}`),
        label: L('Косозъбо колело z₂', 'Helical gear z₂'),
        material: L('Стомана 42CrMo4, подобрена и азотирана', 'Steel 42CrMo4, quenched, tempered and nitrided'),
        func: L(
          `Първото стъпало намалява оборотите ${n(Z2 / Z1, 0)} пъти. Косите зъби влизат в зацепване постепенно – предавката е по-тиха и по-натоварваема от правозъбата.`,
          `The first stage reduces the speed ${n(Z2 / Z1, 0)} times. The helical teeth enter the mesh gradually – the stage is quieter and carries more load than a spur one.`,
        ),
        dims: [
          { label: L('Модул / наклон', 'Module / helix'), value: `mₙ = ${MN} mm, β = ${n((BETA * 180) / Math.PI, 2)}°` },
          { label: L('Зъби / ширина', 'Teeth / width'), value: `z = ${Z2}, b = ${B2} mm` },
          { label: L('Делителен диаметър', 'Pitch diameter'), value: `d = ${n(D2, 1)} mm` },
        ],
      },
    },
    bearingPart(
      'brg2A',
      's2',
      S2_BRG_A,
      BRG_6004,
      60,
      L('Лагер 6004 – вал 2, опора A', 'Bearing 6004 – shaft 2, A'),
      L('Опората в лявата стена на корпуса.', 'The support in the left wall of the housing.'),
      80,
    ),
    {
      id: 'shaft3',
      body: 's3',
      position: [0, 0, 0],
      explode: { offset: [0, 0, 0], order: 2 },
      approach: [0, 0, 100],
      build: ({ materials }) => new THREE.Mesh(steppedShaft(segs(SHAFT3), 0.8, [SHAFT3_KEYWAY, SHAFT3_OUT_KEYWAY]), materials.steel()),
      meta: {
        name: L('Изходящ вал', 'Output shaft'),
        material: L('Стомана 42CrMo4, подобрена', 'Steel 42CrMo4, quenched and tempered'),
        func: L(
          'Оста му е под 90° спрямо входящия вал. Носи голямото конично колело и предава намалените 6 пъти обороти към работната машина.',
          'Its axis is at 90° to the input shaft. It carries the large bevel gear and delivers the speed, reduced 6 times, to the driven machine.',
        ),
        dims: [
          { label: L('Седло на колелото', 'Gear seat'), value: 'ø26 k6' },
          { label: L('Изходящ край', 'Output end'), value: 'ø22 h9' },
          { label: L('Лагери', 'Bearings'), value: '6006 / 6005' },
        ],
      },
    },
    {
      id: 'key3',
      body: 's3',
      position: [0, 0, 0],
      explode: { offset: [22, 0, 0], order: 3, frame: 'spin' },
      build: ({ materials }) => new THREE.Mesh(keyGeometry(13, KEY3, (SHAFT3_KEYWAY.z0 + SHAFT3_KEYWAY.z1) / 2), materials.darkSteel()),
      meta: {
        name: L('Призматична шпонка 8×7×14', 'Parallel key 8×7×14'),
        label: L('Шпонка', 'Key'),
        material: L('Стомана C45, калибрирана', 'Steel C45, bright drawn'),
        func: L('Свързва голямото конично колело с изходящия вал.', 'Connects the large bevel gear to the output shaft.'),
        dims: [{ label: L('b × h × l', 'b × h × l'), value: '8 × 7 × 14 mm' }],
      },
    },
    {
      id: 'gear4',
      body: 's3',
      position: [0, 0, 0],
      explode: { offset: [0, 0, -45], order: 2 },
      approach: [0, 0, -40],
      build: ({ materials }) => {
        const zHeel = RE * Math.cos(DELTA4);
        const cone = bevelCone(Z4, DELTA4);
        // The heel face of the teeth is on the back cone; inside the root circle it is flat at zBack.
        const zBack = zHeel + (cone.rp - cone.rMin) * cone.tanDelta;
        const teeth = bevelGear(bevelHeel(Z4, DELTA4, Math.PI + Math.PI / Z4), zHeel, (RE - BB) / RE, cone, [keyedBorePath(13, KEY3.b, KEY3.t2)]);
        const disk = new THREE.Shape();
        disk.absarc(0, 0, DE4 / 2 - 4, 0, Math.PI * 2, false);
        disk.holes.push(keyedBorePath(13, KEY3.b, KEY3.t2));
        const diskGeo = extrudeCentered(disk, 4, { bevel: 0.4, curveSegments: 48 });
        diskGeo.translate(0, 0, zBack + 2); // behind the teeth, clear of the pinion tips
        const hub = new THREE.Shape();
        hub.absarc(0, 0, 20, 0, Math.PI * 2, false);
        hub.holes.push(keyedBorePath(13, KEY3.b, KEY3.t2));
        const hubGeo = extrudeCentered(hub, 28 - zHeel, { bevel: 0.4, curveSegments: 40 });
        hubGeo.translate(0, 0, (28 + zHeel) / 2);
        return new THREE.Mesh(merge([teeth, diskGeo, hubGeo]), materials.paint(BEVEL_COLOR, 0.6, 0.35));
      },
      meta: {
        name: L(`Конично колело z₄ = ${Z4}`, `Bevel gear z₄ = ${Z4}`),
        label: L('Конично колело z₄', 'Bevel gear z₄'),
        material: L('Стомана 18CrNiMo7-6, циментирани и закалени зъби', 'Steel 18CrNiMo7-6, case-hardened teeth'),
        func: L(
          'Второто стъпало завърта движението на 90° и намалява оборотите още 2 пъти. Зъбите се стесняват към върха на конуса, където се пресичат осите.',
          'The second stage turns the motion through 90° and reduces the speed 2 more times. The teeth get smaller towards the cone apex, where the axes meet.',
        ),
        dims: [
          { label: L('Модул / зъби', 'Module / teeth'), value: `m = ${n(MB, 1)} mm, z = ${Z4}` },
          { label: L('Ъгъл на конуса', 'Cone angle'), value: `δ = ${n((DELTA4 * 180) / Math.PI, 2)}°` },
          { label: L('Диаметър / ширина', 'Diameter / width'), value: `dₑ = ${DE4} mm, b = ${BB} mm` },
        ],
      },
    },
    bearingPart(
      'brg3A',
      's3',
      S3_BRG_A,
      BRG_6006,
      70,
      L('Лагер 6006 – вал 3, опора A', 'Bearing 6006 – shaft 3, A'),
      L('Опората до коничното колело. Поема силите от зацепването.', 'The support next to the bevel gear. Takes the forces from the mesh.'),
      100,
    ),
    bearingPart(
      'brg3B',
      's3',
      S3_BRG_B,
      BRG_6005,
      60,
      L('Лагер 6005 – вал 3, опора B', 'Bearing 6005 – shaft 3, B'),
      L('Опората в предната стена, до изходящия край.', 'The support in the front wall, next to the output end.'),
    ),
  ];
  // Exploded view, step 2 (after the cover is off): everything on a shaft lifts out of the housing together
  // and the three shafts move apart (body frame of shafts 1 and 2: x = world +z, z = world −x).
  const lift: Record<string, PartDef['position']> = { s1: [100, 110, 0], s2: [0, 130, 0], s3: [130, 110, 0] };
  return list.map((p) => (p.body && lift[p.body] ? { ...p, explode: { ...p.explode, group: { offset: lift[p.body], order: 1 } } } : p));
}

/** For the drawings and the theory: pitch diameters and other derived numbers. */
export const DERIVED = { D1, D2, DE3, DE4, RE, S1_Z, KEY2, KEY3, BRG_6004, BRG_6005, BRG_6006 };
