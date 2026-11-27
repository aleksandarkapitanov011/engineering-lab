/**
 * Symbols for kinematic diagrams (ISO 3952), in sheet millimetres: shafts, rolling bearings on fixed
 * supports, cylindrical and bevel gears, couplings, the motor and shaft numbers. Gears are tinted like the
 * 3D model (helical/spur blue, bevel orange) so the diagram reads at a glance.
 */
import { f, line, text } from './svgdraw';

export const KIN = { GEAR: '#dbe7f3', BEVEL: '#f6e0c6', BODY: '#fcfbf7', MACHINE: '#eef2f6' };

/** A shaft: a heavy line. */
export const shaftLine = (x1: number, y1: number, x2: number, y2: number): string =>
  `<line class="thick" style="stroke-width:1.1" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;

/** Rolling bearing: both rings in half-section with a ball; `support` adds the fixed support (housing). */
export function bearing(x: number, y: number, vertical = false, support = true): string {
  let o = '';
  for (const sgn of [-1, 1]) {
    const [rx, ry, rw, rh] = vertical ? [x + sgn * 4.5 - 3, y - 4, 6, 8] : [x - 4, y + sgn * 4.5 - 3, 8, 6];
    o += `<rect class="thick" x="${f(rx)}" y="${f(ry)}" width="${rw}" height="${rh}" style="fill:${KIN.BODY}"/>`;
    o += `<circle class="thin" cx="${f(rx + rw / 2)}" cy="${f(ry + rh / 2)}" r="1.6" style="fill:#5d6b7a"/>`;
  }
  if (!support) return o;
  if (vertical) {
    o += line(x + 7.5, y, x + 12, y, 'thin') + line(x + 12, y - 7, x + 12, y + 7);
    o += [0, 1, 2, 3].map((i) => line(x + 12, y - 6 + i * 4, x + 16, y - 9 + i * 4, 'thin')).join('');
  } else {
    o += line(x, y + 7.5, x, y + 12, 'thin') + line(x - 7, y + 12, x + 7, y + 12);
    o += [0, 1, 2, 3].map((i) => line(x - 6 + i * 4, y + 12, x - 9 + i * 4, y + 16, 'thin')).join('');
  }
  return o;
}

/**
 * Cylindrical gear seen from the side: a rectangle of half-height `hh` centred on the shaft at (x, yc).
 * `hand` draws helical teeth (slanted lines, ±1); 0 = spur. `keyed` adds the × of a gear fixed to its shaft.
 */
export function gearRect(x: number, yc: number, hh: number, hand: -1 | 0 | 1 = 0, keyed = false): string {
  let o = `<rect class="thick" x="${f(x - 4.5)}" y="${f(yc - hh)}" width="9" height="${f(2 * hh)}" style="fill:${KIN.GEAR}"/>`;
  if (hand) for (let i = -hh + 6; i < hh - 2; i += 7) o += line(x - 4.5, yc + i, x + 4.5, yc + i - 5 * hand, 'thin');
  if (keyed) o += line(x - 2.5, yc - 2.5, x + 2.5, yc + 2.5, 'thin') + line(x - 2.5, yc + 2.5, x + 2.5, yc - 2.5, 'thin');
  return o;
}

/** Flexible coupling: two half-couplings facing each other. */
export const coupling = (x: number, y: number, vertical = false): string =>
  vertical
    ? line(x - 6, y - 2, x + 6, y - 2) + line(x - 6, y + 2, x + 6, y + 2) + line(x - 6, y - 2, x - 6, y - 5, 'thin') + line(x + 6, y + 2, x + 6, y + 5, 'thin')
    : line(x - 2, y - 6, x - 2, y + 6) + line(x + 2, y - 6, x + 2, y + 6) + line(x - 2, y - 6, x - 5, y - 6, 'thin') + line(x + 2, y + 6, x + 5, y + 6, 'thin');

/** Electric motor: a circle with “M”. */
export const motor = (x: number, y: number, r = 10): string =>
  `<circle class="thick" cx="${f(x)}" cy="${f(y)}" r="${r}" style="fill:${KIN.MACHINE}"/>` + text(x, y + r * 0.24, 'M', { size: r / 2, cls: 'label' });

/** Shaft number in a circle (I, II, III). */
export const shaftNo = (x: number, y: number, t: string): string =>
  `<circle class="thin" cx="${f(x)}" cy="${f(y)}" r="5.4" style="fill:#fff"/>` + text(x, y + 1.9, t, { size: 3.4, cls: 'label' });
