/** Shared helpers for the spur gear drawings (sheet mm, scale 2:1 unless stated). */
import type { DrawingNote } from '../../../core/types';
import { dim, f, fitSize, line, note, roughness, text, ts, wrapText } from '../../../ui/svgdraw';
import { iso1328 } from '../../../ui/gdt';

export const S = 2; // drawing scale 2:1
export const n = (bg: string): { bg: string } => ({ bg });
export const N = (title: string, body: string): DrawingNote => ({ title: n(title), body: n(body) });
export const comma = (v: number, d = 1): string => v.toFixed(d).replace('.', ',');

/** Horizontal dimension between two points at possibly different heights, line at y = yl. */
export function hd(xa: number, ya: number, xb: number, yb: number, yl: number, label: string, o: Parameters<typeof dim>[6] = {}): string {
  const s = Math.sign(yl - ya) || 1;
  const ext =
    line(xa, ya + 0.8 * s, xa, yl + 1.8 * s, 'thin') + line(xb, yb + 0.8 * Math.sign(yl - yb), xb, yl + 1.8 * Math.sign(yl - yb), 'thin');
  const d = dim(xa, yl, xb, yl, 0, label, o);
  return o.note ? d.replace('<rect class="hit"', `${ext}<rect class="hit"`) : ext + d;
}

/** Vertical dimension between two points, line at x = xl (text reads from the right). */
export function vd(xa: number, ya: number, xb: number, yb: number, xl: number, label: string, o: Parameters<typeof dim>[6] = {}): string {
  const ext =
    line(xa + 0.8 * Math.sign(xl - xa), ya, xl + 1.8 * Math.sign(xl - xa), ya, 'thin') +
    line(xb + 0.8 * Math.sign(xl - xb), yb, xl + 1.8 * Math.sign(xl - xb), yb, 'thin');
  const [y1, y2] = ya > yb ? [ya, yb] : [yb, ya];
  const d = dim(xl, y1, xl, y2, 0, label, o);
  return o.note ? d.replace('<rect class="hit"', `${ext}<rect class="hit"`) : ext + d;
}

/** Diameter dimension drawn inside the outline (arrows touch the surfaces from inside). */
export function diaInside(x: number, yc: number, r: number, label: string, o: Parameters<typeof dim>[6] = {}): string {
  return dim(x, yc + r, x, yc - r, 0, label, o);
}

export function notesBlock(x: number, y: number, title: string, rows: { t: string; key?: string }[], width = 200): string {
  let s = text(x, y, title, { anchor: 'start', size: 3.4, cls: 'label' });
  // Long lines wrap (the text is larger than on a printed sheet).
  const lh = ts(3.1) * 1.3;
  let yy = y + ts(3.4) + 2;
  for (const r of rows) {
    const lines = wrapText(r.t, 3.1, width);
    const y0 = yy;
    const el = lines.map((ln, k) => text(x + (k ? 4 : 0), yy + k * lh, ln, { anchor: 'start', size: 3.1 })).join('');
    s += r.key ? note(r.key, el, { x: x - 1, y: y0 - ts(3.1), w: width + 2, h: lines.length * lh + 1.5 }) : el;
    yy += lines.length * lh + 0.6;
  }
  return s;
}

/** Gear data table (ISO 1340): [name, symbol, value, note key] rows, fitted to the columns. */
export function gearTable(tx: number, ty: number, rows: [string, string, string, string][], title = 'ДАННИ ЗА ЗЪБНОТО КОЛЕЛО'): string {
  const cw = [56, 16, 30];
  const rh = 6.6;
  const tw = cw[0] + cw[1] + cw[2];
  let t = `<rect class="tb-fill" x="${tx}" y="${ty}" width="${tw}" height="${f(rh * (rows.length + 1))}"/>`;
  t += `<rect class="tbl-head" x="${tx}" y="${ty}" width="${tw}" height="${rh}"/>`;
  t += `<rect class="thick" x="${tx}" y="${ty}" width="${tw}" height="${f(rh * (rows.length + 1))}"/>`;
  t += text(tx + tw / 2, ty + 4.8, title, { size: 3, cls: 'label' });
  rows.forEach((row, i) => {
    const y = ty + rh * (i + 1);
    let r = i % 2 ? `<rect class="tbl-band" x="${tx}" y="${f(y)}" width="${tw}" height="${rh}"/>` : '';
    r += line(tx, y, tx + tw, y, 'thin');
    r += text(tx + 1.2, y + 4.8, row[0], { anchor: 'start', size: fitSize(row[0], 2.7, cw[0] - 2.5) });
    r += text(tx + cw[0] + cw[1] / 2, y + 4.8, row[1], { size: fitSize(row[1], 2.9, cw[1] - 2) });
    r += text(tx + cw[0] + cw[1] + 1.2, y + 4.8, row[2], { anchor: 'start', size: fitSize(row[2], 2.7, cw[2] - 2.5) });
    t += note(row[3], r, { x: tx, y, w: tw, h: rh });
  });
  t += line(tx + cw[0], ty + rh, tx + cw[0], ty + rh * (rows.length + 1), 'thin');
  t += line(tx + cw[0] + cw[1], ty + rh, tx + cw[0] + cw[1], ty + rh * (rows.length + 1), 'thin');
  return t;
}

/** Accuracy rows of ISO 1328 for grade q (values in mm). */
export function accuracyRows(q: number, m: number, d: number, b: number): [string, string, string, string][] {
  const v = iso1328(q, m, d, b);
  const mm = (u: number): string => comma(u / 1000, 3);
  return [
    ['Единична стъпка', 'fpt', `±${mm(v.fpt)}`, 'iso1328'],
    ['Натрупана стъпка', 'Fp', mm(v.Fp), 'iso1328'],
    ['Профил', 'Fα', mm(v.Fa), 'iso1328'],
    ['Линия на зъба', 'Fβ', mm(v.Fb), 'iso1328'],
    ['Радиално биене', 'Fr', mm(v.Fr), 'iso1328'],
  ];
}

export function generalRoughness(x: number, y: number): string {
  const sym = roughness(x, y, '3,2');
  const paren =
    text(x + 21, y - 4, '(', { size: 7 }) +
    `<path class="thin" style="stroke-width:0.3" d="M${f(x + 24)} ${f(y - 6)}L${f(x + 25.5)} ${f(y - 3.5)}L${f(x + 28)} ${f(y - 9)}"/>` +
    text(x + 30.5, y - 4, ')', { size: 7 });
  return note('ra-general', sym + paren, { x: x - 5, y: y - 13, w: 40, h: 15 });
}
