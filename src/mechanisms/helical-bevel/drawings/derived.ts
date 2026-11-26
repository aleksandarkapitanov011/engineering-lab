/** Geometry derived for the drawings (mm, angles in rad). Positions s are along the gear axis from the cone apex. */
import { BB, D1, D2, MB, MN, RE } from '../params';

export type SR = [number, number]; // [s, r]

export interface BevelProfile {
  rp: number;
  ha: number;
  hf: number;
  thetaA: number;
  thetaF: number;
  /** Heel and toe points on the pitch, tip and root cones. */
  pitchHeel: SR;
  pitchToe: SR;
  tipHeel: SR;
  tipToe: SR;
  rootHeel: SR;
  rootToe: SR;
  /** Outer tip diameter. */
  dae: number;
}

export function bevelProfile(z: number, delta: number): BevelProfile {
  const rp = (MB * z) / 2;
  const ha = MB;
  const hf = 1.25 * MB;
  const t = (RE - BB) / RE;
  const c = Math.cos(delta);
  const s = Math.sin(delta);
  const pitchHeel: SR = [RE * c, rp];
  const tipHeel: SR = [RE * c - ha * s, rp + ha * c];
  const rootHeel: SR = [RE * c + hf * s, rp - hf * c];
  const sc = (p: SR): SR => [p[0] * t, p[1] * t];
  return {
    rp,
    ha,
    hf,
    thetaA: Math.atan(ha / RE),
    thetaF: Math.atan(hf / RE),
    pitchHeel,
    pitchToe: sc(pitchHeel),
    tipHeel,
    tipToe: sc(tipHeel),
    rootHeel,
    rootToe: sc(rootHeel),
    dae: 2 * tipHeel[1],
  };
}

export const HEL = {
  da1: D1 + 2 * MN,
  df1: D1 - 2.5 * MN,
  da2: D2 + 2 * MN,
  df2: D2 - 2.5 * MN,
};

/** Mass of a stepped steel body from [s0, s1, d] steps, kg. */
export const steelMass = (steps: { s0: number; s1: number; d: number }[], extra = 0): number =>
  (steps.reduce((a, st) => a + (Math.PI / 4) * st.d ** 2 * (st.s1 - st.s0), 0) + extra) * 7.85e-6;
