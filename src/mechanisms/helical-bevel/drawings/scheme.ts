/**
 * Drawing of the helical-bevel gearbox: kinematic diagram (ISO 3952 symbols), data of the four gears and
 * the ratio calculation. Text is passed already in the current language.
 */
import type { DrawingDef, DrawingNote, LText } from '../../../core/types';
import { lt } from '../../../i18n';
import { arrowHead, f, fitSize, line, note, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { ETA1, ETA2 } from '../forces';
import { bearing, coupling, gearRect, KIN, shaftLine, shaftNo } from '../../../ui/kinematic';
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
  legend: N(
    L('Условни означения', 'Symbols'),
    L(
      'Знаците по ISO 3952: валът е дебела линия, лагерът с търкаляне – двата пръстена в полуразрез с топче, цилиндричното колело – правоъгълник (косите линии – коси зъби), коничното – трапец, съединителят – две полусъединителни шайби, двигателят – кръг с „M“.',
      'The ISO 3952 symbols: a shaft is a thick line, a rolling bearing the two rings in half-section with a ball, a cylindrical gear a rectangle (slanted lines – helical teeth), a bevel gear a trapezoid, a coupling two half-couplings, the motor a circle with “M”.',
    ),
  ),
  shafts: N(
    L('Параметри на валовете', 'Shaft data'),
    L(
      'Оборотите падат с предавателното отношение на всяко стъпало, мощността – с к.п.д. (загуби в зъбите и лагерите). Моментът T = 9550·P/n расте почти толкова пъти, колкото падат оборотите – затова изходящият вал е най-дебел.',
      'The speed drops by the ratio of each stage, the power by the efficiency (losses in the teeth and bearings). The torque T = 9550·P/n grows almost as many times as the speed drops – that is why the output shaft is the thickest.',
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
  const BEV_FILL = KIN.BEVEL;

  // --- Kinematic diagram (left two thirds) ---
  let k = '';
  const y1 = 64; // shaft I (input)
  const y2 = 114; // shaft II (intermediate)
  const xb = 212; // bevel apex x = shaft III
  const xg = 124; // helical stage plane
  // Housing outline (dash-dot): what is inside the gearbox.
  k += `<rect class="center" x="66" y="40" width="172" height="146" rx="3" style="stroke:#7d8793"/>`;
  k += T(70, 46.5, L('корпус', 'housing'), { size: 2.6, anchor: 'start', cls: 'label tb-label' });
  // Motor and input coupling.
  k += `<circle class="thick" cx="34" cy="${y1}" r="10" style="fill:#eef2f6"/>` + text(34, y1 + 2.4, 'M', { size: 5, cls: 'label' });
  k += shaftLine(44, y1, 54, y1) + coupling(56, y1) + shaftLine(58, y1, 168, y1);
  k += T(34, y1 + 18, L('двигател', 'motor'), { size: 2.6 });
  // Shafts II and III.
  k += shaftLine(76, y2, xb - 13, y2);
  k += shaftLine(xb, y2 + 13, xb, 198);
  // Gears.
  k += gearRect(xg, y1, 12, 1) + gearRect(xg, y2, 38, -1);
  k += `<path class="thick" style="fill:${BEV_FILL}" d="M${xb - 28} ${y2 - 13}L${xb - 13} ${y2 - 6}L${xb - 13} ${y2 + 6}L${xb - 28} ${y2 + 13}Z"/>`;
  k += `<path class="thick" style="fill:${BEV_FILL}" d="M${xb - 26} ${y2 + 28}L${xb + 26} ${y2 + 28}L${xb + 13} ${y2 + 13}L${xb - 13} ${y2 + 13}Z"/>`;
  // The axes meet at the common cone apex.
  k += line(xb - 13, y2, xb + 6, y2, 'center') + line(xb, y2 - 6, xb, y2 + 13, 'center');
  // Bearings.
  k += bearing(84, y1) + bearing(160, y1) + bearing(88, y2) + bearing(170, y2);
  k += bearing(xb, 160, true) + bearing(xb, 180, true);
  // Output coupling and the driven machine.
  k += coupling(xb, 202, true) + shaftLine(xb, 204, xb, 212);
  k += `<rect class="thick" x="${xb - 24}" y="212" width="48" height="14" rx="1.5" style="fill:#eef2f6"/>`;
  k += T(xb, 221, L('работна машина', 'driven machine'), { size: 2.6 });
  // Shaft numbers and speeds.
  k += shaftNo(178, y1 - 9, 'I') + T(186, y1 - 7.5, L('n₁', 'n₁'), { size: 3.4, anchor: 'start' });
  k += shaftNo(72, y2 - 11, 'II') + T(80, y2 - 9.5, L('n₂', 'n₂'), { size: 3.4, anchor: 'start' });
  k += shaftNo(xb + 18, 194, 'III') + T(xb + 26, 195.5, L('n₃', 'n₃'), { size: 3.4, anchor: 'start' });
  // Input arrow.
  k += line(20, y1 - 18, 30, y1 - 18, 'thin') + arrowHead(36, y1 - 18, 0);
  // Tooth numbers.
  k += T(xg + 8, y1 - 8, L(`z₁ = ${Z1}`, `z₁ = ${Z1}`), { size: 3.2, anchor: 'start' });
  k += T(xg + 8, y2 + 34, L(`z₂ = ${Z2}`, `z₂ = ${Z2}`), { size: 3.2, anchor: 'start' });
  k += T(xb - 34, y2 - 17, L(`z₃ = ${Z3}`, `z₃ = ${Z3}`), { size: 3.2, anchor: 'start' });
  k += T(xb + 28, y2 + 24, L(`z₄ = ${Z4}`, `z₄ = ${Z4}`), { size: 3.2, anchor: 'start' });
  s += note('scheme', k + T(140, 28, L('КИНЕМАТИЧНА СХЕМА', 'KINEMATIC DIAGRAM'), { size: 4.4, cls: 'label' }), { x: 100, y: 21, w: 80, h: 10 });
  s += note('helical', T(xg, y2 + 52, L('стъпало 1: косозъбо', 'stage 1: helical'), { size: 3.2, cls: 'label' }), { x: xg - 32, y: y2 + 46, w: 64, h: 8 });
  s += note('bevel', T(xb - 8, y2 - 28, L('стъпало 2: конично', 'stage 2: bevel'), { size: 3.2, cls: 'label' }), { x: xb - 40, y: y2 - 34, w: 64, h: 8 });

  // --- Legend of the symbols (bottom left) ---
  const lx = 26;
  const ly = 238;
  let lg = T(lx, ly, L('УСЛОВНИ ОЗНАЧЕНИЯ (ISO 3952)', 'SYMBOLS (ISO 3952)'), { size: 3.2, anchor: 'start', cls: 'label' });
  const items: [string, LText][] = [
    [shaftLine(0, 0, 16, 0), L('вал', 'shaft')],
    [bearing(8, 0, false, false), L('лагер с търкаляне', 'rolling bearing')],
    [gearRect(8, 0, 6, 1), L('цилиндрично колело (косо)', 'cylindrical gear (helical)')],
    [`<path class="thick" style="fill:${BEV_FILL}" d="M2 -6L14 -2.5L14 2.5L2 6Z"/>`, L('конично колело', 'bevel gear')],
    [coupling(8, 0), L('съединител', 'coupling')],
    [`<circle class="thick" cx="8" cy="0" r="6" style="fill:#eef2f6"/>` + text(8, 1.6, 'M', { size: 3.4, cls: 'label' }), L('електродвигател', 'electric motor')],
  ];
  items.forEach(([sym, lab], i) => {
    const cx = lx + (i % 2) * 100;
    const cy = ly + 11 + Math.floor(i / 2) * 13;
    lg += `<g transform="translate(${cx} ${cy})">${sym}</g>` + T(cx + 22, cy + 1.6, lab, { size: 2.9, anchor: 'start' });
  });
  s += note('legend', lg, { x: lx - 2, y: ly - 6, w: 200, h: 48 });

  // --- Tables (top right) ---
  const tx = 268;
  const ty = 22;
  const rh = 6.6;
  const tableMarkup = (x0: number, y0: number, title: LText, widths: number[], data: (LText | string)[][]): string => {
    const w = widths.reduce((a, b) => a + b, 0);
    let o = `<rect class="tb-fill" x="${x0}" y="${y0}" width="${w}" height="${f(rh * (data.length + 1))}"/>`;
    o += `<rect class="tbl-head" x="${x0}" y="${y0}" width="${w}" height="${f(rh * 2)}"/>`;
    o += `<rect class="thick" x="${x0}" y="${y0}" width="${w}" height="${f(rh * (data.length + 1))}"/>`;
    o += text(x0 + w / 2, y0 + 4.8, lt(title), { size: 3, cls: 'label' });
    data.forEach((r, i) => {
      const y = y0 + rh * (i + 1);
      if (i > 1 && i % 2 === 0) o += `<rect class="tbl-band" x="${x0}" y="${f(y)}" width="${w}" height="${rh}"/>`;
      o += line(x0, y, x0 + w, y, i === 1 ? 'thick' : 'thin');
      const name = typeof r[0] === 'string' ? r[0] : lt(r[0]);
      o += text(x0 + 1.2, y + 4.8, name, { anchor: 'start', size: fitSize(name, 2.7, widths[0] - 2.5) });
      let x = x0 + widths[0];
      for (let c = 1; c < widths.length; c++) {
        const v = r[c] as string;
        o += text(x + widths[c] / 2, y + 4.8, v, { size: fitSize(v, 2.7, widths[c] - 2) });
        x += widths[c];
      }
    });
    let x = x0 + widths[0];
    for (let c = 1; c < widths.length; c++) {
      o += line(x, y0 + rh, x, y0 + rh * (data.length + 1), 'thin');
      x += widths[c];
    }
    return o;
  };
  const cw = [48, 20, 20, 25, 25];
  const W = cw.reduce((a, b) => a + b, 0);
  const rows: (LText | string)[][] = [
    [L('Колело', 'Gear'), 'z₁', 'z₂', 'z₃', 'z₄'],
    [L('Брой зъби z', 'Teeth z'), `${Z1}`, `${Z2}`, `${Z3}`, `${Z4}`],
    [L('Модул, mm', 'Module, mm'), `mₙ ${num(MN, 0)}`, `mₙ ${num(MN, 0)}`, `mₑ ${num(MB, 1)}`, `mₑ ${num(MB, 1)}`],
    [L('Наклон β', 'Helix β'), `${dg(BETA)}°`, `${dg(BETA)}°`, '0°', '0°'],
    [L('Посока на наклона', 'Hand'), lt(L('дясна', 'right')), lt(L('лява', 'left')), '—', '—'],
    [L('Делителен диаметър, mm', 'Pitch diameter, mm'), num(D1, 1), num(D2, 1), num(DE3, 1), num(DE4, 1)],
    [L('Ъгъл на конуса δ', 'Cone angle δ'), '—', '—', `${dg(DELTA3)}°`, `${dg(DELTA4)}°`],
    [L('Ширина b, mm', 'Width b, mm'), '24', '22', `${BB}`, `${BB}`],
    [L('Междуосие / Rₑ, mm', 'Centre dist. / Rₑ, mm'), `a = ${A1}`, `a = ${A1}`, `Rₑ ${num(RE, 1)}`, `Rₑ ${num(RE, 1)}`],
  ];
  s += note('table', tableMarkup(tx, ty, L('ДАННИ ЗА КОЛЕЛАТА', 'GEAR DATA'), cw, rows), { x: tx, y: ty, w: W, h: rh * (rows.length + 1) });

  // Speeds, power and torque of the shafts (motor 1,1 kW at 1500 min⁻¹).
  const n1 = 1500;
  const P1 = 1.1;
  const sp = [
    { n: n1, P: P1 },
    { n: n1 / I1, P: P1 * ETA1 },
    { n: n1 / I_TOTAL, P: P1 * ETA1 * ETA2 },
  ];
  const sy = ty + rh * (rows.length + 1) + 8;
  const sRows: (LText | string)[][] = [
    [L('Вал', 'Shaft'), 'n, min⁻¹', 'P, kW', 'T, N·m'],
    ...sp.map((v, i) => [['I', 'II', 'III'][i], num(v.n, 0), num(v.P, 2), num((9550 * v.P) / v.n, 1)]),
  ];
  s += note('shafts', tableMarkup(tx, sy, L('ПАРАМЕТРИ НА ВАЛОВЕТЕ', 'SHAFT DATA'), [48, 30, 30, 30], sRows), { x: tx, y: sy, w: 138, h: rh * 5 });

  // --- Ratio calculation ---
  const ry = sy + rh * 5 + 12;
  let r = T(tx, ry, L('ПРЕДАВАТЕЛНО ОТНОШЕНИЕ', 'GEAR RATIO'), { size: 3.2, anchor: 'start', cls: 'label' });
  r += text(tx, ry + 9, `i₁ = z₂/z₁ = ${Z2}/${Z1} = ${num(I1, 0)}`, { size: 3.4, anchor: 'start' });
  r += text(tx, ry + 17, `i₂ = z₄/z₃ = ${Z4}/${Z3} = ${num(I2, 0)}`, { size: 3.4, anchor: 'start' });
  r += text(tx, ry + 28, `i = i₁·i₂ = ${num(I_TOTAL, 0)}`, { size: 4.6, anchor: 'start', cls: 'title-big' });
  r += text(tx + 78, ry + 9, `T = 9550·P / n`, { size: 3, anchor: 'start' });
  r += text(tx + 78, ry + 17, `η = ${num(ETA1, 2)}·${num(ETA2, 2)}`, { size: 3, anchor: 'start' });
  s += note('ratio', r, { x: tx - 2, y: ry - 6, w: 138, h: 40 });

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
