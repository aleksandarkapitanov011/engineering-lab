/**
 * App logo: an orange spur gear with a bored hub (the same gear as the app icon, scripts/icons.mjs).
 * The path is generated: 10 trapezoidal teeth, root r = 12.6, tip r = 17.2 in a 40 × 40 box.
 */
const GEAR = 'M20.00 7.40L20.79 7.42L22.37 2.96L25.11 3.58L24.64 8.28L27.41 9.81L28.03 10.29L31.93 7.61L33.79 9.72L30.64 13.25L31.98 16.11L32.20 16.87L36.93 16.99L37.20 19.78L32.58 20.79L31.98 23.89L31.72 24.64L35.47 27.52L34.04 29.93L29.71 28.03L27.41 30.19L26.75 30.64L28.10 35.18L25.52 36.29L23.13 32.20L20.00 32.60L19.21 32.58L17.63 37.04L14.89 36.42L15.36 31.72L12.59 30.19L11.97 29.71L8.07 32.39L6.21 30.28L9.36 26.75L8.02 23.89L7.80 23.13L3.07 23.01L2.80 20.22L7.42 19.21L8.02 16.11L8.28 15.36L4.53 12.48L5.96 10.07L10.29 11.97L12.59 9.81L13.25 9.36L11.90 4.82L14.48 3.71L16.87 7.80Z';
const HOLE = 'M25.4 20A5.4 5.4 0 1 0 14.6 20A5.4 5.4 0 1 0 25.4 20Z';

export const gearLogo =
  '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  `<path d="${GEAR}${HOLE}" fill="var(--accent, #ff7a1a)" fill-rule="evenodd"/>` +
  '<circle cx="20" cy="20" r="2.6" fill="#ffb16e"/>' +
  '</svg>';
