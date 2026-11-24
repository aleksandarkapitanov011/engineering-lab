/**
 * Close-up of the gear mesh: base and pitch circles, line of action with the active path,
 * pitch point, pressure angle and live contact points synced with the 3D teeth.
 */
import * as THREE from 'three';
import type { CloseUpDef, CloseUpOverlay } from '../../core/types';
import { contactDistances, lineOfAction } from '../../core/involute';
import { labelSprite } from '../../three/forceArrows';
import type { Layout } from './layout';
import { ALPHA, B1, B2, BACKLASH } from './params';

const ORANGE = '#ff7a1a';
const WHITE = '#ffffff';
const GREY = '#9aa6b2';

const bg = (s: string): { bg: string } => ({ bg: s });
const n = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Gear mesh frequency f = z1·n1/60 (Hz). */
export const meshFrequency = (z1: number, n1: number): number => (z1 * n1) / 60;

function material(color: string, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity });
}

function segment(p0: THREE.Vector3, p1: THREE.Vector3, radius: number, mat: THREE.Material): THREE.Mesh {
  const len = p0.distanceTo(p1);
  const g = new THREE.CylinderGeometry(radius, radius, len, 8);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(p0).add(p1).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
  return m;
}

/** Dashed circle made of short arc pieces (a thin torus per dash). */
function circle(c: THREE.Vector3, r: number, mat: THREE.Material, tube: number, dashes = 0): THREE.Object3D {
  const g = new THREE.Group();
  if (!dashes) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 180), mat);
    m.position.copy(c);
    g.add(m);
    return g;
  }
  const arc = (Math.PI * 2) / dashes;
  for (let i = 0; i < dashes; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 6, arc * 0.55), mat);
    m.position.copy(c);
    m.rotation.z = i * arc;
    g.add(m);
  }
  return g;
}

export function createCloseUp(L: Layout): CloseUpDef {
  const { m, z1, z2, x1 } = L.cfg;
  const loa = lineOfAction(m, z1, z2, ALPHA, x1, BACKLASH);
  const zF = Math.max(B1, B2) / 2 + 0.8; // just in front of the gear faces
  const y = L.axisY;
  const rp1 = L.g1.d / 2;
  const toWorld = (p: [number, number]): THREE.Vector3 => new THREE.Vector3(p[0], p[1] + y, zF);
  const at = (s: number): THREE.Vector3 => toWorld([loa.T1[0] + loa.dir[0] * s, loa.T1[1] + loa.dir[1] * s]);
  const gAlpha = loa.sE - loa.sA;
  const pb = Math.PI * m * Math.cos(loa.alpha);
  const view = Math.max(12, 0.62 * loa.L + 3 * m);

  return {
    title: bg('Зацепване отблизо'),
    intro: bg(
      'Точките на контакт винаги лежат на линията на зацепване N₁N₂. Плътният участък A–E е активната част: тук работят зъбите. Анимацията е забавена допълнително, за да се проследи контактът.',
    ),
    camera: { target: [rp1, y, 0], dir: [0.1, 0.07, 1], radius: view },
    focusParts: ['pinion', 'gear2'],
    facts(n1) {
      return [
        { label: bg('Честота на зацепване f = z₁·n₁/60'), value: `${n(meshFrequency(z1, n1))} Hz` },
        { label: bg('Честота на вала n₁/60'), value: `${n(n1 / 60, 1)} Hz` },
        { label: bg('Активна дължина gα = AE'), value: `${n(gAlpha, 2)} mm` },
        { label: bg('Основна стъпка pb = π·m·cos α'), value: `${n(pb, 2)} mm` },
        { label: bg('Препокриване ε = gα / pb'), value: n(gAlpha / pb, 2) },
      ];
    },
    createOverlay(): CloseUpOverlay {
      const group = new THREE.Group();
      group.name = 'closeup-overlay';
      group.renderOrder = 40;
      const mats = {
        base: material(GREY, 0.85),
        pitch: material(WHITE, 0.75),
        loa: material(ORANGE, 0.55),
        active: material(ORANGE, 1),
        contact: material(WHITE, 1),
        contactRing: material(ORANGE, 1),
        tangent: material(GREY, 0.6),
      };
      const C1 = toWorld([0, 0]);
      const C2 = toWorld([L.a, 0]);
      const t = Math.max(0.12, m * 0.07);
      group.add(circle(C1, L.g1.db / 2, mats.base, t, 64));
      group.add(circle(C2, L.g2.db / 2, mats.base, t, 96));
      group.add(circle(C1, rp1, mats.pitch, t * 0.9));
      group.add(circle(C2, L.g2.d / 2, mats.pitch, t * 0.9));
      const T1 = at(0);
      const T2 = at(loa.L);
      const A = at(loa.sA);
      const E = at(loa.sE);
      const P = toWorld([rp1, 0]);
      group.add(segment(T1, T2, t * 1.4, mats.loa));
      group.add(segment(A, E, t * 3.2, mats.active));
      // Common tangent of the pitch circles and the pressure angle between it and the line of action.
      group.add(segment(P.clone().add(new THREE.Vector3(0, -loa.L * 0.75, 0)), P.clone().add(new THREE.Vector3(0, loa.L * 0.75, 0)), t * 0.8, mats.tangent));
      const arcR = Math.max(4, loa.L * 0.38);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(arcR, t * 1.2, 4, 24, loa.alpha), mats.active);
      arc.position.copy(P);
      arc.rotation.z = Math.PI / 2 - loa.alpha;
      group.add(arc);
      const dot = (p: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
        s.position.copy(p);
        return s;
      };
      group.add(dot(P, t * 4, mats.pitch), dot(T1, t * 3, mats.base), dot(T2, t * 3, mats.base));

      const lh = Math.max(2.2, m * 1.35);
      const label = (text: string, p: THREE.Vector3, color: string, dx = 0, dy = 0): void => {
        const s = labelSprite(text, color, lh);
        s.position.copy(p).add(new THREE.Vector3(dx, dy, 0));
        s.renderOrder = 45;
        group.add(s);
      };
      label('P', P, WHITE, lh * 1.2, -lh * 0.6);
      label('A', A, ORANGE, -lh * 1.3, lh * 0.5);
      label('E', E, ORANGE, lh * 1.1, 0);
      label('N₁', T1, GREY, -lh * 1.1, -lh * 1.1);
      label('N₂', T2, GREY, lh * 1.2, lh * 0.3);
      label(`α = ${ALPHA}°`, P, ORANGE, arcR * 0.55 + lh, arcR * 0.95);
      label('линия на зацепване', T2, ORANGE, lh * 2.5, lh * 1.6);

      // Contact points (pooled).
      const contacts: THREE.Object3D[] = [];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        g.add(dot(new THREE.Vector3(), t * 6.5, mats.contactRing), dot(new THREE.Vector3(), t * 4.2, mats.contact));
        g.visible = false;
        group.add(g);
        contacts.push(g);
      }
      group.traverse((o) => {
        o.renderOrder = Math.max(o.renderOrder, 40);
        (o as THREE.Mesh).raycast = () => undefined;
      });

      return {
        object: group,
        update(inputAngle) {
          const ds = contactDistances(loa, inputAngle);
          contacts.forEach((c, i) => {
            c.visible = i < ds.length;
            if (c.visible) c.position.copy(at(ds[i]));
          });
          return { contacts: ds.length };
        },
        dispose() {
          group.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) mesh.geometry.dispose();
            const sm = (o as THREE.Sprite).material as THREE.SpriteMaterial | undefined;
            if ((o as THREE.Sprite).isSprite && sm) {
              sm.map?.dispose();
              sm.dispose();
            }
          });
          Object.values(mats).forEach((mm) => mm.dispose());
          group.removeFromParent();
        },
      };
    },
  };
}
