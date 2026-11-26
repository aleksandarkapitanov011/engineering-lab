/**
 * Animated 3D figures for the theory notebook: a small three.js scene drawn into the taped-in figure, with
 * handwritten SVG labels on top that follow points of the scene.
 *
 * All figures share ONE WebGL renderer (phones allow only a few contexts): each frame the active figure is
 * rendered there and copied into its own 2D canvas, which also keeps the last frame visible when the page
 * stops animating. The scene is built lazily, on the first frame.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { IllustrationHandle } from '../core/types';
import { createMaterialKit, type MaterialKit } from '../three/materials';
import { label, makeRoot, svg } from './illus';

export const FIG_W = 400;
export const FIG_H = 300;
const DPR = 2;

let shared: { renderer: THREE.WebGLRenderer; env: THREE.Texture } | null = null;
function renderer(): { renderer: THREE.WebGLRenderer; env: THREE.Texture } {
  if (shared) return shared;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(FIG_W * DPR, FIG_H * DPR, false);
  r.setClearColor(0x000000, 0);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;
  const pmrem = new THREE.PMREMGenerator(r);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  shared = { renderer: r, env };
  return shared;
}

export interface Fig3DContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  kit: MaterialKit;
  /** SVG overlay in figure units (400 × 300). */
  overlay: SVGSVGElement;
  /** Places the camera on `dir` from `target` so a sphere of `radius` fills the figure. */
  view(target: THREE.Vector3Like, dir: THREE.Vector3Like, radius: number): void;
  /** A handwritten label that follows a 3D point (offset in figure units). */
  pin(at: THREE.Vector3 | (() => THREE.Vector3), text: string, o?: Parameters<typeof label>[4] & { dx?: number; dy?: number }): SVGTextElement;
  /** Figure coordinates of a 3D point. */
  project(p: THREE.Vector3): [number, number];
}

/**
 * Creates a 3D figure. `build` sets up the scene once and returns the per-frame update (t, dt in seconds);
 * labels pinned with `ctx.pin` are moved after every update.
 */
export function figure3d(host: HTMLElement, build: (ctx: Fig3DContext) => (t: number, dt: number) => void): IllustrationHandle {
  const wrap = document.createElement('div');
  wrap.className = 'illus3d';
  const canvas = document.createElement('canvas');
  canvas.width = FIG_W * DPR;
  canvas.height = FIG_H * DPR;
  canvas.className = 'illus3d-canvas';
  wrap.appendChild(canvas);
  host.appendChild(wrap);
  const overlay = makeRoot(wrap, FIG_W, FIG_H);
  overlay.classList.add('illus3d-overlay');
  const ctx2d = canvas.getContext('2d');

  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let update: ((t: number, dt: number) => void) | null = null;
  const pins: { at: THREE.Vector3 | (() => THREE.Vector3); el: SVGTextElement; dx: number; dy: number }[] = [];

  const project = (p: THREE.Vector3): [number, number] => {
    const v = p.clone().project(camera!);
    return [((v.x + 1) / 2) * FIG_W, ((1 - v.y) / 2) * FIG_H];
  };

  const ensure = (): void => {
    if (scene) return;
    const { env } = renderer();
    scene = new THREE.Scene();
    scene.environment = env;
    scene.environmentIntensity = 0.95;
    scene.add(new THREE.HemisphereLight('#ffffff', '#5a5f66', 0.7));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(140, 260, 180);
    const rim = new THREE.DirectionalLight('#dce8ff', 0.9);
    rim.position.set(-200, 120, -160);
    scene.add(key, rim);
    camera = new THREE.PerspectiveCamera(32, FIG_W / FIG_H, 1, 4000);
    const c: Fig3DContext = {
      scene,
      camera,
      kit: createMaterialKit(),
      overlay,
      view(target, dir, radius) {
        const d = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
        const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera!.fov / 2));
        const tg = new THREE.Vector3(target.x, target.y, target.z);
        camera!.position.copy(tg).addScaledVector(d, dist);
        camera!.lookAt(tg);
        camera!.near = Math.max(1, dist - radius * 3);
        camera!.far = dist + radius * 3;
        camera!.updateProjectionMatrix();
      },
      pin(at, text, o = {}) {
        const el = label(overlay, 0, 0, text, { size: 14, weight: 700, ...o });
        el.classList.add('illus3d-label');
        pins.push({ at, el, dx: o.dx ?? 0, dy: o.dy ?? 0 });
        return el;
      },
      project,
    };
    update = build(c);
  };

  const draw = (t: number, dt: number): void => {
    ensure();
    update!(t, dt);
    camera!.updateMatrixWorld();
    for (const p of pins) {
      const at = typeof p.at === 'function' ? p.at() : p.at;
      const [x, y] = project(at);
      p.el.setAttribute('x', (x + p.dx).toFixed(1));
      p.el.setAttribute('y', (y + p.dy).toFixed(1));
    }
    const { renderer: r } = renderer();
    r.render(scene!, camera!);
    if (ctx2d) {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      ctx2d.drawImage(r.domElement, 0, 0, canvas.width, canvas.height);
    }
  };

  let raf = 0;
  let running = false;
  let t = 0;
  let last = 0;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const loop = (now: number): void => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    draw(t, dt);
    raf = requestAnimationFrame(loop);
  };
  // First frame (poster) once the page has been laid out.
  const poster = window.setTimeout(() => draw(0, 0), 30);

  return {
    start() {
      if (running) return;
      if (reduce) {
        draw(t, 0);
        return;
      }
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      running = false;
      window.clearTimeout(poster);
      cancelAnimationFrame(raf);
      scene?.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry.dispose();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) mat.dispose();
      });
      wrap.remove();
    },
  };
}

/** A straight arrow drawn in the overlay between two 3D points (projected every frame by the caller). */
export function overlayArrow(overlay: SVGSVGElement, color: string, id: string): (a: [number, number], b: [number, number]) => void {
  const defs = svg('defs', {}, overlay);
  const m = svg('marker', { id: `ah3-${id}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
  svg('path', { d: 'M0 0L10 5L0 10z', fill: color }, m);
  const line = svg('line', { stroke: color, 'stroke-width': 3.2, 'stroke-linecap': 'round', 'marker-end': `url(#ah3-${id})` }, overlay);
  return ([x1, y1], [x2, y2]) => {
    line.setAttribute('x1', x1.toFixed(1));
    line.setAttribute('y1', y1.toFixed(1));
    line.setAttribute('x2', x2.toFixed(1));
    line.setAttribute('y2', y2.toFixed(1));
  };
}
