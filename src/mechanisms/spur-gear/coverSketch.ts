/** Hand-drawn sketch of the spur gear pair for the notebook cover (same pen as the gearbox sketch). */
import type { LText } from '../../core/types';
import { lt } from '../../i18n';
import { SK, sketchPen } from '../common/sketch';

const L = (bg: string, en: string): LText => ({ bg, en });
const { INK, RED, BLUE, ORANGE, GREEN, PENCIL } = SK;

/** Outline of a gear with z teeth (pitch radius r, tooth height h) as a path. */
function gearPath(cx: number, cy: number, r: number, z: number, h: number, phase = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < z; i++) {
    for (const [f, rr] of [
      [0, r - h / 2],
      [0.2, r + h / 2],
      [0.5, r + h / 2],
      [0.7, r - h / 2],
    ] as [number, number][]) {
      const a = phase + ((i + f) / z) * Math.PI * 2;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
  }
  return `M${pts.join(' L')} Z`;
}

const circle = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

export function coverSketch(): string {
  const pen = sketchPen();
  const { ink, text } = pen;
  /** Arc arrow around (cx, cy) from angle a0 to a1 (degrees, screen; clockwise when a1 > a0). */
  const arcArrow = (cx: number, cy: number, r: number, a0: number, a1: number, color: string, delay: number): string => {
    const p = (a: number): [number, number] => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    const cw = a1 > a0 ? 1 : 0;
    const big = Math.abs(a1 - a0) > 180 ? 1 : 0;
    // Head along the tangent at the end.
    const t = ((a1 + (cw ? 90 : -90)) * Math.PI) / 180;
    const hp = (da: number): string => `${(x1 - 9 * Math.cos(t + da)).toFixed(1)} ${(y1 - 9 * Math.sin(t + da)).toFixed(1)}`;
    return (
      ink(`M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${big} ${cw} ${x1.toFixed(1)} ${y1.toFixed(1)}`, color, 2.6, delay) +
      ink(`M${hp(0.5)} L${x1.toFixed(1)} ${y1.toFixed(1)} L${hp(-0.5)}`, color, 2.6, delay + 1)
    );
  };

  const c1: [number, number] = [78, 112];
  const c2: [number, number] = [182, 112];
  const r1 = 34;
  const r2 = 68;
  let g = '';
  // Pinion z₁ = 20 (blue) and gear z₂ = 40 (orange), coloured in with pencil.
  const g1 = gearPath(c1[0], c1[1], r1, 20, 7, 0);
  const g2 = gearPath(c2[0], c2[1], r2, 40, 7, Math.PI / 40);
  g += pen.fill(g1, 'blue', 1) + ink(g1, INK, 2, 0);
  g += pen.fill(g2, 'orange2', 2) + ink(g2, INK, 2, 1);
  g += ink(circle(c1[0], c1[1], 8), INK, 2, 2) + ink(circle(c2[0], c2[1], 13), INK, 2, 2);
  // Pitch circles (pencil) and the marks that show the turning.
  g += ink(circle(c1[0], c1[1], r1), PENCIL, 1.2, 3) + ink(circle(c2[0], c2[1], r2), PENCIL, 1.2, 3);
  g += ink(`M${c1[0]} ${c1[1] - 8} L${c1[0]} ${c1[1] - r1 + 6}`, BLUE, 2.4, 3);
  g += ink(`M${c2[0]} ${c2[1] - 13} L${c2[0]} ${c2[1] - r2 + 8}`, ORANGE, 2.4, 3);
  // Directions of rotation: z₁ counter-clockwise (red), z₂ clockwise (green).
  g += arcArrow(c1[0], c1[1], r1 + 16, 250, 160, RED, 5);
  g += arcArrow(c2[0], c2[1], r2 + 14, 300, 350, GREEN, 6);
  // Mesh point and its leader.
  g += ink(circle(c1[0] + r1, c1[1], 3), RED, 3, 7);
  g += ink(`M${c1[0] + r1 + 2} ${c1[1] - 4} C${c1[0] + r1 + 10} 70 ${c1[0] + r1 + 20} 50 ${c1[0] + r1 + 34} 40`, PENCIL, 1.6, 7);
  // Centre distance with arrows.
  g += ink(`M${c1[0]} ${c1[1] + 12} L${c1[0]} 212 M${c2[0]} ${c2[1] + 16} L${c2[0]} 212`, PENCIL, 1.2, 8);
  g += pen.arrow(c1[0] + 40, 206, c1[0] + 2, 206, INK, 2, 8) + pen.arrow(c2[0] - 40, 206, c2[0] - 2, 206, INK, 2, 8);
  // "i = 2" circled in the corner.
  g += ink('M262 34 C258 14 318 12 320 32 C322 52 266 56 260 38', RED, 2.2, 10);

  let notes = '';
  notes += text(c1[0] + r1 + 38, 38, lt(L('зацепване', 'mesh')), PENCIL, 17, 8, 'start');
  notes += text(c1[0] - 6, c1[1] + r1 + 30, `z₁ = 20`, BLUE, 19, 9);
  notes += text(c1[0] - 6, c1[1] + r1 + 48, lt(L('задвижващо', 'driving')), RED, 16, 9);
  notes += text(c2[0] + 30, c2[1] + r2 + 22, `z₂ = 40`, ORANGE, 19, 9, 'start');
  notes += text(c1[0] - r1 - 22, c1[1] - r1 - 6, 'n₁', RED, 20, 10);
  notes += text(c2[0] + r2 + 6, c2[1] - 14, 'n₂ = n₁/2', GREEN, 17, 10, 'start');
  notes += text((c1[0] + c2[0]) / 2, 201, 'a = 60 mm', INK, 17, 9);
  notes += text(290, 40, 'i = 2', RED, 26, 11);
  notes += text(292, 70, lt(L('по-бавно,', 'slower,')), PENCIL, 16, 12);
  notes += text(292, 88, lt(L('но по-силно!', 'but stronger!')), PENCIL, 16, 12);
  return pen.svg('-4 0 336 226', g, notes, lt(L('Скица на зъбната предавка', 'Sketch of the gear pair')));
}
