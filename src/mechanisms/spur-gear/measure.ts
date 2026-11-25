/**
 * Measuring exercise: span measurement W_k of the pinion with a disc micrometer.
 *
 * Geometry: the two disc faces are parallel planes tangent to the outer flanks of k neighbouring teeth.
 * Their common normal is a tangent to the base circle, so W_k = r_b·((k − 1)·2π/z + 2ψ_b), i.e.
 * W_k = m·cos α·[π(k − 0.5) + z·inv α] + 2·x·m·sin α, independent of where on the base circle it touches.
 * The contact points lie on that tangent at ±W/2 from the tangent point.
 */
import * as THREE from 'three';
import type { MeasureDef, MeasureOverlay, MeasureSample } from '../../core/types';
import { inv, spanMeasurement } from '../../core/involute';
import type { Layout } from './layout';
import { BACKLASH } from './params';

const bg = (s: string): { bg: string } => ({ bg: s });
const n2 = (v: number): string => v.toFixed(2).replace('.', ',');
const n3 = (v: number): string => v.toFixed(3).replace('.', ',');

/** Number of teeth k and span W for a profile-shifted spur gear (mm). */
export function spanFor(m: number, z: number, x: number, alpha: number): { k: number; W: number } {
  const { k } = spanMeasurement(m, z, (alpha * 180) / Math.PI);
  return { k, W: m * Math.cos(alpha) * (Math.PI * (k - 0.5) + z * inv(alpha)) + 2 * x * m * Math.sin(alpha) };
}

/** Upper / lower deviations of W (thinner teeth give the backlash), as on drawing EL-SG-002. */
export const W_ES = -0.04;
export const W_EI = -0.08;

/** Direction of the middle measured tooth in the close-up (up-left, away from the other gear), rad. */
const VIEW_ANGLE = (3 * Math.PI) / 4;

export function createMeasure(L: Layout): MeasureDef {
  const { m, z1, x1 } = L.cfg;
  const g = L.g1;
  const { k, W } = spanFor(m, z1, x1, g.alpha);
  const nominal = Math.round(W * 100) / 100;
  const upper = Math.round((nominal + W_ES) * 100);
  const lower = Math.round((nominal + W_EI) * 100);
  // The 3D pinion is cut with BACKLASH removed from the tooth thickness on the pitch circle.
  const modelW = Math.round((W - BACKLASH * Math.cos(g.alpha)) * 100) / 100;
  const rb = g.db / 2;
  const sub = '₀₁₂₃₄₅₆₇₈₉';
  const Wk = `W${String(k).split('').map((c) => sub[Number(c)]).join('')}`;

  const verdictOf = (hundredths: number): string => (hundredths > upper ? 'rework' : hundredths < lower ? 'scrap' : 'ok');
  const explainOf = (actual: number): string => {
    const dW = actual - nominal;
    const ds = dW / Math.cos(g.alpha);
    const v = verdictOf(Math.round(actual * 100));
    const base = `${Wk} = ${n2(actual)} mm, отклонение ${dW >= 0 ? '+' : '−'}${n2(Math.abs(dW))} mm от номинала. Дебелината на зъба по делителната окръжност е ${ds >= 0 ? 'по-голяма' : 'по-малка'} с ΔW/cos α = ${n3(Math.abs(ds))} mm.`;
    if (v === 'ok') return `${base} Това е в полето ${n2(lower / 100)}…${n2(upper / 100)}: зъбите са изтънени точно колкото трябва за страничната хлабина. Годно.`;
    if (v === 'rework')
      return `${base} Над горната граница ${n2(upper / 100)}: зъбите са твърде дебели, хлабината няма да стигне и предавката може да заклини. Поправим брак – колелото се връща за дорязване.`;
    return `${base} Под долната граница ${n2(lower / 100)}: зъбите са изтънени повече от допуснатото – голяма хлабина, удари при реверс. Отнетият материал не може да се върне – окончателен брак.`;
  };

  return {
    title: bg('Виртуално измерване'),
    intro: bg(
      `Провери партида малки колела като контрольор. Микрометърът с дискови накрайници мери размера през ${k} зъба ${Wk} – от него се съди за дебелината на зъбите. Завърти барабана (плъзни по скалата) или натисни „Трещотка“, докато накрайниците опрат в зъбите, отчети скалата и реши дали колелото е годно. Границите са номиналът плюс отклоненията от чертежа.`,
    ),
    quantity: bg(`${Wk} – размер през ${k} зъба`),
    spec: { nominal, es: W_ES, ei: W_EI },
    resolution: 0.01,
    range: [0, 25],
    verdicts: [
      { id: 'ok', label: bg('Годно') },
      { id: 'rework', label: bg('Брак – поправим') },
      { id: 'scrap', label: bg('Брак – окончателен') },
    ],
    samples(count, rng) {
      const pick = (a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));
      const kinds: ('ok' | 'rework' | 'scrap')[] = ['ok', 'rework', 'scrap'];
      while (kinds.length < count - 1) kinds.push(kinds[Math.floor(rng() * 3)]);
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      const values = kinds.slice(0, count - 1).map((kind) =>
        kind === 'ok' ? pick(lower, upper) : kind === 'rework' ? pick(upper + 1, upper + 7) : pick(lower - 7, lower - 1),
      );
      // The first one is the pinion of the 3D model itself.
      const all = [Math.round(modelW * 100), ...values];
      return all.map(
        (hund): MeasureSample => ({ actual: hund / 100, verdict: verdictOf(hund), explain: bg(explainOf(hund / 100)) }),
      );
    },
    camera: (() => {
      // Centre of the instrument in its local frame (measuring axis along x, discs just above the teeth),
      // turned to the measuring position.
      const lx = 12;
      const ly = rb + 8.5 + 4;
      const b = VIEW_ANGLE - Math.PI / 2;
      return {
        target: [lx * Math.cos(b) - ly * Math.sin(b), L.axisY + lx * Math.sin(b) + ly * Math.cos(b), 0] as [number, number, number],
        dir: [-0.3, 0.32, 1] as [number, number, number],
        radius: 46,
      };
    })(),
    focusParts: ['pinion', 'shaft1'],
    createOverlay(): MeasureOverlay {
      return discMicrometer(L, W);
    },
  };
}

/** Disc micrometer built in a local frame: x = measuring axis, y = radial through the tangent point, z = gear axis. */
function discMicrometer(L: Layout, Wnom: number): MeasureOverlay {
  const g = L.g1;
  const rb = g.db / 2;
  const pitch = (2 * Math.PI) / g.z;
  const { k } = spanFor(g.m, g.z, g.x, g.alpha);
  const Rd = 9; // disc radius
  const td = 1.1; // disc thickness at the rim
  const yc = rb - 0.5 + Rd; // disc centres: the rim reaches just below the contact points
  const root = new THREE.Group();
  root.name = 'measure-overlay';
  const frame = new THREE.Group(); // rotates with the measured teeth
  root.add(frame);

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
      // Middle measured tooth: the tooth nearest to VIEW_ANGLE. Tooth 0 of the pinion is centred at +x.
      const phi = angles.s1 ?? 0;
      const j = Math.round((VIEW_ANGLE - phi) / pitch);
      const theta = phi + j * pitch + (k % 2 === 0 ? pitch / 2 : 0);
      root.position.set(0, L.axisY, 0);
      frame.rotation.z = theta - Math.PI / 2; // local +y → radial direction θ
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
