/**
 * Hand-drawn sketch of the gearbox for the notebook cover: ink lines that wobble (SVG turbulence filter),
 * gears "coloured in" with pencil hatching, coloured arrows for the input, the output and the directions of
 * rotation, and handwritten notes. Every stroke has pathLength = 1, so the CSS can draw it in.
 */
import type { LText } from '../../core/types';
import { lt } from '../../i18n';
import { I_TOTAL, Z1, Z2, Z3, Z4 } from './params';

const INK = '#213b73';
const RED = '#d23b2c';
const BLUE = '#3c78c8';
const ORANGE = '#e0782f';
const GREEN = '#2f9e5b';
const PENCIL = '#7b8494';
const L = (bg: string, en: string): LText => ({ bg, en });

let n = 0;
/** One ink stroke (drawn in by the CSS, delay `d` in steps of 0.12 s). */
const ink = (d: string, color = INK, w = 2.4, delay = 0, extra = ''): string =>
  `<path class="sk" pathLength="1" style="--d:${(delay * 0.12).toFixed(2)}s" d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const fill = (d: string, pattern: string, delay = 0): string => `<path class="sk-fill" style="--d:${(delay * 0.12).toFixed(2)}s" d="${d}" fill="url(#${pattern})"/>`;
const text = (x: number, y: number, s: string, color = INK, size = 15, delay = 0, anchor = 'middle', rot = 0): string =>
  `<text class="sk-t" style="--d:${(delay * 0.12).toFixed(2)}s" x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`;

/** Curved rotation arrow around a shaft seen side-on: an ellipse arc with a head. */
function spin(cx: number, cy: number, rx: number, ry: number, color: string, delay: number, flip = false): string {
  const s = flip ? -1 : 1;
  const d = `M${cx - rx} ${cy} A${rx} ${ry} 0 1 ${flip ? 0 : 1} ${cx + rx * 0.7} ${cy + s * ry * 0.72}`;
  const hx = cx + rx * 0.7;
  const hy = cy + s * ry * 0.72;
  return ink(d, color, 2.2, delay) + ink(`M${hx - 7} ${hy - s * 1} L${hx} ${hy} L${hx - 2} ${hy - s * 7}`, color, 2.2, delay + 1);
}

export function coverSketch(): string {
  n += 1;
  const id = (k: string): string => `sk${n}-${k}`;
  const hatch = (k: string, color: string, angle: number, gap = 5): string =>
    `<pattern id="${id(k)}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${angle})"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="2.2" stroke-opacity="0.55"/></pattern>`;
  const defs = `<defs>
    <filter id="${id('rough')}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="3"/>
    </filter>
    ${hatch('blue', BLUE, 35)}${hatch('blue2', BLUE, -30, 6)}${hatch('orange', ORANGE, 45)}${hatch('grey', PENCIL, -45, 7)}
  </defs>`;
  const P = (k: string): string => id(k);
  let g = '';
  // Housing (pencil).
  g += ink('M34 40 Q32 38 36 36 L236 34 Q240 34 240 38 L242 158 Q242 162 238 162 L38 164 Q34 164 34 160 Z', PENCIL, 1.6, 0);
  // Input shaft 1 (top) with the helical pinion; intermediate shaft 2 with the big helical gear.
  g += ink('M4 70 L120 69', INK, 3, 1);
  g += fill('M70 56 L88 56 L88 84 L70 84 Z', P('blue'), 2) + ink('M70 56 L88 56 L88 84 L70 84 Z', INK, 2.2, 2);
  g += ink('M73 82 L85 58 M73 72 L80 58 M78 84 L88 66', BLUE, 1.4, 3);
  g += ink('M60 118 L176 117', INK, 3, 2);
  g += fill('M70 84 L90 84 L90 150 L70 150 Z', P('blue2'), 3) + ink('M70 84 L90 84 L90 150 L70 150 Z', INK, 2.2, 3);
  g += ink('M73 146 L87 88 M73 128 L84 88 M76 150 L88 104 M80 150 L89 122', BLUE, 1.4, 4);
  // Bevel pair: pinion at the end of shaft 2, gear on the output shaft going down.
  g += fill('M170 104 L186 98 L186 138 L170 132 Z', P('orange'), 4) + ink('M170 104 L186 98 L186 138 L170 132 Z', INK, 2.2, 4);
  g += fill('M182 140 L230 140 L220 152 L192 152 Z', P('orange'), 5) + ink('M182 140 L230 140 L220 152 L192 152 Z', INK, 2.2, 5);
  g += ink('M206 140 L206 204', INK, 3, 5);
  // Bearings (little crossed boxes).
  for (const [x, y] of [
    [44, 69],
    [110, 69],
    [100, 117],
    [154, 117],
  ] as [number, number][]) {
    g += ink(`M${x - 5} ${y - 7} L${x + 5} ${y - 7} L${x + 5} ${y + 7} L${x - 5} ${y + 7} Z M${x - 5} ${y - 7} L${x + 5} ${y + 7}`, PENCIL, 1.5, 4);
  }
  // Arrows: input (red), output (green), directions of rotation.
  g += ink('M-8 54 L22 54', RED, 3, 6) + ink('M14 48 L22 54 L14 60', RED, 3, 6);
  g += ink('M222 186 L222 214', GREEN, 3, 7) + ink('M216 206 L222 214 L228 206', GREEN, 3, 7);
  g += spin(28, 70, 9, 15, RED, 7);
  g += spin(128, 118, 9, 15, BLUE, 8, true);
  g += spin(206, 186, 12, 6, GREEN, 8);
  // "i = 6" circled in the corner.
  g += ink('M262 60 C260 38 318 36 320 58 C322 80 266 84 260 64', RED, 2.2, 12);
  // Notes (outside the wobble filter, so they stay readable).
  let notes = '';
  notes += text(-8, 42, lt(L('вход n₁', 'input n₁')), RED, 19, 9, 'start');
  notes += text(79, 48, `z₁ = ${Z1}`, INK, 18, 10);
  notes += text(96, 148, `z₂ = ${Z2}`, INK, 18, 10, 'start');
  notes += text(180, 90, `z₃ = ${Z3}`, ORANGE, 18, 10);
  notes += text(236, 140, `z₄ = ${Z4}`, ORANGE, 18, 10, 'start');
  notes += text(232, 224, lt(L('изход n₃', 'output n₃')), GREEN, 19, 9, 'start');
  notes += text(36, 192, lt(L('косозъбо ×3', 'helical ×3')), BLUE, 19, 11, 'start', -3);
  notes += text(118, 194, lt(L('конично ×2', 'bevel ×2')), ORANGE, 19, 11, 'start', 2);
  notes += text(290, 68, `i = ${I_TOTAL}`, RED, 26, 12);
  notes += text(290, 98, '= 3 × 2', PENCIL, 17, 13);
  notes += text(196, 238, lt(L('изход под 90°!', 'output at 90°!')), PENCIL, 16, 13, 'end', -2);
  return `<svg class="nb-sketch-svg" viewBox="-14 22 346 226" role="img" aria-label="${lt(L('Скица на редуктора', 'Sketch of the gearbox'))}">${defs}<g filter="url(#${id('rough')})">${g}</g>${notes}</svg>`;
}
