/**
 * Single source of truth for the spur gear pair dimensions (mm).
 * World frame: shafts run along Z, gear 1 axis at x = 0, gear 2 axis at x = A, both at y = AXIS_Y.
 * Base plate top is y = 0. The gears' mid-plane is z = 0.
 */
import { centreDistance, gearDims } from '../../core/involute';

export const M = 2;
export const Z1 = 20;
export const Z2 = 40;
export const ALPHA = 20;
export const B1 = 20; // pinion face width
export const B2 = 18; // gear face width
export const A = centreDistance(M, Z1, Z2); // 60
export const AXIS_Y = 50;
export const BACKLASH = 0.08; // small circumferential backlash so flanks never z-fight

export const G1 = gearDims(M, Z1, ALPHA);
export const G2 = gearDims(M, Z2, ALPHA);

/** Parallel keys to DIN 6885 / ISO 773 (b x h, shaft depth t1, hub depth t2). */
export const KEY1 = { b: 6, h: 6, t1: 3.5, t2: 2.8, L: 16 };
export const KEY2 = { b: 8, h: 7, t1: 4.0, t2: 3.3, L: 14 };

/** Deep groove ball bearings. */
export const BRG1 = { code: '6004', d: 20, D: 42, B: 12, n: 9, ball: 6.35, C: 9950 };
export const BRG2 = { code: '6005', d: 25, D: 47, B: 12, n: 10, ball: 7.14, C: 11900 };

/** Shaft 1 in its own frame: z_local = 0 at the input end. World z = local - SHAFT1_OFFSET. */
export const SHAFT1_OFFSET = 74;
export const SHAFT1_SEGMENTS = [
  { z0: 0, z1: 46, d: 20, fit: 'h9', role: 'input' },
  { z0: 46, z1: 58, d: 20, fit: 'k6', role: 'bearing' },
  { z0: 58, z1: 64, d: 24, fit: '', role: 'shoulder' },
  { z0: 64, z1: 96, d: 20, fit: 'k6', role: 'seat' },
  { z0: 96, z1: 120, d: 20, fit: 'h9', role: 'end' },
] as const;
export const SHAFT1_KEYWAY = { z0: 66, z1: 82 }; // local

/** Shaft 2 local frame: z_local = 0 at the free end. World z = local - SHAFT2_OFFSET. */
export const SHAFT2_OFFSET = 51;
export const SHAFT2_SEGMENTS = [
  { z0: 0, z1: 24, d: 25, fit: 'h9', role: 'end' },
  { z0: 24, z1: 36, d: 25, fit: 'k6', role: 'bearing' },
  { z0: 36, z1: 42, d: 30, fit: '', role: 'shoulder' },
  { z0: 42, z1: 72, d: 25, fit: 'k6', role: 'seat' },
  { z0: 72, z1: 120, d: 25, fit: 'h9', role: 'output' },
] as const;
export const SHAFT2_KEYWAY = { z0: 44, z1: 58 }; // local, centred on the gear (world z = 0)

/** Bearing centres in world z. */
export const BRG1A_Z = -22;
export const BRG1B_Z = 16;
export const BRG2A_Z = -21;
export const BRG2B_Z = 15;

/** Bearing support walls (two twin pillow walls) centre z and thickness. */
export const WALL_A_Z = -21.5;
export const WALL_B_Z = 15.5;
export const WALL_T = 10;
