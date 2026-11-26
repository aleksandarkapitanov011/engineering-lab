/** Drawings of the helical-bevel gearbox, in sheet order. */
import type { DrawingDef } from '../../../core/types';
import { scheme } from './scheme';
import { assemblySheet } from './assembly';
import { shaft1Sheet, shaft2Sheet, shaft3Sheet } from './shafts';
import { gear2Sheet, gear4Sheet } from './gears';

export const drawings: DrawingDef[] = [scheme, assemblySheet, shaft1Sheet, shaft2Sheet, shaft3Sheet, gear2Sheet, gear4Sheet];
