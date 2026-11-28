/**
 * Geometrical tolerancing for the drawings (ISO 1101 / ISO 5459), in sheet millimetres: tolerance frames
 * with their symbols drawn as paths (fonts lack most of them), datum feature symbols, centre holes
 * (ISO 6411), detail marks and break lines. Everything can be wrapped as a tappable note.
 */
import type { DrawingNote } from '../core/types';
import { arrowHead, f, line, note, text, textWidth, ts } from './svgdraw';

export type GSym = 'runout' | 'totalRunout' | 'perp' | 'parallel' | 'cyl' | 'circ' | 'flat' | 'sym' | 'position' | 'coax';

/** Frame height (holds the enlarged screen text). */
export const FH = 7.6;

/** The characteristic symbol centred at (x, y), about 5 mm high. */
function symbol(sym: GSym, x: number, y: number): string {
  const p = (d: string, extra = ''): string => `<path class="thin gsym" style="stroke-width:0.42;${extra}" d="${d}"/>`;
  switch (sym) {
    case 'runout':
      return p(`M${f(x - 2)} ${f(y + 2.2)}L${f(x + 1.6)} ${f(y - 1.6)}`) + arrowHead(x + 2.2, y - 2.2, -Math.PI / 4, 2.2);
    case 'totalRunout':
      return (
        p(`M${f(x - 3)} ${f(y + 2.4)}H${f(x + 1.4)}M${f(x - 2.6)} ${f(y + 2.4)}L${f(x - 0.2)} ${f(y - 1.2)}M${f(x - 0.2)} ${f(y + 2.4)}L${f(x + 2.2)} ${f(y - 1.2)}`) +
        arrowHead(x + 0.4, y - 2, -Math.atan2(3.6, 2.4), 1.8) +
        arrowHead(x + 2.8, y - 2, -Math.atan2(3.6, 2.4), 1.8)
      );
    case 'perp':
      return p(`M${f(x - 2.6)} ${f(y + 2.4)}H${f(x + 2.6)}M${f(x)} ${f(y + 2.4)}V${f(y - 2.6)}`);
    case 'parallel':
      return p(`M${f(x - 2.4)} ${f(y + 2.4)}L${f(x - 0.4)} ${f(y - 2.4)}M${f(x + 0.4)} ${f(y + 2.4)}L${f(x + 2.4)} ${f(y - 2.4)}`);
    case 'cyl':
      return `<circle class="thin gsym" style="stroke-width:0.42" cx="${f(x)}" cy="${f(y)}" r="1.7"/>` + p(`M${f(x - 2.9)} ${f(y + 2.4)}L${f(x - 0.6)} ${f(y - 2.6)}M${f(x + 0.6)} ${f(y + 2.6)}L${f(x + 2.9)} ${f(y - 2.4)}`);
    case 'circ':
      return `<circle class="thin gsym" style="stroke-width:0.42" cx="${f(x)}" cy="${f(y)}" r="2.3"/>`;
    case 'flat':
      return p(`M${f(x - 2.8)} ${f(y + 1.6)}H${f(x + 1.4)}L${f(x + 2.8)} ${f(y - 1.6)}H${f(x - 1.4)}Z`);
    case 'sym':
      return p(`M${f(x - 2.8)} ${f(y)}H${f(x + 2.8)}M${f(x - 1.6)} ${f(y - 1.8)}H${f(x + 1.6)}M${f(x - 1.6)} ${f(y + 1.8)}H${f(x + 1.6)}`);
    case 'position':
      return `<circle class="thin gsym" style="stroke-width:0.42" cx="${f(x)}" cy="${f(y)}" r="1.8"/>` + p(`M${f(x - 2.9)} ${f(y)}H${f(x + 2.9)}M${f(x)} ${f(y - 2.9)}V${f(y + 2.9)}`);
    case 'coax':
      return `<circle class="thin gsym" style="stroke-width:0.42" cx="${f(x)}" cy="${f(y)}" r="1.2"/><circle class="thin gsym" style="stroke-width:0.42" cx="${f(x)}" cy="${f(y)}" r="2.5"/>`;
  }
}

export interface FcfOpts {
  /** Leader from the frame to the toleranced feature: the arrow end, an optional knee, and the side it leaves from. */
  to?: [number, number];
  knee?: [number, number];
  /** More features with the same requirement: extra leaders (straight, from the same point). */
  also?: [number, number][];
  from?: 'left' | 'right' | 'bottom' | 'top';
  /** The arrow meets the surface at this angle (rad); default: along the last leg. */
  arrowAngle?: number;
  note?: string;
}

/** Width of a tolerance frame. */
export function fcfWidth(tol: string, datums: string[] = []): number {
  return FH + textWidth(tol, 3.2) + 4 + datums.reduce((a, d) => a + Math.max(FH, textWidth(d, 3.2) + 3.6), 0);
}

/**
 * Tolerance frame (ISO 1101) with its top-left corner at (x, y): symbol | tolerance | datums,
 * e.g. runout 0,02 relative to A–B. A leader with an arrow goes to the feature.
 */
export function fcf(x: number, y: number, sym: GSym, tol: string, datums: string[] = [], o: FcfOpts = {}): string {
  const w = fcfWidth(tol, datums);
  let s = `<rect class="fcf-fill" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${FH}"/>`;
  s += `<rect class="thin fcf" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${FH}"/>`;
  s += symbol(sym, x + FH / 2, y + FH / 2);
  let cx = x + FH;
  s += line(cx, y, cx, y + FH, 'thin');
  const tw = textWidth(tol, 3.2) + 4;
  s += text(cx + tw / 2, y + FH / 2 + ts(3.2) * 0.36, tol, { size: 3.2, cls: 'label' });
  cx += tw;
  for (const d of datums) {
    const dw = Math.max(FH, textWidth(d, 3.2) + 3.6);
    s += line(cx, y, cx, y + FH, 'thin');
    s += text(cx + dw / 2, y + FH / 2 + ts(3.2) * 0.36, d, { size: 3.2, cls: 'label' });
    cx += dw;
  }
  if (o.to) {
    const from = o.from ?? 'bottom';
    const start: [number, number] =
      from === 'left' ? [x, y + FH / 2] : from === 'right' ? [x + w, y + FH / 2] : from === 'top' ? [x + FH / 2, y] : [x + FH / 2, y + FH];
    const pts = [start, ...(o.knee ? [o.knee] : []), o.to];
    for (let i = 0; i + 1 < pts.length; i++) s += line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'thin');
    const a = pts[pts.length - 2];
    const ang = o.arrowAngle ?? Math.atan2(o.to[1] - a[1], o.to[0] - a[0]);
    s += arrowHead(o.to[0], o.to[1], ang, 3.2);
    for (const q of o.also ?? []) s += line(start[0], start[1], q[0], q[1], 'thin') + arrowHead(q[0], q[1], Math.atan2(q[1] - start[1], q[0] - start[0]), 3.2);
  }
  s = `<g class="gdt">${s}</g>`;
  if (!o.note) return s;
  const xs = [x, x + w, ...(o.to ? [o.to[0]] : []), ...(o.knee ? [o.knee[0]] : []), ...(o.also ?? []).map((q) => q[0])];
  const ys = [y, y + FH, ...(o.to ? [o.to[1]] : []), ...(o.knee ? [o.knee[1]] : []), ...(o.also ?? []).map((q) => q[1])];
  return note(o.note, s, { x: Math.min(...xs) - 1, y: Math.min(...ys) - 1, w: Math.max(...xs) - Math.min(...xs) + 2, h: Math.max(...ys) - Math.min(...ys) + 2 });
}

/**
 * Datum feature symbol (ISO 5459): a filled triangle standing on the feature at (x, y), a line in
 * direction `dir` (outwards from the material) and the letter in a square frame.
 */
export function datum(x: number, y: number, letter: string, dir: 'down' | 'up' | 'left' | 'right', len = 7, key?: string): string {
  const [ux, uy] = dir === 'down' ? [0, 1] : dir === 'up' ? [0, -1] : dir === 'left' ? [-1, 0] : [1, 0];
  const [px, py] = [-uy, ux];
  const hb = 1.9;
  const th = 3.2;
  let s = `<path class="datum-tri" d="M${f(x + px * hb)} ${f(y + py * hb)}L${f(x - px * hb)} ${f(y - py * hb)}L${f(x + ux * th)} ${f(y + uy * th)}Z"/>`;
  const ex = x + ux * (th + len);
  const ey = y + uy * (th + len);
  s += line(x + ux * th, y + uy * th, ex, ey, 'thin');
  const b = FH;
  const bx = ex - b / 2 + ux * (b / 2);
  const by = ey - b / 2 + uy * (b / 2);
  s += `<rect class="fcf-fill" x="${f(bx)}" y="${f(by)}" width="${b}" height="${b}"/><rect class="thin fcf" x="${f(bx)}" y="${f(by)}" width="${b}" height="${b}"/>`;
  s += text(bx + b / 2, by + b / 2 + ts(3.6) * 0.36, letter, { size: 3.6, cls: 'label' });
  s = `<g class="gdt">${s}</g>`;
  if (!key) return s;
  return note(key, s, { x: Math.min(x, bx) - 2, y: Math.min(y, by) - 2, w: Math.abs(bx - x) + b + 4, h: Math.abs(by - y) + b + 4 });
}

/**
 * Centre hole at a shaft end (ISO 6411, form A): the 60° countersink in a local section (thin lines,
 * hatched behind) and the designation on a leader. `dir` = 1 when the end faces +x on the sheet.
 */
export function centreHole(xEnd: number, yc: number, scale: number, dir: 1 | -1, desig: string | null, key?: string, labelUp = true): string {
  const d = 2 * scale; // pilot ø2
  const D = 4.25 * scale; // countersink ø4,25
  const depth = (D / 2 / Math.tan(Math.PI / 6)) * 1 + 2.2 * scale;
  const cone = (D / 2) / Math.tan(Math.PI / 6);
  const x1 = xEnd - dir * cone;
  const x2 = xEnd - dir * depth;
  let s = `<path class="thin" d="M${f(xEnd)} ${f(yc - D / 2)}L${f(x1)} ${f(yc - d / 2)}L${f(x2)} ${f(yc - d / 2)}L${f(x2)} ${f(yc + d / 2)}L${f(x1)} ${f(yc + d / 2)}L${f(xEnd)} ${f(yc + D / 2)}"/>`;
  // Wavy boundary of the local section.
  const wx = x2 - dir * 2;
  s += `<path class="thin" d="M${f(xEnd)} ${f(yc - D / 2 - 2.4)}C${f(wx)} ${f(yc - D / 2 - 3)} ${f(wx + dir * 2)} ${f(yc + D / 2 + 3)} ${f(xEnd)} ${f(yc + D / 2 + 2.4)}"/>`;
  if (desig === null) return key ? note(key, `<g>${s}</g>`, { x: Math.min(xEnd, x2) - 2, y: yc - D / 2 - 4, w: Math.abs(xEnd - x2) + 4, h: D + 8 }) : `<g>${s}</g>`;
  const lx = xEnd + dir * 6;
  const ly = yc + (labelUp ? -1 : 1) * 15;
  const w = textWidth(desig, 2.9) + 2;
  s += line(xEnd - dir * cone * 0.4, yc + (labelUp ? -1 : 1) * D * 0.3, lx, ly, 'thin') + line(lx, ly, lx + dir * w, ly, 'thin');
  s += arrowHead(xEnd - dir * cone * 0.4, yc + (labelUp ? -1 : 1) * D * 0.3, Math.atan2(yc + (labelUp ? -1 : 1) * D * 0.3 - ly, xEnd - dir * cone * 0.4 - lx), 2.6);
  s += text(dir > 0 ? lx + 1 : lx - w + 1, ly - 1, desig, { anchor: 'start', size: 2.9 });
  s = `<g>${s}</g>`;
  if (!key) return s;
  return note(key, s, { x: Math.min(xEnd, lx, lx + dir * w) - 2, y: Math.min(yc - D, ly - 6), w: Math.abs(lx + dir * w - xEnd) + 4 + cone, h: Math.abs(ly - yc) + D + 6 });
}

/** Detail mark: a thin circle around the area shown enlarged, with its letter. */
export function detailMark(x: number, y: number, r: number, letter: string, key?: string): string {
  const lx = x + r * 0.75 + 3;
  const ly = y - r * 0.75 - 3;
  let s = `<circle class="thin" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>` + line(x + r * 0.7, y - r * 0.7, lx, ly, 'thin');
  s += text(lx + 1.2, ly - 0.6, letter, { anchor: 'start', size: 4.4, cls: 'title-big' });
  if (!key) return s;
  return note(key, s, { x: x - r - 1, y: ly - 8, w: 2 * r + 12, h: 2 * r + 12 });
}

/** Freehand break line (thin, wavy) between two points. */
export function breakLine(x1: number, y1: number, x2: number, y2: number): string {
  // Two gentle waves of a fixed height, whatever the length.
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const amp = Math.min(2.2, L * 0.12);
  const nx = (-(y2 - y1) / L) * amp;
  const ny = ((x2 - x1) / L) * amp;
  const at = (k: number): string => `${f(x1 + (x2 - x1) * k)} ${f(y1 + (y2 - y1) * k)}`;
  const ctl = (k: number, sg: number): string => `${f(x1 + (x2 - x1) * k + nx * sg)} ${f(y1 + (y2 - y1) * k + ny * sg)}`;
  return `<path class="thin" d="M${at(0)}Q${ctl(0.125, 1)} ${at(0.25)}Q${ctl(0.375, -1)} ${at(0.5)}Q${ctl(0.625, 1)} ${at(0.75)}Q${ctl(0.875, -1)} ${at(1)}"/>`;
}

/**
 * Detail view of a shoulder at scale `k` (e.g. 8:1): the bearing seat, the grinding undercut DIN 509 form F
 * (0,6 × 0,3, 15° run-out), the fillet and the shoulder face with its chamfer, the material hatched.
 * (cx, cy) is where the seat surface meets the shoulder face on the sheet; the seat runs to the left,
 * `h` (mm) is the shoulder height above the seat.
 */
export function undercutDetail(cx: number, cy: number, k: number, h: number, letter: string, mirror = false): string {
  // sx = −1 mirrors the view: the seat to the right of the shoulder.
  const sx = mirror ? -1 : 1;
  const X = (x: number): number => cx + sx * x * k;
  const Y = (y: number): number => cy - y * k;
  const P = (x: number, y: number): string => `${f(X(x))} ${f(Y(y))}`;
  const t1 = 0.3;
  const r = 0.6;
  const fw = 2.5;
  const xs = -fw + t1 / Math.tan((15 * Math.PI) / 180);
  const x0 = -4.6;
  const x1 = 3.2;
  const yb = -1.8;
  // Outline of the shaft: seat → undercut (15° in, flat bottom, R0,6 up into the face recess) → face → chamfer → top of the shoulder.
  const prof =
    `M${P(x0, 0)}L${P(-fw, 0)}L${P(xs, -t1)}L${P(0.2 - r, -t1)}` +
    `A${f(r * k)} ${f(r * k)} 0 0 ${mirror ? 1 : 0} ${P(0.2, -t1 + r)}L${P(0, 0.9)}L${P(0, h - 0.4)}L${P(0.4, h)}L${P(x1, h)}`;
  let s = `<path class="hatch" d="${prof}L${P(x1, yb)}L${P(x0, yb)}Z"/>`;
  s += `<path class="thick" d="${prof}"/>`;
  s += breakLine(X(x0), Y(0), X(x0), Y(yb)) + breakLine(X(x0), Y(yb), X(x1), Y(yb)) + breakLine(X(x1), Y(h), X(x1), Y(yb));
  // Dimensions: width of the undercut, its depth, the 15° run-out, the fillet; the designation.
  s += dimH(Math.min(X(-fw), X(0)), Y(0), Math.max(X(-fw), X(0)), Y(0), Y(h + 1.4), '2,5');
  s += line(X(-fw), Y(0), X(-0.1), Y(0), 'thin');
  s += dimV(X(-1.9), Y(0), Y(-t1), X(-1.9), '0,3', true, mirror);
  s += text(X(xs - 0.9), Y(-0.15) - 6, '15°', { size: 3, anchor: mirror ? 'start' : 'end' });
  const ax = X(0.2 - r * 0.3);
  const ay = Y(-(t1 - r * 0.25));
  const kx = X(1.8);
  const ky = Y(-1.4);
  s += line(ax, ay, kx, ky, 'thin') + line(kx, ky, kx + sx * 14, ky, 'thin');
  s += arrowHead(ax, ay, Math.atan2(ay - ky, ax - kx), 2.6);
  s += text(mirror ? kx - 1 : kx + 1, ky - 1, 'R0,6', { size: 3, anchor: mirror ? 'end' : 'start' });
  const xm = (X(x0) + X(x1)) / 2;
  s += text(xm, Y(yb) + 9, 'DIN 509 – F0,6×0,3', { size: 3 });
  s += text(xm, Y(h + 3.2), `${letter} (${k}:1)`, { size: 4.4, cls: 'title-big' });
  const left = Math.min(X(x0), X(x1));
  return note('detail', s, { x: left - 2, y: Y(h + 4.2), w: (x1 - x0) * k + 4, h: (h + 4.2 - yb) * k + 12 });
}

/** Small horizontal dimension between two points with the line at yl (used inside detail views). */
function dimH(xa: number, ya: number, xb: number, yb: number, yl: number, label: string): string {
  let s = line(xa, ya - 0.8, xa, yl - 1.6, 'thin') + line(xb, yb - 0.8, xb, yl - 1.6, 'thin');
  s += line(xa - 7, yl, xb + 7, yl, 'thin') + arrowHead(xa, yl, 0, 3) + arrowHead(xb, yl, Math.PI, 3);
  s += text((xa + xb) / 2, yl - 1.3, label, { size: 3 });
  return `<g class="dim">${s}</g>`;
}

/** Small vertical dimension (arrows outside) with the line at xl, text to the left. */
function dimV(x: number, ya: number, yb: number, xl: number, label: string, below = false, right = false): string {
  let s = xl === x ? '' : line(x - 0.8, ya, xl - 1.6, ya, 'thin') + line(x - 0.8, yb, xl - 1.6, yb, 'thin');
  s += line(xl, ya - 7, xl, yb + 7, 'thin') + arrowHead(xl, ya, Math.PI / 2, 3) + arrowHead(xl, yb, -Math.PI / 2, 3);
  s += below ? text(right ? xl + 1.2 : xl - 1.2, yb + 7 + ts(3) * 0.9, label, { size: 3, anchor: right ? 'start' : 'end' }) : text(xl - 1.4, (ya + yb) / 2 + 1.2, label, { size: 3, anchor: 'end' });
  return `<g class="dim">${s}</g>`;
}

// ------------------------------------------------------------------------------- gear tolerances (ISO 1328)
/** Rounds a tolerance as ISO 1328 does: to 0,5 µm below 5 µm, else to whole µm. */
const r1328 = (v: number): number => (v < 5 ? Math.round(v * 2) / 2 : Math.round(v));

/**
 * Gear accuracy tolerances of ISO 1328-1/-2 (1995) for grade `q`, module m (mm), pitch diameter d and
 * face width b: single pitch fpt, total cumulative pitch Fp, total profile Fα, total helix Fβ, runout Fr (µm).
 */
export function iso1328(q: number, m: number, d: number, b: number): { fpt: number; Fp: number; Fa: number; Fb: number; Fr: number } {
  const k = Math.pow(2, (q - 5) / 2);
  return {
    fpt: r1328((0.3 * (m + 0.4 * Math.sqrt(d)) + 4) * k),
    Fp: r1328((0.3 * m + 1.25 * Math.sqrt(d) + 7) * k),
    Fa: r1328((3.2 * Math.sqrt(m) + 0.22 * Math.sqrt(d) + 0.7) * k),
    Fb: r1328((0.1 * Math.sqrt(d) + 0.63 * Math.sqrt(b) + 4.2) * k),
    Fr: r1328((0.24 * m + Math.sqrt(d) + 5.6) * k), // 0,8·Fp
  };
}

// ------------------------------------------------------------------------------- explanations on tap
const N = (bg: [string, string], en: [string, string]): DrawingNote => ({ title: { bg: bg[0], en: en[0] }, body: { bg: bg[1], en: en[1] } });

/** Explanations of the tolerancing elements, used by every sheet (a sheet's own notes take precedence). */
export const GDT_NOTES: Record<string, DrawingNote> = {
  datum: N(
    ['База', 'Datum'],
    ['Триъгълникът с буквата отбелязва база (ISO 5459): повърхнина, спрямо която се мерят другите. За вал това са лагерните шийки – оста през двете е общата база A–B, точно както валът се върти в лагерите си.', 'The triangle with the letter marks a datum (ISO 5459): a surface the others are measured from. On a shaft these are the bearing seats – the axis through both is the common datum A–B, exactly as the shaft turns in its bearings.'],
  ),
  runout: N(
    ['Радиално биене', 'Circular runout'],
    ['Стрелката ↗ в рамката: валът се върти около базата A–B, индикаторът опира в повърхнината и разликата между най-голямото и най-малкото показание не бива да надхвърля стойността. Така колелото или съединителят не „бият“ спрямо лагерите.', 'The ↗ arrow in the frame: the shaft turns about datum A–B, a dial indicator touches the surface and the difference between the largest and smallest reading must not exceed the value. So the gear or coupling does not run out relative to the bearings.'],
  ),
  axrunout: N(
    ['Челно биене на рамо', 'Axial runout of a shoulder'],
    ['Рамото, в което опира лагерът или колелото, трябва да е перпендикулярно на оста. Мери се с индикатор по челото, докато валът се върти около A–B. Изкривено рамо накланя пръстена на лагера и съкращава живота му.', 'The shoulder the bearing or gear bears against must be square to the axis. It is measured with an indicator on the face while the shaft turns about A–B. A skew shoulder tilts the bearing ring and shortens its life.'],
  ),
  cyl: N(
    ['Цилиндричност', 'Cylindricity'],
    ['Лагерната шийка трябва да е истински цилиндър: всички точки лежат между два съосни цилиндъра на разстояние, равно на допуска. Овална или конусна шийка деформира тънкия пръстен на лагера.', 'The bearing seat must be a true cylinder: every point lies between two coaxial cylinders as far apart as the tolerance. An oval or tapered seat distorts the thin bearing ring.'],
  ),
  perp: N(
    ['Перпендикулярност', 'Perpendicularity'],
    ['Челото трябва да лежи между две равнини, перпендикулярни на базата и отдалечени на стойността в рамката.', 'The face must lie between two planes perpendicular to the datum, as far apart as the value in the frame.'],
  ),
  sym: N(
    ['Симетричност на канала', 'Symmetry of the keyway'],
    ['Средната равнина на шпонковия канал трябва да минава през оста (базата). Изместен канал кара шпонката да опира само с единия си ръб.', 'The median plane of the keyway must pass through the axis (datum). An offset keyway makes the key bear on one edge only.'],
  ),
  parallel: N(
    ['Успоредност', 'Parallelism'],
    ['Повърхнината трябва да лежи между две равнини, успоредни на базата и отдалечени на стойността в рамката.', 'The surface must lie between two planes parallel to the datum, as far apart as the value in the frame.'],
  ),
  centre: N(
    ['Центрови отвори ISO 6411', 'Centre holes ISO 6411'],
    ['В челата на вала се пробиват центрови отвори (форма A, 60°). На тях валът се захваща между центрове при струговане, шлифоване и контрол – така всички диаметри се обработват спрямо една и съща ос.', 'Centre holes (form A, 60°) are drilled in the shaft ends. The shaft is held between centres on them when turning, grinding and checking – so every diameter is machined about one and the same axis.'],
  ),
  detail: N(
    ['Изглед в увеличение', 'Detail view'],
    ['Кръгът с буква показва място, начертано отделно в по-едър мащаб. Тук – преходът при рамото: канал за излизане на шлифовъчния диск (DIN 509) и закръглението. Острите ъгли концентрират напрежения и валът се чупи от умора точно там.', 'The circle with a letter marks an area drawn separately at a larger scale. Here – the transition at the shoulder: the grinding undercut (DIN 509) and the fillet. Sharp corners concentrate stress and shafts break by fatigue exactly there.'],
  ),
  part3d: N(
    ['Изглед за справка', 'Reference picture'],
    ['Аксонометрията е само за ориентация – детайлът се изработва по изгледите и размерите на чертежа.', 'The pictorial view is for orientation only – the part is made from the views and dimensions of the drawing.'],
  ),
  span: N(
    ['Размер през k зъба W', 'Span W over k teeth'],
    ['Контролният размер на зъбите: мери се с микрометър с дискови челюсти през k зъба. Отклоненията Ewms/Ewmi задават страничния луфт в зацепването – колелото е малко „по-тънко“ от теоретичното.', 'The check dimension of the teeth: measured with a disc micrometer over k teeth. The deviations Ewms/Ewmi set the backlash in the mesh – the gear is slightly “thinner” than the theoretical one.'],
  ),
  chordal: N(
    ['Хордална дебелина на зъба', 'Chordal tooth thickness'],
    ['При коничните колела дебелината на зъба се мери с шублер за зъби на външния край: хордата s̄ на височина h̄ от върха на зъба.', 'On bevel gears the tooth thickness is measured with a gear-tooth calliper at the outer end: the chord s̄ at the height h̄ from the tip.'],
  ),
  iso1328: N(
    ['Допуски по ISO 1328', 'Tolerances to ISO 1328'],
    ['fpt – единична стъпка, Fp – натрупана стъпка, Fα – профил, Fβ – линия на зъба, Fr – радиално биене на венеца. Стойностите следват от степента на точност, модула, диаметъра и ширината и се проверяват на зъбоизмервателна машина.', 'fpt – single pitch, Fp – total cumulative pitch, Fα – profile, Fβ – helix, Fr – radial runout of the teeth. The values follow from the accuracy grade, module, diameter and width and are checked on a gear measuring machine.'],
  ),
  bore: N(
    ['Отвор H7 – база A', 'Bore H7 – datum A'],
    ['Отворът на главината е базата на колелото: на него то се центрира върху вала. Всички биения на венеца и челата се мерят спрямо него, с колелото на точен дорник.', 'The hub bore is the datum of the gear: it centres the gear on the shaft. All runouts of the teeth and faces are measured relative to it, with the gear on a precision mandrel.'],
  ),
  overall: N(
    ['Габаритни размери', 'Overall dimensions'],
    ['Външните размери на възела – нужни за мястото, където се монтира.', 'The outside size of the unit – needed for the place where it is mounted.'],
  ),
  connect: N(
    ['Присъединителни размери', 'Connecting dimensions'],
    ['Краищата на валовете, на които се слагат съединителите или шайбите: диаметър с допуск и дължина.', 'The shaft ends that carry the couplings or pulleys: diameter with its tolerance and length.'],
  ),
  hubkey: N(
    ['Канал в главината JS9', 'Hub keyway JS9'],
    ['Ширина JS9 – симетрично поле, леко подвижна сглобка на шпонката в главината, за да се надява колелото. Размерът d + t₂ се мери от отсрещната страна на отвора до дъното на канала.', 'Width JS9 – a symmetric zone, a slightly free fit of the key in the hub so the gear slides on. The size d + t₂ is measured from the opposite side of the bore to the bottom of the keyway.'],
  ),
};
