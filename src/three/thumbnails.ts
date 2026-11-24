/**
 * Renders small PNG thumbnails of parts for the assembly tray, using a temporary WebGL context.
 * Results are cached per mechanism + part for the session.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Mechanism } from '../core/types';
import { createMaterialKit } from './materials';

const cache = new Map<string, string>();

export function cachedThumbnail(mechId: string, partId: string): string | undefined {
  return cache.get(`${mechId}:${partId}`);
}

/** Renders all missing thumbnails, yielding between parts so the UI stays responsive. */
export async function renderThumbnails(
  mech: Mechanism,
  partIds: string[],
  onEach: (partId: string, url: string) => void,
): Promise<void> {
  const todo = partIds.filter((id) => !cache.has(`${mech.id}:${id}`));
  for (const id of partIds) {
    const url = cache.get(`${mech.id}:${id}`);
    if (url) onEach(id, url);
  }
  if (!todo.length) return;
  const W = 192;
  const H = 144;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return;
  }
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const scene = new THREE.Scene();
  scene.environment = env;
  scene.add(new THREE.HemisphereLight('#ffffff', '#444444', 0.8));
  const key = new THREE.DirectionalLight('#ffffff', 2);
  key.position.set(1, 2, 1.5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(30, W / H, 1, 5000);
  const kit = createMaterialKit();

  for (const id of todo) {
    const def = mech.parts.find((p) => p.id === id);
    if (!def) continue;
    const obj = def.build({ materials: kit });
    // Show axial parts lying horizontally (axis left-right), like on a workbench.
    if (def.body) obj.rotation.y = Math.PI / 2;
    const holder = new THREE.Group();
    holder.add(obj);
    scene.add(holder);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    holder.position.sub(sphere.center);
    const dist = sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 0.92;
    camera.position.set(0.55, 0.55, 1).normalize().multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    cache.set(`${mech.id}:${id}`, url);
    onEach(id, url);
    scene.remove(holder);
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  env.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
}
