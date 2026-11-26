/**
 * Animated 3D figures for the theory notebook.
 *
 *  - figure3d: a free 3D scene (perspective camera) with handwritten SVG labels pinned to scene points.
 *  - sheet3d:  a 2D drawing "sheet" lying in the plane of the gear faces, seen slightly from the side by an
 *              orthographic camera. Existing precise SVG drawings keep working unchanged on the sheet (the sheet
 *              gets the affine map of that plane), while the gears under it are real 3D meshes placed exactly
 *              where the drawn gears are (taken from the SVG transforms every frame).
 *
 * All figures share ONE WebGL renderer (phones allow only a few contexts): each frame the active figure is
 * rendered there and copied into its own 2D canvas, which also keeps the last frame visible when stopped.
 * Every figure has a small pause / play button; the choice is remembered for all figures.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { IllustrationHandle } from '../core/types';
import { gearOutline, type OutlineOptions } from '../core/involute';
import { t as tx } from '../i18n';
import { createMaterialKit, type MaterialKit } from '../three/materials';
import { circlePath, creased, extrudeCentered, shapeFromPoints } from '../three/geom';
import { icons } from './icons';
import { label, makeRoot, svg } from './illus';

export const FIG_W = 400;
export const FIG_H = 300;
const DPR = 2;

// ------------------------------------------------------------------ shared renderer
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

function newScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.environment = renderer().env;
  scene.environmentIntensity = 0.95;
  scene.add(new THREE.HemisphereLight('#ffffff', '#5a5f66', 0.7));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(140, 260, 180);
  const rim = new THREE.DirectionalLight('#dce8ff', 0.9);
  rim.position.set(-200, 120, -160);
  scene.add(key, rim);
  return scene;
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) mat.dispose();
  });
}

// ------------------------------------------------------------------ pause preference (all figures)
const PAUSE_KEY = 'el-figures-paused';
let paused = ((): boolean => {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1';
  } catch {
    return false;
  }
})();
const pauseListeners = new Set<() => void>();
function setPaused(on: boolean): void {
  paused = on;
  try {
    localStorage.setItem(PAUSE_KEY, on ? '1' : '0');
  } catch {
    // Not stored: the choice holds for this session.
  }
  pauseListeners.forEach((f) => f());
}

/**
 * The frame loop of one figure: canvas, SVG overlay, pause button, start / stop from the notebook.
 * `draw(t, dt)` renders a frame; it is called once for the poster frame even when paused.
 */
function figureLoop(host: HTMLElement, draw: (t: number, dt: number, ctx2d: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement) => void, extraDispose: () => void) {
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
  const btn = document.createElement('button');
  btn.className = 'illus3d-pause';
  btn.type = 'button';
  wrap.appendChild(btn);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let wanted = false; // the notebook shows this figure
  let running = false;
  let raf = 0;
  let t = 0;
  let last = 0;
  const frame = (dt: number): void => draw(t, dt, ctx2d, canvas);
  const loop = (now: number): void => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    frame(dt);
    raf = requestAnimationFrame(loop);
  };
  const sync = (): void => {
    const should = wanted && !paused && !reduce;
    btn.innerHTML = paused ? icons.play : icons.pause;
    btn.setAttribute('aria-label', tx(paused ? 'animPlay' : 'animPause'));
    btn.setAttribute('aria-pressed', String(paused));
    btn.hidden = reduce;
    if (should && !running) {
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setPaused(!paused);
  });
  pauseListeners.add(sync);
  sync();
  // First frame (poster) once the page has been laid out.
  const poster = window.setTimeout(() => frame(0), 30);

  const handle: IllustrationHandle = {
    start() {
      wanted = true;
      sync();
      if (!running) frame(0);
    },
    stop() {
      wanted = false;
      sync();
    },
    dispose() {
      wanted = false;
      running = false;
      window.clearTimeout(poster);
      cancelAnimationFrame(raf);
      pauseListeners.delete(sync);
      extraDispose();
      wrap.remove();
    },
  };
  return { handle, overlay, wrap };
}

function blit(ctx2d: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement): void {
  if (!ctx2d) return;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  ctx2d.drawImage(renderer().renderer.domElement, 0, 0, canvas.width, canvas.height);
}

// ------------------------------------------------------------------ figure3d (free 3D scene)
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
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let update: ((t: number, dt: number) => void) | null = null;
  const pins: { at: THREE.Vector3 | (() => THREE.Vector3); el: SVGTextElement; dx: number; dy: number }[] = [];
  const project = (p: THREE.Vector3): [number, number] => {
    const v = p.clone().project(camera!);
    return [((v.x + 1) / 2) * FIG_W, ((1 - v.y) / 2) * FIG_H];
  };
  const { handle, overlay } = figureLoop(
    host,
    (t, dt, ctx2d, canvas) => {
      if (!scene) {
        scene = newScene();
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
      }
      update!(t, dt);
      camera!.updateMatrixWorld();
      for (const p of pins) {
        const [x, y] = project(typeof p.at === 'function' ? p.at() : p.at);
        p.el.setAttribute('x', (x + p.dx).toFixed(1));
        p.el.setAttribute('y', (y + p.dy).toFixed(1));
      }
      renderer().renderer.render(scene, camera!);
      blit(ctx2d, canvas);
    },
    () => {
      if (scene) disposeScene(scene);
    },
  );
  return handle;
}

/** A straight arrow drawn in the overlay between two figure points. */
export function overlayArrow(overlay: SVGElement, color: string, id: string): (a: [number, number], b: [number, number]) => void {
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

// ------------------------------------------------------------------ sheet3d (drawing over 3D gears)
export interface SheetGear extends Omit<OutlineOptions, 'phase'> {
  color: string;
  phase?: number;
  /** Bore radius (mm). */
  bore?: number;
  /** Face width (mm), drawn behind the sheet. */
  width?: number;
  /** < 1: see-through (e.g. to show lines behind the teeth). */
  opacity?: number;
}

export interface Sheet3D {
  /** SVG group in sheet units (400 × 300, y down): draw the figure here as on a flat SVG. */
  root: SVGSVGElement;
  /** A real 3D gear that follows the SVG group `g` (its position, scale and rotation, every frame). */
  gear(g: SVGGElement, o: SheetGear): void;
  /** Starts the figure: `tick` updates the SVG (as before); the 3D gears and the view follow. */
  animate(tick: (t: number, dt: number) => void): IllustrationHandle;
}

export function sheet3d(host: HTMLElement, view: { tilt?: number; swing?: number } = {}): Sheet3D {
  const scene = newScene();
  const camera = new THREE.OrthographicCamera(-FIG_W / 2, FIG_W / 2, FIG_H / 2, -FIG_H / 2, -2000, 2000);
  camera.zoom = 0.94;
  camera.updateProjectionMatrix();
  const kit = createMaterialKit();
  const gears: { g: SVGGElement; mesh: THREE.Mesh }[] = [];
  let tick: (t: number, dt: number) => void = () => undefined;
  let sheetG: SVGGElement | null = null;
  const tilt = view.tilt ?? 0.42;
  const swing = view.swing ?? 0.22;
  const m4 = new THREE.Matrix4();

  const placeCamera = (t: number): void => {
    // Above the sheet and a little to the side, swaying slowly.
    const yaw = swing * Math.sin(t * 0.3);
    const dir = new THREE.Vector3(Math.sin(yaw), tilt, Math.cos(yaw)).normalize();
    camera.position.copy(dir).multiplyScalar(800);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  };
  /** Figure coordinates of a sheet point (sheet x right, y down; world z = 0). */
  const toFig = (x: number, y: number): [number, number] => {
    const v = new THREE.Vector3(x - FIG_W / 2, FIG_H / 2 - y, 0).project(camera);
    return [((v.x + 1) / 2) * FIG_W, ((1 - v.y) / 2) * FIG_H];
  };

  const { handle: base, overlay } = figureLoop(
    host,
    (t, dt, ctx2d, canvas) => {
      tick(t, dt);
      placeCamera(t);
      const [ex, ey] = toFig(0, 0);
      const [ax, ay] = toFig(1, 0);
      const [cx, cy] = toFig(0, 1);
      sheetG!.setAttribute('transform', `matrix(${(ax - ex).toFixed(5)} ${(ay - ey).toFixed(5)} ${(cx - ex).toFixed(5)} ${(cy - ey).toFixed(5)} ${ex.toFixed(3)} ${ey.toFixed(3)})`);
      // Gears follow their SVG groups: local (mm, as drawn) → sheet → world.
      const sheetCTM = sheetG!.getScreenCTM();
      if (sheetCTM) {
        const inv = sheetCTM.inverse();
        for (const { g, mesh } of gears) {
          const ctm = g.getScreenCTM();
          if (!ctm) continue;
          const r = inv.multiply(ctm); // local → sheet
          const s = Math.sqrt(Math.abs(r.a * r.d - r.b * r.c));
          m4.set(r.a, r.c, 0, r.e - FIG_W / 2, -r.b, -r.d, 0, FIG_H / 2 - r.f, 0, 0, s, 0, 0, 0, 0, 1);
          mesh.matrix.copy(m4);
          mesh.matrixWorldNeedsUpdate = true;
        }
      }
      renderer().renderer.render(scene, camera);
      blit(ctx2d, canvas);
    },
    () => disposeScene(scene),
  );
  sheetG = svg('g', {}, overlay);

  return {
    root: sheetG as unknown as SVGSVGElement,
    gear(g, o) {
      const width = o.width ?? 6;
      const shape = shapeFromPoints(gearOutline({ ...o, phase: o.phase ?? 0, flankSegments: o.flankSegments ?? 10 }));
      shape.holes.push(circlePath(o.bore ?? (o.m * o.z) / 8));
      const geo = creased(extrudeCentered(shape, width, { bevel: Math.min(0.35 * o.m, width / 4), curveSegments: 32 }), 30);
      geo.translate(0, 0, -width / 2); // front face in the sheet plane, body behind it
      const mat = kit.paint(o.color, 0.55, 0.35) as THREE.MeshStandardMaterial;
      if (o.opacity !== undefined && o.opacity < 1) {
        mat.transparent = true;
        mat.opacity = Math.max(0.35, o.opacity);
        mat.depthWrite = false;
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
      gears.push({ g, mesh });
    },
    animate(fn) {
      tick = fn;
      return base;
    },
  };
}
