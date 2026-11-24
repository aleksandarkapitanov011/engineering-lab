/**
 * Technical drawings (A3, scale 2:1) of shaft 1 and the pinion, generated as SVG.
 * Every dimension / symbol with a `note` key opens an explanation in the drawing tab.
 */
import type { DrawingDef, DrawingNote } from '../../core/types';
import { gearOutline, spanMeasurement } from '../../core/involute';
import {
  arrowHead,
  circle,
  dim,
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
} from '../../ui/svgdraw';
import { G1, KEY1, M, SHAFT1_KEYWAY, SHAFT1_SEGMENTS, Z1, Z2, A } from './params';

const S = 2; // drawing scale 2:1
const n = (bg: string): { bg: string } => ({ bg });
const N = (title: string, body: string): DrawingNote => ({ title: n(title), body: n(body) });
const comma = (v: number, d = 1): string => v.toFixed(d).replace('.', ',');

/** Horizontal dimension between two points at possibly different heights, line at y = yl. */
function hd(xa: number, ya: number, xb: number, yb: number, yl: number, label: string, o: Parameters<typeof dim>[6] = {}): string {
  const s = Math.sign(yl - ya) || 1;
  const ext =
    line(xa, ya + 0.8 * s, xa, yl + 1.8 * s, 'thin') + line(xb, yb + 0.8 * Math.sign(yl - yb), xb, yl + 1.8 * Math.sign(yl - yb), 'thin');
  const d = dim(xa, yl, xb, yl, 0, label, o);
  return o.note ? d.replace('<rect class="hit"', `${ext}<rect class="hit"`) : ext + d;
}

/** Vertical dimension between two points, line at x = xl (text reads from the right). */
function vd(xa: number, ya: number, xb: number, yb: number, xl: number, label: string, o: Parameters<typeof dim>[6] = {}): string {
  const ext =
    line(xa + 0.8 * Math.sign(xl - xa), ya, xl + 1.8 * Math.sign(xl - xa), ya, 'thin') +
    line(xb + 0.8 * Math.sign(xl - xb), yb, xl + 1.8 * Math.sign(xl - xb), yb, 'thin');
  const [y1, y2] = ya > yb ? [ya, yb] : [yb, ya];
  const d = dim(xl, y1, xl, y2, 0, label, o);
  return o.note ? d.replace('<rect class="hit"', `${ext}<rect class="hit"`) : ext + d;
}

/** Diameter dimension drawn inside the outline (arrows touch the surfaces from inside). */
function diaInside(x: number, yc: number, r: number, label: string, o: Parameters<typeof dim>[6] = {}): string {
  return dim(x, yc + r, x, yc - r, 0, label, o);
}

function notesBlock(x: number, y: number, title: string, rows: { t: string; key?: string }[]): string {
  let s = text(x, y, title, { anchor: 'start', size: 3.4, cls: 'label' });
  rows.forEach((r, i) => {
    const yy = y + 6 + i * 5.2;
    const el = text(x, yy, r.t, { anchor: 'start', size: 3.1 });
    s += r.key ? note(r.key, el, { x: x - 1, y: yy - 4, w: r.t.length * 1.75 + 2, h: 5.4 }) : el;
  });
  return s;
}

function generalRoughness(x: number, y: number): string {
  const sym = roughness(x, y, '3,2');
  const paren =
    text(x + 21, y - 4, '(', { size: 7 }) +
    `<path class="thin" style="stroke-width:0.3" d="M${f(x + 24)} ${f(y - 6)}L${f(x + 25.5)} ${f(y - 3.5)}L${f(x + 28)} ${f(y - 9)}"/>` +
    text(x + 30.5, y - 4, ')', { size: 7 });
  return note('ra-general', sym + paren, { x: x - 5, y: y - 13, w: 40, h: 15 });
}

// ---------------------------------------------------------------- Shaft 1

const shaftNotes: Record<string, DrawingNote> = {
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

function shaftSvg(): string {
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
    sheet: '1/2',
    mass: '0,30 kg',
  });
  return s + sheetEnd();
}

// ---------------------------------------------------------------- Pinion

const span = spanMeasurement(M, Z1, 20);

const pinionNotes: Record<string, DrawingNote> = {
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

function pinionSvg(): string {
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

  // --- Gear data table ---
  const tx = 306;
  const ty = 16;
  const cw = [56, 16, 30];
  const rh = 6.6;
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
  const tw = cw[0] + cw[1] + cw[2];
  let tbl = `<rect class="thick" x="${tx}" y="${ty}" width="${tw}" height="${f(rh * (rows.length + 1))}"/>`;
  tbl += text(tx + tw / 2, ty + 4.6, 'ДАННИ ЗА ЗЪБНОТО КОЛЕЛО', { size: 3, cls: 'label' });
  rows.forEach((row, i) => {
    const y = ty + rh * (i + 1);
    let r = line(tx, y, tx + tw, y, 'thin');
    r += text(tx + 1.5, y + 4.6, row[0], { anchor: 'start', size: 2.7 });
    r += text(tx + cw[0] + cw[1] / 2, y + 4.6, row[1], { size: 2.9 });
    r += text(tx + cw[0] + cw[1] + 1.5, y + 4.6, row[2], { anchor: 'start', size: 2.7 });
    tbl += note(row[3], r, { x: tx, y, w: tw, h: rh });
  });
  tbl += line(tx + cw[0], ty + rh, tx + cw[0], ty + rh * (rows.length + 1), 'thin');
  tbl += line(tx + cw[0] + cw[1], ty + rh, tx + cw[0] + cw[1], ty + rh * (rows.length + 1), 'thin');
  s += tbl;

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
    sheet: '2/2',
    mass: '0,17 kg',
  });
  return s + sheetEnd();
}

export const drawings: DrawingDef[] = [
  { id: 'shaft1', title: { bg: 'Вал 1', en: 'Shaft 1' }, render: shaftSvg, notes: shaftNotes },
  { id: 'pinion', title: { bg: 'Зъбно колело z₁', en: 'Pinion z1' }, render: pinionSvg, notes: pinionNotes },
];
