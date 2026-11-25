import type { Mechanism } from '../../core/types';
import { gearOutline, matingPhase, polygonPath } from '../../core/involute';
import { fmt } from '../../i18n';
import { SHAFT1_OFFSET } from './params';
import { makeParts } from './parts';
import { assembly } from './assembly';
import { drawings } from './drawings';
import { theory } from './theory';
import { quiz } from './quiz';
import { DEFAULT_CONFIG, layoutFor, type Layout } from './layout';
import { createLab } from './lab';
import { createForces } from './forces';
import { createCloseUp } from './closeup';
import { createStress } from './stress';
import { createMounting } from './mounting';
import { createMeasure } from './measure';

const thumbnail = (() => {
  const p1 = polygonPath(gearOutline({ m: 2, z: 20, backlash: 0.1 }), true);
  const p2 = polygonPath(gearOutline({ m: 2, z: 40, backlash: 0.1, phase: matingPhase(40) }), true);
  return `<svg viewBox="-26 -46 134 92" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g><path d="${p1}" fill="#4d82b3" stroke="currentColor" stroke-width="0.6"/><circle r="10" fill="var(--surface)"/></g>
    <g transform="translate(60 0)"><path d="${p2}" fill="#c4913f" stroke="currentColor" stroke-width="0.6"/><circle r="12.5" fill="var(--surface)"/></g>
  </svg>`;
})();

/** Builds the full mechanism for one gear configuration (used for the default and by the lab). */
export function mechanismFor(L: Layout): Mechanism {
  const { z1, z2 } = L.cfg;
  return {
    kind: 'mechanism',
    id: 'spur-gear',
    title: { bg: 'Цилиндрична зъбна предавка', en: 'Spur gear pair' },
    subtitle: { bg: 'Две прави зъбни колела, m = 2, z₁ = 20, z₂ = 40', en: 'Two spur gears, m = 2, z1 = 20, z2 = 40' },
    thumbnail,
    parts: makeParts(L),
    kinematics: {
      input: 's1',
      output: 's2',
      bodies: [
        {
          id: 's1',
          label: { bg: 'Вал 1', en: 'Shaft 1' },
          origin: [0, L.axisY, 0],
          axis: [0, 0, 1],
          arrow: { z: -SHAFT1_OFFSET - 6, radius: 17 },
        },
        {
          id: 's2',
          label: { bg: 'Вал 2', en: 'Shaft 2' },
          origin: [L.a, L.axisY, 0],
          axis: [0, 0, 1],
          arrow: { z: 75, radius: 19 },
        },
      ],
      links: [{ kind: 'external-gear', from: 's1', to: 's2', zFrom: z1, zTo: z2 }],
    },
    readouts: [
      {
        label: { bg: 'n₁', en: 'n1' },
        value: (s) => `${fmt(Math.abs(s.get('s1') ?? 0))}`,
        sign: (s) => Math.sign(s.get('s1') ?? 0),
      },
      {
        label: { bg: 'n₂', en: 'n2' },
        value: (s) => `${fmt(Math.abs(s.get('s2') ?? 0))}`,
        sign: (s) => Math.sign(s.get('s2') ?? 0),
      },
      {
        label: { bg: 'i = z₂/z₁', en: 'i = z2/z1' },
        value: () => fmt(z2 / z1, 2),
      },
    ],
    assembly,
    drawings,
    theory,
    quiz,
    camera: {
      target: [L.a / 2, L.axisY * 0.7, -2],
      views: {
        iso: [1, 0.85, 1.25],
        front: [0, 0.02, 1],
        top: [0, 1, 0.001],
        side: [1, 0.02, 0],
      },
    },
    section: { normal: [0, -1, 0], constant: L.axisY },
    maxInputRpm: 3000,
    forces: createForces(L),
    closeUp: createCloseUp(L),
    stress: createStress(L),
    mounting: createMounting(L),
    measure: createMeasure(L),
  };
}

export const spurGear: Mechanism = {
  ...mechanismFor(layoutFor(DEFAULT_CONFIG)),
  lab: createLab((L) => mechanismFor(L)),
};
