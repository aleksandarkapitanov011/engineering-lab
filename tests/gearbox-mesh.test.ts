/**
 * The teeth of the helical-bevel gearbox must mesh without overlapping: the vertices of one gear that lie
 * near the mesh must stay outside the solids of the other part, at every rotation angle.
 * Point-in-solid is decided by ray parity against the (closed) target meshes.
 */
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { helicalBevel } from '../src/mechanisms/helical-bevel';
import { P_BEV, P_HEL } from '../src/mechanisms/helical-bevel/forces';
import { MechanismScene } from '../src/three/mechanismScene';

function meshesOf(scene: MechanismScene, id: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  scene.parts.get(id)!.wrapper.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      (m.material as THREE.Material).side = THREE.DoubleSide;
      out.push(m);
    }
  });
  return out;
}

/** World positions of the vertices of `meshes` within `radius` of `centre`. */
function pointsNear(meshes: THREE.Mesh[], centre: THREE.Vector3, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (const m of meshes) {
    const pos = m.geometry.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (v.distanceTo(centre) < radius) pts.push(v.clone());
    }
  }
  // Duplicate vertices (non-indexed geometry) are dropped.
  const seen = new Set<string>();
  return pts.filter((p) => {
    const k = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const DIRS = [new THREE.Vector3(0.31, 0.83, 0.47).normalize(), new THREE.Vector3(-0.62, 0.21, -0.75).normalize()];

/** Points inside any target solid (both ray directions must agree, against grazing hits). */
function inside(points: THREE.Vector3[], targets: THREE.Mesh[]): THREE.Vector3[] {
  const rc = new THREE.Raycaster();
  return points.filter((p) =>
    targets.some((t) =>
      DIRS.every((d) => {
        rc.set(p, d);
        const hits = rc.intersectObject(t, false).filter((h) => h.distance > 1e-4);
        return hits.length % 2 === 1;
      }),
    ),
  );
}

describe('helical-bevel gearbox: the teeth mesh without overlapping', () => {
  const scene = new MechanismScene(helicalBevel);
  // 12 quarter-pitches of z₁: three pitches of z₁, almost one pitch of the bevel pinion z₃.
  const steps = 12;
  const cases: [string, string, THREE.Vector3, number][] = [
    ['shaft1', 'gear2', new THREE.Vector3(...P_HEL), 16],
    ['gear2', 'shaft1', new THREE.Vector3(...P_HEL), 16],
    ['shaft2', 'gear4', new THREE.Vector3(...P_BEV), 14],
    ['gear4', 'shaft2', new THREE.Vector3(...P_BEV), 14],
  ];
  for (const [a, b, centre, radius] of cases) {
    it(`${a} stays out of ${b}`, () => {
      const bad: string[] = [];
      for (let k = 0; k < steps; k++) {
        scene.advance(60 / 1500 / 17 / 4, 1500, 1);
        scene.update(0);
        scene.root.updateMatrixWorld(true);
        const hits = inside(pointsNear(meshesOf(scene, a), centre, radius), meshesOf(scene, b));
        if (hits.length) bad.push(`step ${k}: ${hits.length} points, e.g. ${hits[0].toArray().map((x) => x.toFixed(2))}`);
      }
      expect(bad).toEqual([]);
    }, 60000);
  }
});
