/**
 * Minimal technical-drawing toolkit producing SVG markup in sheet millimetres.
 * Line types: thick (visible outlines), thin (dimensions, hatching), centre (dash-dot).
 * Any element can be wrapped with a note key so the drawing tab can explain it on tap.
 */
import { tr } from '../i18n';

export const f = (n: number): string => (Math.round(n * 1000) / 1000).toString();
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type Cls = 'thick' | 'thin' | 'center' | 'hidden-line';

export function line(x1: number, y1: number, x2: number, y2: number, cls: Cls = 'thick'): string {
  return `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
}

export function polyline(pts: [number, number][], cls: Cls = 'thick', closed = false): string {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + (closed ? 'Z' : '');
  return `<path class="${cls}" d="${d}"/>`;
}

export function path(d: string, cls: string): string {
  return `<path class="${cls}" d="${d}"/>`;
}

export function circle(cx: number, cy: number, r: number, cls: Cls = 'thick'): string {
  return `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
}

export interface TextOpts {
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  rotate?: number;
  cls?: string;
  /** Upper / lower deviations shown stacked after the main text. */
  tol?: [string, string];
}

/** Rough text width for hit areas (italic sans, mm). */
export const textWidth = (s: string, size = 3.5): number => s.length * size * 0.56;

export function text(x: number, y: number, raw: string, o: TextOpts = {}): string {
  const s = tr(raw);
  const size = o.size ?? 3.5;
  const anchor = o.anchor ?? 'middle';
  const rot = o.rotate ? ` transform="rotate(${f(o.rotate)} ${f(x)} ${f(y)})"` : '';
  const cls = o.cls ? ` class="${o.cls}"` : '';
  if (!o.tol) {
    return `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" style="font-size:${size}px"${rot}${cls}>${esc(s)}</text>`;
  }
  // Main text followed by stacked deviations.
  const tw = textWidth(s, size);
  const tolW = Math.max(textWidth(o.tol[0], size * 0.7), textWidth(o.tol[1], size * 0.7));
  const total = tw + 0.6 + tolW;
  const x0 = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  const ts = size * 0.7;
  return `<g${rot}><text x="${f(x0)}" y="${f(y)}" text-anchor="start" style="font-size:${size}px"${cls}>${esc(s)}</text>
    <text x="${f(x0 + tw + 0.6)}" y="${f(y - size * 0.55)}" text-anchor="start" style="font-size:${ts}px">${esc(o.tol[0])}</text>
    <text x="${f(x0 + tw + 0.6)}" y="${f(y + size * 0.15)}" text-anchor="start" style="font-size:${ts}px">${esc(o.tol[1])}</text></g>`;
}

export function arrowHead(x: number, y: number, angle: number, len = 3): string {
  // Closed, filled arrow with 15° half-angle (ISO 129).
  const w = len * Math.tan((15 * Math.PI) / 180);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const bx = x - c * len;
  const by = y - s * len;
  return `<path class="arrow" d="M${f(x)} ${f(y)}L${f(bx - s * w)} ${f(by + c * w)}L${f(bx + s * w)} ${f(by - c * w)}Z"/>`;
}

/** Wraps markup as a tappable element with an enlarged invisible hit box. */
export function note(key: string, inner: string, hit: { x: number; y: number; w: number; h: number }): string {
  return `<g data-note="${key}"><rect class="hit" x="${f(hit.x)}" y="${f(hit.y)}" width="${f(hit.w)}" height="${f(hit.h)}" rx="1.5"/>${inner}</g>`;
}

export interface DimOpts {
  note?: string;
  tol?: [string, string];
  /** Text position along the dimension line, 0..1 (default 0.5). */
  at?: number;
  /** Draw arrows outside the extension lines (for short dimensions). */
  outside?: boolean;
  size?: number;
}

/**
 * Linear dimension between P1 and P2. The dimension line is offset along the left-hand normal
 * of P1→P2 by `offset` (negative = other side). Extension lines are drawn from the points.
 */
export function dim(x1: number, y1: number, x2: number, y2: number, offset: number, label: string, o: DimOpts = {}): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const nx = uy;
  const ny = -ux; // left normal in SVG (y down) for a left-to-right line points up
  const sgn = Math.sign(offset) || 1;
  const a1x = x1 + nx * offset;
  const a1y = y1 + ny * offset;
  const a2x = x2 + nx * offset;
  const a2y = y2 + ny * offset;
  const gap = 0.8 * sgn;
  const over = 1.8 * sgn;
  let s = '';
  if (Math.abs(offset) > 0.01) {
    s += line(x1 + nx * gap, y1 + ny * gap, a1x + nx * over, a1y + ny * over, 'thin');
    s += line(x2 + nx * gap, y2 + ny * gap, a2x + nx * over, a2y + ny * over, 'thin');
  }
  const ang = Math.atan2(uy, ux);
  if (o.outside) {
    s += line(a1x - ux * 7, a1y - uy * 7, a2x + ux * 7, a2y + uy * 7, 'thin');
    s += arrowHead(a1x, a1y, ang) + arrowHead(a2x, a2y, ang + Math.PI);
  } else {
    s += line(a1x, a1y, a2x, a2y, 'thin');
    s += arrowHead(a1x, a1y, ang + Math.PI) + arrowHead(a2x, a2y, ang);
  }
  // Text above the line, readable from the bottom or the right side.
  let rot = (ang * 180) / Math.PI;
  // Keep text readable from the bottom or the right of the sheet: rot in [-90°, 90°).
  if (rot > 89.99 || rot < -90.01) rot = rot > 0 ? rot - 180 : rot + 180;
  const at = o.at ?? 0.5;
  const size = o.size ?? 3.5;
  // ISO 129: text sits just above the dimension line, as seen by the reader.
  const r = (rot * Math.PI) / 180;
  const upx = Math.sin(r);
  const upy = -Math.cos(r);
  const bx = a1x + (a2x - a1x) * at + upx * 1.1;
  const by = a1y + (a2y - a1y) * at + upy * 1.1;
  const tEl = text(bx, by, label, { rotate: Math.abs(rot) > 0.01 ? rot : undefined, tol: o.tol, size });
  s += tEl;
  if (!o.note) return `<g>${s}</g>`;
  const tw = textWidth(label, size) + (o.tol ? textWidth(o.tol[0], size * 0.7) + 1 : 0) + 4;
  const th = size + 4;
  // Hit box around the text, axis-aligned approximation.
  const vertical = Math.abs(Math.abs(rot) - 90) < 1;
  const hb = vertical
    ? { x: bx - th + 1, y: by - tw / 2, w: th, h: tw }
    : { x: bx - tw / 2, y: by - th + 1.5, w: tw, h: th };
  return note(o.note, s, hb);
}

/**
 * Surface roughness symbol (ISO 1302/21920, material removal required) with its tip at (x, y)
 * on a horizontal surface below it, and the Ra value written above the extension line.
 */
export function roughness(x: number, y: number, ra: string, key?: string, flip = false): string {
  const h = 3.5;
  const t = Math.tan((30 * Math.PI) / 180);
  const sy = flip ? -1 : 1;
  const p = (dx: number, dy: number): string => `${f(x + dx)} ${f(y - dy * sy)}`;
  const d = `M${p(-h * t, h)}L${p(0, 0)}L${p(2 * h * t, 2 * h)}L${p(2 * h * t + 11, 2 * h)}M${p(-h * t, h)}L${p(h * t, h)}`;
  const tx = x + 2 * h * t + 1.2;
  const ty = flip ? y + 2 * h + 3.2 : y - 2 * h - 0.8;
  const inner = `<path class="thin" style="stroke-width:0.3" d="${d}"/>${text(tx, ty, `Ra ${ra}`, { anchor: 'start', size: 2.8 })}`;
  if (!key) return inner;
  return note(key, inner, { x: x - 4, y: flip ? y : y - 2 * h - 4.5, w: 22, h: 2 * h + 5 });
}

/** Leader line with an arrow at (x1, y1), a knee at (x2, y2) and a horizontal shoulder with text. */
export function leader(x1: number, y1: number, x2: number, y2: number, label: string, key?: string, right = true): string {
  const w = textWidth(label, 3.2) + 2;
  const x3 = right ? x2 + w : x2 - w;
  const ang = Math.atan2(y1 - y2, x1 - x2);
  let s = line(x2, y2, x1, y1, 'thin') + line(x2, y2, x3, y2, 'thin') + arrowHead(x1, y1, ang, 2.6);
  s += text(right ? x2 + 1 : x3 + 1, y2 - 0.9, label, { anchor: 'start', size: 3.2 });
  if (!key) return s;
  return note(key, s, { x: Math.min(x2, x3) - 1, y: y2 - 6, w: w + 2, h: 8 });
}

export function hatchDefs(): string {
  return `<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="2.4" stroke="#1d232b" stroke-width="0.22"/></pattern></defs>`;
}

export interface TitleBlock {
  name: string;
  material: string;
  scale: string;
  number: string;
  author: string;
  date: string;
  sheet: string;
  mass?: string;
}

/** Simplified ISO 7200 title block, 180 x 36 mm, bottom-right corner at (x2, y2). */
export function titleBlock(x2: number, y2: number, tb: TitleBlock, key = 'title'): string {
  const w = 180;
  const hgt = 36;
  const x = x2 - w;
  const y = y2 - hgt;
  let s = `<rect class="thick" x="${f(x)}" y="${f(y)}" width="${w}" height="${hgt}"/>`;
  s += line(x, y + 12, x2, y + 12, 'thin') + line(x, y + 24, x2, y + 24, 'thin');
  s += line(x + 110, y, x + 110, y2, 'thin') + line(x + 145, y + 12, x + 145, y2, 'thin');
  const lab = (lx: number, ly: number, t: string): string => text(lx + 1.5, ly + 3.4, t, { anchor: 'start', size: 2.2, cls: 'label' });
  const val = (vx: number, vy: number, t: string, size = 3.6): string => text(vx + 2, vy + 9.5, t, { anchor: 'start', size });
  s += lab(x, y, 'Наименование') + val(x, y, tb.name, 4.6);
  s += lab(x + 110, y, 'Чертеж №') + val(x + 110, y, tb.number);
  s += lab(x, y + 12, 'Материал') + val(x, y + 12, tb.material, 3.2);
  s += lab(x + 110, y + 12, 'Мащаб') + val(x + 110, y + 12, tb.scale);
  s += lab(x + 145, y + 12, 'Лист') + val(x + 145, y + 12, tb.sheet);
  s += lab(x, y + 24, 'Разработил') + val(x, y + 24, tb.author, 3.2);
  s += lab(x + 110, y + 24, 'Дата') + val(x + 110, y + 24, tb.date);
  s += lab(x + 145, y + 24, 'Маса') + val(x + 145, y + 24, tb.mass ?? '—');
  return note(key, s, { x, y, w, h: hgt });
}

/** A3 landscape sheet with frame. Returns the opening of the SVG; close with sheetEnd(). */
export function sheetStart(w = 420, hgt = 297): string {
  return `<svg class="tdraw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" width="${w * 4}" height="${hgt * 4}">
  ${hatchDefs()}
  <rect x="0" y="0" width="${w}" height="${hgt}" fill="#f7f5ef"/>
  <rect class="thick" x="20" y="10" width="${w - 30}" height="${hgt - 20}"/>`;
}

export function sheetEnd(): string {
  return '</svg>';
}
