/**
 * Hand-drawn sketch of the gearbox for the notebook cover: ink lines that wobble (SVG turbulence filter),
 * gears "coloured in" with pencil hatching, coloured arrows for the input, the output and the directions of
 * rotation, and handwritten notes. Every stroke has pathLength = 1, so the CSS can draw it in.
 */
import type { LText } from '../../core/types';
import { lt } from '../../i18n';
import { I_TOTAL, Z1, Z2, Z3, Z4 } from './params';
import { SK, sketchPen } from '../common/sketch';

const { INK, RED, BLUE, ORANGE, GREEN, PENCIL } = SK;
const L = (bg: string, en: string): LText => ({ bg, en });

export function coverSketch(): string {
  const pen = sketchPen();
  const { ink, fill, text, spin } = pen;
  const P = (k: string): string => k;
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
  return pen.svg('-14 22 346 226', g, notes, lt(L('Скица на редуктора', 'Sketch of the gearbox')));
}
