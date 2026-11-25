/** Drawing of shaft 1 (input shaft). */
import type { DrawingNote } from '../../../core/types';
import {
  arrowHead,
  f,
  leader,
  line,
  note,
  path,
  polyline,
  roughness,
  sheetEnd,
  sheetStart,
  text,
  titleBlock,
} from '../../../ui/svgdraw';
import { S, N, diaInside, generalRoughness, hd, notesBlock, vd } from './common';
import { KEY1, SHAFT1_KEYWAY, SHAFT1_SEGMENTS } from '../params';

// ---------------------------------------------------------------- Shaft 1

export const shaftNotes: Record<string, DrawingNote> = {
  len120: N(
    'Обща дължина 120 mm',
    'Габаритен размер на вала. Веригата 46 + 12 + 6 + 32 нарочно не включва последния участък (24 mm): така няма затворена размерна верига и всички неточности се натрупват в най-малко отговорния участък.',
  ),
  len46: N(
    '46 mm – входящ край',
    'Участъкът за съединител или ремъчна шайба. Не е функционално критичен, затова е с общ допуск по ISO 2768-m (±0,3 mm за 30…120 mm).',
  ),
  len12: N(
    '12 mm – лагерна шийка',
    'Равна на ширината B = 12 mm на лагер 6004. Вътрешният пръстен трябва да лежи изцяло върху шлифованата шийка k6 и да опира в рамото.',
  ),
  len6: N(
    '6 mm – рамо',
    'Рамото е осевата опора на лагер A от едната страна и на колелото от другата. Осигурява точното положение на колелото по оста.',
  ),
  len32: N(
    '32 mm = 20 + 12',
    'Седлото на колелото (20 mm) и шийката на лагер B (12 mm) са на един и същ диаметър ø20 k6, затова се размерват като един участък.',
  ),
  h9: N(
    'ø20 h9 (0 / −0,052)',
    'Свободен, нефункционален диаметър. Основното отклонение h има горно отклонение 0, а квалитет 9 дава поле 52 µm. Изпълнява се само със струговане – евтино.',
  ),
  k6: N(
    'ø20 k6 (+0,015 / +0,002)',
    'Шийките за лагерите и седлото на колелото. Валът е винаги малко по-голям от номинала, затова вътрешният пръстен на лагера сяда с лек натяг и не се превърта под товар. Изисква шлифоване.',
  ),
  d24: N(
    'ø24 – рамо',
    'Диаметърът на рамото е по-малък от външния диаметър на вътрешния пръстен на лагера (около 27 mm при 6004). Така пръстенът опира добре, а остава място за изваждач при демонтаж.',
  ),
  keyway: N(
    'Шпонков канал 6 N9 (0 / −0,030)',
    'Ширина b = 6 mm по ISO 773 / DIN 6885 за валове ø17…22 mm. Полето N9 дава нормална, леко стегната сглобка на шпонката във вала, така че тя не се движи при реверсиране на момента.',
  ),
  depth: N(
    '16,5 (0 / −0,1)',
    'Дълбочината се задава от отсрещната образуваща до дъното на канала: d − t₁ = 20 − 3,5 = 16,5 mm. Така се измерва директно с шублер. Допускът е само в минус – каналът може да е малко по-дълбок, но не по-плитък.',
  ),
  keypos: N(
    'Положение и дължина на канала',
    'Каналът започва на 2 mm от рамото и е дълъг 16 mm – по-къс от главината на колелото (20 mm), за да не отслабва вала извън нея. Дължината е от стандартния ред за призматични шпонки.',
  ),
  sectionA: N(
    'Разрез A–A',
    'Напречно сечение през шпонковия канал. Стрелките при секущата равнина показват посоката на гледане. Щриховката под 45° означава срязан материал.',
  ),
  ra08: N(
    'Ra 0,8 µm',
    'Средна аритметична грапавост 0,8 µm на лагерните шийки и седлото. Нужна е, за да се запази натягът на сглобката k6 – грапавите върхове иначе се смачкват при монтажа. Постига се чрез шлифоване.',
  ),
  ra16: N(
    'Ra 1,6 µm – чело на рамото',
    'Челото, в което опира лагерът. По-гладката повърхнина осигурява перпендикулярност на оста и равномерно опиране на пръстена.',
  ),
  ra32: N('Ra 3,2 µm – стени на канала', 'Стените на шпонковия канал се фрезоват. Ra 3,2 µm е достатъчно за предаване на момента чрез натиск.'),
  'ra-general': N(
    'Ra 3,2 (√) – обща грапавост',
    'Знакът до основния надпис задава грапавост Ra 3,2 µm за всички неозначени повърхнини. Символът в скоби означава „освен означените на чертежа“.',
  ),
  chamfer: N(
    'Фаска 1×45°',
    'Фаските улесняват надяването на лагерите и колелото, премахват острите ръбове и предпазват от нараняване. Записът означава катет 1 mm под ъгъл 45°.',
  ),
  fillet: N(
    'Радиус R0,5',
    'Закръглението в прехода към рамото намалява концентрацията на напрежения при огъване. То трябва да е по-малко от радиуса на ръба на лагерния пръстен (0,6 mm при 6004), иначе лагерът няма да опре в рамото.',
  ),
  fit: N(
    'Сглобка ø20 H7/k6',
    'Система на отвора: отворът на колелото е H7 (0…+0,021), валът е k6 (+0,002…+0,015). Получава се преходна сглобка – от хлабина 0,019 mm до натяг 0,015 mm. Колелото се центрира точно, а въртящият момент се предава от шпонката.',
  ),
  bearingfit: N(
    'Сглобка вал – лагер',
    'Отворът на вътрешния пръстен има отрицателен допуск (0…−0,010 mm при клас на точност P0). С вал k6 винаги се получава лек натяг – правилното решение за въртящ се вътрешен пръстен.',
  ),
  iso2768: N(
    'ISO 2768-mK',
    'Общи допуски за размери без указан допуск (клас m – среден) и за форма и разположение (клас K). Например за размер 46 mm допускът е ±0,3 mm.',
  ),
  heat: N(
    'Подобряване 220…250 HB',
    'Закаляване и високо отвръщане на стомана C45. Дава добро съчетание от якост и жилавост за вал, натоварен на усукване и огъване.',
  ),
  title: N(
    'Основен надпис',
    'Съдържа наименованието, материала, мащаба (2:1 – детайлът е начертан два пъти по-голям), номера на чертежа и автора. Оформя се по ISO 7200.',
  ),
};

export function shaftSvg(): string {
  const X0 = 60;
  const Yc = 118;
  const X = (z: number): number => X0 + S * z;
  const segs = SHAFT1_SEGMENTS;
  const r = (i: number): number => (segs[i].d / 2) * S;
  const c = 1 * S; // chamfer

  // Outline (top half, then mirrored).
  const top: [number, number][] = [
    [X(0), Yc - r(0) + c],
    [X(0) + c, Yc - r(0)],
  ];
  for (let i = 0; i < segs.length - 1; i++) {
    top.push([X(segs[i].z1), Yc - r(i)], [X(segs[i].z1), Yc - r(i + 1)]);
  }
  top.push([X(120) - c, Yc - r(4)], [X(120), Yc - r(4) + c]);
  const bottom = top.map(([x, y]) => [x, 2 * Yc - y] as [number, number]);
  let s = sheetStart();
  s += polyline(top) + polyline(bottom);
  s += line(X(0), Yc - r(0) + c, X(0), Yc + r(0) - c) + line(X(120), Yc - r(4) + c, X(120), Yc + r(4) - c);
  s += line(X(0) + c, Yc - r(0), X(0) + c, Yc + r(0)) + line(X(120) - c, Yc - r(4), X(120) - c, Yc + r(4));
  s += line(X(58), Yc - r(2), X(58), Yc + r(2)) + line(X(64), Yc - r(2), X(64), Yc + r(2));
  // Keyway facing the viewer (form B, flat ends).
  const k0 = X(SHAFT1_KEYWAY.z0);
  const k1 = X(SHAFT1_KEYWAY.z1);
  const kb = (KEY1.b / 2) * S;
  s += polyline(
    [
      [k0, Yc - kb],
      [k1, Yc - kb],
      [k1, Yc + kb],
      [k0, Yc + kb],
    ],
    'thick',
    true,
  );
  // Axis.
  s += line(X(0) - 6, Yc, X(120) + 6, Yc, 'center');

  // Length chain above, overall length above that.
  const yChain = Yc - 38;
  s += hd(X(0), Yc - r(0), X(46), Yc - r(0), yChain, '46', { note: 'len46' });
  s += hd(X(46), Yc - r(1), X(58), Yc - r(2), yChain, '12', { note: 'len12' });
  s += hd(X(58), Yc - r(2), X(64), Yc - r(2), yChain, '6', { note: 'len6', outside: true });
  s += hd(X(64), Yc - r(3), X(96), Yc - r(3), yChain, '32', { note: 'len32' });
  s += hd(X(0), Yc - r(0) + c, X(120), Yc - r(4) + c, Yc - 50, '120', { note: 'len120' });

  // Keyway position and length below.
  const yKey = Yc + 36;
  s += hd(X(64), Yc + r(2), k0, Yc + kb, yKey, '2', { note: 'keypos', outside: true, at: -0.9 });
  s += hd(k0, Yc + kb, k1, Yc + kb, yKey, '16', { note: 'keypos' });

  // Diameters inside the outline.
  s += diaInside(X(23), Yc, r(0), 'ø20h9', { note: 'h9', tol: ['0', '−0,052'] });
  s += diaInside(X(52), Yc, r(1), 'ø20k6', { note: 'k6', tol: ['+0,015', '+0,002'] });
  s += diaInside(X(61), Yc, r(2), 'ø24', { note: 'd24' });
  s += diaInside(X(90), Yc, r(3), 'ø20k6', { note: 'k6', tol: ['+0,015', '+0,002'] });
  s += diaInside(X(108), Yc, r(4), 'ø20h9', { note: 'h9', tol: ['0', '−0,052'] });

  // Chamfer and fillet leaders.
  s += leader(X(0) + 1, Yc - r(0) + 1, X(0) - 8, Yc - 30, '1×45° (2×)', 'chamfer', false);
  s += leader(X(58) - 0.4, Yc + r(1) + 0.4, X(58) - 14, Yc + 32, 'R0,5', 'fillet', false);

  // Roughness on surfaces.
  s += roughness(X(52), Yc - r(1), '0,8', 'ra08');
  s += roughness(X(88), Yc - r(3), '0,8', 'ra08');
  // Ra 1.6 on the shoulder face via a leader with reference line.
  {
    const fx = X(58);
    const fy = Yc + r(1) + 2;
    const kx = fx - 22;
    const ky = Yc + 50;
    const inner =
      line(fx, fy, fx - 8, ky, 'thin') +
      arrowHead(fx, fy, Math.atan2(fy - ky, fx - (fx - 8)), 2.6) +
      line(fx - 8, ky, kx, ky, 'thin') +
      roughness(kx + 3, ky, '1,6');
    s += note('ra16', inner, { x: kx - 2, y: ky - 13, w: 32, h: 15 });
  }

  // Cutting plane A–A at the keyway, viewing to the right.
  const xa = X(74);
  for (const y0 of [Yc - r(3) - 5, Yc + r(3) + 5]) {
    const y1 = y0 + (y0 < Yc ? -6 : 6);
    s += `<line class="thick" style="stroke-width:0.9" x1="${f(xa)}" y1="${f(y0)}" x2="${f(xa)}" y2="${f(y1)}"/>`;
    s += line(xa, y1, xa + 8, y1, 'thin') + arrowHead(xa + 8, y1, 0);
    s += text(xa + 10, y1 + 1.4, 'A', { size: 5, anchor: 'start' });
  }

  // Section A–A.
  const Xs = 360;
  const Ys = Yc;
  const R = 10 * S;
  const kd = (10 - KEY1.t1) * S; // keyway bottom distance from axis
  const xc = Math.sqrt(R * R - kb * kb);
  const sec = `M${f(Xs + xc)} ${f(Ys - kb)}A${R} ${R} 0 1 0 ${f(Xs + xc)} ${f(Ys + kb)}L${f(Xs + kd)} ${f(Ys + kb)}L${f(Xs + kd)} ${f(Ys - kb)}Z`;
  s += note(
    'sectionA',
    path(sec, 'hatch') + path(sec, 'thick') + text(Xs, Ys - R - 10, 'A–A', { size: 5, cls: 'title-big' }),
    { x: Xs - 14, y: Ys - R - 16, w: 28, h: 9 },
  );
  s += line(Xs - R - 4, Ys, Xs + R + 4, Ys, 'center') + line(Xs, Ys - R - 4, Xs, Ys + R + 4, 'center');
  s += vd(Xs + xc, Ys + kb, Xs + xc, Ys - kb, Xs + R + 10, '6N9', { note: 'keyway', tol: ['0', '−0,030'] });
  s += hd(Xs - R, Ys, Xs + kd, Ys + kb, Ys + R + 12, '16,5', { note: 'depth', tol: ['0', '−0,1'] });
  {
    const inner = line(Xs + kd + 3, Ys - kb, Xs + kd + 10, Ys - R - 6, 'thin') + roughness(Xs + kd + 10, Ys - R - 6, '3,2');
    s += note('ra32', inner, { x: Xs + kd + 4, y: Ys - R - 20, w: 26, h: 16 });
  }

  // General roughness, notes, title block.
  s += generalRoughness(372, 236);
  s += notesBlock(26, 200, 'ТЕХНИЧЕСКИ ИЗИСКВАНИЯ', [
    { t: '1. Подобряване 220…250 HB.', key: 'heat' },
    { t: '2. Неуказани фаски 0,5×45°, радиуси R0,5.', key: 'chamfer' },
    { t: '3. Общи допуски ISO 2768-mK.', key: 'iso2768' },
    { t: '4. Сглобка с колелото: ø20 H7/k6.', key: 'fit' },
    { t: '5. Лагерни шийки: ø20 k6, лагери 6004.', key: 'bearingfit' },
  ]);
  s += titleBlock(410, 287, {
    name: 'Вал 1 (входящ)',
    material: 'Стомана C45 (EN 10083-2)',
    scale: '2:1',
    number: 'EL-SG-001',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '2/6',
    mass: '0,30 kg',
  });
  return s + sheetEnd();
}
