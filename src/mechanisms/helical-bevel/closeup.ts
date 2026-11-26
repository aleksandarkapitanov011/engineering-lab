/**
 * Close-up of the bevel mesh, explained with Tredgold's approximation: at the heel the two gears work like
 * spur gears on their back cones (virtual radii rᵥ = Rₑ·tg δ). The overlay draws, in the plane of the back
 * cones, the virtual pitch and base circles, the line of action with its active part A–E and the live
 * contact points; from each contact point the contact line runs along the tooth towards the common apex.
 */
import * as THREE from 'three';
import type { CloseUpDef, CloseUpOverlay, LText } from '../../core/types';
import { contactDistances, lineOfAction } from '../../core/involute';
import { labelSprite } from '../../three/forceArrows';
import { lt } from '../../i18n';
import { AXIS_Y, BB, DELTA3, DELTA4, I1, MB, RE, Z3, Z4 } from './params';

const ORANGE = '#ff7a1a';
const WHITE = '#ffffff';
const GREY = '#9aa6b2';
const L = (bg: string, en: string): LText => ({ bg, en });
const nb = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Virtual (Tredgold) numbers of teeth at the back cone. */
export const ZV3 = Z3 / Math.cos(DELTA3);
export const ZV4 = Z4 / Math.cos(DELTA4);
const RV3 = RE * Math.tan(DELTA3);
const RV4 = RE * Math.tan(DELTA4);

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const APEX = V(0, AXIS_Y, 0);
/** Pitch cone generator of the mesh (from the apex to the heel), in the plane of the axes. */
const G = V(-Math.cos(DELTA3), 0, Math.sin(DELTA3));
/** Back-cone direction at the heel, from the pinion side to the gear side. */
const N = V(Math.sin(DELTA3), 0, Math.cos(DELTA3));
/** Tangential direction (the pinion flank at the mesh moves along −Y, i.e. counter-clockwise in this frame). */
const T = V(0, -1, 0);
const PH = APEX.clone().addScaledVector(G, RE); // heel pitch point
const C3 = PH.clone().addScaledVector(N, -RV3); // centre of the virtual pinion (on the pinion axis)
const C4 = PH.clone().addScaledVector(N, RV4); // centre of the virtual gear (on the gear axis)
const TOE = (RE - BB) / RE;

function material(color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity });
}

function segment(p0: THREE.Vector3, p1: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
  const g = new THREE.CylinderGeometry(radius, radius, p0.distanceTo(p1), 8);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(p0).add(p1).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
  return m;
}

/** Arc of a circle in the heel plane (centre c, radius r) between angles a0…a1 measured from N towards T. */
function arc(c: THREE.Vector3, r: number, a0: number, a1: number, tube: number, mat: THREE.Material, dashed = false): THREE.Object3D {
  const g = new THREE.Group();
  const n = dashed ? 28 : 1;
  for (let i = 0; i < n; i++) {
    const s = a0 + ((a1 - a0) * i) / n;
    const e = a0 + ((a1 - a0) * (i + (dashed ? 0.55 : 1))) / n;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 12; k++) {
      const a = s + ((e - s) * k) / 12;
      pts.push(c.clone().addScaledVector(N, r * Math.cos(a)).addScaledVector(T, r * Math.sin(a)));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, tube, 4, false), mat));
  }
  return g;
}

export function createCloseUp(): CloseUpDef {
  // Virtual spur pair at the heel (outer module), pinion centre C3, gear centre C4 along +N.
  const loa = lineOfAction(MB, ZV3, ZV4, 20, 0, 0.08);
  const toWorld = (p: [number, number]): THREE.Vector3 => C3.clone().addScaledVector(N, p[0]).addScaledVector(T, p[1]);
  const at = (s: number): THREE.Vector3 => toWorld([loa.T1[0] + loa.dir[0] * s, loa.T1[1] + loa.dir[1] * s]);
  const pb = Math.PI * MB * Math.cos(loa.alpha);
  const eps = (loa.sE - loa.sA) / pb;
  const toApex = (p: THREE.Vector3): THREE.Vector3 => APEX.clone().add(p.clone().sub(APEX).multiplyScalar(TOE));

  return {
    title: L('Конично зацепване отблизо', 'Bevel mesh close-up'),
    intro: L(
      'Метод на Тредголд: на широкия край коничните колела работят като цилиндрични колела, разположени на допълнителните конуси (радиуси rᵥ = Rₑ·tg δ). Там се чертаят линията на зацепване и точките на контакт; от всяка точка контактът продължава по зъба като линия към общия връх на конусите.',
      'Tredgold’s method: at the wide end the bevel gears work like spur gears placed on their back cones (radii rᵥ = Rₑ·tan δ). There the line of action and the contact points are drawn; from each point the contact continues along the tooth as a line towards the common cone apex.',
    ),
    // From above: the plane of the axes holds both pitch cones, the apex and the back cones.
    camera: { target: [PH.x * 0.75, AXIS_Y, PH.z * 0.9], dir: [0.12, 1, 0.42], radius: 40 },
    focusParts: ['shaft2', 'gear4'],
    legend: [
      { color: ORANGE, label: L('линия на зацепване, активна част A–E', 'line of action, active path A–E') },
      { color: WHITE, label: L('контакт: точка и линия по зъба', 'contact: point and line along the tooth'), dot: true },
      { color: WHITE, label: L('делителни конуси / окръжности', 'pitch cones / circles') },
      { color: GREY, label: L('допълнителни конуси, основни окръжности', 'back cones, base circles') },
    ],
    facts(n1) {
      const n2 = n1 / I1;
      return [
        { label: L('Еквивалентни зъби zᵥ = z / cos δ', 'Virtual teeth zᵥ = z / cos δ'), value: `${nb(ZV3, 1)} / ${nb(ZV4, 1)}` },
        { label: L('Еквивалентни радиуси rᵥ = Rₑ·tg δ', 'Virtual radii rᵥ = Rₑ·tan δ'), value: `${nb(RV3, 1)} / ${nb(RV4, 1)} mm` },
        { label: L('Препокриване εα (еквивалентни колела)', 'Contact ratio εα (virtual gears)'), value: nb(eps, 2) },
        { label: L('Честота на зацепване f = z₃·n₂/60', 'Mesh frequency f = z₃·n₂/60'), value: `${nb((Z3 * n2) / 60)} Hz` },
        { label: L('Ъгли на конусите δ₃ / δ₄', 'Cone angles δ₃ / δ₄'), value: `${nb((DELTA3 * 180) / Math.PI, 1)}° / ${nb((DELTA4 * 180) / Math.PI, 1)}°` },
        { label: L('Конусно разстояние Rₑ, ширина b', 'Cone distance Rₑ, face width b'), value: `${nb(RE, 1)} / ${BB} mm` },
      ];
    },
    createOverlay(): CloseUpOverlay {
      const group = new THREE.Group();
      group.name = 'closeup-overlay';
      const mats = {
        base: material(GREY, 0.85),
        pitch: material(WHITE, 0.75),
        loa: material(ORANGE, 0.55),
        active: material(ORANGE, 1),
        contact: material(WHITE, 1),
        ring: material(ORANGE, 1),
        cone: material(GREY, 0.7),
      };
      const t = 0.16;
      // Pitch cones (generators in the plane of the axes) up to the heel, and the back cones.
      const heel3a = PH.clone();
      const heel3b = V(-RE * Math.cos(DELTA3), AXIS_Y, -RE * Math.sin(DELTA3));
      const heel4b = V(RE * Math.sin(DELTA3), AXIS_Y, RE * Math.cos(DELTA3));
      for (const e of [heel3a, heel3b, heel4b]) group.add(segment(APEX, e, t * 0.8, mats.pitch));
      group.add(segment(C3, C4, t * 0.7, mats.cone));
      // Virtual pitch and base circles (only the arcs near the mesh).
      const rb3 = RV3 * Math.cos(loa.alpha);
      const rb4 = RV4 * Math.cos(loa.alpha);
      group.add(arc(C3, RV3, -0.9, 0.9, t * 0.8, mats.pitch));
      group.add(arc(C4, RV4, Math.PI - 0.45, Math.PI + 0.45, t * 0.8, mats.pitch));
      group.add(arc(C3, rb3, -0.9, 0.9, t * 0.7, mats.base, true));
      group.add(arc(C4, rb4, Math.PI - 0.45, Math.PI + 0.45, t * 0.7, mats.base, true));
      // Line of action, active part.
      const T1 = at(0);
      const T2 = at(loa.L);
      const A = at(loa.sA);
      const E = at(loa.sE);
      group.add(segment(T1, T2, t * 1.3, mats.loa), segment(A, E, t * 3, mats.active));
      const dot = (p: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
        s.position.copy(p);
        return s;
      };
      group.add(dot(APEX, t * 4, mats.pitch), dot(PH, t * 3.5, mats.pitch));
      const lh = 2.6;
      const label = (text: string, p: THREE.Vector3, color: string, d: THREE.Vector3): void => {
        const s = labelSprite(text, color, lh);
        s.position.copy(p).add(d);
        group.add(s);
      };
      label('P', PH, WHITE, V(0, 0, 2.6));
      label('A', A, ORANGE, N.clone().multiplyScalar(-2.4));
      label('E', E, ORANGE, N.clone().multiplyScalar(2.4));
      label(lt(L('общ връх', 'common apex')), APEX, WHITE, V(0, 2.5, 0));
      label(`rᵥ₃ = ${nb(RV3, 1)}`, C3.clone().lerp(PH, 0.5), GREY, V(-4, 0, 0));
      label(`δ₃ = ${nb((DELTA3 * 180) / Math.PI, 1)}°`, APEX.clone().lerp(heel3b, 0.45), WHITE, V(0, 0, -3));
      label(`δ₄ = ${nb((DELTA4 * 180) / Math.PI, 1)}°`, APEX.clone().lerp(heel4b, 0.45), WHITE, V(3, 0, 0));

      // Contact points with their contact lines towards the apex (pooled).
      const contacts: THREE.Group[] = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        g.add(dot(new THREE.Vector3(), t * 5.5, mats.ring), dot(new THREE.Vector3(), t * 3.6, mats.contact));
        g.visible = false;
        group.add(g);
        contacts.push(g);
      }
      const lines: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const m = segment(V(0, 0, 0), V(0, 1, 0), t * 1.6, mats.contact);
        m.visible = false;
        group.add(m);
        lines.push(m);
      }
      group.traverse((o) => {
        o.renderOrder = 40;
        (o as THREE.Mesh).raycast = () => undefined;
      });
      const up = new THREE.Vector3(0, 1, 0);

      return {
        object: group,
        update(inputAngle) {
          // Shaft 2 turns 1/i₁ of the input; one tooth of z₃ ↔ one tooth of the virtual zᵥ₃.
          const phi = (inputAngle / I1) * (Z3 / ZV3);
          const ds = contactDistances(loa, phi);
          contacts.forEach((c, i) => {
            const show = i < ds.length;
            c.visible = show;
            lines[i].visible = show;
            if (!show) return;
            const q = at(ds[i]);
            c.position.copy(q);
            const q2 = toApex(q);
            const ln = lines[i];
            ln.position.copy(q).add(q2).multiplyScalar(0.5);
            ln.scale.set(1, q.distanceTo(q2), 1);
            ln.quaternion.setFromUnitVectors(up, q2.clone().sub(q).normalize());
          });
          return { contacts: ds.length };
        },
        dispose() {
          group.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) mesh.geometry.dispose();
            const sp = o as THREE.Sprite;
            if (sp.isSprite) {
              (sp.material as THREE.SpriteMaterial).map?.dispose();
              sp.material.dispose();
            }
          });
          Object.values(mats).forEach((mm) => mm.dispose());
          group.removeFromParent();
        },
      };
    },
  };
}
