import type { AssemblyDef } from '../../core/types';
import { BEARING_DISMOUNT, BEARING_MOUNT, GEAR_DISMOUNT, GEAR_MOUNT, KEY_DISMOUNT, KEY_MOUNT } from '../common/tools';

const bg = (s: string): { bg: string } => ({ bg: s });

/**
 * Assembly order as data. Any step whose prerequisites are installed may be done next,
 * so the two shaft sub-assemblies can be built in any interleaving. Keys are optional:
 * nothing stops a gear going on without its key, but then the key cannot go in any more
 * and the gear slips on the shaft when the machine runs.
 */
export const assembly: AssemblyDef = {
  parTimeSec: 120,
  steps: [
    {
      partId: 'shaft1',
      requires: ['base'],
      hint: bg('Валът се поставя в опорите на основата.'),
      removeHint: bg('Валът излиза последен: върху него още има лагери, колело или шпонка.'),
    },
    {
      partId: 'key1',
      requires: ['shaft1'],
      hint: bg('Шпонката ляга в канала на вала, затова първо трябва да има вал.'),
      removeHint: bg('Шпонката е под главината на колелото – първо свалете колелото.'),
      mount: KEY_MOUNT,
      dismount: KEY_DISMOUNT,
      optional: {
        lockedBy: 'pinion',
        consequence: bg(
          'Колелото z₁ е надянато без шпонка. Вал 1 се върти, а колелото стои на място – триенето в сглобката H7/k6 не стига, за да предаде момента. Нищо не стига до вал 2.',
        ),
        stops: ['pinion', 'gear2', 'shaft2', 'key2', 'brg2A', 'brg2B'],
      },
    },
    {
      partId: 'pinion',
      requires: ['shaft1'],
      hint: bg('Колелото се надява на вала – първо трябва да има вал.'),
      removeHint: bg('Лагер B стои до колелото и му пречи да излезе – първо свалете лагера.'),
      mount: GEAR_MOUNT,
      dismount: GEAR_DISMOUNT,
    },
    {
      partId: 'brg1A',
      requires: ['shaft1'],
      hint: bg('Лагерът се монтира върху лагерната шийка ø20 k6 на вала — първо поставете вал 1.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'brg1B',
      requires: ['pinion'],
      hint: bg(
        'Лагер B застава непосредствено до колелото. Ако се монтира преди него, колелото няма как да мине през лагера до мястото си.',
      ),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'shaft2',
      requires: ['base'],
      hint: bg('Валът се поставя в опорите на основата.'),
      removeHint: bg('Валът излиза последен: върху него още има лагери, колело или шпонка.'),
    },
    {
      partId: 'key2',
      requires: ['shaft2'],
      hint: bg('Шпонката ляга в канала на вал 2, затова първо трябва да има вал.'),
      removeHint: bg('Шпонката е под главината на голямото колело – първо свалете колелото.'),
      mount: KEY_MOUNT,
      dismount: KEY_DISMOUNT,
      optional: {
        lockedBy: 'gear2',
        consequence: bg(
          'Голямото колело е без шпонка. Малкото колело го върти, но то се превърта около вал 2 и валът стои – изходът не получава въртящ момент.',
        ),
        stops: ['shaft2', 'brg2A', 'brg2B'],
      },
    },
    {
      partId: 'gear2',
      requires: ['shaft2'],
      hint: bg('Колелото се надява на вал 2 – първо трябва да има вал.'),
      removeHint: bg('Лагер B на вал 2 опира в главината на колелото – първо свалете лагера.'),
      mount: GEAR_MOUNT,
      dismount: GEAR_DISMOUNT,
    },
    {
      partId: 'brg2A',
      requires: ['shaft2'],
      hint: bg('Лагерът се монтира върху шийката ø25 k6 на вал 2 — първо поставете вала.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'brg2B',
      requires: ['gear2'],
      hint: bg('Лагер B на вал 2 опира в главината на голямото колело. Монтиран преди колелото, той ще блокира пътя му.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
  ],
};
