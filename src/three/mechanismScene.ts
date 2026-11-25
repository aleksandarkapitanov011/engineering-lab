/**
 * Turns a Mechanism data module into a live Three.js scene graph:
 * kinematic bodies (rotation), exploded view, highlighting, section caps, ghosts and install animations.
 * Nothing in here is specific to a particular mechanism.
 */
import * as THREE from 'three';
import type { BodyPose, Mechanism, PartDef, Vec3 } from '../core/types';
import { speedFactors } from '../core/kinematics';
import { createGhostKit, createMaterialKit } from './materials';
import { merge } from './geom';
import { srgbToLinear } from './colormap';

interface MatState {
  mat: THREE.MeshStandardMaterial;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

interface PartInstance {
  def: PartDef;
  wrapper: THREE.Group;
  content: THREE.Group;
  meshes: THREE.Mesh[];
  caps: THREE.Mesh[];
  mats: MatState[];
  base: THREE.Vector3;
  offset: THREE.Vector3;
  explodeP: number;
  /** 1 = fully away (not yet installed), animates to 0 on install. */
  away: number;
  awayTarget: number;
}

interface BodyInstance {
  id: string;
  pivot: THREE.Group;
  factor: number;
  /** Extra rotation from a pose override (mounting error), rad. */
  phase: number;
  arrow?: THREE.Mesh;
}

const ACCENT = new THREE.Color('#ff7a1a');
const CAP_COLOR = '#b4553f';
const smooth = (t: number): number => t * t * (3 - 2 * t);

export class MechanismScene {
  readonly root = new THREE.Group();
  readonly parts = new Map<string, PartInstance>();
  private readonly bodies = new Map<string, BodyInstance>();
  private readonly plane: THREE.Plane;
  private readonly maxOrder: number;
  private explode = 0;
  private explodeTarget = 0;
  private sectionOn = false;
  private highlighted: string | null = null;
  private ghost: { id: string; obj: THREE.Group; mat: THREE.MeshBasicMaterial; t: number } | null = null;
  inputAngle = 0;
  /** Parts that stand still although their body turns (e.g. a gear slipping on a shaft without its key). */
  private readonly frozen = new Map<string, number>();

  constructor(private readonly mech: Mechanism) {
    const kit = createMaterialKit();
    const factors = speedFactors(mech.kinematics);
    this.plane = new THREE.Plane(new THREE.Vector3(...mech.section.normal), mech.section.constant);

    for (const b of mech.kinematics.bodies) {
      const pivot = new THREE.Group();
      pivot.name = `body:${b.id}`;
      pivot.position.set(...b.origin);
      pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...b.axis).normalize());
      this.root.add(pivot);
      const inst: BodyInstance = { id: b.id, pivot, factor: factors.get(b.id) ?? 0, phase: 0 };
      if (b.arrow) {
        inst.arrow = makeArrow(b.arrow.radius);
        inst.arrow.position.z = b.arrow.z;
        inst.arrow.visible = false;
        pivot.add(inst.arrow);
      }
      this.bodies.set(b.id, inst);
    }

    this.maxOrder = Math.max(0, ...mech.parts.map((p) => p.explode.order));

    for (const def of mech.parts) {
      const content = new THREE.Group();
      content.add(def.build({ materials: kit }));
      const wrapper = new THREE.Group();
      wrapper.name = `part:${def.id}`;
      wrapper.userData.partId = def.id;
      wrapper.position.set(...def.position);
      wrapper.add(content);
      const parent = def.body ? this.bodies.get(def.body)?.pivot : this.root;
      if (!parent) throw new Error(`Part ${def.id} references unknown body ${def.body}`);
      parent.add(wrapper);

      const meshes: THREE.Mesh[] = [];
      content.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      const mats: MatState[] = [];
      const caps: THREE.Mesh[] = [];
      for (const m of meshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mats.push({ mat, opacity: mat.opacity, transparent: mat.transparent, depthWrite: mat.depthWrite });
        m.castShadow = !mat.transparent;
        m.receiveShadow = true;
        // Back faces rendered flat: under a clipping plane they read as a solid cut surface.
        const cap = new THREE.Mesh(
          m.geometry,
          new THREE.MeshBasicMaterial({ color: CAP_COLOR, side: THREE.BackSide, clippingPlanes: [this.plane] }),
        );
        cap.visible = false;
        cap.raycast = () => undefined;
        cap.userData.isCap = true;
        if (mat.transparent) cap.userData.skip = true;
        m.add(cap);
        caps.push(cap);
      }
      this.parts.set(def.id, {
        def,
        wrapper,
        content,
        meshes,
        caps,
        mats,
        base: wrapper.position.clone(),
        offset: new THREE.Vector3(...def.explode.offset),
        explodeP: 0,
        away: 0,
        awayTarget: 0,
      });
    }
    this.applyPose();
  }

  /** Bounding sphere of the assembled mechanism (for camera fitting). */
  boundingSphere(): THREE.Sphere {
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const p of this.parts.values()) for (const m of p.meshes) box.expandByObject(m);
    return box.getBoundingSphere(new THREE.Sphere());
  }

  minY(): number {
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const p of this.parts.values()) for (const m of p.meshes) box.expandByObject(m);
    return box.min.y;
  }

  /** Advances the input shaft by its speed (rpm) scaled for display. */
  advance(dt: number, inputRpm: number, visualScale: number): void {
    this.inputAngle += ((inputRpm * 2 * Math.PI) / 60) * visualScale * dt;
    if (this.inputAngle > 1e6 || this.inputAngle < -1e6) this.inputAngle = 0;
  }

  setExploded(on: boolean): void {
    this.explodeTarget = on ? this.maxOrder + 1 : 0;
  }

  isExploded(): boolean {
    return this.explodeTarget > 0;
  }

  /** Per-frame update. Returns true while something is still animating. */
  update(dt: number): boolean {
    let animating = false;
    if (this.explode !== this.explodeTarget) {
      const speed = 2.2; // stages per second
      const dir = Math.sign(this.explodeTarget - this.explode);
      this.explode += dir * speed * dt;
      if ((dir > 0 && this.explode >= this.explodeTarget) || (dir < 0 && this.explode <= this.explodeTarget)) {
        this.explode = this.explodeTarget;
      }
      animating = true;
    }
    for (const p of this.parts.values()) {
      p.explodeP = smooth(THREE.MathUtils.clamp(this.explode - p.def.explode.order, 0, 1));
      if (p.away !== p.awayTarget) {
        const dir = Math.sign(p.awayTarget - p.away);
        p.away = THREE.MathUtils.clamp(p.away + dir * dt * 2.4, 0, 1);
        if ((dir > 0 && p.away >= p.awayTarget) || (dir < 0 && p.away <= p.awayTarget)) p.away = p.awayTarget;
        animating = true;
      }
    }
    if (this.ghost) {
      this.ghost.t += dt;
      this.ghost.mat.opacity = 0.28 + 0.18 * Math.sin(this.ghost.t * 5);
      animating = true;
    }
    this.applyPose();
    return animating;
  }

  /** Current rotation angle of every kinematic body (rad). */
  bodyAngles(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const id of this.bodies.keys()) out[id] = this.bodyAngle(id);
    return out;
  }

  private bodyAngle(bodyId?: string): number {
    if (!bodyId) return 0;
    const b = this.bodies.get(bodyId);
    return b ? this.inputAngle * b.factor + b.phase : 0;
  }

  /** Moves / tilts a kinematic body (e.g. to show a mounting error). `null` restores the nominal pose. */
  setBodyPose(bodyId: string, pose: BodyPose | null): void {
    const b = this.bodies.get(bodyId);
    const def = this.mech.kinematics.bodies.find((k) => k.id === bodyId);
    if (!b || !def) return;
    b.pivot.position.set(...(pose?.origin ?? def.origin));
    b.pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...(pose?.axis ?? def.axis)).normalize());
    b.phase = pose?.phase ?? 0;
    this.applyPose();
  }

  /** Stops the given parts at their current angle while the rest keeps turning; [] releases them. */
  setFrozen(ids: string[]): void {
    this.frozen.clear();
    for (const id of ids) {
      const p = this.parts.get(id);
      if (p) this.frozen.set(id, this.bodyAngle(p.def.body));
    }
    this.applyPose();
  }

  private placeWrapper(def: PartDef, wrapper: THREE.Object3D, content: THREE.Object3D, k: number, away = 0): void {
    const angle = this.frozen.get(def.id) ?? this.bodyAngle(def.body);
    const off = new THREE.Vector3(...def.explode.offset).multiplyScalar(k);
    if (def.explode.frame === 'spin') off.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    if (away > 0) {
      const ap = new THREE.Vector3(...(def.approach ?? def.explode.offset)).multiplyScalar(away);
      if (!def.approach && def.explode.frame === 'spin') ap.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
      off.add(ap);
    }
    wrapper.position.set(...def.position).add(off);
    content.rotation.z = angle;
    if (def.spin) {
      const inner = content.children[0];
      for (const [name, f] of Object.entries(def.spin)) {
        const child = inner?.getObjectByName(name);
        if (child) child.rotation.z = angle * (f - 1);
      }
    }
  }

  private applyPose(): void {
    for (const p of this.parts.values()) {
      this.placeWrapper(p.def, p.wrapper, p.content, p.explodeP, smooth(p.away));
    }
    if (this.ghost) {
      const p = this.parts.get(this.ghost.id)!;
      const g = this.ghost.obj;
      this.placeWrapper(p.def, g, g.children[0], 0);
    }
  }

  setSection(on: boolean): void {
    this.sectionOn = on;
    const planes = on ? [this.plane] : null;
    for (const p of this.parts.values()) {
      for (const s of p.mats) {
        s.mat.clippingPlanes = planes;
        s.mat.clipShadows = true;
        s.mat.needsUpdate = true;
      }
      for (const c of p.caps) c.visible = on && !c.userData.skip;
    }
  }

  isSection(): boolean {
    return this.sectionOn;
  }

  /** Rotation direction arrows. */
  setArrows(visible: boolean, speeds?: Map<string, number>): void {
    for (const b of this.bodies.values()) {
      if (!b.arrow) continue;
      const n = speeds?.get(b.id) ?? b.factor;
      b.arrow.visible = visible && n !== 0;
      b.arrow.scale.y = n < 0 ? -1 : 1;
    }
  }

  private stressSaved = new Map<THREE.MeshStandardMaterial, { color: THREE.Color; metalness: number; roughness: number; envMapIntensity: number }>();

  /**
   * Colours parts by a stress field (per vertex). `fields` maps part id → function of a point in the
   * part's frame (body frame for rotating parts, world for static ones) → [r, g, b].
   * Parts without a field are faded. Pass null to restore the normal look.
   */
  paintStress(fields: Map<string, (p: [number, number, number]) => [number, number, number]> | null): void {
    // `fields` return sRGB colours (0…1).
    // Restore first.
    for (const p of this.parts.values()) {
      for (const m of p.meshes) {
        if (m.geometry.getAttribute('color')) m.geometry.deleteAttribute('color');
      }
      for (const s of p.mats) {
        const saved = this.stressSaved.get(s.mat);
        if (saved) {
          s.mat.color.copy(saved.color);
          s.mat.metalness = saved.metalness;
          s.mat.roughness = saved.roughness;
          s.mat.envMapIntensity = saved.envMapIntensity;
        }
        s.mat.vertexColors = false;
        s.mat.toneMapped = true;
        s.mat.opacity = s.opacity;
        s.mat.transparent = s.transparent;
        s.mat.depthWrite = s.depthWrite;
        s.mat.emissive.setRGB(0, 0, 0);
        s.mat.needsUpdate = true;
      }
    }
    this.stressSaved.clear();
    if (!fields) return;

    this.root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    for (const [id, p] of this.parts) {
      const field = fields.get(id);
      if (!field) {
        for (const s of p.mats) {
          s.mat.transparent = true;
          s.mat.opacity = Math.min(s.opacity, 0.12);
          s.mat.depthWrite = false;
          s.mat.needsUpdate = true;
        }
        continue;
      }
      const frameInv = p.def.body ? this.bodies.get(p.def.body)!.pivot.matrixWorld.clone().invert() : new THREE.Matrix4();
      for (const mesh of p.meshes) {
        const pos = mesh.geometry.getAttribute('position');
        const colors = new Float32Array(pos.count * 3);
        const toFrame = frameInv.clone().multiply(mesh.matrixWorld);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(toFrame);
          // Fields return sRGB; WebGL vertex colours are linear.
          const c = field([v.x, v.y, v.z]);
          colors[3 * i] = srgbToLinear(c[0]);
          colors[3 * i + 1] = srgbToLinear(c[1]);
          colors[3 * i + 2] = srgbToLinear(c[2]);
        }
        mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      for (const s of p.mats) {
        this.stressSaved.set(s.mat, {
          color: s.mat.color.clone(),
          metalness: s.mat.metalness,
          roughness: s.mat.roughness,
          envMapIntensity: s.mat.envMapIntensity,
        });
        s.mat.vertexColors = true;
        s.mat.toneMapped = false;
        // Matte and slightly dimmed, so lit faces don't clip to white and the colours stay saturated.
        s.mat.color.setRGB(0.8, 0.8, 0.8);
        s.mat.metalness = 0;
        s.mat.roughness = 0.88;
        s.mat.envMapIntensity = 0.22;
        s.mat.opacity = 1;
        s.mat.transparent = false;
        s.mat.depthWrite = true;
        s.mat.needsUpdate = true;
      }
    }
  }

  /** Keeps the given parts as they are and fades everything else (no emissive glow). */
  focus(ids: string[] | null): void {
    this.highlighted = null;
    for (const [pid, p] of this.parts) {
      const keep = ids === null || ids.includes(pid);
      for (const s of p.mats) {
        s.mat.opacity = keep ? s.opacity : Math.min(s.opacity, 0.1);
        s.mat.transparent = keep ? s.transparent : true;
        s.mat.depthWrite = keep ? s.depthWrite : false;
        s.mat.emissive.setRGB(0, 0, 0);
        s.mat.needsUpdate = true;
      }
      for (const m of p.meshes) m.castShadow = keep && !p.mats[0]?.transparent;
    }
  }

  highlight(id: string | null): void {
    this.highlighted = id;
    for (const [pid, p] of this.parts) {
      for (const s of p.mats) {
        if (id === null) {
          s.mat.opacity = s.opacity;
          s.mat.transparent = s.transparent;
          s.mat.depthWrite = s.depthWrite;
          s.mat.emissive.setRGB(0, 0, 0);
        } else if (pid === id) {
          s.mat.opacity = Math.max(s.opacity, s.transparent ? 0.55 : 1);
          s.mat.transparent = s.transparent;
          s.mat.depthWrite = s.depthWrite;
          s.mat.emissive.copy(ACCENT).multiplyScalar(0.45);
        } else {
          s.mat.transparent = true;
          s.mat.opacity = Math.min(s.opacity, 0.14);
          s.mat.depthWrite = false;
          s.mat.emissive.setRGB(0, 0, 0);
        }
        s.mat.needsUpdate = true;
      }
      for (const m of p.meshes) m.castShadow = id === null || pid === id ? !p.mats[0]?.transparent : false;
    }
  }

  highlightedId(): string | null {
    return this.highlighted;
  }

  /** Objects to raycast for picking (visible parts only). */
  pickables(): THREE.Object3D[] {
    return [...this.parts.values()].filter((p) => p.wrapper.visible).map((p) => p.wrapper);
  }

  partIdOf(obj: THREE.Object3D | null): string | null {
    let o: THREE.Object3D | null = obj;
    while (o) {
      if (typeof o.userData.partId === 'string') return o.userData.partId;
      o = o.parent;
    }
    return null;
  }

  /** Assembly game: shows or hides a part. `animate` slides it in from its explode offset. */
  setInstalled(id: string, installed: boolean, animate = false): void {
    const p = this.parts.get(id);
    if (!p) return;
    p.wrapper.visible = installed;
    if (installed && animate) {
      p.away = 1;
      p.awayTarget = 0;
    } else {
      p.away = 0;
      p.awayTarget = 0;
    }
    this.applyPose();
  }

  /** Assembly game: translucent pulsing preview of where a part goes. */
  showGhost(id: string | null): THREE.Object3D | null {
    if (this.ghost) {
      this.ghost.obj.removeFromParent();
      this.ghost.obj.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      this.ghost.mat.dispose();
      this.ghost = null;
    }
    if (!id) return null;
    const p = this.parts.get(id);
    if (!p) return null;
    const mat = new THREE.MeshBasicMaterial({
      color: ACCENT,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const content = new THREE.Group();
    content.add(p.def.build({ materials: createGhostKit(mat) }));
    const obj = new THREE.Group();
    obj.add(content);
    obj.userData.ghostFor = id;
    obj.renderOrder = 10;
    p.wrapper.parent!.add(obj);
    this.ghost = { id, obj, mat, t: 0 };
    this.applyPose();
    return obj;
  }

  ghostObject(): THREE.Object3D | null {
    return this.ghost?.obj ?? null;
  }

  /** World-space centre of a part in its installed position. */
  partCenter(id: string): THREE.Vector3 {
    const p = this.parts.get(id);
    const v = new THREE.Vector3();
    if (!p) return v;
    const obj = this.ghost?.id === id ? this.ghost.obj : p.wrapper;
    this.root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(obj).getCenter(v);
  }

  dispose(): void {
    this.showGhost(null);
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!m.userData.isCap) m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.root.removeFromParent();
  }

  get mechanism(): Mechanism {
    return this.mech;
  }
}

/** Curved arrow around the Z axis (counter-clockwise), radius r. */
function makeArrow(r: number): THREE.Mesh {
  const arc = 1.45 * Math.PI;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (arc * i) / 40;
    pts.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 1.3, 8, false);
  const cone = new THREE.ConeGeometry(3.4, 9, 14);
  // Cone points along +Y by default; tangent at the arc end is (-sin a, cos a).
  cone.rotateZ(arc);
  cone.translate(r * Math.cos(arc), r * Math.sin(arc), 0);
  const g = merge([tube, cone]);
  const mat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    emissive: ACCENT,
    emissiveIntensity: 0.5,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.raycast = () => undefined;
  return mesh;
}

export type { Vec3 };
