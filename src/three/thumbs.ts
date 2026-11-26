/**
 * 3D pictures for the catalogue cards. One small off-screen renderer draws each model once, on a
 * transparent background, and the image is kept in memory and in localStorage, so later visits show it
 * at once. Jobs run one at a time between frames, so the home screen stays responsive.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Mechanism, Preview3D } from '../core/types';
import { createMaterialKit } from './materials';
import { MechanismScene } from './mechanismScene';

/** Bump when a preview model or the look changes, so cached images are redrawn. */
const VERSION = 3;
/** Default picture size (catalogue cards); other sizes can be asked per picture. */
const W = 704;
const H = 320;
export interface ThumbSize {
  w: number;
  h: number;
}

const memory = new Map<string, string>();
const storageKey = (id: string): string => `thumb:v${VERSION}:${id}`;

function cached(id: string): string | null {
  const m = memory.get(id);
  if (m) return m;
  try {
    const s = localStorage.getItem(storageKey(id));
    if (s) memory.set(id, s);
    return s;
  } catch {
    return null;
  }
}

function store(id: string, url: string): void {
  memory.set(id, url);
  try {
    localStorage.setItem(storageKey(id), url);
  } catch {
    // Storage full or blocked: the memory copy is enough for this session.
  }
}

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let envTex: THREE.Texture | null = null;

function setup(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene } {
  if (renderer && scene) return { renderer, scene };
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.9;
  scene.add(new THREE.HemisphereLight('#ffffff', '#3b3f45', 0.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(140, 260, 180);
  const rim = new THREE.DirectionalLight('#cfe0ff', 0.9);
  rim.position.set(-200, 120, -160);
  scene.add(key, rim);
  return { renderer, scene };
}

/** Frees the WebGL context once the queue is empty (phones allow only a few contexts). */
function teardown(): void {
  envTex?.dispose();
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = null;
  scene = null;
  envTex = null;
}

/** Up to ~8000 world-space vertices of the visible meshes: the real silhouette, not the bounding box. */
function samplePoints(obj: THREE.Object3D): THREE.Vector3[] {
  const meshes: THREE.Mesh[] = [];
  let total = 0;
  obj.traverseVisible((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    meshes.push(m);
    total += m.geometry.getAttribute('position').count;
  });
  const step = Math.max(1, Math.floor(total / 8000));
  const pts: THREE.Vector3[] = [];
  for (const m of meshes) {
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
  return pts;
}

/** Places the camera along `dir` so that the model fills the image with a small margin, centred. */
function frame(camera: THREE.PerspectiveCamera, obj: THREE.Object3D, box: THREE.Box3, dir: THREE.Vector3, size: ThumbSize): void {
  const { w: W, h: H } = size;
  const centre = box.getCenter(new THREE.Vector3());
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  let dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
  const pts = samplePoints(obj);
  camera.clearViewOffset();
  const p = new THREE.Vector3();
  for (let it = 0; it < 5; it++) {
    camera.position.copy(centre).addScaledVector(dir, dist);
    camera.lookAt(centre);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of pts) {
      p.copy(c).project(camera);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    if (it === 4) {
      // Centre the picture in screen space.
      camera.setViewOffset(W, H, (((minX + maxX) / 2) * W) / 2, (-((minY + maxY) / 2) * H) / 2, W, H);
      camera.updateProjectionMatrix();
    } else dist *= Math.max((maxX - minX) / 2 / 0.9, (maxY - minY) / 2 / 0.84);
  }
}

function disposeTree(o: THREE.Object3D): void {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) mat.dispose();
  });
}

function render(p: Preview3D, size: ThumbSize): string {
  const { renderer: r, scene: s } = setup();
  r.setSize(size.w, size.h, false);
  const obj = p.build(createMaterialKit());
  s.add(obj);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const camera = new THREE.PerspectiveCamera(30, size.w / size.h, 1, 5000);
  frame(camera, obj, box, new THREE.Vector3(...p.dir).normalize(), size);
  camera.near = Math.max(0.5, camera.position.distanceTo(box.getCenter(new THREE.Vector3())) - box.getSize(new THREE.Vector3()).length());
  camera.far = camera.near + box.getSize(new THREE.Vector3()).length() * 3 + 100;
  camera.updateProjectionMatrix();
  r.render(s, camera);
  const url = r.domElement.toDataURL('image/webp', 0.86);
  s.remove(obj);
  disposeTree(obj);
  // Browsers without WebP encoding fall back to PNG.
  return url.startsWith('data:image/webp') ? url : r.domElement.toDataURL('image/png');
}

interface Job {
  id: string;
  preview: Preview3D;
  size: ThumbSize;
  done: (url: string) => void;
}
const queue: Job[] = [];
let running = false;

function pump(): void {
  const job = queue.shift();
  if (!job) {
    running = false;
    teardown();
    return;
  }
  let url: string | null = cached(job.id);
  if (!url) {
    try {
      url = render(job.preview, job.size);
      store(job.id, url);
    } catch (e) {
      console.warn('thumbnail failed', job.id, e);
    }
  }
  if (url) job.done(url);
  // Next job after the browser has painted.
  window.setTimeout(pump, 16);
}

/**
 * Calls `done` with the picture of `id`: at once when it is cached, otherwise after rendering.
 * Returns true when it was answered synchronously.
 */
export function thumbnail(id: string, preview: Preview3D, done: (url: string) => void, size: ThumbSize = { w: W, h: H }): boolean {
  const url = cached(id);
  if (url) {
    done(url);
    return true;
  }
  queue.push({ id, preview, done, size });
  if (!running) {
    running = true;
    window.setTimeout(pump, 50);
  }
  return false;
}

/** The default card picture of a mechanism: the whole model as the Model tab shows it, from the iso view. */
export function mechanismPreview(mech: Mechanism): Preview3D {
  return (
    mech.preview ?? {
      dir: mech.camera.views.iso,
      build: () => {
        const s = new MechanismScene(mech);
        s.setArrows(false);
        s.update(0);
        return s.root;
      },
    }
  );
}

/** Cover photo of a mechanism: its moving parts without the housing / base, a little closer. */
export function coverPreview(mech: Mechanism): Preview3D {
  return {
    dir: mech.camera.views.iso,
    build: () => {
      const s = new MechanismScene(mech);
      for (const id of ['housing', 'base']) {
        const p = s.parts.get(id);
        if (p) p.wrapper.visible = false;
      }
      s.setArrows(false);
      s.update(0);
      return s.root;
    },
  };
}
