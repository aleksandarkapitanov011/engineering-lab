/**
 * Fits sheet: tolerance-zone diagrams (ISO 286) of every fit in the gear pair, with the resulting
 * maximum clearance / interference, plus a summary table.
 */
import type { DrawingNote } from '../../../core/types';
import { f, line, note, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { N } from './common';
import { tr } from '../../../i18n';
import { shaftNotes } from './shaft1';

/** Deviations in µm. Hole = outer part, shaft = inner part. */
export interface FitSpec {
  key: string;
  title: string;
  where: string;
  hole: { name: string; ES: number; EI: number };
  shaft: { name: string; es: number; ei: number };
}

export interface FitResult {
  /** Maximum clearance (negative = the fit always has interference). */
  Smax: number;
  /** Maximum interference (negative = the fit always has clearance). */
  Nmax: number;
  kind: 'clearance' | 'transition' | 'interference';
}

export function fitResult(s: FitSpec): FitResult {
  const Smax = s.hole.ES - s.shaft.ei;
  const Nmax = s.shaft.es - s.hole.EI;
  const kind = Nmax <= 0 ? 'clearance' : Smax <= 0 ? 'interference' : 'transition';
  return { Smax, Nmax, kind };
}

/** ISO 286-2 / ISO 492 values used in the gear pair (µm). */
export const FITS: FitSpec[] = [
  {
    key: 'f1',
    title: 'ø20 H7/k6',
    where: 'колело z₁ – вал 1',
    hole: { name: 'H7', ES: 21, EI: 0 },
    shaft: { name: 'k6', es: 15, ei: 2 },
  },
  {
    key: 'f2',
    title: 'ø20 k6 – лагер',
    where: 'вътрешен пръстен 6004 – вал 1',
    hole: { name: 'пръстен', ES: 0, EI: -10 },
    shaft: { name: 'k6', es: 15, ei: 2 },
  },
  {
    key: 'f3',
    title: 'ø42 H7 – лагер',
    where: 'опора – външен пръстен 6004',
    hole: { name: 'H7', ES: 25, EI: 0 },
    shaft: { name: 'пръстен', es: 0, ei: -11 },
  },
  {
    key: 'f4',
    title: '6 N9/h9',
    where: 'шпонков канал във вал 1 – шпонка',
    hole: { name: 'N9', ES: 0, EI: -30 },
    shaft: { name: 'h9', es: 0, ei: -30 },
  },
  {
    key: 'f5',
    title: '6 JS9/h9',
    where: 'канал в главината – шпонка',
    hole: { name: 'JS9', ES: 15, EI: -15 },
    shaft: { name: 'h9', es: 0, ei: -30 },
  },
  {
    key: 'f6',
    title: 'ø20 H7/g6',
    where: 'за сравнение: плъзгаща сглобка',
    hole: { name: 'H7', ES: 21, EI: 0 },
    shaft: { name: 'g6', es: -7, ei: -20 },
  },
];

const KIND_TEXT: Record<FitResult['kind'], string> = {
  clearance: 'с хлабина',
  transition: 'преходна',
  interference: 'с натяг',
};
const KIND_COLOUR: Record<FitResult['kind'], string> = {
  clearance: '#1f7a4d',
  transition: '#b06a00',
  interference: '#b3261e',
};

export const fitsNotes: Record<string, DrawingNote> = {
  f1: N(
    'ø20 H7/k6 – колело върху вал',
    'Полето на отвора H7 (0…+21 µm) и полето на вала k6 (+2…+15 µm) се застъпват: според действителните размери ще има или малка хлабина (до 19 µm), или малък натяг (до 15 µm). Това е преходна сглобка – колелото се надява с леко почукване, центрира се точно, а моментът се предава от шпонката.',
  ),
  f2: N(
    'Лагер върху вал k6',
    'Отворът на лагера е с отрицателно поле (0…−10 µm) – обратно на системата на отвора. Затова валът k6, който с H7 дава преходна сглобка, с лагера дава винаги натяг (от 2 до 25 µm). Въртящият се вътрешен пръстен не бива да се превърта по вала, иначе го изтрива.',
  ),
  f3: N(
    'Лагер в отвор H7',
    'Външният пръстен е неподвижен спрямо товара (местно натоварване) и може да седи с хлабина (0…36 µm). Така лагерът се монтира лесно, а единият от двата лагера на вала може да се плъзга осово при топлинно удължение на вала.',
  ),
  f4: N(
    'Шпонка в канала на вала: N9/h9',
    'Шпонката h9 и каналът N9 имат еднакво поле (30 µm), но N9 е изместено надолу – сглобката е преходна, клони към стегната. Шпонката остава във вала при демонтаж на колелото и не се движи при реверс.',
  ),
  f5: N(
    'Шпонка в главината: JS9/h9',
    'Симетричното поле JS9 (±15 µm) дава по-хлабава сглобка от N9: колелото се надява върху вече поставената шпонка без пресоване.',
  ),
  f6: N(
    'H7/g6 – за сравнение',
    'Ако валът е g6 (−7…−20 µm), полетата не се застъпват: винаги има хлабина от 7 до 41 µm. Това е плъзгаща сглобка за детайли, които трябва да се местят по вала (например превключващи колела) – за неподвижно колело с шпонка е твърде хлабава.',
  ),
  zero: N(
    'Нулева линия',
    'Отговаря на номиналния размер (напр. 20 mm). Отклоненията се нанасят нагоре (+) и надолу (−) в микрометри. Защрихованото поле е отворът, плътното – валът.',
  ),
  scale: N(
    'Мащаб на диаграмите',
    'Всички диаграми са в един мащаб (1 µm = 0,8 mm), за да могат да се сравняват на око. Номиналните размери не са в мащаб – те са десетки милиметра, а полетата са хилядни от милиметъра.',
  ),
  smax: N('Хлабина S', 'Smax = ES − ei: най-големият отвор с най-малкия вал. Ако излезе отрицателна, хлабина няма никога – тогава се показва най-малкият натяг Nmin = −Smax.'),
  nmax: N('Натяг N', 'Nmax = es − EI: най-големият вал в най-малкия отвор. Ако излезе отрицателен, натяг няма никога – тогава се показва най-малката хлабина Smin = −Nmax.'),
  table: N(
    'Всички сглобки в предавката',
    'Двата вала имат еднакви по вид сглобки. Числата за ø25 и ø47 са от същите интервали на ISO 286 (18…30 и 30…50 mm), затова съвпадат с тези за ø20 и ø42.',
  ),
  title: shaftNotes.title,
};

const K = 0.8; // mm of sheet per µm

function diagram(x: number, y: number, spec: FitSpec): string {
  const r = fitResult(spec);
  const y0 = y + 54;
  const Yd = (dev: number): number => y0 - dev * K;
  let s = `<rect x="${x}" y="${y}" width="118" height="96" rx="2" style="fill:none;stroke:#b8b4a8;stroke-width:0.25"/>`;
  s += text(x + 59, y + 8, spec.title, { size: 4.6, cls: 'title-big' });
  s += text(x + 59, y + 13.5, spec.where, { size: 2.7, cls: 'label' });
  // Zero line.
  s += note(
    'zero',
    line(x + 6, y0, x + 84, y0, 'thick') + text(x + 4.5, y0 + 1.1, '0', { size: 3, anchor: 'end' }) + text(x + 7, y0 - 1.5, '+', { size: 3 }) + text(x + 7, y0 + 4.5, '−', { size: 3 }),
    { x: x + 1, y: y0 - 5, w: 20, h: 10 },
  );
  // Hole zone (hatched) and shaft zone (filled).
  const hx = x + 18;
  const sx = x + 48;
  const zw = 24;
  const yh0 = Yd(spec.hole.ES);
  const yh1 = Yd(spec.hole.EI);
  const ys0 = Yd(spec.shaft.es);
  const ys1 = Yd(spec.shaft.ei);
  s += `<rect class="hatch" x="${hx}" y="${f(yh0)}" width="${zw}" height="${f(yh1 - yh0)}"/>`;
  s += `<rect class="thick" x="${hx}" y="${f(yh0)}" width="${zw}" height="${f(yh1 - yh0)}" style="fill:none"/>`;
  s += `<rect class="thick" x="${sx}" y="${f(ys0)}" width="${zw}" height="${f(ys1 - ys0)}" style="fill:#c7d3df"/>`;
  s += text(hx + zw / 2, yh0 - 2, spec.hole.name, { size: 3.2 });
  s += text(sx + zw / 2, ys0 - 2, spec.shaft.name, { size: 3.2 });
  const dev = (v: number): string => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
  s += text(hx - 1, yh0 + 2.5, dev(spec.hole.ES), { size: 2.6, anchor: 'end' });
  s += text(hx - 1, yh1 + 0.5, dev(spec.hole.EI), { size: 2.6, anchor: 'end' });
  s += text(sx + zw + 1, ys0 + 2.5, dev(spec.shaft.es), { size: 2.6, anchor: 'start' });
  s += text(sx + zw + 1, ys1 + 0.5, dev(spec.shaft.ei), { size: 2.6, anchor: 'start' });
  // Results.
  const rx = x + 88;
  // Upper value: max clearance, or the smallest interference if there is never clearance.
  const [l1, v1] = r.Smax >= 0 ? ['Smax', r.Smax] : ['Nmin', -r.Smax];
  // Lower value: max interference, or the smallest clearance if there is never interference.
  const [l2, v2] = r.Nmax > 0 ? ['Nmax', r.Nmax] : ['Smin', -r.Nmax];
  const smaxT = `${v1} µm`;
  const nmaxT = `${v2} µm`;
  s += note('smax', text(rx, y + 40, l1, { size: 3, anchor: 'start', cls: 'label' }) + text(rx, y + 45.5, smaxT, { size: 3.4, anchor: 'start' }), {
    x: rx - 1,
    y: y + 35,
    w: 28,
    h: 12,
  });
  s += note('nmax', text(rx, y + 55, l2, { size: 3, anchor: 'start', cls: 'label' }) + text(rx, y + 60.5, nmaxT, { size: 3.4, anchor: 'start' }), {
    x: rx - 1,
    y: y + 50,
    w: 28,
    h: 12,
  });
  s += `<text x="${f(x + 59)}" y="${f(y + 91)}" text-anchor="middle" style="font-size:3.6px;fill:${KIND_COLOUR[r.kind]};font-weight:700">${tr(`сглобка ${KIND_TEXT[r.kind]}`)}</text>`;
  return note(spec.key, s, { x, y, w: 118, h: 96 });
}

export function fitsSvg(): string {
  let s = sheetStart();
  const xs = [28, 152, 276];
  const ys = [16, 118];
  FITS.forEach((spec, i) => (s += diagram(xs[i % 3], ys[Math.floor(i / 3)], spec)));

  // Summary table of the assembly.
  const rows: [string, string, string, FitSpec][] = [
    ['Колело z₁ – вал 1', 'ø20 H7/k6', 'EL-SG-001/002', FITS[0]],
    ['Колело z₂ – вал 2', 'ø25 H7/k6', 'EL-SG-003/004', FITS[0]],
    ['Лагери – валове', 'ø20 k6, ø25 k6', '6004, 6005', FITS[1]],
    ['Лагери – опори', 'ø42 H7, ø47 H7', '6004, 6005', FITS[2]],
    ['Шпонки – валове', '6 N9, 8 N9 / h9', 'ISO 773', FITS[3]],
  ];
  const tx = 26;
  const ty = 222;
  const cw = [52, 38, 36, 34, 34];
  const W = cw.reduce((a, b) => a + b, 0);
  const rh = 9.4;
  let t = `<rect class="thick" x="${tx}" y="${ty}" width="${W}" height="${f(rh * (rows.length + 1))}"/>`;
  const cols = cw.reduce<number[]>((acc, w, i) => [...acc, (acc[i] ?? tx) + w], [tx]);
  const hdr = ['Съединение', 'Сглобка', 'Детайли', 'S / N, µm', 'Вид'];
  hdr.forEach((hText, i) => (t += text(cols[i] + 1.5, ty + 6, hText, { anchor: 'start', size: 2.7, cls: 'label' })));
  for (const c of cols.slice(1, -1)) t += line(c, ty, c, ty + rh * (rows.length + 1), 'thin');
  rows.forEach((row, i) => {
    const y = ty + rh * (i + 1);
    const r = fitResult(row[3]);
    t += line(tx, y, tx + W, y, 'thin');
    t += text(cols[0] + 1.5, y + 6, row[0], { anchor: 'start', size: 2.8 });
    t += text(cols[1] + 1.5, y + 6, row[1], { anchor: 'start', size: 2.8 });
    t += text(cols[2] + 1.5, y + 6, row[2], { anchor: 'start', size: 2.8 });
    const range = r.kind === 'clearance' ? `S ${-r.Nmax}…${r.Smax}` : r.kind === 'interference' ? `N ${-r.Smax}…${r.Nmax}` : `S ≤ ${r.Smax}, N ≤ ${r.Nmax}`;
    t += text(cols[3] + 1.5, y + 6, range, { anchor: 'start', size: 2.8 });
    t += `<text x="${f(cols[4] + 1.5)}" y="${f(y + 6)}" style="font-size:2.8px;fill:${KIND_COLOUR[r.kind]};font-weight:700">${tr(KIND_TEXT[r.kind])}</text>`;
  });
  s += note('table', t, { x: tx, y: ty, w: W, h: rh * (rows.length + 1) });
  s += note(
    'scale',
    text(232, 232, 'Мащаб на полетата: 1 µm = 0,8 mm', { anchor: 'start', size: 3, cls: 'label' }) +
      text(232, 238, 'Отворът – щриховано, валът – плътно', { anchor: 'start', size: 3, cls: 'label' }),
    { x: 230, y: 227, w: 70, h: 14 },
  );
  s += titleBlock(410, 287, {
    name: 'Сглобки и допуски',
    material: 'ISO 286-1/-2, ISO 492',
    scale: '—',
    number: 'EL-SG-005',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '6/6',
  });
  return s + sheetEnd();
}
