/**
 * Force vectors in the 3D view: shaft + cone arrows drawn on top of the model, with text labels.
 * Lengths are proportional to the force (the largest force gets MAX_LEN mm).
 */
import * as THREE from 'three';
import { tr } from '../i18n';
import type { ForceArrow } from '../core/types';

const MIN_LEN = 12;
const MAX_LEN = 58;

export function labelSprite(raw: string, color: string, height = 7.5): THREE.Sprite {
  const text = tr(raw);
  const scale = 2;
  const font = `700 ${26 * scale}px system-ui, "Segoe UI", Roboto, sans-serif`;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 24 * scale;
  const h = 40 * scale;
  c.width = w;
  c.height = h;
  ctx.font = font;
  ctx.fillStyle = 'rgba(16, 18, 22, 0.82)';
  const r = 12 * scale;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 6 * scale, h);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 14 * scale, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set((height * w) / h, height, 1);
  s.renderOrder = 31;
  return s;
}

export class ForceArrows {
  readonly group = new THREE.Group();

  constructor() {
    this.group.name = 'force-arrows';
  }

  set(arrows: ForceArrow[]): void {
    this.clear();
    const max = Math.max(1e-9, ...arrows.map((a) => a.magnitude));
    for (const a of arrows) {
      if (!(a.magnitude > 0)) continue;
      const dir = new THREE.Vector3(...a.dir).normalize();
      const len = MIN_LEN + (MAX_LEN - MIN_LEN) * (a.magnitude / max);
      const at = new THREE.Vector3(...a.at);
      let tail: THREE.Vector3;
      if (a.mode === 'to') {
        const head = at.clone().addScaledVector(dir, -(a.gap ?? 0));
        tail = head.clone().addScaledVector(dir, -len);
      } else {
        tail = at.clone();
      }
      const mat = new THREE.MeshBasicMaterial({ color: a.color, depthTest: false, transparent: true, opacity: 0.95 });
      const headLen = Math.min(9, len * 0.45);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, len - headLen, 10), mat);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, headLen, 16), mat);
      shaft.position.y = (len - headLen) / 2;
      cone.position.y = len - headLen / 2;
      const arrow = new THREE.Group();
      arrow.add(shaft, cone);
      arrow.position.copy(tail);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      for (const m of [shaft, cone]) {
        m.renderOrder = 30;
        m.raycast = () => undefined;
      }
      this.group.add(arrow);
      const label = labelSprite(a.label, a.color);
      const along = a.labelAt !== undefined ? a.labelAt * len : a.mode === 'to' ? -6 : len + 7;
      const tip = tail.clone().addScaledVector(dir, along);
      label.position.copy(tip);
      label.raycast = () => undefined;
      this.group.add(label);
    }
  }

  clear(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh | THREE.Sprite;
      if ((m as THREE.Mesh).isMesh) (m as THREE.Mesh).geometry.dispose();
      const mat = (m as THREE.Mesh).material as THREE.Material | undefined;
      if (mat) {
        (mat as THREE.SpriteMaterial).map?.dispose();
        mat.dispose();
      }
    });
    this.group.clear();
  }

  dispose(): void {
    this.clear();
    this.group.removeFromParent();
  }
}
