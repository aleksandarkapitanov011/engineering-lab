/**
 * Minimal technical-drawing toolkit producing SVG markup in sheet millimetres.
 * Line types: thick (visible outlines), thin (dimensions, hatching), centre (dash-dot).
 * Any element can be wrapped with a note key so the drawing tab can explain it on tap.
 */
import { lt, tr } from '../i18n';

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

/**
 * The drawings are read on a screen, often a phone, not printed: an A3 sheet with the print sizes of
 * ISO 3098 (2.5…3.5 mm) shows letters 3–6 px high. All text is drawn larger than the size the sheets ask
 * for (small text the most), and so are the arrow heads.
 */
export const TEXT_K = 1.45;
export const ts = (size: number): number => (size >= 5 ? size * 1.15 : size * TEXT_K);

/** Rough text width for hit areas (italic sans, mm), for the nominal size. */
export const textWidth = (s: string, size = 3.5): number => s.length * ts(size) * 0.56;

/** The largest nominal size ≤ `size` at which `s` fits into `width` mm. */
export const fitSize = (s: string, size: number, width: number): number => Math.min(size, size * (width / Math.max(0.1, textWidth(s, size))));

/** Splits `s` into lines no wider than `width` mm at the nominal `size`. */
export function wrapText(s: string, size: number, width: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(next, size) > width) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

export function text(x: number, y: number, raw: string, o: TextOpts = {}): string {
  const s = tr(raw);
  const nominal = o.size ?? 3.5;
  const size = ts(nominal);
  const anchor = o.anchor ?? 'middle';
  const rot = o.rotate ? ` transform="rotate(${f(o.rotate)} ${f(x)} ${f(y)})"` : '';
  const cls = o.cls ? ` class="${o.cls}"` : '';
  if (!o.tol) {
    return `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" style="font-size:${f(size)}px"${rot}${cls}>${esc(s)}</text>`;
  }
  // Main text followed by stacked deviations.
  const tw = textWidth(s, nominal);
  const tolW = Math.max(textWidth(o.tol[0], nominal * 0.7), textWidth(o.tol[1], nominal * 0.7));
  const total = tw + 0.6 + tolW;
  const x0 = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  const tsz = f(size * 0.7);
  return `<g${rot}><text x="${f(x0)}" y="${f(y)}" text-anchor="start" style="font-size:${f(size)}px"${cls}>${esc(s)}</text>
    <text x="${f(x0 + tw + 0.6)}" y="${f(y - size * 0.55)}" text-anchor="start" style="font-size:${tsz}px">${esc(o.tol[0])}</text>
    <text x="${f(x0 + tw + 0.6)}" y="${f(y + size * 0.15)}" text-anchor="start" style="font-size:${tsz}px">${esc(o.tol[1])}</text></g>`;
}

export function arrowHead(x: number, y: number, angle: number, len = 3.8): string {
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
  const over = 2.2 * sgn;
  let s = '';
  if (Math.abs(offset) > 0.01) {
    s += line(x1 + nx * gap, y1 + ny * gap, a1x + nx * over, a1y + ny * over, 'thin');
    s += line(x2 + nx * gap, y2 + ny * gap, a2x + nx * over, a2y + ny * over, 'thin');
  }
  const ang = Math.atan2(uy, ux);
  if (o.outside) {
    s += line(a1x - ux * 8.5, a1y - uy * 8.5, a2x + ux * 8.5, a2y + uy * 8.5, 'thin');
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
  const bx = a1x + (a2x - a1x) * at + upx * 1.3;
  const by = a1y + (a2y - a1y) * at + upy * 1.3;
  const tEl = text(bx, by, label, { rotate: Math.abs(rot) > 0.01 ? rot : undefined, tol: o.tol, size });
  s += tEl;
  // Dimensions in their own colour (dark blue), apart from the outlines of the part.
  s = `<g class="dim">${s}</g>`;
  if (!o.note) return s;
  const tw = textWidth(label, size) + (o.tol ? textWidth(o.tol[0], size * 0.7) + 1 : 0) + 4;
  const th = ts(size) + 4;
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
  const h = 4.4;
  const t = Math.tan((30 * Math.PI) / 180);
  const sy = flip ? -1 : 1;
  const bar = textWidth(`Ra ${ra}`, 2.8) + 2;
  const p = (dx: number, dy: number): string => `${f(x + dx)} ${f(y - dy * sy)}`;
  const d = `M${p(-h * t, h)}L${p(0, 0)}L${p(2 * h * t, 2 * h)}L${p(2 * h * t + bar, 2 * h)}M${p(-h * t, h)}L${p(h * t, h)}`;
  const tx = x + 2 * h * t + 1.2;
  const ty = flip ? y + 2 * h + ts(2.8) + 0.6 : y - 2 * h - 0.9;
  const inner = `<path class="thin" style="stroke-width:0.32" d="${d}"/>${text(tx, ty, `Ra ${ra}`, { anchor: 'start', size: 2.8 })}`;
  if (!key) return inner;
  return note(key, inner, { x: x - 4, y: flip ? y : y - 2 * h - ts(2.8) - 1.5, w: bar + 10, h: 2 * h + ts(2.8) + 2 });
}

/** Leader line with an arrow at (x1, y1), a knee at (x2, y2) and a horizontal shoulder with text. */
export function leader(x1: number, y1: number, x2: number, y2: number, label: string, key?: string, right = true): string {
  const w = textWidth(label, 3.2) + 2;
  const x3 = right ? x2 + w : x2 - w;
  const ang = Math.atan2(y1 - y2, x1 - x2);
  let s = line(x2, y2, x1, y1, 'thin') + line(x2, y2, x3, y2, 'thin') + arrowHead(x1, y1, ang, 3.2);
  s += text(right ? x2 + 1 : x3 + 1, y2 - 1, label, { anchor: 'start', size: 3.2 });
  if (!key) return s;
  return note(key, s, { x: Math.min(x2, x3) - 1, y: y2 - ts(3.2) - 2, w: w + 2, h: ts(3.2) + 4 });
}

export function hatchDefs(): string {
  // Cut material: 45° hatching on a light steel-blue tint, so sections stand out at a glance.
  return `<defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(45)">
    <rect width="2.4" height="2.4" fill="#dfe8f1"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#1d232b" stroke-width="0.24"/></pattern></defs>`;
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
  let s = `<rect class="tb-fill" x="${f(x)}" y="${f(y)}" width="${w}" height="${hgt}"/>`;
  s += `<rect class="tb-head" x="${f(x)}" y="${f(y)}" width="110" height="12"/>`;
  s += `<rect class="thick" x="${f(x)}" y="${f(y)}" width="${w}" height="${hgt}"/>`;
  s += line(x, y + 12, x2, y + 12, 'thin') + line(x, y + 24, x2, y + 24, 'thin');
  s += line(x + 110, y, x + 110, y2, 'thin') + line(x + 145, y + 12, x + 145, y2, 'thin');
  const lab = (lx: number, ly: number, t: string): string => text(lx + 1.5, ly + 3.6, t, { anchor: 'start', size: 2.2, cls: 'label tb-label' });
  const val = (vx: number, vy: number, t: string, size = 3.6, cw = 34): string =>
    text(vx + 2, vy + 10.2, t, { anchor: 'start', size: fitSize(tr(t), size, cw - 3) });
  s += lab(x, y, lt({ bg: 'Наименование', en: 'Name' })) + val(x, y, tb.name, 4.6, 110);
  s += lab(x + 110, y, lt({ bg: 'Чертеж №', en: 'Drawing No.' })) + val(x + 110, y, tb.number, 3.6, 70);
  s += lab(x, y + 12, lt({ bg: 'Материал', en: 'Material' })) + val(x, y + 12, tb.material, 3.2, 110);
  s += lab(x + 110, y + 12, lt({ bg: 'Мащаб', en: 'Scale' })) + val(x + 110, y + 12, tb.scale);
  s += lab(x + 145, y + 12, lt({ bg: 'Лист', en: 'Sheet' })) + val(x + 145, y + 12, tb.sheet);
  s += lab(x, y + 24, lt({ bg: 'Разработил', en: 'Drawn by' })) + val(x, y + 24, tb.author, 3.2, 110);
  s += lab(x + 110, y + 24, lt({ bg: 'Дата', en: 'Date' })) + val(x + 110, y + 24, tb.date);
  s += lab(x + 145, y + 24, lt({ bg: 'Маса', en: 'Mass' })) + val(x + 145, y + 24, tb.mass ?? '—');
  return note(key, s, { x, y, w, h: hgt });
}

/** A3 landscape sheet with frame. Returns the opening of the SVG; close with sheetEnd(). */
export function sheetStart(w = 420, hgt = 297): string {
  const x0 = 20;
  const y0 = 10;
  const x1 = w - 10;
  const y1 = hgt - 10;
  let z = '';
  // Zones: 8 across (1…8), 6 down (A…F), marked in the margin, with short ticks on the frame.
  const nx = 8;
  const ny = 6;
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    if (i > 0 && i < nx) z += line(x, y0 - 5, x, y0, 'thin') + line(x, y1, x, y1 + 5, 'thin');
    if (i < nx) {
      const xm = x0 + ((x1 - x0) * (i + 0.5)) / nx;
      z += `<text class="zone" x="${f(xm)}" y="${f(y0 - 2.8)}" text-anchor="middle">${i + 1}</text>`;
      z += `<text class="zone" x="${f(xm)}" y="${f(y1 + 6.6)}" text-anchor="middle">${i + 1}</text>`;
    }
  }
  for (let j = 0; j <= ny; j++) {
    const y = y0 + ((y1 - y0) * j) / ny;
    if (j > 0 && j < ny) z += line(x0 - 5, y, x0, y, 'thin') + line(x1, y, x1 + 5, y, 'thin');
    if (j < ny) {
      const ym = y0 + ((y1 - y0) * (j + 0.5)) / ny + 1.3;
      const c = String.fromCharCode(65 + j);
      z += `<text class="zone" x="${f(x0 - 4)}" y="${f(ym)}" text-anchor="middle">${c}</text>`;
      z += `<text class="zone" x="${f(x1 + 5)}" y="${f(ym)}" text-anchor="middle">${c}</text>`;
    }
  }
  // Centring marks: from the paper edge across the frame line, in the middle of each side.
  const cm = `stroke-width:0.9`;
  z += `<path class="thick" style="${cm}" d="M${f(w / 2)} 0V${f(y0 + 5)}M${f(w / 2)} ${f(hgt)}V${f(y1 - 5)}M0 ${f(hgt / 2)}H${f(x0 + 5)}M${f(w)} ${f(hgt / 2)}H${f(x1 - 5)}"/>`;
  return `<svg class="tdraw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" width="${w * 4}" height="${hgt * 4}">
  ${hatchDefs()}
  <rect x="0" y="0" width="${w}" height="${hgt}" fill="#f8f6f0"/>
  <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fcfbf7"/>
  ${z}
  <rect class="thick frame" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/>`;
}

export function sheetEnd(): string {
  return '</svg>';
}
