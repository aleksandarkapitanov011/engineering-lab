/**
 * Design configuration of the spur gear pair and everything derived from it
 * (gear dimensions, centre distance, axis height, integral pinion, checks).
 * Shafts, keys and bearings stay fixed; the gears and the housing adapt.
 */
import { centreDistance, deg, gearDims, inv, type GearDims } from '../../core/involute';
import { ALPHA, BRG1, BRG2, KEY1, KEY2 } from './params';

export interface GearConfig {
  m: number;
  z1: number;
  z2: number;
  /** Profile shift of the pinion. The gear gets x2 = -x1, so the centre distance stays a = m(z1+z2)/2. */
  x1: number;
}

export const DEFAULT_CONFIG: GearConfig = { m: 2, z1: 20, z2: 40, x1: 0 };

/** ISO 54 first-choice modules offered in the lab. */
export const MODULES = [1, 1.25, 1.5, 2, 2.5, 3];

export interface Layout {
  cfg: GearConfig;
  g1: GearDims;
  g2: GearDims;
  a: number;
  axisY: number;
  /** Rim thickness between the hub keyway and the root circle. */
  rim1: number;
  rim2: number;
  /** Too thin to bore: the gear is made in one piece with its shaft. */
  integral1: boolean;
  integral2: boolean;
  /** Outer rings of the two bearings would overlap. */
  bearingsClash: boolean;
  /** Transverse contact ratio. */
  eps: number;
  /** Tooth thickness on the tip circle. */
  sa1: number;
  sa2: number;
  /** Smallest tooth count without undercut for the given shift. */
  zLim1: number;
  zLim2: number;
}

/** Tooth thickness on the tip circle: s_a = d_a·(s/d + inv α − inv α_a). */
export function tipThickness(g: GearDims): number {
  const aa = Math.acos(g.db / g.da);
  return g.da * (g.s / g.d + inv(g.alpha) - inv(aa));
}

/** Undercut limit for a standard rack: z ≥ 2(1 − x) / sin²α. */
export const undercutLimit = (x: number, alphaDeg = ALPHA): number => (2 * (1 - x)) / Math.sin(deg(alphaDeg)) ** 2;

export function layoutFor(cfg: GearConfig): Layout {
  const g1 = gearDims(cfg.m, cfg.z1, ALPHA, cfg.x1);
  const g2 = gearDims(cfg.m, cfg.z2, ALPHA, -cfg.x1);
  const a = centreDistance(cfg.m, cfg.z1, cfg.z2);
  const axisY = Math.max(50, Math.max(g1.da, g2.da) / 2 + 8);
  const rim1 = g1.df / 2 - (BRG1.d / 2 + KEY1.t2);
  const rim2 = g2.df / 2 - (BRG2.d / 2 + KEY2.t2);
  const ra1 = g1.da / 2;
  const ra2 = g2.da / 2;
  const rb1 = g1.db / 2;
  const rb2 = g2.db / 2;
  // x1 + x2 = 0, so the working pressure angle equals α.
  const ga = Math.sqrt(ra1 * ra1 - rb1 * rb1) + Math.sqrt(ra2 * ra2 - rb2 * rb2) - a * Math.sin(g1.alpha);
  return {
    cfg,
    g1,
    g2,
    a,
    axisY,
    rim1,
    rim2,
    integral1: rim1 < 2 * cfg.m,
    integral2: rim2 < 2 * cfg.m,
    bearingsClash: a < (BRG1.D + BRG2.D) / 2 + 4,
    eps: ga / g1.pb,
    sa1: tipThickness(g1),
    sa2: tipThickness(g2),
    zLim1: undercutLimit(cfg.x1),
    zLim2: undercutLimit(-cfg.x1),
  };
}
