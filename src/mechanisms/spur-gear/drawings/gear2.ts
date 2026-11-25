/** Drawing of the gear z2 (with web, lightening holes and hub), A3, section 2:1, end view 1:1. */
import type { DrawingNote } from '../../../core/types';
import { gearOutline, matingPhase, spanMeasurement } from '../../../core/involute';
import { circle, f, leader, line, note, path, polyline, roughness, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { S, N, comma, diaInside, generalRoughness, hd, notesBlock, vd } from './common';
import { A, G2, KEY2, M, Z1, Z2 } from '../params';
import { pinionNotes } from './pinion';

/** Same body proportions as the 3D model (parts.ts). */
export const GEAR2_BODY = (() => {
  const rimInner = G2.df / 2 - Math.max(2.5 * M, 3);
  const hubR = 20;
  const span = rimInner - hubR;
  return {
    rimInner,
    hubR,
    bore: 12.5,
    web: 6,
    holes: 6,
    holeR: Math.min(span / 2 - 2.5, 14),
    holePitchR: (rimInner + hubR) / 2,
  };
})();

const span2 = spanMeasurement(M, Z2, 20);
const B = GEAR2_BODY;

export const gear2Notes: Record<string, DrawingNote> = {
  da: N(
    'ø84 h11 – диаметър на върховете',
    'da = d + 2m = 80 + 4 = 84 mm. Полето h11 (0…−0,22) е широко, защото върховете не работят пряко, но не бива да надвишават номинала – иначе опират в петите на малкото колело.',
  ),
  rim: N(
    'ø65 – вътрешен диаметър на венеца',
    `Венецът под зъбите трябва да е поне 2,5·m дебел (тук ${comma(G2.df / 2 - B.rimInner, 1)} mm под петите). По-тънък венец се огъва под товара и зъбите се чупят в основата, дори ако самите зъби са здрави.`,
  ),
  hub: N(
    'ø40 – главина',
    'Главината е около 1,6 пъти по-голяма от отвора (25 mm). Така около шпонковия канал остава достатъчно материал, за да не се пръсне при натягане.',
  ),
  bore: N(
    'ø25 H7 (+0,021 / 0)',
    'Отворът е в системата на отвора: долно отклонение 0, квалитет 7 (21 µm за 18…30 mm). Заедно с вала k6 дава преходната сглобка H7/k6.',
  ),
  width: N(
    'Ширина b = 18 mm',
    'Голямото колело е с 2 mm по-тясно от малкото (20 mm). Така при неточен осов монтаж зъбите на по-тясното колело все пак носят по цялата си ширина.',
  ),
  web: N(
    'Диск 6 mm',
    'Дискът свързва венеца с главината. При колела над около ø80 mm плътното тяло е излишна маса: дискът е 2–3 пъти по-тънък от венеца и пак е достатъчно корав.',
  ),
  holes: N(
    `6 отвора ø${comma(2 * B.holeR, 1)} на ø${comma(2 * B.holePitchR, 1)}`,
    'Олекотяващи отвори в диска. Намаляват масата и инерционния момент на колелото, удобни са и за захващане при обработка и балансиране. Разположени са на равни ъгли, за да не се нарушава балансът.',
  ),
  hubkey: N(
    '8 JS9 (±0,018)',
    'Каналът в главината за шпонка 8×7. Симетричното поле JS9 позволява колелото да се надене на ръка, без излишна хлабина при реверс.',
  ),
  hubdepth: N(
    '28,3 (+0,2 / 0)',
    'd + t₂ = 25 + 3,3 = 28,3 mm, мерено от отсрещната образуваща на отвора до дъното на канала. Допускът е само в плюс.',
  ),
  section: N(
    'Осов разрез',
    'Разрезът минава през два от олекотяващите отвори, затова дискът е прекъснат – отворите се виждат като празнина между главината и венеца. Петовата линия (ø75) е дебела, делителната (ø80) – щрихпунктирна.',
  ),
  endview: N(
    'Изглед отстрани в мащаб 1:1',
    'Колелото е голямо, затова изгледът е в по-малък мащаб от разреза. Мащабът се изписва до изгледа, когато се различава от основния в надписа.',
  ),
  ra08: pinionNotes.ra08,
  ra16: N('Ra 1,6 в отвора', 'Отворът H7 се разстъргва или райберова до Ra 1,6 µm, за да се получи предвидената сглобка.'),
  ra32: N('Ra 3,2 – чела на главината', 'Челото на главината опира в рамото на вала. Ra 3,2 µm и перпендикулярност към отвора осигуряват колелото да не се „клати“.'),
  'ra-general': N(
    'Ra 6,3 (√) – обща грапавост',
    'Неработните повърхнини – дискът, отворите, вътрешността на венеца – могат да са по-грапави: Ra 6,3 µm. Работните повърхнини са означени отделно.',
  ),
  chamfer: pinionNotes.chamfer,
  radii: N(
    'Неуказани радиуси R2',
    'Преходите между диска, венеца и главината се закръглят. Острите вътрешни ъгли са концентратори на напрежения, а при изковки и отливки и източник на пукнатини.',
  ),
  m: pinionNotes.m,
  z: N('Брой зъби z = 40', 'Двойно повече от малкото колело: предавателното число е u = 40/20 = 2. С 40 зъба няма опасност от подрязване.'),
  alpha: pinionNotes.alpha,
  x: N('Коефициент на изместване x = 0', 'Без изместване. Сумата x₁ + x₂ = 0 запазва стандартното междуосие a = 60 mm.'),
  d: N('Делителен диаметър d = 80 mm', 'd = m·z = 2·40 = 80 mm. Двете делителни окръжности (40 и 80 mm) се допират в полюса P.'),
  da2: N('Диаметър на върховете da = 84 mm', 'da = d + 2m = 84 mm.'),
  df: N('Диаметър на петите df = 75 mm', 'df = d − 2,5m = 80 − 5 = 75 mm.'),
  grade: N(
    'Степен на точност 8',
    'Голямото колело от подобрена стомана е по-мек и обикновено се обработва с една степен по-грубо от закаленото малко колело. При тази скорост (под 5 m/s) степен 8 е напълно достатъчна.',
  ),
  W: N(
    `Размер през ${span2.k} зъба W = ${comma(span2.W, 2)}`,
    `W = m·cos α·[π(k − 0,5) + z·inv α] = ${comma(span2.W, 3)} mm при k = ${span2.k}. Отрицателните отклонения изтъняват зъбите и дават страничната хлабина.`,
  ),
  mate: N('Спрегнато колело z₁ = 20', 'Малкото, задвижващото колело на вал 1 – чертеж EL-SG-002.'),
  a: pinionNotes.a,
  heat: N(
    'Подобряване 240…280 HB',
    'Закаляване и високо отвръщане. Голямото колело остава по-меко от закаленото малко колело – двойката се разработва и не се задира.',
  ),
  fit: N('Сглобка с вала: ø25 H7/k6', 'Виж чертежа на вал 2 (EL-SG-003).'),
  iso2768: pinionNotes.iso2768,
  title: pinionNotes.title,
};

export function gear2Svg(): string {
  const Xm = 92;
  const Ym = 130;
  const ra = (G2.da / 2) * S;
  const rp = (G2.d / 2) * S;
  const rf = (G2.df / 2) * S;
  const rri = B.rimInner * S;
  const rh = B.hubR * S;
  const rb = B.bore * S;
  const kTop = (B.bore + KEY2.t2) * S;
  const kb = (KEY2.b / 2) * S;
  const kEdge = Math.sqrt(rb * rb - kb * kb);
  const w = 18 * S;
  const ww = (B.web / 2) * S;
  const hIn = (B.holePitchR - B.holeR) * S; // hole edges in the section plane
  const hOut = (B.holePitchR + B.holeR) * S;
  const x0 = Xm - w / 2;
  const x1 = Xm + w / 2;
  const c = 1 * S;

  let s = sheetStart();
  // --- Axial section (2:1) through two lightening holes ---
  const half = (sg: 1 | -1): string => {
    const y = (r: number): number => Ym - sg * r;
    const inner = sg === 1 ? kTop : rb;
    const hubWeb: [number, number][] =
      sg === 1
        ? [
            [x0, y(inner)],
            [x0, y(rh)],
            [Xm - ww, y(rh)],
            [Xm - ww, y(hIn)],
            [Xm + ww, y(hIn)],
            [Xm + ww, y(rh)],
            [x1, y(rh)],
            [x1, y(inner)],
          ]
        : [
            [x0, y(rb + c)],
            [x0, y(rh)],
            [Xm - ww, y(rh)],
            [Xm - ww, y(hIn)],
            [Xm + ww, y(hIn)],
            [Xm + ww, y(rh)],
            [x1, y(rh)],
            [x1, y(rb + c)],
            [x1 - c, y(rb)],
            [x0 + c, y(rb)],
          ];
    const rimWeb: [number, number][] = [
      [Xm - ww, y(hOut)],
      [Xm - ww, y(rri)],
      [x0, y(rri)],
      [x0, y(ra - c)],
      [x0 + c, y(ra)],
      [x1 - c, y(ra)],
      [x1, y(ra - c)],
      [x1, y(rri)],
      [Xm + ww, y(rri)],
      [Xm + ww, y(hOut)],
    ];
    const pd = (pts: [number, number][]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
    return (
      path(pd(hubWeb), 'hatch') +
      path(pd(rimWeb), 'hatch') +
      polyline(hubWeb, 'thick', true) +
      polyline(rimWeb, 'thick', true) +
      line(x0, y(rf), x1, y(rf))
    );
  };
  let sec = half(1) + half(-1);
  // Edges seen through the bore (keyway side and the bore chamfers).
  sec += line(x0, Ym - kEdge, x1, Ym - kEdge) + line(x0 + c, Ym - kEdge, x0 + c, Ym + rb) + line(x1 - c, Ym - kEdge, x1 - c, Ym + rb);
  s += note('section', sec, { x: x0, y: Ym - ra, w, h: rri * 2 - 2 * rh });
  s += line(x0 - 5, Ym - rp, x1 + 12, Ym - rp, 'center') + line(x0 - 5, Ym + rp, x1 + 5, Ym + rp, 'center');
  s += line(x0 - 8, Ym, x1 + 8, Ym, 'center');
  s += text(Xm, Ym - ra - 22, 'Осов разрез', { size: 3.4, cls: 'label' });

  s += vd(x0 + c, Ym + ra, x0 + c, Ym - ra, x0 - 16, 'ø84h11', { note: 'da', tol: ['0', '−0,220'] });
  s += vd(x1, Ym + rb, x1, Ym - rb, x1 + 12, 'ø25H7', { note: 'bore', tol: ['+0,021', '0'] });
  s += vd(x1, Ym + rh, x1, Ym - rh, x1 + 26, 'ø40', { note: 'hub' });
  s += vd(Xm + ww, Ym + rri, Xm + ww, Ym - rri, x1 + 40, 'ø65', { note: 'rim' });
  s += hd(x0, Ym + ra - c, x1, Ym + ra - c, Ym + ra + 12, '18', { note: 'width' });
  s += hd(Xm - ww, Ym + hIn, Xm + ww, Ym + hIn, Ym + (hIn + hOut) / 2, '6', { note: 'web', outside: true });
  s += leader(x0 + 0.7, Ym - ra + 0.7, x0 - 10, Ym - ra - 10, '1×45° (4×)', 'chamfer', false);
  s += leader(Xm - ww - 0.3, Ym - rri + 0.3, x0 - 3, Ym - (hIn + hOut) / 2, 'R2', 'radii', false);
  s += roughness(x1 + 8, Ym - rp, '0,8', 'ra08');
  s += roughness(Xm - 4, Ym + rb, '1,6', 'ra16');
  s += roughness(x1 + 2, Ym + rh + 9, '3,2', 'ra32', true);

  // --- End view (1:1) with the real tooth profile ---
  const Xe = 228;
  const Ye = Ym;
  const outline = gearOutline({ m: M, z: Z2, phase: matingPhase(Z2) + Math.PI / 2 });
  const gp = outline.map(([x, y], i) => `${i ? 'L' : 'M'}${f(Xe + x)} ${f(Ye - y)}`).join('') + 'Z';
  let ev = path(gp, 'thick');
  ev += circle(Xe, Ye, G2.d / 2, 'center') + circle(Xe, Ye, G2.df / 2, 'thin');
  ev += circle(Xe, Ye, B.rimInner) + circle(Xe, Ye, B.hubR);
  ev += circle(Xe, Ye, B.holePitchR, 'center');
  for (let i = 0; i < B.holes; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / B.holes;
    ev += circle(Xe + B.holePitchR * Math.cos(a), Ye - B.holePitchR * Math.sin(a), B.holeR);
  }
  const r1 = B.bore;
  const kb1 = KEY2.b / 2;
  const kT1 = B.bore + KEY2.t2;
  const kE1 = Math.sqrt(r1 * r1 - kb1 * kb1);
  ev += path(
    `M${f(Xe - kb1)} ${f(Ye - kE1)}L${f(Xe - kb1)} ${f(Ye - kT1)}L${f(Xe + kb1)} ${f(Ye - kT1)}L${f(Xe + kb1)} ${f(Ye - kE1)}A${r1} ${r1} 0 1 1 ${f(Xe - kb1)} ${f(Ye - kE1)}Z`,
    'thick',
  );
  s += note('endview', ev, { x: Xe - 16, y: Ye + G2.da / 2 + 3, w: 32, h: 10 });
  s += line(Xe - G2.da / 2 - 5, Ye, Xe + G2.da / 2 + 5, Ye, 'center') + line(Xe, Ye - G2.da / 2 - 5, Xe, Ye + G2.da / 2 + 5, 'center');
  s += text(Xe, Ye - G2.da / 2 - 14, 'Изглед отстрани (1:1)', { size: 3.4, cls: 'label' });
  const hx = Xe + B.holePitchR * Math.cos(Math.PI / 2 - Math.PI / 3);
  const hy = Ye - B.holePitchR * Math.sin(Math.PI / 2 - Math.PI / 3);
  s += leader(hx + B.holeR * 0.7, hy - B.holeR * 0.7, Xe + 34, Ye - 52, `6× ø${comma(2 * B.holeR, 1)} на ø${comma(2 * B.holePitchR, 1)}`, 'holes');
  s += leader(Xe + kb1, Ye - kT1 + 0.4, Xe + 22, Ye - 62, '8JS9 (±0,018)', 'hubkey');
  s += diaInside(Xe + 2.2, Ye - (kT1 - r1) / 2, (kT1 + r1) / 2, '28,3', { note: 'hubdepth', tol: ['+0,2', '0'], size: 2.6 });

  // --- Gear data table ---
  const tx = 306;
  const ty = 16;
  const cw = [56, 16, 30];
  const rh7 = 6.6;
  const rows: [string, string, string, string][] = [
    ['Модул', 'm', '2', 'm'],
    ['Брой зъби', 'z', String(Z2), 'z'],
    ['Ъгъл на профила', 'α', '20°', 'alpha'],
    ['Коеф. на изместване', 'x', '0', 'x'],
    ['Делителен диаметър', 'd', comma(G2.d, 0), 'd'],
    ['Диаметър на върховете', 'da', '84 h11', 'da2'],
    ['Диаметър на петите', 'df', comma(G2.df, 0), 'df'],
    ['Степен на точност', '—', '8 (ISO 1328)', 'grade'],
    [`Размер през ${span2.k} зъба`, `W${span2.k}`, `${comma(span2.W, 2)} −0,05/−0,10`, 'W'],
    ['Спрегнато колело', 'z₁', String(Z1), 'mate'],
    ['Междуосие', 'a', `${A} ± 0,03`, 'a'],
  ];
  const tw = cw[0] + cw[1] + cw[2];
  let tbl = `<rect class="thick" x="${tx}" y="${ty}" width="${tw}" height="${f(rh7 * (rows.length + 1))}"/>`;
  tbl += text(tx + tw / 2, ty + 4.6, 'ДАННИ ЗА ЗЪБНОТО КОЛЕЛО', { size: 3, cls: 'label' });
  rows.forEach((row, i) => {
    const y = ty + rh7 * (i + 1);
    let r = line(tx, y, tx + tw, y, 'thin');
    r += text(tx + 1.5, y + 4.6, row[0], { anchor: 'start', size: 2.7 });
    r += text(tx + cw[0] + cw[1] / 2, y + 4.6, row[1], { size: 2.9 });
    r += text(tx + cw[0] + cw[1] + 1.5, y + 4.6, row[2], { anchor: 'start', size: 2.7 });
    tbl += note(row[3], r, { x: tx, y, w: tw, h: rh7 });
  });
  tbl += line(tx + cw[0], ty + rh7, tx + cw[0], ty + rh7 * (rows.length + 1), 'thin');
  tbl += line(tx + cw[0] + cw[1], ty + rh7, tx + cw[0] + cw[1], ty + rh7 * (rows.length + 1), 'thin');
  s += tbl;

  s += generalRoughness(372, 236).replace('Ra 3,2', 'Ra 6,3');
  s += notesBlock(26, 238, 'ТЕХНИЧЕСКИ ИЗИСКВАНИЯ', [
    { t: '1. Подобряване 240…280 HB.', key: 'heat' },
    { t: '2. Неуказани радиуси R2, фаски 0,5×45°.', key: 'radii' },
    { t: '3. Общи допуски ISO 2768-mK.', key: 'iso2768' },
    { t: '4. Сглобка с вала: ø25 H7/k6.', key: 'fit' },
  ]);
  s += titleBlock(410, 287, {
    name: 'Зъбно колело z = 40',
    material: 'Стомана C45 (EN 10083-2)',
    scale: '2:1 (1:1)',
    number: 'EL-SG-004',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '5/6',
    mass: '0,43 kg',
  });
  return s + sheetEnd();
}
