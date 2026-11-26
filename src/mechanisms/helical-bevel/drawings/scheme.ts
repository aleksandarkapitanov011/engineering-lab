/**
 * Drawing of the helical-bevel gearbox: kinematic diagram (ISO 3952 symbols), data of the four gears and
 * the ratio calculation. Text is passed already in the current language.
 */
import type { DrawingDef, DrawingNote, LText } from '../../../core/types';
import { lt } from '../../../i18n';
import { arrowHead, f, line, note, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { BB, BETA, D1, D2, DE3, DE4, DELTA3, DELTA4, I1, I2, I_TOTAL, MB, MN, RE, Z1, Z2, Z3, Z4, A1 } from '../params';

const L = (bg: string, en: string): LText => ({ bg, en });
const N = (title: LText, body: LText): DrawingNote => ({ title, body });
const num = (v: number, d = 2): string => lt({ bg: v.toFixed(d).replace('.', ','), en: v.toFixed(d) });
const dg = (r: number): string => num((r * 180) / Math.PI, 2);

export const schemeNotes: Record<string, DrawingNote> = {
  scheme: N(
    L('Кинематична схема', 'Kinematic diagram'),
    L(
      'Опростено изображение по ISO 3952: валовете са линии, цилиндричните колела – правоъгълници, коничните – трапци, лагерите – знак „□“ върху стойка. Показва как се предава движението, без формата на детайлите.',
      'A simplified representation to ISO 3952: shafts are lines, spur and helical gears rectangles, bevel gears trapezoids, bearings a “□” on a support. It shows how motion is transmitted, without the shapes of the parts.',
    ),
  ),
  helical: N(
    L('Косозъбо стъпало', 'Helical stage'),
    L(
      `Наклонените линии в правоъгълниците означават коси зъби; двете колела са с противоположен наклон. i₁ = z₂/z₁ = ${Z2}/${Z1} = ${num(I1, 0)}.`,
      `The slanted lines in the rectangles mean helical teeth; the two gears have opposite hands. i₁ = z₂/z₁ = ${Z2}/${Z1} = ${num(I1, 0)}.`,
    ),
  ),
  bevel: N(
    L('Конично стъпало', 'Bevel stage'),
    L(
      `Трапците са коничните колела, а пресечната точка на осите е общият връх на конусите. i₂ = z₄/z₃ = ${Z4}/${Z3} = ${num(I2, 0)}.`,
      `The trapezoids are the bevel gears; the intersection of the axes is the common apex of the cones. i₂ = z₄/z₃ = ${Z4}/${Z3} = ${num(I2, 0)}.`,
    ),
  ),
  table: N(
    L('Данни за колелата', 'Gear data'),
    L(
      'Косозъбите колела се задават с нормален модул mₙ и ъгъл β, коничните – с модула и диаметъра на външния край, ъгъла на делителния конус δ и конусното разстояние Rₑ.',
      'Helical gears are specified by the normal module mₙ and the angle β; bevel gears by the module and diameter at the outer end, the pitch cone angle δ and the cone distance Rₑ.',
    ),
  ),
  ratio: N(
    L('Предавателно отношение', 'Gear ratio'),
    L(
      `Отношенията на стъпалата се умножават: i = i₁·i₂ = ${num(I1, 0)}·${num(I2, 0)} = ${num(I_TOTAL, 0)}. При n₁ = 1500 min⁻¹ изходът се върти с 250 min⁻¹.`,
      `The stage ratios multiply: i = i₁·i₂ = ${num(I1, 0)}·${num(I2, 0)} = ${num(I_TOTAL, 0)}. With n₁ = 1500 rpm the output turns at 250 rpm.`,
    ),
  ),
  title: N(
    L('Основен надпис', 'Title block'),
    L('Наименование, номер на чертежа, мащаб и автор, по ISO 7200.', 'Name, drawing number, scale and author, to ISO 7200.'),
  ),
};

function schemeSvg(): string {
  let s = sheetStart();
  const T = (x: number, y: number, t: LText, o: Parameters<typeof text>[3] = {}): string => text(x, y, lt(t), o);
  // --- Kinematic diagram ---
  let k = '';
  const y1 = 70; // input shaft
  const y2 = 130; // intermediate shaft
  const xb = 250; // bevel apex x
  k += line(30, y1, 170, y1) + line(90, y2, xb, y2);
  k += line(xb, y2 + 6, xb, 218); // output shaft (drawn downwards)
  const gearRect = (x: number, yc: number, h: number, hand: 1 | -1): string => {
    let o = `<rect class="thick" x="${f(x - 4)}" y="${f(yc - h)}" width="8" height="${f(2 * h)}" style="fill:#f7f5ef"/>`;
    for (let i = -h + 6; i < h - 2; i += 8) o += line(x - 4, yc + i, x + 4, yc + i - 5 * hand, 'thin');
    return o;
  };
  k += gearRect(130, y1, 14, 1) + gearRect(130, y2, 44, -1);
  // Bevel pinion on shaft 2 (pointing to the apex), bevel gear on shaft 3.
  k += `<path class="thick" style="fill:#f7f5ef" d="M${xb - 26} ${y2 - 12}L${xb - 12} ${y2 - 6}L${xb - 12} ${y2 + 6}L${xb - 26} ${y2 + 12}Z"/>`;
  k += `<path class="thick" style="fill:#f7f5ef" d="M${xb - 24} ${y2 + 26}L${xb + 24} ${y2 + 26}L${xb + 12} ${y2 + 12}L${xb - 12} ${y2 + 12}Z"/>`;
  const support = (x: number, y: number): string =>
    `<rect class="thick" x="${x - 4}" y="${y - 4}" width="8" height="8" style="fill:#f7f5ef"/>` +
    line(x, y + 4, x, y + 12, 'thin') +
    line(x - 7, y + 12, x + 7, y + 12) +
    [0, 1, 2, 3].map((i) => line(x - 6 + i * 4, y + 12, x - 9 + i * 4, y + 16, 'thin')).join('');
  k += support(70, y1) + support(170, y1) + support(100, y2) + support(200, y2);
  k += support(xb, 172) + support(xb, 200);
  k += line(22, y1, 40, y1, 'thin') + arrowHead(46, y1, 0, 3);
  k += T(24, y1 - 5, L('n₁', 'n₁'), { size: 4, anchor: 'start' });
  k += line(xb, 220, xb, 230, 'thin') + arrowHead(xb, 236, Math.PI / 2, 3);
  k += T(xb + 4, 236, L('n₃', 'n₃'), { size: 4, anchor: 'start' });
  k += T(144, y1 - 16, L(`z₁ = ${Z1}`, `z₁ = ${Z1}`), { size: 3.4, anchor: 'start' });
  k += T(144, y2 + 50, L(`z₂ = ${Z2}`, `z₂ = ${Z2}`), { size: 3.4, anchor: 'start' });
  k += T(xb - 46, y2 - 16, L(`z₃ = ${Z3}`, `z₃ = ${Z3}`), { size: 3.4, anchor: 'start' });
  k += T(xb + 28, y2 + 24, L(`z₄ = ${Z4}`, `z₄ = ${Z4}`), { size: 3.4, anchor: 'start' });
  s += note('scheme', k + T(150, 30, L('КИНЕМАТИЧНА СХЕМА', 'KINEMATIC DIAGRAM'), { size: 4, cls: 'label' }), { x: 140, y: 24, w: 60, h: 8 });
  s += note('helical', T(130, y2 + 62, L('стъпало 1: косозъбо', 'stage 1: helical'), { size: 3.4, cls: 'label' }), { x: 100, y: y2 + 56, w: 60, h: 8 });
  s += note('bevel', T(xb + 4, y2 - 26, L('стъпало 2: конично', 'stage 2: bevel'), { size: 3.4, cls: 'label' }), { x: xb - 26, y: y2 - 32, w: 60, h: 8 });

  // --- Gear data table ---
  const tx = 290;
  const ty = 24;
  const cw = [44, 20, 20, 20, 20];
  const rh = 6.6;
  const W = cw.reduce((a, b) => a + b, 0);
  const rows: [LText, string, string, string, string][] = [
    [L('Колело', 'Gear'), 'z₁', 'z₂', 'z₃', 'z₄'],
    [L('Брой зъби z', 'Teeth z'), `${Z1}`, `${Z2}`, `${Z3}`, `${Z4}`],
    [L('Модул, mm', 'Module, mm'), `mₙ ${num(MN, 0)}`, `mₙ ${num(MN, 0)}`, `mₑ ${num(MB, 1)}`, `mₑ ${num(MB, 1)}`],
    [L('Наклон β', 'Helix β'), `${dg(BETA)}°`, `${dg(BETA)}°`, '0°', '0°'],
    [L('Посока на наклона', 'Hand'), lt(L('дясна', 'right')), lt(L('лява', 'left')), '—', '—'],
    [L('Делит. диаметър, mm', 'Pitch dia., mm'), num(D1, 1), num(D2, 1), num(DE3, 1), num(DE4, 1)],
    [L('Ъгъл на конуса δ', 'Cone angle δ'), '—', '—', `${dg(DELTA3)}°`, `${dg(DELTA4)}°`],
    [L('Ширина b, mm', 'Width b, mm'), '24', '22', `${BB}`, `${BB}`],
    [L('Междуосие / Rₑ, mm', 'Centre dist. / Rₑ, mm'), `a = ${A1}`, `a = ${A1}`, `Rₑ ${num(RE, 1)}`, `Rₑ ${num(RE, 1)}`],
  ];
  let tb = `<rect class="thick" x="${tx}" y="${ty}" width="${W}" height="${f(rh * (rows.length + 1))}"/>`;
  tb += text(tx + W / 2, ty + 4.6, lt(L('ДАННИ ЗА КОЛЕЛАТА', 'GEAR DATA')), { size: 3, cls: 'label' });
  rows.forEach((r, i) => {
    const y = ty + rh * (i + 1);
    tb += line(tx, y, tx + W, y, i === 1 ? 'thick' : 'thin');
    tb += text(tx + 1.5, y + 4.6, lt(r[0]), { anchor: 'start', size: 2.7 });
    let x = tx + cw[0];
    for (let c = 1; c < 5; c++) {
      tb += text(x + cw[c] / 2, y + 4.6, r[c] as string, { size: 2.7 });
      x += cw[c];
    }
  });
  let x = tx + cw[0];
  for (let c = 1; c < 5; c++) {
    tb += line(x, ty + rh, x, ty + rh * (rows.length + 1), 'thin');
    x += cw[c];
  }
  s += note('table', tb, { x: tx, y: ty, w: W, h: rh * (rows.length + 1) });

  // --- Ratio calculation ---
  const ry = 112;
  let r = T(tx, ry, L('ПРЕДАВАТЕЛНО ОТНОШЕНИЕ', 'GEAR RATIO'), { size: 3.4, anchor: 'start', cls: 'label' });
  r += text(tx, ry + 9, `i₁ = z₂/z₁ = ${Z2}/${Z1} = ${num(I1, 0)}`, { size: 3.6, anchor: 'start' });
  r += text(tx, ry + 17, `i₂ = z₄/z₃ = ${Z4}/${Z3} = ${num(I2, 0)}`, { size: 3.6, anchor: 'start' });
  r += text(tx, ry + 27, `i = i₁·i₂ = ${num(I_TOTAL, 0)}`, { size: 4.6, anchor: 'start', cls: 'title-big' });
  r += text(tx, ry + 36, `n₃ = n₁ / i`, { size: 3.4, anchor: 'start' });
  s += note('ratio', r, { x: tx - 2, y: ry - 6, w: 100, h: 46 });

  s += titleBlock(410, 287, {
    name: lt(L('Цилиндрично-коничен редуктор', 'Helical-bevel gearbox')),
    material: lt(L('Кинематична схема', 'Kinematic diagram')),
    scale: '—',
    number: 'EL-HB-000',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '1/7',
  });
  return s + sheetEnd();
}

export const scheme: DrawingDef = { id: 'scheme', title: L('Схема и данни', 'Diagram and data'), render: schemeSvg, notes: schemeNotes };
