/** Drawing of shaft 2 (output shaft), A3, scale 2:1. */
import type { DrawingNote } from '../../../core/types';
import { arrowHead, f, leader, line, note, path, part3d, polyline, roughness, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { S, N, diaInside, generalRoughness, hd, notesBlock, vd } from './common';
import { centreHole, datum, detailMark, fcf, FH, undercutDetail } from '../../../ui/gdt';
import { KEY2, SHAFT2_KEYWAY, SHAFT2_SEGMENTS } from '../params';
import { shaftNotes } from './shaft1';

export const shaft2Notes: Record<string, DrawingNote> = {
  len120: N(
    'Обща дължина 120 mm',
    'Габаритният размер. Веригата 24 + 12 + 6 + 30 оставя изходния край (48 mm) без размер – там се натрупват неточностите, защото той е най-малко отговорен.',
  ),
  len24: N('24 mm – свободен край', 'Участъкът зад лагер A. Нефункционален, с общ допуск по ISO 2768-m (±0,2 mm за 6…30 mm).'),
  len12: N(
    '12 mm – лагерна шийка',
    'Равна на ширината B = 12 mm на лагер 6005. Вътрешният пръстен опира в рамото ø30 и лежи изцяло върху шлифованата шийка.',
  ),
  len6: N('6 mm – рамо', 'Рамото ø30 е осевата опора едновременно на лагер A (отляво) и на голямото колело (отдясно).'),
  len30: N(
    '30 mm = 18 + 12',
    'Седлото на колелото (ширина 18 mm) и шийката на лагер B (12 mm) са на един диаметър ø25 k6. Затова се размерват като един участък.',
  ),
  h9: N(
    'ø25 h9 (0 / −0,052)',
    'Свободни диаметри – свободният край и изходящият край към съединителя. Полето h9 се постига само със струговане. За 18…30 mm квалитет 9 е 52 µm.',
  ),
  k6: N(
    'ø25 k6 (+0,015 / +0,002)',
    'Шийките за лагерите 6005 и седлото на колелото. Същите отклонения като при ø20 k6, защото и двата диаметъра са в интервала 18…30 mm на ISO 286.',
  ),
  d30: N(
    'ø30 – рамо',
    'По каталога на лагера 6005 диаметърът на опорното рамо трябва да е между 30 и 32 mm: достатъчно висок, за да опира пръстенът, и достатъчно нисък, за да остане място за изваждач.',
  ),
  keyway: N(
    'Шпонков канал 8 N9 (0 / −0,036)',
    'По ISO 773 / DIN 6885 валове ø22…30 mm получават шпонка 8 × 7. Ширината 8 N9 дава стегната сглобка на шпонката във вала.',
  ),
  depth: N(
    '21 (0 / −0,2)',
    'Мери се от отсрещната образуваща: d − t₁ = 25 − 4,0 = 21 mm. За шпонки над 6 mm допускът на t₁ е 0,2 mm, затова и тук полето е 0,2 – в минус.',
  ),
  keypos: N(
    'Канал 14 mm на 2 mm от рамото',
    'Шпонката 8×7×14 е по-къса от главината на колелото (18 mm), а каналът започва на 2 mm от рамото, за да не се събира концентрацията на напрежения от рамото и от канала в едно сечение.',
  ),
  sectionA: shaftNotes.sectionA,
  ra08: N('Ra 0,8 µm', 'Шлифовани шийки и седло. Гладката повърхнина запазва натяга на сглобката k6.'),
  ra32: shaftNotes.ra32,
  'ra-general': shaftNotes['ra-general'],
  chamfer: shaftNotes.chamfer,
  fillet: N(
    'Радиуси R0,5 (2×)',
    'Преходите от двете страни на рамото. Радиусът трябва да е по-малък от фаската на пръстена на лагер 6005 (0,6 mm), за да опре лагерът плътно в рамото.',
  ),
  fit: N(
    'Сглобка ø25 H7/k6',
    'Отворът на колелото z₂ е ø25 H7 (0…+0,021), валът е k6 (+0,002…+0,015). Преходна сглобка: от хлабина 0,019 mm до натяг 0,015 mm. Колелото се центрира, а моментът се предава от шпонката.',
  ),
  bearingfit: N(
    'Лагери 6005 върху k6',
    'Вътрешният пръстен се върти спрямо товара (циркулационно натоварване), затова седи с лек натяг върху k6. Отворът на пръстена има поле 0…−0,010 mm.',
  ),
  iso2768: shaftNotes.iso2768,
  heat: shaftNotes.heat,
  output: N(
    'Изходящ край',
    'Тук се монтира съединител или зъбно колело на следващото стъпало. Моментът на вал 2 е два пъти по-голям от този на вал 1 (i = 2), затова валът е по-дебел: ø25 вместо ø20.',
  ),
  title: shaftNotes.title,
};

export function shaft2Svg(): string {
  const X0 = 50;
  const Yc = 120;
  const X = (z: number): number => X0 + S * z;
  const segs = SHAFT2_SEGMENTS;
  const r = (i: number): number => (segs[i].d / 2) * S;
  const c = 1 * S;
  const end = 120;

  const top: [number, number][] = [
    [X(0), Yc - r(0) + c],
    [X(0) + c, Yc - r(0)],
  ];
  for (let i = 0; i < segs.length - 1; i++) top.push([X(segs[i].z1), Yc - r(i)], [X(segs[i].z1), Yc - r(i + 1)]);
  top.push([X(end) - c, Yc - r(4)], [X(end), Yc - r(4) + c]);
  const bottom = top.map(([x, y]) => [x, 2 * Yc - y] as [number, number]);
  let s = sheetStart();
  s += polyline(top) + polyline(bottom);
  s += line(X(0), Yc - r(0) + c, X(0), Yc + r(0) - c) + line(X(end), Yc - r(4) + c, X(end), Yc + r(4) - c);
  s += line(X(0) + c, Yc - r(0), X(0) + c, Yc + r(0)) + line(X(end) - c, Yc - r(4), X(end) - c, Yc + r(4));
  s += line(X(36), Yc - r(2), X(36), Yc + r(2)) + line(X(42), Yc - r(2), X(42), Yc + r(2));
  // Keyway (form B) facing the viewer.
  const k0 = X(SHAFT2_KEYWAY.z0);
  const k1 = X(SHAFT2_KEYWAY.z1);
  const kb = (KEY2.b / 2) * S;
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
  s += line(X(0) - 6, Yc, X(end) + 6, Yc, 'center');

  // Length chain above (open at the output end), overall length above it.
  const yChain = Yc - 42;
  s += hd(X(0), Yc - r(0), X(24), Yc - r(0), yChain, '24', { note: 'len24' });
  s += hd(X(24), Yc - r(1), X(36), Yc - r(2), yChain, '12', { note: 'len12' });
  s += hd(X(36), Yc - r(2), X(42), Yc - r(2), yChain, '6', { note: 'len6', outside: true });
  s += hd(X(42), Yc - r(3), X(72), Yc - r(3), yChain, '30', { note: 'len30' });
  s += hd(X(0), Yc - r(0) + c, X(end), Yc - r(4) + c, Yc - 54, '120', { note: 'len120' });

  // Keyway position and length below.
  const yKey = Yc + 40;
  s += hd(X(42), Yc + r(2), k0, Yc + kb, yKey, '2', { note: 'keypos', outside: true, at: -0.9 });
  s += hd(k0, Yc + kb, k1, Yc + kb, yKey, '14', { note: 'keypos' });

  // Diameters inside the outline.
  s += diaInside(X(12), Yc, r(0), 'ø25h9', { note: 'h9', tol: ['0', '−0,052'] });
  s += diaInside(X(30), Yc, r(1), 'ø25k6', { note: 'k6', tol: ['+0,015', '+0,002'] });
  s += diaInside(X(39), Yc, r(2), 'ø30', { note: 'd30' });
  s += diaInside(X(66), Yc, r(3), 'ø25k6', { note: 'k6', tol: ['+0,015', '+0,002'] });
  s += diaInside(X(96), Yc, r(4), 'ø25h9', { note: 'h9', tol: ['0', '−0,052'] });
  s += note('output', text(X(96), Yc + r(4) + 9, 'изходящ край', { size: 3, cls: 'label' }), { x: X(96) - 16, y: Yc + r(4) + 4, w: 32, h: 7 });

  s += leader(X(0) + 1, Yc - r(0) + 1, X(0) - 6, Yc - 34, '1×45° (2×)', 'chamfer', false);

  s += roughness(X(29), Yc + r(1), '0,8', 'ra08', true);
  s += roughness(X(63), Yc - r(3), '0,8', 'ra08');

  // Cutting plane A–A through the keyway.
  const xa = X(51);
  for (const y0 of [Yc - r(3) - 5, Yc + r(3) + 5]) {
    const y1 = y0 + (y0 < Yc ? -6 : 6);
    s += `<line class="thick" style="stroke-width:0.9" x1="${f(xa)}" y1="${f(y0)}" x2="${f(xa)}" y2="${f(y1)}"/>`;
    s += line(xa, y1, xa + 8, y1, 'thin') + arrowHead(xa + 8, y1, 0);
    s += text(xa + 10, y1 + 1.4, 'A', { size: 5, anchor: 'start' });
  }

  // Section A–A.
  const Xs = 350;
  const Ys = Yc;
  const R = 12.5 * S;
  const kd = (12.5 - KEY2.t1) * S;
  const xc = Math.sqrt(R * R - kb * kb);
  const sec = `M${f(Xs + xc)} ${f(Ys - kb)}A${R} ${R} 0 1 0 ${f(Xs + xc)} ${f(Ys + kb)}L${f(Xs + kd)} ${f(Ys + kb)}L${f(Xs + kd)} ${f(Ys - kb)}Z`;
  s += note(
    'sectionA',
    path(sec, 'hatch') + path(sec, 'thick') + text(Xs, Ys - R - 10, 'A–A', { size: 5, cls: 'title-big' }),
    { x: Xs - 14, y: Ys - R - 16, w: 28, h: 9 },
  );
  s += line(Xs - R - 4, Ys, Xs + R + 4, Ys, 'center') + line(Xs, Ys - R - 4, Xs, Ys + R + 4, 'center');
  s += vd(Xs + xc, Ys + kb, Xs + xc, Ys - kb, Xs + R + 10, '8N9', { note: 'keyway', tol: ['0', '−0,036'] });
  s += hd(Xs - R, Ys, Xs + kd, Ys + kb, Ys + R + 12, '21', { note: 'depth', tol: ['0', '−0,2'] });
  {
    const inner = line(Xs + kd + 3, Ys - kb, Xs + kd + 10, Ys - R - 6, 'thin') + roughness(Xs + kd + 10, Ys - R - 6, '3,2');
    s += note('ra32', inner, { x: Xs + kd + 4, y: Ys - R - 20, w: 26, h: 16 });
  }

  // Tolerancing: A and B on the bearing seats; runouts relative to A–B; keyway centred.
  s += datum(X(25.5), Yc + r(1) + 0.4, 'A', 'down', 5, 'datum') + datum(X(69), Yc + r(3) + 0.4, 'B', 'down', 5, 'datum');
  s += fcf(X(44), Yc - 38, 'runout', '0,02', ['A-B'], { to: [X(44) + FH / 2, Yc - r(3) - 0.6], note: 'runout' });
  s += fcf(X(92), Yc - 38, 'runout', '0,03', ['A-B'], { to: [X(92) + FH / 2, Yc - r(4) - 0.6], note: 'runout' });
  s += fcf(X(2), Yc - 38, 'runout', '0,02', ['A-B'], { from: 'right', knee: [X(36) - 5, Yc - r(1) - 2.5], to: [X(36) - 0.6, Yc - r(1) - 2.5], arrowAngle: 0, note: 'axrunout' });
  s += fcf(328, Ys + R + 20, 'sym', '0,02', ['A-B'], { from: 'top', knee: [331.8, Ys + R + 16], to: [Xs + kd + 1.2, Ys + kb + 0.4], note: 'sym' });
  s += centreHole(X(0), Yc, S, -1, null, 'centre') + centreHole(X(end), Yc, S, 1, null, 'centre');
  s += detailMark(X(36), Yc - r(1), 6, 'X', 'detail') + undercutDetail(290, 222, 8, 2.5, 'X');
  s += part3d(24, 14, 90, 40, 'shaft2', 'изглед за справка');

  s += generalRoughness(372, 236);
  s += notesBlock(26, 200, 'ТЕХНИЧЕСКИ ИЗИСКВАНИЯ', [
    { t: '1. Подобряване 220…250 HB.', key: 'heat' },
    { t: '2. Неуказани фаски 0,5×45°, радиуси R0,5.', key: 'chamfer' },
    { t: '3. Общи допуски ISO 2768-mK.', key: 'iso2768' },
    { t: '4. Сглобка с колелото: ø25 H7/k6.', key: 'fit' },
    { t: '5. Лагерни шийки: ø25 k6, лагери 6005.', key: 'bearingfit' },
    { t: '6. Центрови отвори ISO 6411-A2/4,25 в двата края.', key: 'centre' },
  ]);
  s += titleBlock(410, 287, {
    name: 'Вал 2 (изходящ)',
    material: 'Стомана C45 (EN 10083-2)',
    scale: '2:1',
    number: 'EL-SG-003',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '4/6',
    mass: '0,47 kg',
  });
  return s + sheetEnd();
}
