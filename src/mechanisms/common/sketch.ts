/**
 * "Pen" for hand-drawn notebook sketches: ink strokes that wobble (SVG turbulence filter) and draw themselves
 * in (pathLength = 1 + CSS), pencil hatching to colour shapes in, handwritten notes, rotation arrows.
 */
export const SK = {
  INK: '#213b73',
  RED: '#d23b2c',
  BLUE: '#3c78c8',
  ORANGE: '#e0782f',
  GREEN: '#2f9e5b',
  PENCIL: '#7b8494',
};

let counter = 0;

export interface SketchPen {
  /** Ink stroke; `delay` in steps of 0.12 s. */
  ink(d: string, color?: string, w?: number, delay?: number): string;
  /** Hatched fill with one of the patterns: blue, blue2, orange, orange2, grey. */
  fill(d: string, pattern: string, delay?: number): string;
  /** Handwritten note. */
  text(x: number, y: number, s: string, color?: string, size?: number, delay?: number, anchor?: string, rot?: number): string;
  /** Curved rotation arrow around a point (an elliptic arc with a head). */
  spin(cx: number, cy: number, rx: number, ry: number, color: string, delay: number, flip?: boolean): string;
  /** Straight arrow from (x1, y1) to (x2, y2). */
  arrow(x1: number, y1: number, x2: number, y2: number, color: string, w: number, delay: number): string;
  /** Wraps the wobbly strokes and the (straight, readable) notes into an SVG. */
  svg(viewBox: string, strokes: string, notes: string, label: string): string;
}

export function sketchPen(): SketchPen {
  counter += 1;
  const id = (k: string): string => `sk${counter}-${k}`;
  const dl = (delay: number): string => (delay * 0.12).toFixed(2);
  const ink = (d: string, color = SK.INK, w = 2.4, delay = 0): string =>
    `<path class="sk" pathLength="1" style="--d:${dl(delay)}s" d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hatch = (k: string, color: string, angle: number, gap = 5): string =>
    `<pattern id="${id(k)}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${angle})"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="2.2" stroke-opacity="0.55"/></pattern>`;
  return {
    ink,
    fill: (d, pattern, delay = 0) => `<path class="sk-fill" style="--d:${dl(delay)}s" d="${d}" fill="url(#${id(pattern)})"/>`,
    text: (x, y, s, color = SK.INK, size = 15, delay = 0, anchor = 'middle', rot = 0) =>
      `<text class="sk-t" style="--d:${dl(delay)}s" x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${s}</text>`,
    spin(cx, cy, rx, ry, color, delay, flip = false) {
      const s = flip ? -1 : 1;
      const hx = cx + rx * 0.7;
      const hy = cy + s * ry * 0.72;
      return (
        ink(`M${cx - rx} ${cy} A${rx} ${ry} 0 1 ${flip ? 0 : 1} ${hx} ${hy}`, color, 2.2, delay) +
        ink(`M${hx - 7} ${hy - s} L${hx} ${hy} L${hx - 2} ${hy - s * 7}`, color, 2.2, delay + 1)
      );
    },
    arrow(x1, y1, x2, y2, color, w, delay) {
      const a = Math.atan2(y2 - y1, x2 - x1);
      const h = 8;
      const p = (da: number): string => `${(x2 - h * Math.cos(a + da)).toFixed(1)} ${(y2 - h * Math.sin(a + da)).toFixed(1)}`;
      return ink(`M${x1} ${y1} L${x2} ${y2}`, color, w, delay) + ink(`M${p(0.5)} L${x2} ${y2} L${p(-0.5)}`, color, w, delay);
    },
    svg(viewBox, strokes, notes, label) {
      const defs = `<defs>
    <filter id="${id('rough')}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/>
      <feDisplacementMap in="SourceGraphic" scale="3"/>
    </filter>
    ${hatch('blue', SK.BLUE, 35)}${hatch('blue2', SK.BLUE, -30, 6)}${hatch('orange', SK.ORANGE, 45)}${hatch('orange2', SK.ORANGE, -40, 6)}${hatch('grey', SK.PENCIL, -45, 7)}
  </defs>`;
      return `<svg class="nb-sketch-svg" viewBox="${viewBox}" role="img" aria-label="${label}">${defs}<g filter="url(#${id('rough')})">${strokes}</g>${notes}</svg>`;
    },
  };
}
