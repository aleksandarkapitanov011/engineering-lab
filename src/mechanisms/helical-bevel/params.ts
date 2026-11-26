/**
 * Two-stage helical-bevel gearbox: single source of truth for the dimensions (mm).
 *
 * World frame: Y up, base plate top at y = 0 + BASE_T. The input shaft (1) and the intermediate shaft (2)
 * are parallel to −X; the output shaft (3) runs along +Z. The bevel apex (where the axes of shafts 2 and 3
 * meet) is at (0, AXIS_Y, 0).
 * Every body axis points AWAY from its bevel apex / mesh, so all meshes use the external-gear sign rule.
 * Positions along a shaft are given in its body frame: local z = −x for shafts 1 and 2, local z = z for shaft 3.
 */
import { deg } from '../../core/involute';

export const ALPHA_N = 20; // normal pressure angle, °

// ---------------------------------------------------------------- Stage 1: helical spur gears
export const MN = 2; // normal module
export const Z1 = 17;
export const Z2 = 51;
/** Centre distance of stage 1 (chosen round); the helix angle follows from it. */
export const A1 = 70;
export const BETA = Math.acos((MN * (Z1 + Z2)) / (2 * A1)); // rad, ≈ 13.73°
export const MT = MN / Math.cos(BETA); // transverse module
export const ALPHA_T = Math.atan(Math.tan(deg(ALPHA_N)) / Math.cos(BETA)); // rad
export const D1 = MT * Z1; // 35
export const D2 = MT * Z2; // 105
export const B1 = 24; // face width of the pinion
export const B2 = 22;
export const HEL_BACKLASH = 0.08;

// ---------------------------------------------------------------- Stage 2: straight bevel gears, Σ = 90°
export const MB = 2.5; // outer (heel) module
export const Z3 = 15;
export const Z4 = 30;
export const DELTA3 = Math.atan(Z3 / Z4); // pitch cone angle of the pinion, rad
export const DELTA4 = Math.PI / 2 - DELTA3;
export const DE3 = MB * Z3; // 37.5
export const DE4 = MB * Z4; // 75
/** Outer cone distance R_e = d_e / (2 sin δ). */
export const RE = DE3 / (2 * Math.sin(DELTA3));
export const BB = 13; // face width (≤ R_e/3)

export const I1 = Z2 / Z1;
export const I2 = Z4 / Z3;
export const I_TOTAL = I1 * I2;

// ---------------------------------------------------------------- Layout
export const AXIS_Y = 75;
export const BASE_T = 10;
/** Shaft 1 axis is offset by the stage-1 centre distance (towards the viewer, +Z). */
export const S1_Z = A1;
/** Stage 1 mid-plane (local z of shafts 1 and 2). */
export const STAGE1_Z = 83;

/** Bearings (deep groove ball bearings); C / C0: dynamic / static load rating, N. */
export const BRG_6004 = { code: '6004', d: 20, D: 42, B: 12, n: 9, ball: 6.35, C: 9950, C0: 5000 };
export const BRG_6005 = { code: '6005', d: 25, D: 47, B: 12, n: 10, ball: 7.14, C: 11900, C0: 6550 };
export const BRG_6006 = { code: '6006', d: 30, D: 55, B: 13, n: 11, ball: 7.94, C: 13800, C0: 8300 };

/** Bearing centres in local z. */
export const S1_BRG_A = 120; // left wall
export const S1_BRG_B = 48; // inner rib
export const S2_BRG_A = 120;
export const S2_BRG_B = 48;
export const S3_BRG_A = 40; // output rib
export const S3_BRG_B = 106; // front wall

/** Shaft segments in local z: [z0, z1, diameter]. */
export const SHAFT1: [number, number, number][] = [
  [42, 54, 20], // bearing B seat
  [54, 71, 24],
  [71, 95, 26], // core under the helical teeth (teeth are cut on the shaft)
  [95, 114, 24],
  [114, 126, 20], // bearing A seat
  [126, 170, 18], // input end
];
export const SHAFT1_KEYWAY = { z0: 135, z1: 160, b: 6, t1: 3.5 };

export const SHAFT2: [number, number, number][] = [
  [24, 40, 22], // core under the bevel teeth (pinion shaft); the gear tips at the heel reach s ≈ 38.6
  [40, 42, 36], // pinion backing / shoulder of bearing B
  [42, 55, 30], // bearing B seat (6006)
  [55, 72, 28],
  [72, 94, 26], // seat of the large helical gear
  [94, 114, 24],
  [114, 126, 20], // bearing A seat
];
export const SHAFT2_KEYWAY = { z0: 75, z1: 91, b: 8, t1: 4 };

export const SHAFT3: [number, number, number][] = [
  [8, 28, 26], // seat of the bevel gear
  [28, 34, 32], // shoulder
  [34, 47, 30], // bearing A seat (6006)
  [47, 100, 28],
  [100, 112, 25], // bearing B seat (6005)
  [112, 160, 22], // output end
];
export const SHAFT3_KEYWAY = { z0: 11, z1: 25, b: 8, t1: 4 };
export const SHAFT3_OUT_KEYWAY = { z0: 120, z1: 150, b: 6, t1: 3.5 };

export const KEY2 = { b: 8, h: 7, t1: 4, t2: 3.3, L: 16 };
export const KEY3 = { b: 8, h: 7, t1: 4, t2: 3.3, L: 14 };
/** Keys of the shaft ends (not modelled as parts): coupling on the input, driven machine on the output. */
export const KEY_IN = { b: 6, h: 6, t1: 3.5, L: 25, d: 18 };
export const KEY_OUT = { b: 6, h: 6, t1: 3.5, L: 30, d: 22 };

/** Large helical gear body: rim, web with lightening holes, hub. */
export const GEAR2_BODY = { rimInner: 44, web: 8, hubR: 22, bore: 13, holes: 6, holeR: 6.5, holePitchR: 33 };

/** Housing (cast iron, shown cut away): outer box and the inner walls carrying the bearings. */
export const HOUSING = {
  x0: -126,
  x1: 58,
  z0: -72,
  z1: 112,
  top: 138,
  wall: 10,
  leftWallX: -120, // centre of the left wall (bearings A of shafts 1 and 2)
  ribX: -48, // centre of the inner rib (bearings B of shafts 1 and 2)
  outRibZ: 40, // centre of the output rib (bearing A of shaft 3)
  frontWallZ: 106, // centre of the front wall (bearing B of shaft 3)
};
