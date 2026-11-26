/**
 * 3D disc micrometer for the span measurement W_k of a gear (shared by the measuring exercises).
 * The two disc faces are parallel planes tangent to the outer flanks of k neighbouring teeth; their common
 * normal is a tangent to the base circle (base cylinder), so the contact points lie on it at ±W/2.
 */
import * as THREE from 'three';
import type { MeasureOverlay } from '../../core/types';

export interface DiscMicrometerOptions {
  /** Base radius (transverse) and number of teeth of the measured gear, teeth spanned k, nominal span. */
  rb: number;
  z: number;
  k: number;
  Wnom: number;
  /** Centre angle of tooth 0 (gear frame) for the current body angles. */
  tooth0(angles: Record<string, number>): number;
  /** Where around the gear the instrument sits (gear frame, rad). */
  viewAngle: number;
  /** Gear centre (mid-plane) and axis in the world. */
  centre: [number, number, number];
  axis: [number, number, number];
  /** Helical gears: the measuring axis is turned by the base helix angle (signed by the hand), rad. */
  tilt?: number;
}

/**
 * Disc micrometer built in a local frame: x = measuring axis, y = radial through the tangent point,
 * z = gear axis. For a helical gear the instrument is turned about y by the base helix angle, so the disc
 * faces are normal to the base helix (the span is measured in the normal plane).
 */
export function discMicrometer(o: DiscMicrometerOptions): MeasureOverlay {
  const { rb, k, Wnom } = o;
  const pitch = (2 * Math.PI) / o.z;
  const Rd = 9; // disc radius
  const td = 1.1; // disc thickness at the rim
  const yc = rb - 0.5 + Rd; // disc centres: the rim reaches just below the contact points
  const root = new THREE.Group();
  root.name = 'measure-overlay';
  root.position.set(...o.centre);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...o.axis).normalize());
  const turn = new THREE.Group(); // rotates with the measured teeth
  const frame = new THREE.Group(); // tilted by the base helix angle
  frame.rotation.y = o.tilt ?? 0;
  turn.add(frame);
  root.add(turn);

  const chrome = new THREE.MeshStandardMaterial({ color: '#d7dde4', metalness: 0.9, roughness: 0.22 });
  const satin = new THREE.MeshStandardMaterial({ color: '#b9c2cc', metalness: 0.8, roughness: 0.4 });
  const enamel = new THREE.MeshStandardMaterial({ color: '#3b5f86', metalness: 0.35, roughness: 0.45 });
  const contactMat = new THREE.MeshStandardMaterial({ color: '#2fbf71', metalness: 0.4, roughness: 0.3, emissive: '#1d7a46', emissiveIntensity: 0.6 });
  const disposables: { dispose(): void }[] = [chrome, satin, enamel, contactMat];
  const along = (len: number, r: number, mat: THREE.Material, seg = 32): THREE.Mesh => {
    const geo = new THREE.CylinderGeometry(r, r, len, seg);
    geo.rotateZ(Math.PI / 2); // axis along x
    disposables.push(geo);
    return new THREE.Mesh(geo, mat);
  };
  const box = (sx: number, sy: number, sz: number, mat: THREE.Material): THREE.Mesh => {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    disposables.push(geo);
    return new THREE.Mesh(geo, mat);
  };

  // Fixed side: disc on the left, its spindle and the frame.
  const fixedDisc = along(td, Rd, chrome, 64);
  const movingDisc = along(td, Rd, chrome, 64);
  const xf0 = -Wnom / 2; // nominal face positions (the frame is built around them)
  const sleeveX0 = Wnom / 2 + td + 9;
  const anvil = along(9, 2.6, satin);
  anvil.position.set(xf0 - td - 4.5, yc, 0);
  frame.add(anvil);
  const legL = box(6, 22, 7, enamel);
  legL.position.set(xf0 - td - 11, yc + 8, 0);
  const top = box(sleeveX0 - (xf0 - td - 14) + 3, 7, 7, enamel);
  top.position.set((sleeveX0 + 3 + (xf0 - td - 14)) / 2, yc + 19, 0);
  const legR = box(6, 22, 7, enamel);
  legR.position.set(sleeveX0, yc + 8, 0);
  frame.add(legL, top, legR);
  const sleeve = along(20, 4.4, satin);
  sleeve.position.set(sleeveX0 + 3 + 10, yc, 0);
  frame.add(sleeve);
  // Moving side: disc, spindle, thimble and ratchet move together.
  const moving = new THREE.Group();
  const spindle = along(sleeveX0 - (Wnom / 2 + td) + 2, 2.6, chrome);
  spindle.position.set((sleeveX0 + Wnom / 2 + td) / 2 - 1, yc, 0);
  const thimble = along(16, 6.2, satin, 48);
  thimble.position.set(sleeveX0 + 3 + 20 - 2 + 8, yc, 0);
  const ratchet = along(7, 3.6, enamel);
  ratchet.position.set(sleeveX0 + 3 + 20 - 2 + 16 + 3.5, yc, 0);
  movingDisc.position.set(Wnom / 2 + td / 2, yc, 0);
  moving.add(movingDisc, spindle, thimble, ratchet);
  fixedDisc.position.set(xf0 - td / 2, yc, 0);
  frame.add(fixedDisc, moving);
  root.traverse((o) => {
    o.castShadow = true;
    (o as THREE.Mesh).raycast = () => undefined;
  });

  return {
    object: root,
    update(angles, reading, actual) {
      // Middle measured tooth: the tooth nearest to the view angle (or the gap, for an even k).
      const phi = o.tooth0(angles);
      const j = Math.round((o.viewAngle - phi) / pitch);
      const theta = phi + j * pitch + (k % 2 === 0 ? pitch / 2 : 0);
      turn.rotation.z = theta - Math.PI / 2; // local +y → radial direction θ
      // The fixed face sits on the real left flank; the moving face is `reading` away from it.
      const xf = -actual / 2;
      fixedDisc.position.x = xf - td / 2;
      anvil.position.x = xf - td - 4.5;
      moving.position.x = xf + reading - Wnom / 2;
      const touching = reading <= actual + 1e-6;
      fixedDisc.material = touching ? contactMat : chrome;
      movingDisc.material = touching ? contactMat : chrome;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      root.removeFromParent();
    },
  };
}
