/**
 * Two-stage helical-bevel gearbox: helical input stage (i₁ = 3) and a bevel stage (i₂ = 2) that turns the
 * output through 90°. Data module only – the app shell renders it like any other mechanism.
 */
import type { LText, Mechanism } from '../../core/types';
import { fmt } from '../../i18n';
import { makeParts } from './parts';
import { assembly } from './assembly';
import { theory, quiz } from './theory';
import { drawings } from './drawings';
import { createForces } from './forces';
import { AXIS_Y, I_TOTAL, S1_Z, Z1, Z2, Z3, Z4 } from './params';

const L = (bg: string, en: string): LText => ({ bg, en });
const line = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const thin = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';

export const thumbnail = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <path ${line} d="M14 20 H78 V64 H14 Z"/>
  <path ${line} d="M78 30 H96 V58 H78"/>
  <rect ${thin} x="24" y="40" width="10" height="16"/><path ${thin} d="M24 44 L34 40 M24 50 L34 44 M24 56 L34 50"/>
  <rect ${thin} x="38" y="26" width="10" height="34"/><path ${thin} d="M38 32 L48 26 M38 40 L48 34 M38 48 L48 42 M38 56 L48 50"/>
  <path ${thin} d="M54 34 L62 30 L62 54 L54 50 Z"/>
  <path ${thin} d="M64 52 L84 52 L80 60 L68 60 Z"/>
  <path ${line} stroke-dasharray="5 3 1.5 3" d="M2 48 H36 M38 43 H58 M74 48 V78"/>
  <path ${line} d="M6 41 a7 7 0 1 0 0 14"/><path ${line} d="M81 74 a7 7 0 1 0 -14 0"/>
</svg>`;

export const helicalBevel: Mechanism = {
  kind: 'mechanism',
  id: 'helical-bevel-gearbox',
  category: 'mechanisms',
  title: L('Цилиндрично-коничен редуктор', 'Helical-bevel gearbox'),
  subtitle: L(
    `Косозъба и конична двойка, i = ${I_TOTAL}, изходен вал под 90°`,
    `Helical and bevel stages, i = ${I_TOTAL}, output shaft at 90°`,
  ),
  thumbnail,
  parts: makeParts(),
  kinematics: {
    input: 's1',
    output: 's3',
    bodies: [
      { id: 's1', label: L('Вал 1 (входящ)', 'Shaft 1 (input)'), origin: [0, AXIS_Y, S1_Z], axis: [-1, 0, 0], arrow: { z: 164, radius: 15 } },
      { id: 's2', label: L('Вал 2 (междинен)', 'Shaft 2 (intermediate)'), origin: [0, AXIS_Y, 0], axis: [-1, 0, 0], arrow: { z: 132, radius: 15 } },
      { id: 's3', label: L('Вал 3 (изходящ)', 'Shaft 3 (output)'), origin: [0, AXIS_Y, 0], axis: [0, 0, 1], arrow: { z: 150, radius: 15 } },
    ],
    // Every axis points away from its mesh, so both pairs follow the external-gear sign rule.
    links: [
      { kind: 'external-gear', from: 's1', to: 's2', zFrom: Z1, zTo: Z2 },
      { kind: 'external-gear', from: 's2', to: 's3', zFrom: Z3, zTo: Z4 },
    ],
  },
  readouts: [
    { label: L('n₁', 'n₁'), value: (s) => fmt(Math.abs(s.get('s1') ?? 0)), sign: (s) => Math.sign(s.get('s1') ?? 0) },
    { label: L('n₂', 'n₂'), value: (s) => fmt(Math.abs(s.get('s2') ?? 0)), sign: (s) => Math.sign(s.get('s2') ?? 0) },
    { label: L('n₃', 'n₃'), value: (s) => fmt(Math.abs(s.get('s3') ?? 0)) },
    { label: L('i = i₁·i₂', 'i = i₁·i₂'), value: () => fmt(I_TOTAL, 0) },
  ],
  assembly,
  forces: createForces(),
  drawings,
  theory,
  quiz,
  camera: {
    target: [-34, 72, 22],
    views: {
      iso: [0.95, 0.85, 1.25],
      front: [0, 0.02, 1],
      top: [0, 1, 0.001],
      side: [-1, 0.02, 0],
    },
  },
  section: { normal: [0, -1, 0], constant: AXIS_Y },
  maxInputRpm: 1500,
};
