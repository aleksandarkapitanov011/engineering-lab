/**
 * Animated 3D figures of the helical-bevel gearbox theory pages. They use the real gearbox model
 * (MechanismScene, without the housing) turning at the true speed ratios, plus extra teaching objects:
 * pitch cones with their common apex, the helix angle on a tooth, force arrows, the oil bath with splashes.
 */
import * as THREE from 'three';
import type { IllustrationHandle, LText } from '../../core/types';
import { lt } from '../../i18n';
import { solveSpeeds } from '../../core/kinematics';
import { MechanismScene } from '../../three/mechanismScene';
import { figure3d, overlayArrow, type Fig3DContext } from '../../ui/illus3d';
import { svg } from '../../ui/illus';
import { helicalBevel } from './index';
import { AXIS_Y, BETA, D1, D2, DELTA3, DELTA4, RE, S1_Z, STAGE1_Z, Z1, Z2, Z3, Z4 } from './params';

const INK = 'var(--nb-ink)';
const RED = 'var(--nb-red)';
const PENCIL = 'var(--nb-pencil)';
const L = (bg: string, en: string): LText => ({ bg: bg.replace(/(\d)\.(\d)/g, '$1,$2'), en });
const deg = (r: number): string => ((r * 180) / Math.PI).toFixed(1);
const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
/** Visual input speed of the figures (min⁻¹): slow enough to follow the teeth. */
const RPM = 18;

/** The gearbox model without the housing (and without `hide` parts), turning with `rpm`. */
function gearbox(c: Fig3DContext, hide: string[] = [], arrows = false): MechanismScene {
  const s = new MechanismScene(helicalBevel);
  for (const id of ['housing', 'cover', ...hide]) {
    const p = s.parts.get(id);
    if (p) p.wrapper.visible = false;
  }
  s.setArrows(arrows, solveSpeeds(helicalBevel.kinematics, RPM));
  s.update(0);
  c.scene.add(s.root);
  return s;
}

function turn(s: MechanismScene, dt: number): void {
  s.advance(dt, RPM, 1);
  s.update(dt);
}

/** Camera gently swinging around the vertical axis. */
function swing(c: Fig3DContext, t: number, target: THREE.Vector3, dir: THREE.Vector3, radius: number, amp = 0.22): void {
  const d = dir.clone().applyAxisAngle(V(0, 1, 0), amp * Math.sin(t * 0.35));
  c.view(target, d, radius);
}

const say = (c: Fig3DContext, at: THREE.Vector3 | (() => THREE.Vector3), t: LText, o: Parameters<Fig3DContext['pin']>[2] = {}): SVGTextElement =>
  c.pin(at, lt(t), { color: INK, size: 17, ...o });

/** Fig. 1 – the two stages turning: helical, then bevel, output at 90°. */
export function stagesFig(host: HTMLElement): IllustrationHandle {
  return figure3d(host, (c) => {
    const s = gearbox(c, [], true);
    say(c, V(-170, AXIS_Y, S1_Z), L('вход n₁', 'input n₁'), { color: RED, dy: -16, size: 18 });
    say(c, V(0, AXIS_Y, 162), L('изход n₃', 'output n₃'), { color: RED, dy: 18, size: 18 });
    say(c, V(-STAGE1_Z, AXIS_Y + D1 / 2 + 6, S1_Z), L(`z₁ = ${Z1}`, `z₁ = ${Z1}`), { dy: -8 });
    say(c, V(-STAGE1_Z, AXIS_Y + D2 / 2 + 4, 0), L(`z₂ = ${Z2}`, `z₂ = ${Z2}`), { dy: -8 });
    say(c, V(-30, AXIS_Y + 22, 0), L(`z₃ = ${Z3}`, `z₃ = ${Z3}`), { dy: -6, dx: -16 });
    say(c, V(30, AXIS_Y + 30, 18), L(`z₄ = ${Z4}`, `z₄ = ${Z4}`), { dx: 22 });
    say(c, V(-STAGE1_Z, AXIS_Y - D2 / 2 - 6, 30), L('стъпало 1: косозъбо', 'stage 1: helical'), { color: PENCIL, size: 16, dy: 14 });
    say(c, V(10, AXIS_Y - 40, 20), L('стъпало 2: конично', 'stage 2: bevel'), { color: PENCIL, size: 16, dy: 14 });
    const target = V(-50, AXIS_Y, 40);
    const dir = V(0.95, 0.85, 1.25);
    return (t, dt) => {
      turn(s, dt);
      swing(c, t, target, dir, 112);
    };
  });
}

/** Fig. 2 – the helical pair from above: the teeth slant at β, and the axial force it causes. */
export function helixFig(host: HTMLElement): IllustrationHandle {
  return figure3d(host, (c) => {
    const s = gearbox(c, ['shaft3', 'gear4', 'brg3A', 'brg3B', 'key3', 'brg1A', 'brg1B', 'brg2A', 'brg2B']);
    // Axis direction and tooth direction on top of the pinion (right hand: Δz = tan β · Δx at the top).
    const yTop = AXIS_Y + D1 / 2 + 2.2;
    const x0 = -STAGE1_Z + 16;
    const len = 34;
    const axisA = V(x0, yTop, S1_Z);
    const axisB = V(x0 - len, yTop, S1_Z);
    const toothB = V(x0 - len, yTop, S1_Z - len * Math.tan(BETA));
    const axisLine = svg('line', { stroke: PENCIL, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }, c.overlay);
    const toothLine = svg('line', { stroke: RED, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, c.overlay);
    const set = (el: SVGLineElement, a: THREE.Vector3, b: THREE.Vector3): void => {
      const [x1, y1] = c.project(a);
      const [x2, y2] = c.project(b);
      el.setAttribute('x1', x1.toFixed(1));
      el.setAttribute('y1', y1.toFixed(1));
      el.setAttribute('x2', x2.toFixed(1));
      el.setAttribute('y2', y2.toFixed(1));
    };
    say(c, toothB, L(`β ≈ ${deg(BETA)}°`, `β ≈ ${deg(BETA)}°`), { color: RED, size: 21, dx: -10, dy: -4, anchor: 'end' });
    say(c, axisB, L('ос на колелото', 'gear axis'), { color: PENCIL, size: 15, dx: -10, dy: 18, anchor: 'end' });
    // Axial force on gear z₂ (+x for this direction of rotation).
    const fa = overlayArrow(c.overlay, RED, 'fa2');
    const faA = V(-STAGE1_Z + 12, AXIS_Y + D2 / 2 + 6, 8);
    const faB = V(-STAGE1_Z + 40, AXIS_Y + D2 / 2 + 6, 8);
    say(c, faB, L('Fₐ = Fₜ·tg β', 'Fₐ = Fₜ·tan β'), { color: RED, size: 16, dx: 10, dy: -8 });
    say(c, V(-STAGE1_Z - 12, AXIS_Y + D2 / 2 + 4, -14), L(`z₂ – лява посока`, `z₂ – left hand`), { size: 16, anchor: 'end', dx: -10 });
    say(c, V(-STAGE1_Z + 14, AXIS_Y, S1_Z + D1 / 2 + 2), L(`z₁ – дясна посока`, `z₁ – right hand`), { size: 16, anchor: 'start', dx: 12, dy: 14 });
    const target = V(-STAGE1_Z + 4, AXIS_Y + 12, 34);
    const dir = V(-0.3, 1, 0.7);
    return (t, dt) => {
      turn(s, dt);
      swing(c, t, target, dir, 72, 0.16);
      set(axisLine, axisA, axisB);
      set(toothLine, axisA, toothB);
      fa(c.project(faA), c.project(faB));
    };
  });
}

/** Fig. 3 – the bevel pair inside its translucent pitch cones, which meet at the common apex. */
export function conesFig(host: HTMLElement): IllustrationHandle {
  return figure3d(host, (c) => {
    const s = gearbox(c, ['shaft1', 'gear2', 'key2', 'brg1A', 'brg1B', 'brg2A', 'brg2B', 'brg3A', 'brg3B']);
    const apex = V(0, AXIS_Y, 0);
    const k = 1.18;
    const cone = (delta: number, color: string): THREE.Mesh => {
      const h = RE * Math.cos(delta) * k;
      const g = new THREE.ConeGeometry(h * Math.tan(delta), h, 64, 1, true);
      g.translate(0, -h / 2, 0); // apex at the origin, base towards −y
      const m = new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, roughness: 0.6, metalness: 0 }),
      );
      m.renderOrder = 5;
      return m;
    };
    const c3 = cone(DELTA3, '#3c78c8');
    c3.geometry.rotateZ(-Math.PI / 2); // base towards −x (the pinion axis points away from the apex)
    const c4 = cone(DELTA4, '#e0782f');
    c4.geometry.rotateX(-Math.PI / 2); // base towards +z
    c3.position.copy(apex);
    c4.position.copy(apex);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 16), new THREE.MeshStandardMaterial({ color: '#d23b2c', emissive: '#6b140c', roughness: 0.4 }));
    dot.position.copy(apex);
    c.scene.add(c3, c4, dot);
    say(c, apex, L('общ връх', 'common apex'), { color: RED, dx: 14, dy: -10, size: 19, anchor: 'start' });
    say(c, V(-46, AXIS_Y + 24, -6), L(`δ₃ ≈ ${deg(DELTA3)}°`, `δ₃ ≈ ${deg(DELTA3)}°`), { size: 19, color: '#2f63a8' });
    say(c, V(30, AXIS_Y + 30, 44), L(`δ₄ ≈ ${deg(DELTA4)}°`, `δ₄ ≈ ${deg(DELTA4)}°`), { size: 19, color: '#b35a1c' });
    const sigma = svg('text', { x: 300, y: 42, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700, fill: RED, class: 'illus3d-label' }, c.overlay);
    sigma.textContent = 'Σ = 90°';
    // From the apex side, where neither shaft is in the way.
    const target = V(-16, AXIS_Y + 4, 18);
    const dir = V(0.85, 0.8, -0.75);
    return (t, dt) => {
      turn(s, dt);
      swing(c, t, target, dir, 60, 0.25);
    };
  });
}

/** Fig. 4 – directions of rotation on the three shafts and the bevel gears pushing apart. */
export function directionsFig(host: HTMLElement): IllustrationHandle {
  return figure3d(host, (c) => {
    const s = gearbox(c, [], true);
    say(c, V(-168, AXIS_Y + 18, S1_Z), L('n₁', 'n₁'), { color: RED, size: 20, dx: -14, anchor: 'end' });
    say(c, V(-134, AXIS_Y + 20, 0), L('n₂ – обратно', 'n₂ – reversed'), { color: RED, size: 17, dx: -14, anchor: 'end' });
    say(c, V(0, AXIS_Y + 12, 152), L('n₃ – изход под 90°', 'n₃ – output at 90°'), { color: RED, size: 17, dx: 16, anchor: 'start' });
    const a3 = overlayArrow(c.overlay, '#3c78c8', 'fa3');
    const a4 = overlayArrow(c.overlay, '#e0782f', 'fa4');
    // The bevel gears push each other apart along their axes, towards the backs of the cones.
    const p3a = V(-34, AXIS_Y + 26, 2);
    const p3b = V(-84, AXIS_Y + 26, 2);
    const p4a = V(6, AXIS_Y + 42, 22);
    const p4b = V(6, AXIS_Y + 42, 74);
    say(c, p3b, L('Fₐ₃', 'Fₐ₃'), { color: '#2f63a8', size: 19, dx: -12, dy: -6, anchor: 'end' });
    say(c, p4b, L('Fₐ₄', 'Fₐ₄'), { color: '#b35a1c', size: 19, dx: 12, dy: 6, anchor: 'start' });
    const note = svg('text', { x: 356, y: 30, 'text-anchor': 'end', 'font-size': 17, fill: PENCIL, class: 'illus3d-label' }, c.overlay);
    note.textContent = lt(L('конусите се отблъскват', 'the cones push apart'));
    const target = V(-45, AXIS_Y, 38);
    const dir = V(0.75, 1.25, 0.6);
    return (t, dt) => {
      turn(s, dt);
      swing(c, t, target, dir, 112, 0.16);
      a3(c.project(p3a), c.project(p3b));
      a4(c.project(p4a), c.project(p4b));
    };
  });
}

/** Fig. 5 – the overhung bevel pinion between its bearings, and the oil bath the large gear splashes. */
export function bearingsFig(host: HTMLElement): IllustrationHandle {
  return figure3d(host, (c) => {
    const s = gearbox(c);
    // Oil bath: a translucent volume with a gently moving surface, and droplets thrown by gear z₂.
    const x0 = -120;
    const x1 = 50;
    const z0 = -62;
    const z1 = 100;
    const level = 33;
    const floor = 10;
    const oilMat = new THREE.MeshStandardMaterial({ color: '#d8a83a', transparent: true, opacity: 0.2, roughness: 0.15, metalness: 0, depthWrite: false });
    const body = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, level - floor, z1 - z0), oilMat);
    body.position.set((x0 + x1) / 2, (level + floor) / 2, (z0 + z1) / 2);
    body.renderOrder = 6;
    const surfGeo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 48, 40);
    surfGeo.rotateX(-Math.PI / 2);
    const surfMat = new THREE.MeshStandardMaterial({ color: '#e8b94a', transparent: true, opacity: 0.42, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    const surf = new THREE.Mesh(surfGeo, surfMat);
    surf.position.set((x0 + x1) / 2, level, (z0 + z1) / 2);
    surf.renderOrder = 7;
    c.scene.add(body, surf);
    const base = surfGeo.getAttribute('position').array.slice() as Float32Array;
    const drops: { m: THREE.Mesh; v: THREE.Vector3; life: number }[] = [];
    const dropMat = new THREE.MeshStandardMaterial({ color: '#e0b448', roughness: 0.1, metalness: 0.2 });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 1.1, 12, 10), dropMat);
      m.visible = false;
      c.scene.add(m);
      drops.push({ m, v: V(0, 0, 0), life: -Math.random() * 1.5 });
    }
    say(c, V(-120, AXIS_Y + 30, 0), L('A', 'A'), { size: 20 });
    say(c, V(-48, AXIS_Y + 36, 0), L('B', 'B'), { size: 20, dx: 6 });
    say(c, V(-30, AXIS_Y + 24, 0), L('конзола', 'overhang'), { color: RED, size: 17, dx: 26, dy: -12 });
    say(c, V(-100, level, 90), L('масло', 'oil'), { color: '#9a6d10', size: 18, dy: 18 });
    // From the side of gear z₂, so its dip into the oil is in view.
    const target = V(-52, 56, 14);
    const dir = V(-0.55, 0.5, 1);
    const pos = surfGeo.getAttribute('position');
    return (t, dt) => {
      turn(s, dt);
      swing(c, t, target, dir, 102, 0.2);
      // Ripples spreading from where gear z₂ dips in (x = −83, z = 0).
      for (let i = 0; i < pos.count; i++) {
        const x = base[3 * i] + (x0 + x1) / 2;
        const z = base[3 * i + 2] + (z0 + z1) / 2;
        const r = Math.hypot(x + STAGE1_Z, z * 0.6);
        pos.setY(i, 0.9 * Math.sin(r * 0.25 - t * 3.2) * Math.exp(-r / 70) + 0.25 * Math.sin(x * 0.07 + t * 1.3));
      }
      pos.needsUpdate = true;
      surfGeo.computeVertexNormals();
      // Droplets thrown up along the rim of z₂ (it turns towards +z at the bottom for this direction).
      for (const d of drops) {
        d.life += dt;
        if (!d.m.visible) {
          if (d.life > 0) {
            d.m.position.set(-STAGE1_Z + (Math.random() - 0.5) * 18, level + 1, 6 + Math.random() * 10);
            d.v.set((Math.random() - 0.5) * 15, 55 + Math.random() * 35, 25 + Math.random() * 25);
            d.m.visible = true;
            d.life = 0;
          }
          continue;
        }
        d.v.y -= 140 * dt;
        d.m.position.addScaledVector(d.v, dt);
        if (d.m.position.y < level || d.life > 1.4) {
          d.m.visible = false;
          d.life = -Math.random() * 0.6;
        }
      }
    };
  });
}
