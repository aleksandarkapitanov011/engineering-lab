import type { AssemblyDef } from '../../core/types';

/**
 * Assembly order as data. Any step whose prerequisites are installed may be done next,
 * so the two shaft sub-assemblies can be built in any interleaving.
 */
export const assembly: AssemblyDef = {
  parTimeSec: 90,
  steps: [
    {
      partId: 'shaft1',
      requires: ['base'],
      hint: { bg: 'Валът се поставя в опорите на основата.' },
    },
    {
      partId: 'key1',
      requires: ['shaft1'],
      hint: { bg: 'Шпонката ляга в канала на вала, затова първо трябва да има вал.' },
    },
    {
      partId: 'pinion',
      requires: ['key1'],
      hint: {
        bg: 'Първо се поставя шпонката, иначе колелото няма как да предаде въртящ момент. След като колелото е на мястото си, шпонката вече не може да се вкара.',
      },
    },
    {
      partId: 'brg1A',
      requires: ['shaft1'],
      hint: { bg: 'Лагерът се монтира върху лагерната шийка ø20 k6 на вала — първо поставете вал 1.' },
    },
    {
      partId: 'brg1B',
      requires: ['pinion'],
      hint: {
        bg: 'Лагер B застава непосредствено до колелото. Ако се монтира преди него, колелото няма как да мине през лагера до мястото си.',
      },
    },
    {
      partId: 'shaft2',
      requires: ['base'],
      hint: { bg: 'Валът се поставя в опорите на основата.' },
    },
    {
      partId: 'key2',
      requires: ['shaft2'],
      hint: { bg: 'Шпонката ляга в канала на вал 2, затова първо трябва да има вал.' },
    },
    {
      partId: 'gear2',
      requires: ['key2'],
      hint: {
        bg: 'Първо се поставя шпонката, иначе колелото ще се превърта на вала и няма да предава въртящ момент.',
      },
    },
    {
      partId: 'brg2A',
      requires: ['shaft2'],
      hint: { bg: 'Лагерът се монтира върху шийката ø25 k6 на вал 2 — първо поставете вала.' },
    },
    {
      partId: 'brg2B',
      requires: ['gear2'],
      hint: {
        bg: 'Лагер B на вал 2 опира в главината на голямото колело. Монтиран преди колелото, той ще блокира пътя му.',
      },
    },
  ],
};
