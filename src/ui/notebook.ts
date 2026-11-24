/**
 * Student-notebook helpers: inline markup and hand-drawn SVG doodles.
 *
 * Markup (inside LText strings):
 *   ==highlighter==   __red underline__   **ink bold**   ((red circle))
 */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function notebookMarkup(text: string): string {
  return esc(text)
    .replace(/==(.+?)==/g, '<mark class="nb-hl">$1</mark>')
    .replace(/__(.+?)__/g, '<span class="nb-ul">$1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="nb-ink">$1</strong>')
    .replace(/\(\((.+?)\)\)/g, '<span class="nb-circ">$1</span>');
}

/** Strips the markup (for aria labels / plain text use). */
export function plainText(text: string): string {
  return text.replace(/==|__|\*\*|\(\(|\)\)/g, '');
}

/** Wobbly marker stroke used under page titles. */
export const titleUnderline = `<svg class="nb-title-line" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true">
  <path d="M3 9 C 70 3, 130 12, 205 7 S 330 3, 397 8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M40 12 C 120 8, 220 13, 320 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>
</svg>`;

/** Curved arrow pointing up-left (from a note towards the formula above it). */
export const arrowUpLeft = `<svg class="nb-arrow" viewBox="0 0 70 46" aria-hidden="true">
  <path d="M64 40 C 50 38, 30 34, 12 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M7 19 L 11 7 L 22 13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/** Curved arrow pointing right (used on the cover). */
export const arrowRight = `<svg class="nb-arrow" viewBox="0 0 80 40" aria-hidden="true">
  <path d="M4 26 C 20 8, 45 34, 70 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M60 11 L 71 17 L 62 27" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const starDoodle = `<svg class="nb-star" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M20 4 L 24.5 15 L 36 15.5 L 27 23 L 30 35 L 20 28.5 L 10 35 L 13 23 L 4 15.5 L 15.5 15 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
</svg>`;

export const exclaimDoodle = `<svg class="nb-exclaim" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M20 3 C 9 3, 3 11, 4 21 C 5 31, 13 37, 22 36 C 31 35, 37 28, 36 18 C 35 9, 28 3, 18 4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M20 10 L 19.5 24" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>
  <circle cx="19.6" cy="30" r="2.1" fill="currentColor"/>
</svg>`;

export const checkDoodle = `<svg class="nb-check" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M6 22 C 10 25, 13 29, 16 33 C 21 22, 28 12, 37 4" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const crossDoodle = `<svg class="nb-check" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M8 8 C 16 16, 24 24, 33 34 M 33 7 C 24 16, 16 25, 7 33" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;

/** Hand-drawn circle around a score or a word. */
export const circleDoodle = `<svg class="nb-circle" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
  <path d="M110 8 C 50 4, 8 22, 10 52 C 12 82, 70 96, 120 92 C 170 88, 196 66, 190 40 C 184 16, 140 4, 92 10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>`;
