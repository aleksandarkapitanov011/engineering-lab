/**
 * Small 3D models for the catalogue cards of entries that have no full model yet (teasers) and for the
 * folders. Real gear geometry (involute outlines, helical and bevel bodies), built only once to render
 * a picture, so it can afford some detail.
 */
import * as THREE from 'three';
import type { Preview3D } from '../core/types';
import type { MaterialKit } from '../three/materials';
import { gearOutline, type Pt } from '../core/involute';
import { circlePath, creased, extrudeCentered, shapeFromPoints } from '../three/geom';
import { bevelGear, helicalGear } from './helical-bevel/geometry';
import { bevelCone, bevelHeel } from './helical-bevel/parts';
import { BB, DELTA3, DELTA4, RE, Z3, Z4 } from './helical-bevel/params';

const BLUE = '#5b8bb8';
const COPPER = '#c27a45';
const GOLD = '#c9963f';
const BRONZE = '#b07a3c';

function cylinder(kit: MaterialKit, r: number, z0: number, z1: number, mat?: THREE.Material): THREE.Mesh {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, 40);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return new THREE.Mesh(g, mat ?? kit.steel());
}

/** Spur gear along +z, centred on z = 0, with a bore. */
function spur(kit: MaterialKit, m: number, z: number, width: number, phase: number, bore: number, color: string): THREE.Mesh {
  const shape = shapeFromPoints(gearOutline({ m, z, phase, backlash: 0.06 * m }));
  shape.holes.push(circlePath(bore));
  return new THREE.Mesh(creased(extrudeCentered(shape, width, { bevel: 0.25 * m, curveSegments: 32 }), 30), kit.paint(color, 0.55, 0.35));
}

/** Rotates a group so its local +z points along `axis`. */
function along(obj: THREE.Object3D, axis: [number, number, number]): THREE.Object3D {
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...axis).normalize());
  return obj;
}

// ---------------------------------------------------------------- spur pair (folder "Gear drives")
export const spurPairPreview: Preview3D = {
  dir: [0.55, 0.55, 1],
  build(kit) {
    const m = 4;
    const z1 = 13;
    const z2 = 22;
    const a = (m * (z1 + z2)) / 2;
    const g = new THREE.Group();
    const p = spur(kit, m, z1, 20, 0, 6, BLUE);
    const w = spur(kit, m, z2, 20, Math.PI + Math.PI / z2, 9, GOLD);
    w.position.x = a;
    g.add(p, w);
    const s1 = cylinder(kit, 6, -22, 30);
    const s2 = cylinder(kit, 9, -22, 30);
    s2.position.x = a;
    g.add(s1, s2);
    return g;
  },
};

// ---------------------------------------------------------------- straight bevel pair
export const bevelPreview: Preview3D = {
  dir: [0.85, 0.8, -0.95], // from the apex side: the teeth of both gears face the camera
  build(kit) {
    const g = new THREE.Group();
    const t = (RE - BB) / RE;
    const pin = new THREE.Group();
    pin.add(new THREE.Mesh(bevelGear(bevelHeel(Z3, DELTA3, 0), RE * Math.cos(DELTA3), t, bevelCone(Z3, DELTA3)), kit.paint(BLUE, 0.55, 0.35)));
    pin.add(cylinder(kit, 8, 38, 78));
    const gear = new THREE.Group();
    gear.add(
      new THREE.Mesh(
        bevelGear(bevelHeel(Z4, DELTA4, Math.PI + Math.PI / Z4), RE * Math.cos(DELTA4), t, bevelCone(Z4, DELTA4), [circlePath(10)]),
        kit.paint(COPPER, 0.6, 0.35),
      ),
    );
    gear.add(cylinder(kit, 10, 10, 62));
    g.add(along(pin, [-1, 0, 0]), along(gear, [0, 0, 1]));
    return g;
  },
};

// ---------------------------------------------------------------- worm drive
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly r: number,
    private readonly pitch: number,
    private readonly length: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const x = (t - 0.5) * this.length;
    const a = (2 * Math.PI * x) / this.pitch;
    return target.set(x, this.r * Math.cos(a), this.r * Math.sin(a));
  }
}

export const wormPreview: Preview3D = {
  dir: [0.45, 0.35, 1],
  build(kit) {
    const m = 3;
    const z2 = 30;
    const r1 = 15; // worm pitch radius
    const r2 = (m * z2) / 2;
    const a = r1 + r2;
    const pitch = Math.PI * m; // axial pitch = circular pitch of the wheel
    const gamma = Math.atan(pitch / (2 * Math.PI * r1)); // lead angle of a single-start worm
    const g = new THREE.Group();
    // Wheel: axis +z at the origin; a gap faces the worm (−y).
    const outline: Pt[] = gearOutline({ m, z: z2, phase: -Math.PI / 2 - Math.PI / z2, backlash: 0.25 });
    const wheel = new THREE.Mesh(helicalGear(outline, 20, Math.tan(gamma) / r2, [circlePath(12)]), kit.paint(BRONZE, 0.65, 0.32));
    g.add(wheel, cylinder(kit, 12, -26, 26));
    const hub = cylinder(kit, 20, -14, 14, kit.paint(BRONZE, 0.65, 0.32));
    g.add(hub);
    // Worm: axis along x below the wheel; its thread crosses +y (towards the wheel) at x = k·pitch.
    const worm = new THREE.Group();
    const core = new THREE.CylinderGeometry(r1 - 1.25 * m, r1 - 1.25 * m, 110, 40);
    core.rotateZ(Math.PI / 2);
    const thread = new THREE.TubeGeometry(new Helix(r1 - 0.2 * m, pitch, 96), 600, 0.36 * pitch, 12, false);
    const shaft = new THREE.CylinderGeometry(8, 8, 190, 32);
    shaft.rotateZ(Math.PI / 2);
    worm.add(new THREE.Mesh(core, kit.steel()), new THREE.Mesh(thread, kit.steel()), new THREE.Mesh(shaft, kit.steel()));
    worm.position.y = -a;
    g.add(worm);
    return g;
  },
};

// ---------------------------------------------------------------- planetary gear set
export const planetaryPreview: Preview3D = {
  dir: [0.3, 0.6, 1],
  build(kit) {
    const m = 2.5;
    const zs = 18;
    const zp = 12;
    const zr = zs + 2 * zp;
    const rc = (m * (zs + zp)) / 2; // carrier radius
    const w = 16;
    const g = new THREE.Group();
    g.add(spur(kit, m, zs, w, 0, 7, BLUE));
    g.add(cylinder(kit, 7, -30, 26));
    for (let k = 0; k < 3; k++) {
      const th = (2 * Math.PI * k) / 3;
      // The sun has a tooth at θ, so the planet turns a gap towards it.
      const p = spur(kit, m, zp, w, th + Math.PI + Math.PI / zp, 4.5, COPPER);
      p.position.set(rc * Math.cos(th), rc * Math.sin(th), 0);
      const pin = cylinder(kit, 4.5, -16, 10);
      pin.position.copy(p.position);
      g.add(p, pin);
    }
    // Ring gear: a disc with the internal teeth as its hole.
    const ring = new THREE.Shape();
    ring.absarc(0, 0, (m * zr) / 2 + 3 * m, 0, Math.PI * 2, false);
    const teeth = gearOutline({ m, z: zr, phase: -Math.PI / zr, backlash: 0.15 }).map(([x, y]) => new THREE.Vector2(x, y));
    ring.holes.push(new THREE.Path(teeth.reverse()));
    g.add(new THREE.Mesh(creased(extrudeCentered(ring, w, { bevel: 0.6, curveSegments: 48 }), 30), kit.paint('#8f9aa6', 0.7, 0.3)));
    // Carrier behind the planets.
    const carrier = new THREE.Shape();
    carrier.absarc(0, 0, rc + 9, 0, Math.PI * 2, false);
    carrier.holes.push(circlePath(8));
    const cg = extrudeCentered(carrier, 5, { bevel: 0.6, curveSegments: 48 });
    cg.translate(0, 0, -w / 2 - 5);
    g.add(new THREE.Mesh(cg, kit.paint('#4a5360', 0.6, 0.38)));
    return g;
  },
};
