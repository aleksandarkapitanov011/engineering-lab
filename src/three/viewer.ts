/**
 * Reusable 3D viewport: renderer, camera, orbit controls (touch), studio lighting,
 * grid floor with shadows, camera tweens, tap detection and on-demand rendering.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Vec3 } from '../core/types';
import type { Theme } from '../core/storage';

export type FrameHandler = (dt: number) => boolean;

export interface TapEvent {
  clientX: number;
  clientY: number;
}

const THEME_COLORS: Record<Theme, { bg: string; grid1: string; grid2: string }> = {
  dark: { bg: '#15171b', grid1: '#3a4048', grid2: '#262a30' },
  light: { bg: '#e9ecef', grid1: '#aab2bb', grid2: '#cfd5db' },
};

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly canvas: HTMLCanvasElement;

  private readonly handlers = new Set<FrameHandler>();
  private readonly tapListeners = new Set<(e: TapEvent) => void>();
  private needsRender = true;
  private raf = 0;
  private last = performance.now();
  private tween: { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3 } | null =
    null;
  private readonly ro: ResizeObserver;
  private grid: THREE.GridHelper | null = null;
  private envTex: THREE.Texture;
  private down: { x: number; y: number; time: number; id: number } | null = null;
  private multiTouch = false;
  private disposed = false;

  constructor(
    private readonly host: HTMLElement,
    theme: Theme,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.localClippingEnabled = true;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'viewer-canvas';
    host.appendChild(this.canvas);

    this.camera = new THREE.PerspectiveCamera(38, 1, 2, 5000);
    this.camera.position.set(220, 180, 260);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 60;
    this.controls.maxDistance = 1200;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.addEventListener('change', () => this.requestRender());

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.85;

    this.setupLights();
    this.setTheme(theme);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();

    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onCancel);
    this.canvas.addEventListener('touchstart', this.onTouch, { passive: true });

    this.raf = requestAnimationFrame(this.loop);
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight('#ffffff', '#3b3f45', 0.55);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(140, 260, 180);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const sc = key.shadow.camera;
    sc.left = -170;
    sc.right = 170;
    sc.top = 170;
    sc.bottom = -170;
    sc.near = 50;
    sc.far = 700;
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.6;
    key.target.position.set(30, 0, 0);
    this.scene.add(key, key.target);
    const rim = new THREE.DirectionalLight('#cfe0ff', 0.7);
    rim.position.set(-200, 120, -160);
    this.scene.add(rim);
  }

  /** Adds a grid floor and a shadow catcher at height y. */
  setFloor(y: number, size: number, center: Vec3 = [0, 0, 0]): void {
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.ShadowMaterial({ opacity: 0.28 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(center[0], y, center[2]);
    shadow.receiveShadow = true;
    shadow.name = 'floor-shadow';
    this.scene.add(shadow);
    this.gridY = y;
    this.gridCenter = center;
    this.gridSize = size;
    this.rebuildGrid();
  }

  private gridY = 0;
  private gridSize = 0;
  private gridCenter: Vec3 = [0, 0, 0];
  private theme: Theme = 'dark';

  private rebuildGrid(): void {
    if (this.grid) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as THREE.Material).dispose();
      this.grid = null;
    }
    if (!this.gridSize) return;
    const c = THEME_COLORS[this.theme];
    this.grid = new THREE.GridHelper(this.gridSize, this.gridSize / 10, c.grid1, c.grid2);
    this.grid.position.set(this.gridCenter[0], this.gridY - 0.05, this.gridCenter[2]);
    const mat = this.grid.material as THREE.Material;
    mat.transparent = true;
    mat.opacity = 0.55;
    this.scene.add(this.grid);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.scene.background = new THREE.Color(THEME_COLORS[theme].bg);
    this.rebuildGrid();
    this.requestRender();
  }

  addFrameHandler(fn: FrameHandler): () => void {
    this.handlers.add(fn);
    this.requestRender();
    return () => this.handlers.delete(fn);
  }

  onTap(fn: (e: TapEvent) => void): () => void {
    this.tapListeners.add(fn);
    return () => this.tapListeners.delete(fn);
  }

  requestRender(): void {
    this.needsRender = true;
  }

  /** Camera distance so that a sphere of `radius` fits the current viewport. */
  fitDistance(radius: number): number {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fov = Math.min(vFov, hFov);
    return (radius / Math.sin(fov / 2)) * 1.02;
  }

  viewFrom(dir: Vec3, target: Vec3, radius: number, animate = true): void {
    const d = new THREE.Vector3(...dir).normalize();
    const tgt = new THREE.Vector3(...target);
    const pos = tgt.clone().addScaledVector(d, this.fitDistance(radius));
    if (!animate) {
      this.camera.position.copy(pos);
      this.controls.target.copy(tgt);
      this.controls.update();
      this.requestRender();
      return;
    }
    this.tween = {
      t: 0,
      dur: 0.7,
      p0: this.camera.position.clone(),
      p1: pos,
      t0: this.controls.target.clone(),
      t1: tgt,
    };
    this.requestRender();
  }

  raycast(clientX: number, clientY: number, objects: THREE.Object3D[]): THREE.Intersection[] {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    return rc.intersectObjects(objects, true);
  }

  /** World point to client (CSS pixel) coordinates. */
  project(p: THREE.Vector3): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const v = p.clone().project(this.camera);
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  private onTouch = (e: TouchEvent): void => {
    if (e.touches.length > 1) this.multiTouch = true;
  };

  private onDown = (e: PointerEvent): void => {
    if (e.isPrimary) {
      this.multiTouch = false;
      this.down = { x: e.clientX, y: e.clientY, time: performance.now(), id: e.pointerId };
    } else {
      this.multiTouch = true;
    }
  };

  private onUp = (e: PointerEvent): void => {
    const d = this.down;
    if (!d || d.id !== e.pointerId) return;
    this.down = null;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (!this.multiTouch && moved < 8 && performance.now() - d.time < 450) {
      for (const fn of this.tapListeners) fn({ clientX: e.clientX, clientY: e.clientY });
    }
  };

  private onCancel = (): void => {
    this.down = null;
  };

  private insetTop = 0;
  private insetBottom = 0;

  /**
   * Shifts the optical centre so the model is centred in the area not covered by overlays
   * (top toolbar / bottom panel), without changing the canvas size.
   */
  setInsets(top: number, bottom: number): void {
    this.insetTop = top;
    this.insetBottom = bottom;
    this.resize();
  }

  private resize(): void {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const shift = this.insetBottom - this.insetTop;
    if (shift !== 0 && h > 2 * Math.abs(shift)) {
      const fullH = h + Math.abs(shift);
      this.camera.aspect = w / fullH;
      // Render the lower part of a taller virtual frame: the optical centre moves up by shift/2.
      this.camera.setViewOffset(w, fullH, 0, shift > 0 ? shift : 0, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  private loop = (now: number): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    let active = false;
    for (const h of this.handlers) if (h(dt)) active = true;
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const k = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
      this.camera.position.lerpVectors(tw.p0, tw.p1, k);
      this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (tw.t >= 1) this.tween = null;
      active = true;
    }
    // Damping keeps emitting 'change' while the camera settles.
    this.controls.update(dt);
    if (active || this.needsRender) {
      this.needsRender = false;
      this.renderer.render(this.scene, this.camera);
    }
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('touchstart', this.onTouch);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.envTex.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
