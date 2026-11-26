import type { AssemblyDef, LText } from '../../core/types';
import { BEARING_DISMOUNT, BEARING_MOUNT, GEAR_DISMOUNT, GEAR_MOUNT, KEY_DISMOUNT, KEY_MOUNT } from '../common/tools';

const L = (bg: string, en: string): LText => ({ bg, en });

/**
 * Assembly order of the helical-bevel gearbox. The three shaft sub-assemblies can be built in any
 * interleaving. Shaft diameters step down towards one end, so every bearing and gear has exactly one
 * way on – the order on a shaft follows from that.
 */
export const assembly: AssemblyDef = {
  parTimeSec: 180,
  steps: [
    {
      partId: 'shaft1',
      requires: ['housing'],
      hint: L('Валът се поставя в отворите на корпуса.', 'The shaft goes into the bores of the housing.'),
      removeHint: L('Валът излиза последен: първо свалете лагерите му.', 'The shaft comes out last: remove its bearings first.'),
    },
    {
      partId: 'brg1A',
      requires: ['shaft1'],
      hint: L('Лагерът сяда на шийката ø20 на вал 1 – първо поставете вала.', 'The bearing sits on the ø20 seat of shaft 1 – place the shaft first.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'brg1B',
      requires: ['shaft1'],
      hint: L('Лагерът сяда на шийката ø20 на вал 1 – първо поставете вала.', 'The bearing sits on the ø20 seat of shaft 1 – place the shaft first.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'shaft2',
      requires: ['housing'],
      hint: L('Валът се поставя в отворите на корпуса.', 'The shaft goes into the bores of the housing.'),
      removeHint: L(
        'Валът излиза последен: върху него още има лагери, колело или шпонка.',
        'The shaft comes out last: there are still bearings, a gear or a key on it.',
      ),
    },
    {
      partId: 'brg2B',
      requires: ['shaft2'],
      hint: L('Лагерът се надява на вал 2 – първо поставете вала.', 'The bearing goes onto shaft 2 – place the shaft first.'),
      removeHint: L(
        'Лагер B стои зад голямото колело: свалете колелото, после лагера.',
        'Bearing B sits behind the large gear: remove the gear, then the bearing.',
      ),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'key2',
      requires: ['shaft2'],
      hint: L('Шпонката ляга в канала на вал 2 – първо поставете вала.', 'The key sits in the keyway of shaft 2 – place the shaft first.'),
      removeHint: L('Шпонката е под главината на колелото – първо свалете колелото.', 'The key is under the gear hub – remove the gear first.'),
      mount: KEY_MOUNT,
      dismount: KEY_DISMOUNT,
      optional: {
        lockedBy: 'gear2',
        consequence: L(
          'Голямото косозъбо колело е без шпонка. Входящият вал го върти, но то се превърта около вал 2 – коничното стъпало и изходът стоят.',
          'The large helical gear has no key. The input shaft turns it, but it slips around shaft 2 – the bevel stage and the output stand still.',
        ),
        stops: ['shaft2', 'brg2A', 'brg2B', 'shaft3', 'key3', 'gear4', 'brg3A', 'brg3B'],
      },
    },
    {
      partId: 'gear2',
      requires: ['brg2B'],
      hint: L(
        'Лагер B е зад колелото и се надява пръв – колелото после ще му препречи пътя (диаметрите на вала намаляват към левия край).',
        'Bearing B is behind the gear and goes on first – the gear would block its way afterwards (the shaft diameters step down towards the left end).',
      ),
      removeHint: L('Лагер A препречва пътя на колелото – първо свалете лагера.', 'Bearing A blocks the way of the gear – remove the bearing first.'),
      mount: GEAR_MOUNT,
      dismount: GEAR_DISMOUNT,
    },
    {
      partId: 'brg2A',
      requires: ['gear2'],
      hint: L('Лагер A е най-външен – слага се след колелото.', 'Bearing A is outermost – it goes on after the gear.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'shaft3',
      requires: ['housing'],
      hint: L('Валът се поставя в отворите на корпуса.', 'The shaft goes into the bores of the housing.'),
      removeHint: L(
        'Валът излиза последен: върху него още има лагери, колело или шпонка.',
        'The shaft comes out last: there are still bearings, a gear or a key on it.',
      ),
    },
    {
      partId: 'key3',
      requires: ['shaft3'],
      hint: L('Шпонката ляга в канала на вал 3 – първо поставете вала.', 'The key sits in the keyway of shaft 3 – place the shaft first.'),
      removeHint: L('Шпонката е под главината на коничното колело – първо свалете колелото.', 'The key is under the hub of the bevel gear – remove the gear first.'),
      mount: KEY_MOUNT,
      dismount: KEY_DISMOUNT,
      optional: {
        lockedBy: 'gear4',
        consequence: L(
          'Голямото конично колело е без шпонка. Цялата предавка се върти, но колелото се превърта около изходящия вал и той стои.',
          'The large bevel gear has no key. The whole drive turns, but the gear slips around the output shaft and the shaft stands still.',
        ),
        stops: ['shaft3', 'brg3A', 'brg3B'],
      },
    },
    {
      partId: 'gear4',
      requires: ['shaft3'],
      hint: L('Коничното колело се надява на вал 3 – първо поставете вала.', 'The bevel gear goes onto shaft 3 – place the shaft first.'),
      mount: GEAR_MOUNT,
      dismount: GEAR_DISMOUNT,
    },
    {
      partId: 'brg3A',
      requires: ['shaft3'],
      hint: L('Лагерът се надява на вал 3 – първо поставете вала.', 'The bearing goes onto shaft 3 – place the shaft first.'),
      removeHint: L('Лагер B е по-навън и му препречва пътя – първо свалете лагер B.', 'Bearing B is further out and blocks its way – remove bearing B first.'),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
    {
      partId: 'brg3B',
      requires: ['brg3A'],
      hint: L(
        'Лагер A минава през мястото на лагер B към своята шийка – затова B е последен.',
        'Bearing A passes over the seat of bearing B on its way – so B goes on last.',
      ),
      mount: BEARING_MOUNT,
      dismount: BEARING_DISMOUNT,
    },
  ],
};
