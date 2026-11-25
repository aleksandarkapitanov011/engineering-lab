/**
 * Technical drawings of the spur gear pair (A3 sheets, generated as SVG).
 * Every dimension / symbol with a `note` key opens an explanation in the drawing tab.
 */
import type { DrawingDef } from '../../../core/types';
import { assemblyNotes, assemblySvg } from './assembly';
import { shaftNotes, shaftSvg } from './shaft1';
import { pinionNotes, pinionSvg } from './pinion';
import { shaft2Notes, shaft2Svg } from './shaft2';
import { gear2Notes, gear2Svg } from './gear2';
import { fitsNotes, fitsSvg } from './fits';

export const drawings: DrawingDef[] = [
  { id: 'assembly', title: { bg: 'Сглобка', en: 'Assembly' }, render: assemblySvg, notes: assemblyNotes },
  { id: 'shaft1', title: { bg: 'Вал 1', en: 'Shaft 1' }, render: shaftSvg, notes: shaftNotes },
  { id: 'pinion', title: { bg: 'Колело z₁', en: 'Pinion z₁' }, render: pinionSvg, notes: pinionNotes },
  { id: 'shaft2', title: { bg: 'Вал 2', en: 'Shaft 2' }, render: shaft2Svg, notes: shaft2Notes },
  { id: 'gear2', title: { bg: 'Колело z₂', en: 'Gear z₂' }, render: gear2Svg, notes: gear2Notes },
  { id: 'fits', title: { bg: 'Допуски', en: 'Fits' }, render: fitsSvg, notes: fitsNotes },
];
