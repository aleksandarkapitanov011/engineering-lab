/** Drawing of the pinion z1. */
import type { DrawingNote } from '../../../core/types';
import { gearOutline, spanMeasurement } from '../../../core/involute';
import { part3d } from '../../../ui/svgdraw';
import {
  circle,
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
import { S, N, accuracyRows, comma, diaInside, gearTable, generalRoughness, hd, notesBlock, vd } from './common';
import { datum, fcf, FH, iso1328 } from '../../../ui/gdt';
import { A, G1, KEY1, M, Z1, Z2 } from '../params';
import { shaftNotes } from './shaft1';

// ---------------------------------------------------------------- Pinion

const span = spanMeasurement(M, Z1, 20);

export const pinionNotes: Record<string, DrawingNote> = {
  da: N(
    'ø44 h11 – диаметър на върховете',
    'da = d + 2m = 40 + 4 = 44 mm. Широкият допуск h11 (0…−0,16) е достатъчен, защото върховете не участват пряко в зацепването, но не бива да надвишават номинала, за да няма опиране в петите на другото колело.',
  ),
  bore: N(
    'ø20 H7 (+0,021 / 0)',
    'Отворът е в основно отклонение H (долно отклонение 0) и квалитет 7. Заедно с вала k6 дава преходната сглобка H7/k6 – стандартен избор за колела с шпонка.',
  ),
  width: N(
    'Ширина b = 20 mm',
    'Ширината на венеца. Малкото колело се прави с 1–2 mm по-широко от голямото (18 mm), за да се компенсират осеви неточности при монтажа и зъбите да носят по цялата ширина на по-тясното колело.',
  ),
  hubkey: N(
    '6 JS9 (±0,015)',
    'Ширината на канала в главината. Симетричното поле JS9 дава нормална сглобка на шпонката с главината – колелото се монтира без пресоване, но без излишна хлабина.',
  ),
  hubdepth: N(
    '22,8 (+0,1 / 0)',
    'Размерът е d + t₂ = 20 + 2,8 = 22,8 mm, мерен от отсрещната образуваща на отвора до дъното на канала. Допускът е само в плюс – каналът може да е малко по-дълбок, но не по-плитък, иначе шпонката опира.',
  ),
  ra08: N(
    'Ra 0,8 върху делителната линия',
    'Знак за грапавост върху делителната линия се отнася за работните (страничните) повърхнини на зъбите. Ra 0,8 µm е типично за степен на точност 7 след шлифоване или шевинговане.',
  ),
  ra16: N('Ra 1,6 в отвора', 'Отворът H7 се обработва чисто – разстъргване или райберане до Ra 1,6 µm, за да се получи предвидената сглобка.'),
  'ra-general': N(
    'Ra 3,2 (√) – обща грапавост',
    'Всички неозначени повърхнини (челата, фаските) са с Ra 3,2 µm. Символът в скоби означава „освен означените на чертежа“.',
  ),
  chamfer: N(
    'Фаски 1×45°',
    'Фаските по върховете премахват острите ръбове на зъбите, които иначе се отчупват при закаляване. Фаските в отвора улесняват надяването на колелото върху вала.',
  ),
  section: N(
    'Осов разрез',
    'Колелото е показано в разрез по оста. По конвенция (ISO 2203) върховата и петовата линия се чертаят дебело, а делителната – с тънка щрихпунктирна линия, която излиза извън контура.',
  ),
  endview: N(
    'Изглед отстрани',
    'Показва реалния еволвентен профил на зъбите, делителната окръжност (щрихпунктирна) и канала за шпонката в отвора. На производствени чертежи зъбите обикновено не се рисуват – достатъчни са окръжностите.',
  ),
  m: N(
    'Модул m = 2 mm',
    'Основният размер на зъба: m = p/π, където p е стъпката по делителната окръжност. Височината на зъба е 2,25·m = 4,5 mm. Модулите са стандартизирани (ISO 54): 1; 1,25; 1,5; 2; 2,5; 3…',
  ),
  z: N(
    'Брой зъби z = 20',
    'Над теоретичния минимум 17 зъба за α = 20° и x = 0, затова зъбите нямат подрязване. Заедно с модула определя делителния диаметър d = m·z = 40 mm.',
  ),
  alpha: N(
    'Ъгъл на профила α = 20°',
    'Ъгълът на изходния контур (зъбната рейка) по ISO 53. По-голям ъгъл дава по-дебел в основата и по-здрав зъб, но и по-голяма радиална сила върху лагерите.',
  ),
  x: N(
    'Коефициент на изместване x = 0',
    'Колелото е нарязано без изместване на инструмента. Тогава междуосието е точно a = m(z₁ + z₂)/2 = 60 mm.',
  ),
  d: N('Делителен диаметър d = 40 mm', 'd = m·z = 2·20 = 40 mm. Върху делителната окръжност дебелината на зъба е равна на ширината на междузъбието: πm/2 = 3,14 mm.'),
  da2: N('Диаметър на върховете da = 44 mm', 'da = d + 2m(1 + x) = 40 + 4 = 44 mm. Височината на главата на зъба е равна на модула.'),
  df: N(
    'Диаметър на петите df = 35 mm',
    'df = d − 2·1,25m = 40 − 5 = 35 mm. Допълнителните 0,25m образуват радиалната хлабина – място за върха на спрегнатия зъб и за мазането.',
  ),
  grade: N(
    'Степен на точност 7',
    'По ISO 1328-1 степените са от 0 (най-точна) до 12. Степен 7 е обичайна за общото машиностроене и периферни скорости до около 10–15 m/s.',
  ),
  W: N(
    `Размер през ${span.k} зъба W = ${comma(span.W, 2)}`,
    `Измерва се с микрометър с дискови накрайници през k = ${span.k} зъба. W = m·cos α·[π(k − 0,5) + z·inv α] = ${comma(span.W, 3)} mm. Отрицателните отклонения изтъняват зъбите и осигуряват страничната хлабина в предавката.`,
  ),
  mate: N(
    'Спрегнато колело z₂ = 40',
    'Указва с кое колело работи детайлът. Предавателното число е u = z₂/z₁ = 40/20 = 2.',
  ),
  a: N(
    'Междуосие a = 60 ± 0,03',
    'a = m(z₁ + z₂)/2 = 2·(20 + 40)/2 = 60 mm. По-голямо междуосие увеличава хлабината и намалява коефициента на препокриване, по-малкото води до заклинване.',
  ),
  heat: N(
    'Закаляване СВЧ 48…52 HRC',
    'Повърхностно закаляване с ток с висока честота: зъбите стават твърди и устойчиви на износване и питинг, а сърцевината остава жилава и понася ударни натоварвания.',
  ),
  fit: shaftNotes.fit,
  iso2768: shaftNotes.iso2768,
  title: shaftNotes.title,
};

export function pinionSvg(): string {
  const Xm = 112;
  const Ym = 130;
  const ra = (G1.da / 2) * S;
  const rp = (G1.d / 2) * S;
  const rf = (G1.df / 2) * S;
  const rb = 10 * S; // bore radius
  const kTop = (10 + KEY1.t2) * S; // keyway bottom from axis
  const kb = (KEY1.b / 2) * S;
  const kEdge = Math.sqrt(rb * rb - kb * kb);
  const w = 20 * S;
  const x0 = Xm - w / 2;
  const x1 = Xm + w / 2;
  const c = 1 * S;

  let s = sheetStart();
  // --- Main view: full axial section ---
  const topPoly: [number, number][] = [
    [x0, Ym - kTop],
    [x0, Ym - ra + c],
    [x0 + c, Ym - ra],
    [x1 - c, Ym - ra],
    [x1, Ym - ra + c],
    [x1, Ym - kTop],
  ];
  const botPoly: [number, number][] = [
    [x0, Ym + rb + c],
    [x0, Ym + ra - c],
    [x0 + c, Ym + ra],
    [x1 - c, Ym + ra],
    [x1, Ym + ra - c],
    [x1, Ym + rb + c],
    [x1 - c, Ym + rb],
    [x0 + c, Ym + rb],
  ];
  const pd = (pts: [number, number][]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
  let sec = path(pd(topPoly), 'hatch') + path(pd(botPoly), 'hatch');
  sec += polyline(topPoly, 'thick', true) + polyline(botPoly, 'thick', true);
  // Root lines (thick in section), visible edges seen through the bore.
  sec += line(x0, Ym - rf, x1, Ym - rf) + line(x0, Ym + rf, x1, Ym + rf);
  sec += line(x0, Ym - kEdge, x1, Ym - kEdge) + line(x0 + c, Ym - kEdge, x0 + c, Ym + rb) + line(x1 - c, Ym - kEdge, x1 - c, Ym + rb);
  s += note('section', sec, { x: x0, y: Ym - ra, w, h: 2 * ra });
  // Pitch lines and axis.
  s += line(x0 - 5, Ym - rp, x1 + 12, Ym - rp, 'center') + line(x0 - 5, Ym + rp, x1 + 5, Ym + rp, 'center');
  s += line(x0 - 8, Ym, x1 + 8, Ym, 'center');

  s += vd(x0 + c, Ym + ra, x0 + c, Ym - ra, x0 - 16, 'ø44h11', { note: 'da', tol: ['0', '−0,160'] });
  s += vd(x1, Ym + rb, x1, Ym - rb, x1 + 18, 'ø20H7', { note: 'bore', tol: ['+0,021', '0'] });
  s += hd(x0, Ym + ra - c, x1, Ym + ra - c, Ym + ra + 12, '20', { note: 'width' });
  s += leader(x0 + 0.7, Ym - ra + 0.7, x0 - 10, Ym - ra - 10, '1×45° (4×)', 'chamfer', false);
  s += roughness(x1 + 8, Ym - rp, '0,8', 'ra08');
  s += roughness(Xm, Ym + rb, '1,6', 'ra16');
  s += text(Xm, Ym - ra - 22, 'Осов разрез', { size: 3.4, cls: 'label' });

  // --- End view with the real involute profile ---
  const Xe = 252;
  const Ye = Ym;
  const outline = gearOutline({ m: M, z: Z1, phase: Math.PI / 2 + Math.PI / Z1, flankSegments: 10 });
  const gp = outline.map(([x, y], i) => `${i ? 'L' : 'M'}${f(Xe + x * S)} ${f(Ye - y * S)}`).join('') + 'Z';
  let ev = path(gp, 'thick');
  ev += circle(Xe, Ye, rp, 'center') + circle(Xe, Ye, rf, 'thin');
  const bore = `M${f(Xe - kb)} ${f(Ye - kEdge)}L${f(Xe - kb)} ${f(Ye - kTop)}L${f(Xe + kb)} ${f(Ye - kTop)}L${f(Xe + kb)} ${f(Ye - kEdge)}A${rb} ${rb} 0 1 1 ${f(Xe - kb)} ${f(Ye - kEdge)}Z`;
  ev += path(bore, 'thick');
  s += note('endview', ev, { x: Xe - 30, y: Ye + 22, w: 60, h: 20 });
  s += line(Xe - ra - 6, Ye, Xe + ra + 6, Ye, 'center') + line(Xe, Ye - ra - 6, Xe, Ye + ra + 6, 'center');
  s += hd(Xe - kb, Ye - kTop, Xe + kb, Ye - kTop, Ye - ra - 10, '6JS9', { note: 'hubkey', tol: ['+0,015', '−0,015'], outside: true });
  s += diaInside(Xe + 3, Ye - (kTop - rb) / 2, (kTop + rb) / 2, '22,8', { note: 'hubdepth', tol: ['+0,1', '0'], size: 3 });
  s += text(Xe, Ye - ra - 22, 'Изглед отстрани', { size: 3.4, cls: 'label' });

  // --- Gear data table (with the accuracy tolerances of ISO 1328) ---
  const rows: [string, string, string, string][] = [
    ['Модул', 'm', '2', 'm'],
    ['Брой зъби', 'z', String(Z1), 'z'],
    ['Ъгъл на профила', 'α', '20°', 'alpha'],
    ['Коеф. на изместване', 'x', '0', 'x'],
    ['Делителен диаметър', 'd', comma(G1.d, 0), 'd'],
    ['Диаметър на върховете', 'da', '44 h11', 'da2'],
    ['Диаметър на петите', 'df', comma(G1.df, 0), 'df'],
    ['Степен на точност', '—', '7 (ISO 1328)', 'grade'],
    [`Размер през ${span.k} зъба`, `W${span.k}`, `${comma(span.W, 2)} −0,04/−0,08`, 'W'],
    ['Спрегнато колело', 'z₂', String(Z2), 'mate'],
    ['Междуосие', 'a', `${A} ± 0,03`, 'a'],
  ];
  s += gearTable(306, 16, [...rows, ...accuracyRows(7, M, G1.d, 20)]);

  // Tolerancing: the bore is datum A.
  {
    const Fr = iso1328(7, M, G1.d, 20).Fr;
    s += datum(x1 + 18, Ym + rb + 0.4, 'A', 'down', 12, 'bore');
    s += fcf(Xe - FH / 2, Ye + ra + 8, 'runout', comma(Fr / 1000, 3), ['A'], { from: 'top', to: [Xe, Ye + ra + 0.6], note: 'runout' });
    s += fcf(24, Ym + 30, 'runout', '0,02', ['A'], { from: 'right', to: [x0 - 0.6, Ym + 30 + FH / 2], arrowAngle: 0, note: 'axrunout' });
    s += fcf(Xe + kb + 16, Ye - ra - 13.8, 'sym', '0,02', ['A'], { note: 'sym' }) + line(Xe + kb + 8.5, Ye - ra - 10, Xe + kb + 16, Ye - ra - 10, 'thin');
    s += part3d(306, 134, 102, 56, 'pinion', 'изглед за справка');
  }

  s += generalRoughness(372, 236);
  s += notesBlock(26, 206, 'ТЕХНИЧЕСКИ ИЗИСКВАНИЯ', [
    { t: '1. Зъби: закаляване СВЧ 48…52 HRC.', key: 'heat' },
    { t: '2. Неуказани фаски 0,5×45°.', key: 'chamfer' },
    { t: '3. Общи допуски ISO 2768-mK.', key: 'iso2768' },
    { t: '4. Сглобка с вала: ø20 H7/k6.', key: 'fit' },
  ]);
  s += titleBlock(410, 287, {
    name: 'Зъбно колело z = 20',
    material: 'Стомана 40Cr (41Cr4, EN 10083-3)',
    scale: '2:1',
    number: 'EL-SG-002',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '3/6',
    mass: '0,17 kg',
  });
  return s + sheetEnd();
}
