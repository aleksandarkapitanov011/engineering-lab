/**
 * Small "industrial" details drawn as textures: nameplates, cast lettering, stickers. A decal is a thin plane
 * with a canvas texture, lifted a hair off the surface (polygon offset) so it never flickers.
 * In tests (no DOM) the decals are simply left out.
 */
import * as THREE from 'three';

/** A canvas texture (w × h px) drawn by `draw`, or null without a DOM. */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

/**
 * A decal plane of `width × height` mm at `at`, facing `normal` (its "up" stays world +y unless the normal is
 * vertical; then `up` is used). `metal` gives an engraved-aluminium look, otherwise a printed sticker.
 */
export function decal(
  tex: THREE.Texture | null,
  width: number,
  height: number,
  at: THREE.Vector3Like,
  normal: THREE.Vector3Like,
  o: { metal?: boolean; up?: THREE.Vector3Like; roughness?: number } = {},
): THREE.Mesh | null {
  if (!tex) return null;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    metalness: o.metal ? 0.35 : 0.05,
    roughness: o.roughness ?? (o.metal ? 0.5 : 0.55),
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    depthWrite: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  const n = new THREE.Vector3(normal.x, normal.y, normal.z).normalize();
  const up = o.up ? new THREE.Vector3(o.up.x, o.up.y, o.up.z) : Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(up, n).normalize();
  const y = new THREE.Vector3().crossVectors(n, x);
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, n));
  m.position.set(at.x, at.y, at.z).addScaledVector(n, 0.25);
  m.renderOrder = 3;
  return m;
}

/**
 * Riveted aluminium nameplate: a dark header band with the brand, then rows of "key  value".
 * Drawn large and high-contrast (dark bold type on light metal) so it stays legible when small on screen.
 */
export function nameplateTexture(brand: string, rows: [string, string][], accent = '#ff7a1a'): THREE.Texture | null {
  const W = 1200;
  const H = 720;
  return canvasTexture(W, H, (ctx, w, h) => {
    // Brushed aluminium, kept light so the type stands out.
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f4f6f8');
    g.addColorStop(0.5, '#dde2e7');
    g.addColorStop(1, '#eef1f4');
    ctx.fillStyle = g;
    roundRect(ctx, 0, 0, w, h, 44);
    ctx.fill();
    ctx.globalAlpha = 0.05;
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = y % 8 ? '#000' : '#fff';
      ctx.fillRect(0, y, w, 2);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8a96a2';
    ctx.lineWidth = 6;
    roundRect(ctx, 14, 14, w - 28, h - 28, 34);
    ctx.stroke();
    // Header band with the brand.
    const hb = 150;
    ctx.fillStyle = '#16212b';
    roundRect(ctx, 56, 44, w - 112, hb, 18);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(56 + 80, 44 + hb / 2, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16212b';
    ctx.beginPath();
    ctx.arc(56 + 80, 44 + hb / 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    let fs = 84;
    ctx.font = `900 ${fs}px system-ui, "Segoe UI", sans-serif`;
    while (ctx.measureText(brand).width > w - 112 - 190 && fs > 40) {
      fs -= 4;
      ctx.font = `900 ${fs}px system-ui, "Segoe UI", sans-serif`;
    }
    ctx.fillText(brand, 56 + 160, 44 + hb / 2 + 4);
    // Rows: as large as the space allows.
    const top = 44 + hb + 24;
    const step = (h - top - 46) / rows.length;
    const size = Math.min(100, Math.floor(step * 0.62));
    const keyX = 70;
    const valX = Math.round(keyX + Math.max(...rows.map(([k]) => k.length)) * size * 0.55 + 50);
    rows.forEach(([k, v], i) => {
      const y = top + step * (i + 0.5);
      ctx.fillStyle = '#1f2a34';
      ctx.font = `800 ${Math.round(size * 0.82)}px system-ui, "Segoe UI", sans-serif`;
      ctx.fillText(k, keyX, y);
      ctx.fillStyle = '#05090d';
      let vs = size;
      ctx.font = `900 ${vs}px system-ui, "Segoe UI", sans-serif`;
      while (ctx.measureText(v).width > w - valX - 60 && vs > 24) {
        vs -= 2;
        ctx.font = `900 ${vs}px system-ui, "Segoe UI", sans-serif`;
      }
      ctx.fillText(v, valX, y);
      if (i < rows.length - 1) {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(60, y + step / 2);
        ctx.lineTo(w - 60, y + step / 2);
        ctx.stroke();
      }
    });
    // Rivets.
    for (const [x, y] of [
      [34, 34],
      [w - 34, 34],
      [34, h - 34],
      [w - 34, h - 34],
    ]) {
      const r = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 18);
      r.addColorStop(0, '#ffffff');
      r.addColorStop(1, '#6f7a85');
      ctx.fillStyle = r;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Raised cast lettering: light paint on the housing colour, with a soft shadow for relief. */
export function castLettering(text: string, color = '#c9d6df'): THREE.Texture | null {
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '900 92px system-ui, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Letter spacing by hand (canvas letterSpacing is not everywhere yet).
    const chars = [...text];
    const widths = chars.map((c) => ctx.measureText(c).width + 10);
    let x = (w - widths.reduce((a, b) => a + b, 0)) / 2;
    chars.forEach((c, i) => {
      const cx = x + widths[i] / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillText(c, cx + 4, h / 2 + 5);
      ctx.fillStyle = color;
      ctx.fillText(c, cx, h / 2);
      x += widths[i];
    });
  });
}

/** Round sticker with a curved arrow: the direction of rotation of a shaft. */
export function rotationSticker(clockwise: boolean, label: string): THREE.Texture | null {
  return canvasTexture(256, 256, (ctx, w) => {
    const c = w / 2;
    ctx.clearRect(0, 0, w, w);
    ctx.strokeStyle = '#d23b2c';
    ctx.fillStyle = '#d23b2c';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    const a0 = clockwise ? -Math.PI * 0.85 : -Math.PI * 0.15;
    const a1 = clockwise ? Math.PI * 0.35 : -Math.PI * 1.35;
    ctx.beginPath();
    ctx.arc(c, c, 96, a0, a1, !clockwise);
    ctx.stroke();
    const hx = c + 96 * Math.cos(a1);
    const hy = c + 96 * Math.sin(a1);
    const t = a1 + (clockwise ? Math.PI / 2 : -Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(hx + 30 * Math.cos(t), hy + 30 * Math.sin(t));
    ctx.lineTo(hx + 26 * Math.cos(t + 2.2), hy + 26 * Math.sin(t + 2.2));
    ctx.lineTo(hx + 26 * Math.cos(t - 2.2), hy + 26 * Math.sin(t - 2.2));
    ctx.closePath();
    ctx.fill();
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, c, c + 64);
  });
}

/** Yellow warning triangle (ISO 7010 style) with a short caption. */
export function warningSticker(caption: string): THREE.Texture | null {
  return canvasTexture(256, 300, (ctx, w) => {
    ctx.clearRect(0, 0, w, 300);
    ctx.fillStyle = '#f5c400';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2, 20);
    ctx.lineTo(w - 18, 220);
    ctx.lineTo(18, 220);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = '900 120px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', w / 2, 196);
    ctx.font = '800 30px system-ui, sans-serif';
    ctx.fillText(caption, w / 2, 272);
  });
}

/** Oil sight glass face: amber oil up to the middle, a level line, MIN / MAX marks. */
export function sightGlassTexture(): THREE.Texture | null {
  return canvasTexture(256, 256, (ctx, w) => {
    const c = w / 2;
    ctx.clearRect(0, 0, w, w);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, 118, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(210, 225, 235, 0.55)';
    ctx.fillRect(0, 0, w, w);
    const g = ctx.createLinearGradient(0, c, 0, w);
    g.addColorStop(0, 'rgba(230, 160, 40, 0.95)');
    g.addColorStop(1, 'rgba(150, 90, 10, 0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, c + 6, w, w);
    ctx.restore();
    ctx.strokeStyle = '#d23b2c';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(c - 70, c + 6);
    ctx.lineTo(c + 70, c + 6);
    ctx.stroke();
    ctx.fillStyle = '#1d2a36';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAX', c, c - 46);
    ctx.fillText('MIN', c, c + 84);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
