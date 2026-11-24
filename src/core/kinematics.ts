import type { KinematicLink, Kinematics } from './types';

/**
 * Solves the signed speed of every body for a given input speed.
 * Positive = counter-clockwise about the body's axis (right-hand rule).
 *
 * external gear mesh: n_to = -n_from * z_from / z_to  (direction reverses)
 * internal gear mesh: n_to = +n_from * z_from / z_to  (same direction)
 * coupling:           n_to =  n_from
 */
export function solveSpeeds(kin: Kinematics, inputRpm: number): Map<string, number> {
  if (!kin.bodies.some((b) => b.id === kin.input)) {
    throw new Error(`Input body "${kin.input}" not found`);
  }
  const speeds = new Map<string, number>([[kin.input, inputRpm]]);
  const queue = [kin.input];
  while (queue.length) {
    const id = queue.shift()!;
    const n = speeds.get(id)!;
    for (const link of kin.links) {
      let other: string | undefined;
      let factor = 1;
      if (link.from === id) {
        other = link.to;
        factor = linkFactor(link, false);
      } else if (link.to === id) {
        other = link.from;
        factor = linkFactor(link, true);
      }
      if (other === undefined) continue;
      const value = n * factor;
      const known = speeds.get(other);
      if (known === undefined) {
        speeds.set(other, value);
        queue.push(other);
      } else if (Math.abs(known - value) > 1e-9 * Math.max(1, Math.abs(value))) {
        throw new Error(`Kinematic loop is inconsistent at body "${other}"`);
      }
    }
  }
  return speeds;
}

function linkFactor(link: KinematicLink, reverse: boolean): number {
  switch (link.kind) {
    case 'coupling':
      return 1;
    case 'external-gear':
      return -(reverse ? link.zTo / link.zFrom : link.zFrom / link.zTo);
    case 'internal-gear':
      return reverse ? link.zTo / link.zFrom : link.zFrom / link.zTo;
  }
}

/** Transmission ratio i = n_input / n_output (magnitude). */
export function transmissionRatio(kin: Kinematics): number {
  const out = solveSpeeds(kin, 1).get(kin.output);
  if (out === undefined || out === 0) throw new Error('Output body is not driven');
  return Math.abs(1 / out);
}

/** Signed speed of every body relative to the input. Used to phase-lock rotation angles. */
export function speedFactors(kin: Kinematics): Map<string, number> {
  return solveSpeeds(kin, 1);
}
