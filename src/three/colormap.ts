/**
 * Colour scale for stress plots: Google's "Turbo" (a smooth, saturated, perceptually ordered rainbow),
 * trimmed at both ends so the extremes stay vivid (deep blue → cyan → green → yellow → orange → red).
 * Values above 100 % utilisation get a distinct magenta.
 *
 * All colours here are sRGB (for CSS / canvas). Convert with srgbToLinear() before writing WebGL vertex colours.
 */

const T_MIN = 0.1;
const T_MAX = 0.92;
export const OVERLOAD: [number, number, number] = [0.87, 0.15, 0.62];

/** Turbo colormap, polynomial approximation (Mikhailov, Google AI, 2019). */
function turbo(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t));
  const r = 0.13572138 + x * (4.6153926 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943))));
  const g = 0.09140261 + x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604))));
  const b = 0.1066733 + x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973))));
  const c = (v: number): number => Math.min(1, Math.max(0, v));
  return [c(r), c(g), c(b)];
}

/** Stress colour for a normalised value t (0 … 1; > 1 = overload). */
export function rainbow(t: number): [number, number, number] {
  if (t > 1.0001) return OVERLOAD;
  return turbo(T_MIN + (T_MAX - T_MIN) * Math.min(1, Math.max(0, t)));
}

export type StressMode = 'utilisation' | 'absolute';

/** Normalised position on the scale. Only the utilisation mode can exceed 1 (overload colour). */
export function scaleValue(mode: StressMode, stress: number, allowable: number, maxStress: number): number {
  return mode === 'utilisation' ? stress / allowable : Math.min(1, stress / Math.max(1e-9, maxStress));
}

export function cssColour(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
}

/** sRGB component (0…1) to linear light, for WebGL vertex colours. */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** CSS gradient for the legend bar (same colours as the 3D view). */
export function legendGradient(): string {
  const stops: string[] = [];
  for (let i = 0; i <= 10; i++) stops.push(`${cssColour(rainbow(i / 10))} ${i * 10}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
