/** FEM-style rainbow colour scale: blue (low) → cyan → green → yellow → red (high). */
const STOPS: [number, number, number, number][] = [
  [0, 0.12, 0.24, 0.85],
  [0.25, 0.0, 0.7, 0.95],
  [0.5, 0.18, 0.82, 0.3],
  [0.75, 1.0, 0.84, 0.1],
  [1, 0.9, 0.12, 0.1],
];
/** Beyond 100 % utilisation: deep crimson, so overloads stand out. */
const OVER: [number, number, number] = [0.55, 0.0, 0.25];

export function rainbow(t: number): [number, number, number] {
  if (t > 1.0001) return OVER;
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (x <= STOPS[i][0]) {
      const [a, r0, g0, b0] = STOPS[i - 1];
      const [b, r1, g1, b1] = STOPS[i];
      const f = (x - a) / (b - a);
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
    }
  }
  return [STOPS[4][1], STOPS[4][2], STOPS[4][3]];
}

export type StressMode = 'utilisation' | 'absolute';

/** Normalised position on the scale for a stress value. */
export function scaleValue(mode: StressMode, stress: number, allowable: number, maxStress: number): number {
  return mode === 'utilisation' ? stress / allowable : stress / Math.max(1e-9, maxStress);
}

export function cssColour(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
}

/** CSS gradient for the legend bar. */
export function legendGradient(): string {
  return `linear-gradient(to right, ${STOPS.map(([t, r, g, b]) => `${cssColour([r, g, b])} ${t * 100}%`).join(', ')})`;
}
