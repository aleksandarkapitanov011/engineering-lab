/**
 * Assembly drawing of the gear pair, A3, scale 1:1: section in the plane of the shaft axes (seen from above),
 * position balloons, parts list, main fits and a kinematic diagram.
 */
import type { DrawingNote } from '../../../core/types';
import { circle, f, leader, line, note, path, polyline, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { N, notesBlock, vd } from './common';
import {
  A,
  BRG1,
  BRG1A_Z,
  BRG1B_Z,
  BRG2,
  BRG2A_Z,
  BRG2B_Z,
  G1,
  G2,
  KEY1,
  KEY2,
  SHAFT1_KEYWAY,
  SHAFT1_OFFSET,
  SHAFT1_SEGMENTS,
  SHAFT2_KEYWAY,
  SHAFT2_OFFSET,
  SHAFT2_SEGMENTS,
  WALL_A_Z,
  WALL_B_Z,
  WALL_T,
} from '../params';
import { GEAR2_BODY } from './gear2';
import { bearing as kinBearing, coupling, gearRect, KIN, motor, shaftLine, shaftNo } from '../../../ui/kinematic';
import { shaftNotes } from './shaft1';

interface BomRow {
  pos: number;
  name: string;
  qty: number;
  spec: string;
  key: string;
}

const BOM: BomRow[] = [
  { pos: 1, name: 'Основна плоча', qty: 1, spec: 'S235JR', key: 'pos1' },
  { pos: 2, name: 'Лагерна опора', qty: 4, spec: 'EN-GJL-250', key: 'pos2' },
  { pos: 3, name: 'Вал 1 (входящ)', qty: 1, spec: 'EL-SG-001', key: 'pos3' },
  { pos: 4, name: 'Зъбно колело z = 20', qty: 1, spec: 'EL-SG-002', key: 'pos4' },
  { pos: 5, name: 'Вал 2 (изходящ)', qty: 1, spec: 'EL-SG-003', key: 'pos5' },
  { pos: 6, name: 'Зъбно колело z = 40', qty: 1, spec: 'EL-SG-004', key: 'pos6' },
  { pos: 7, name: 'Шпонка 6×6×16', qty: 1, spec: 'ISO 773', key: 'pos7' },
  { pos: 8, name: 'Шпонка 8×7×14', qty: 1, spec: 'ISO 773', key: 'pos8' },
  { pos: 9, name: 'Лагер 6004', qty: 2, spec: 'ISO 15', key: 'pos9' },
  { pos: 10, name: 'Лагер 6005', qty: 2, spec: 'ISO 15', key: 'pos10' },
  { pos: 11, name: 'Болт M8×25', qty: 4, spec: 'ISO 4017', key: 'pos11' },
];

export const assemblyNotes: Record<string, DrawingNote> = {
  view: N(
    'Разрез в равнината на осите',
    'Предавката е разрязана с хоризонтална равнина през двата вала и е гледана отгоре. По конвенция (ISO 128-50) валовете, шпонките, болтовете и сачмите не се щрихират при надлъжен разрез – те са плътни и щриховката не би показала нищо ново. Съседните детайли се щрихират в различни посоки.',
  ),
  mesh: N(
    'Зацепването в разрез',
    'По ISO 2203 в зоната на зацепване зъбите на едното колело се рисуват видими, а върхът на другото – с тънка прекъсната линия, сякаш е скрит зад тях. Делителните линии на двете колела (щрихпунктир) се допират.',
  ),
  a: N(
    'Междуосие a = 60 ± 0,03',
    'Най-важният размер на сглобката: определя хлабината и препокриването в зацепването. Отклонението ±0,03 mm (поле js7) се осигурява от разстоянието между лагерните отвори в опорите. В раздела „Модел“ → „Монтаж“ се вижда какво става при по-голяма грешка.',
  ),
  fitG1: N(
    'ø20 H7/k6 – колело z₁ върху вал 1',
    'Преходна сглобка: колелото се центрира точно, а моментът се предава от шпонката. На сглобения чертеж сглобката се записва като дроб – полето на отвора отгоре, на вала отдолу.',
  ),
  fitG2: N('ø25 H7/k6 – колело z₂ върху вал 2', 'Същата преходна сглобка като при малкото колело, но на диаметър 25 mm.'),
  fitB1: N(
    'ø42 H7 и ø20 k6 – лагер 6004',
    'При лагерите се записва само полето на спрегнатия детайл: пръстените са със стандартни допуски по ISO 492. Вътрешният пръстен (въртящ се) е с натяг върху k6, външният (неподвижен) е с хлабина в H7 и може да се плъзга осово при топлинно удължение.',
  ),
  fitB2: N('ø47 H7 и ø25 k6 – лагер 6005', 'Същата логика като при вал 1: натяг на въртящия се пръстен, хлабина на неподвижния.'),
  bom: N(
    'Спецификация',
    'Списъкът на всички детайли с номерата на позициите от чертежа. Собствените детайли препращат към своите чертежи (EL-SG-…), а стандартните изделия – към стандарта, по който се купуват.',
  ),
  kin: N(
    'Кинематична схема',
    'Опростено изображение по ISO 3952: валовете са линии, колелата – правоъгълници с делителната линия, лагерите – знак „□“ върху стойка. Показва само как се предава движението, без размери и форма.',
  ),
  balloon: N('Номер на позиция', 'Кръгчето с номер сочи към детайла. Същият номер стои в спецификацията вдясно, където е наименованието, броят и материалът или стандартът.'),
  oil: N(
    'Мазане',
    'При периферна скорост под около 12 m/s зъбните колела се мажат с потапяне в масло. Тук корпусът е отворен (учебен стенд), затова предписанието е пластична смазка за открити предавки.',
  ),
  check: N(
    'Проверка на отпечатъка',
    'След сглобяване фланковете се намазват с туш и предавката се завърта под лек товар. Отпечатъкът трябва да покрива поне 40 % от височината и 70 % от ширината на зъба (степен на точност 7–8).',
  ),
  run: N('Разработване', 'Първите часове работа с намален товар загладят върховете на грапавостта и изравняват контакта по ширината на зъба.'),
  rot: N('Свободно въртене', 'Сглобената предавка трябва да се върти на ръка равномерно, без заяждане – това е най-простата проверка за заклинване (виж „Монтаж“ в раздела „Модел“).'),
  title: shaftNotes.title,
};
for (const r of BOM) {
  const why: Record<number, string> = {
    1: 'Носи двете лагерни стойки. Горната ѝ повърхност е базата, от която се отчита височината на осите (50 mm).',
    2: 'Четири отделни стойки (по две на вал). Отворите им за лагерите са в поле H7 и определят междуосието a = 60 ± 0,03.',
    3: 'Входящият вал. Неразрязан, по конвенцията за валове в надлъжен разрез.',
    4: 'Малкото, задвижващо колело. Щриховката е в една посока по цялото колело – така се вижда, че е един детайл.',
    5: 'Изходящият вал, по-дебел заради двойно по-големия момент.',
    6: 'Голямото колело. Дискът е отрязан между олекотяващите отвори, затова е плътен в този разрез.',
    7: 'Призматична шпонка, форма A. Неразрязана по конвенция.',
    8: 'Призматична шпонка на вал 2.',
    9: 'Сачмени лагери 6004 на вал 1. Пръстените се щрихират, сачмите не.',
    10: 'Сачмени лагери 6005 на вал 2.',
    11: 'Болтове, които закрепват стойките към плочата. Виждат се под равнината на разреза.',
  };
  assemblyNotes[r.key] = N(`Поз. ${r.pos} – ${r.name}`, `${why[r.pos]} Брой: ${r.qty}. ${/^EL/.test(r.spec) ? 'Чертеж' : 'Стандарт / материал'}: ${r.spec}.`);
}

const PAPER = '#f7f5ef';

export function assemblySvg(): string {
  // Sheet coordinates: X along the shafts (world z), Y across (world x), 1:1.
  const X0 = 125;
  const Y0 = 82;
  const X = (z: number): number => X0 + z;
  const Y = (x: number): number => Y0 + x;
  const rect = (z0: number, z1: number, x0: number, x1: number): [number, number][] => [
    [X(z0), Y(x0)],
    [X(z1), Y(x0)],
    [X(z1), Y(x1)],
    [X(z0), Y(x1)],
  ];
  const pd = (pts: [number, number][]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
  const hatched = (pts: [number, number][], hatch = 'hatch'): string => path(pd(pts), hatch) + polyline(pts, 'thick', true);
  const solid = (pts: [number, number][]): string => `<path class="thick" style="fill:${PAPER}" d="${pd(pts)}"/>`;

  let s = sheetStart();
  s += `<defs><pattern id="hatch2" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(-45)">
    <rect width="2.4" height="2.4" fill="#f3e4cf"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#1d232b" stroke-width="0.22"/></pattern>
    <pattern id="hatch3" patternUnits="userSpaceOnUse" width="1.5" height="1.5" patternTransform="rotate(45)">
    <rect width="1.5" height="1.5" fill="#e4e7ea"/><line x1="0" y1="0" x2="0" y2="1.5" stroke="#1d232b" stroke-width="0.18"/></pattern></defs>
    <style>.tdraw .hatch2{fill:url(#hatch2);stroke:none}.tdraw .hatch3{fill:url(#hatch3);stroke:none}</style>`;

  let v = '';
  // Base plate below the section plane (visible outline) and the bolt heads.
  const left = 45;
  const plate = `M${f(X(-80) + 8)} ${f(Y(-left))}H${f(X(75) - 8)}A8 8 0 0 1 ${f(X(75))} ${f(Y(-left) + 8)}V${f(Y(A + left) - 8)}A8 8 0 0 1 ${f(X(75) - 8)} ${f(Y(A + left))}H${f(X(-80) + 8)}A8 8 0 0 1 ${f(X(-80))} ${f(Y(A + left) - 8)}V${f(Y(-left) + 8)}A8 8 0 0 1 ${f(X(-80) + 8)} ${f(Y(-left))}Z`;
  v += path(plate, 'thick');
  const hex = (z: number, x: number): string => {
    const pts: [number, number][] = [];
    for (let k = 0; k < 6; k++) pts.push([X(z) + 4.2 * Math.cos((k * Math.PI) / 3), Y(x) + 4.2 * Math.sin((k * Math.PI) / 3)]);
    return polyline(pts, 'thick', true) + circle(X(z), Y(x), 3.4, 'thin');
  };
  const boltZ = [WALL_A_Z + WALL_T / 2 + 6, WALL_B_Z + WALL_T / 2 + 6];
  for (const z of boltZ) for (const x of [-22, A + 22]) v += hex(z, x);

  // Bearing supports cut by the plane (hatched the other way).
  const b1 = BRG1.D / 2 + 0.15;
  const b2 = BRG2.D / 2 + 0.15;
  for (const zc of [WALL_A_Z, WALL_B_Z]) {
    const z0 = zc - WALL_T / 2;
    const z1 = zc + WALL_T / 2;
    v += hatched(rect(z0, z1, -30, -b1), 'hatch2');
    v += hatched(rect(z0, z1, b1, A - b2), 'hatch2');
    v += hatched(rect(z0, z1, A + b2, A + 30), 'hatch2');
  }

  // Bearings: rings hatched (fine), balls plain.
  const bearing = (zc: number, xc: number, b: typeof BRG1): string => {
    const pr = (b.d + b.D) / 4;
    const ri = pr - b.ball / 2 + 0.6;
    const ro = pr + b.ball / 2 - 0.6;
    let o = '';
    for (const sg of [-1, 1]) {
      const yy = (r: number): number => xc + sg * r;
      o += hatched(rect(zc - b.B / 2, zc + b.B / 2, Math.min(yy(b.d / 2), yy(ri)), Math.max(yy(b.d / 2), yy(ri))), 'hatch3');
      o += hatched(rect(zc - b.B / 2, zc + b.B / 2, Math.min(yy(ro), yy(b.D / 2)), Math.max(yy(ro), yy(b.D / 2))), 'hatch3');
      o += `<circle class="thick" style="fill:${PAPER}" cx="${f(X(zc))}" cy="${f(Y(yy(pr)))}" r="${f(b.ball / 2)}"/>`;
    }
    return o;
  };
  v += bearing(BRG1A_Z, 0, BRG1) + bearing(BRG1B_Z, 0, BRG1) + bearing(BRG2A_Z, A, BRG2) + bearing(BRG2B_Z, A, BRG2);

  // Shafts (not hatched) with chamfered ends.
  const shaft = (segs: readonly { z0: number; z1: number; d: number }[], off: number, xc: number): string => {
    const top: [number, number][] = [];
    const L = segs[segs.length - 1].z1;
    const c = 1;
    top.push([X(-off), Y(xc - segs[0].d / 2 + c)], [X(-off + c), Y(xc - segs[0].d / 2)]);
    for (let i = 0; i < segs.length - 1; i++) {
      top.push([X(segs[i].z1 - off), Y(xc - segs[i].d / 2)], [X(segs[i].z1 - off), Y(xc - segs[i + 1].d / 2)]);
    }
    const dl = segs[segs.length - 1].d / 2;
    top.push([X(L - off - c), Y(xc - dl)], [X(L - off), Y(xc - dl + c)]);
    const bot = top.map(([x, y]) => [x, 2 * Y(xc) - y] as [number, number]).reverse();
    return solid([...top, ...bot]);
  };
  v += shaft(SHAFT1_SEGMENTS, SHAFT1_OFFSET, 0);
  v += shaft(SHAFT2_SEGMENTS, SHAFT2_OFFSET, A);

  // Keys (not hatched): key 1 on the outer side of shaft 1, key 2 on the outer side of shaft 2.
  const k1z0 = SHAFT1_KEYWAY.z0 - SHAFT1_OFFSET;
  const k1z1 = SHAFT1_KEYWAY.z1 - SHAFT1_OFFSET;
  const k2z0 = SHAFT2_KEYWAY.z0 - SHAFT2_OFFSET;
  const k2z1 = SHAFT2_KEYWAY.z1 - SHAFT2_OFFSET;
  const r1 = 10;
  const r2 = 12.5;
  v += solid(rect(k1z0, k1z1, -(r1 - KEY1.t1 + KEY1.h), -(r1 - KEY1.t1)));
  v += solid(rect(k2z0, k2z1, A + r2 - KEY2.t1, A + r2 - KEY2.t1 + KEY2.h));

  // Pinion (hatched up to the tip on both sides, it is drawn in front in the mesh).
  const w1 = 10;
  const ra1 = G1.da / 2;
  const kT1 = r1 + KEY1.t2;
  v += hatched([
    [X(-w1), Y(-ra1)],
    [X(w1), Y(-ra1)],
    [X(w1), Y(-r1)],
    [X(k1z1), Y(-r1)],
    [X(k1z1), Y(-kT1)],
    [X(k1z0), Y(-kT1)],
    [X(k1z0), Y(-r1)],
    [X(-w1), Y(-r1)],
  ]);
  v += hatched(rect(-w1, w1, r1, ra1));
  v += line(X(-w1), Y(-G1.df / 2), X(w1), Y(-G1.df / 2)) + line(X(-w1), Y(G1.df / 2), X(w1), Y(G1.df / 2));

  // Gear 2: hub, web and rim; on the mesh side the tip is hidden behind the pinion teeth.
  const w2 = 9;
  const ww = GEAR2_BODY.web / 2;
  const rri = GEAR2_BODY.rimInner;
  const rh = GEAR2_BODY.hubR;
  const ra2 = G2.da / 2;
  const rf2 = G2.df / 2;
  const kT2 = r2 + KEY2.t2;
  const gearHalf = (sg: 1 | -1, outer: number): [number, number][] => {
    const x = (r: number): number => A + sg * r;
    const inner =
      sg === 1
        ? [
            [X(-w2), x(r2)],
            [X(k2z0), x(r2)],
            [X(k2z0), x(kT2)],
            [X(k2z1), x(kT2)],
            [X(k2z1), x(r2)],
            [X(w2), x(r2)],
          ]
        : [
            [X(-w2), x(r2)],
            [X(w2), x(r2)],
          ];
    const pts: [number, number][] = [
      ...(inner as [number, number][]),
      [X(w2), x(rh)],
      [X(ww), x(rh)],
      [X(ww), x(rri)],
      [X(w2), x(rri)],
      [X(w2), x(outer)],
      [X(-w2), x(outer)],
      [X(-w2), x(rri)],
      [X(-ww), x(rri)],
      [X(-ww), x(rh)],
      [X(-w2), x(rh)],
    ];
    return pts.map(([px, py]) => [px, Y(py)] as [number, number]);
  };
  v += hatched(gearHalf(1, ra2), 'hatch2');
  v += hatched(gearHalf(-1, rf2), 'hatch2');
  v += line(X(-w2), Y(A + rf2), X(w2), Y(A + rf2));
  // Mesh side: gear tip hidden behind the pinion, pitch lines touching.
  let mesh = line(X(-w2), Y(A - ra2), X(w2), Y(A - ra2), 'hidden-line');
  mesh += line(X(-w2), Y(A - rf2), X(-w2), Y(A - ra2), 'hidden-line') + line(X(w2), Y(A - rf2), X(w2), Y(A - ra2), 'hidden-line');
  mesh += line(X(-w1 - 4), Y(G1.d / 2), X(w1 + 4), Y(G1.d / 2), 'center');
  v += note('mesh', mesh, { x: X(-w1), y: Y(ra1 - 6), w: 2 * w1, h: 8 });
  for (const zc of [Y(0), Y(A)]) v += line(X(-80) - 4, zc, X(75) + 4, zc, 'center');
  s += note('view', v, { x: X(-80), y: Y(-left), w: 155, h: 6 });

  // Centre distance.
  s += vd(X(-SHAFT1_OFFSET), Y(0), X(-SHAFT2_OFFSET), Y(A), X(-80) - 10, '60±0,03', { note: 'a' });

  // Fits.
  s += leader(X(w1 - 1), Y(r1), X(28), Y(22), 'ø20 H7/k6', 'fitG1');
  s += leader(X(w2 - 1), Y(A - r2), X(28), Y(38), 'ø25 H7/k6', 'fitG2');
  s += leader(X(BRG1B_Z + 5), Y(-BRG1.D / 2), X(42), Y(-36), 'ø42 H7 / ø20 k6', 'fitB1');
  s += leader(X(BRG2B_Z + 5), Y(A + BRG2.D / 2), X(42), Y(A + 36), 'ø47 H7 / ø25 k6', 'fitB2');

  // Position balloons.
  const balloon = (pos: number, tz: number, tx: number, bx: number, by: number): string => {
    const key = `pos${pos}`;
    const px = X(tz);
    const py = Y(tx);
    const ang = Math.atan2(py - by, px - bx);
    const r = 4.2;
    const o =
      `<circle cx="${f(px)}" cy="${f(py)}" r="0.7" class="arrow"/>` +
      line(bx + r * Math.cos(ang), by + r * Math.sin(ang), px, py, 'thin') +
      `<circle class="thin" style="fill:${PAPER};stroke-width:0.35" cx="${f(bx)}" cy="${f(by)}" r="${r}"/>` +
      text(bx, by + 1.6, String(pos), { size: 4.4 });
    return note(key, o, { x: bx - 6, y: by - 6, w: 12, h: 12 });
  };
  const top = Y(-left) - 13;
  const bot = Y(A + left) + 13;
  s += balloon(3, -60, -6, X(-66), top);
  s += balloon(9, BRG1A_Z, -15.5, X(-44), top);
  s += balloon(2, WALL_A_Z, -27, X(-22), top);
  s += balloon(7, 3, -9.5, X(0), top);
  s += balloon(4, -5, -17, X(18), top);
  s += balloon(11, boltZ[1], -22, X(52), top);
  s += balloon(1, 62, A + 30, X(66), bot);
  s += balloon(5, 45, A + 6, X(44), bot);
  s += balloon(10, BRG2B_Z, A + 18, X(22), bot);
  s += balloon(8, -3, A + 12, X(0), bot);
  s += balloon(6, -5, A + 36, X(-22), bot);

  // Kinematic diagram (ISO 3952, schematic, not to scale): motor, coupling, two shafts on bearings, the gear
  // pair (× = keyed to the shaft), coupling to the driven machine.
  {
    const kx = 250;
    const ky = 30;
    let k = text(kx + 76, ky - 8, 'КИНЕМАТИЧНА СХЕМА', { size: 3.2, cls: 'label' });
    const xg = kx + 66;
    const y1 = ky + 12;
    const y2 = y1 + 9 + 23;
    k += motor(kx + 6, y1, 7) + shaftLine(kx + 13, y1, kx + 17, y1) + coupling(kx + 19, y1) + shaftLine(kx + 21, y1, kx + 98, y1);
    k += shaftLine(kx + 36, y2, kx + 116, y2) + coupling(kx + 118, y2) + shaftLine(kx + 120, y2, kx + 124, y2);
    k += `<rect class="thick" x="${kx + 124}" y="${y2 - 7}" width="28" height="14" rx="1.5" style="fill:${KIN.MACHINE}"/>`;
    k += text(kx + 138, y2 + 1.2, 'машина', { size: 2.4 });
    k += gearRect(xg, y1, 9, 0, true) + gearRect(xg, y2, 23, 0, true);
    k += kinBearing(kx + 44, y1) + kinBearing(kx + 88, y1) + kinBearing(kx + 44, y2) + kinBearing(kx + 88, y2);
    k += shaftNo(kx + 104, y1 - 8, 'I') + shaftNo(kx + 104, y2 - 10, 'II');
    k += text(xg - 7, y1 - 11, 'z₁ = 20', { anchor: 'end', size: 3 });
    k += text(xg - 7, y2 + 21, 'z₂ = 40', { anchor: 'end', size: 3 });
    k += text(xg + 7, y1 + 11.5, 'P', { anchor: 'start', size: 3 });
    k += text(kx + 96, y2 + 21, 'i = z₂/z₁ = 2', { anchor: 'start', size: 3 });
    s += note('kin', k, { x: kx - 4, y: ky - 14, w: 156, h: 92 });
  }

  // Parts list (above the title block, numbered from the bottom up as on a real drawing).
  {
    const bx = 230;
    const rowH = 6.4;
    const cw = [12, 76, 14, 78];
    const W = cw.reduce((a, b) => a + b, 0);
    const yBottom = 251;
    const rows = [...BOM].reverse();
    const hdrY = yBottom - rowH;
    let t = `<rect class="thick" x="${bx}" y="${f(yBottom - rowH * (rows.length + 1))}" width="${W}" height="${f(rowH * (rows.length + 1))}"/>`;
    const cols = [bx, bx + cw[0], bx + cw[0] + cw[1], bx + cw[0] + cw[1] + cw[2]];
    for (const c of cols.slice(1)) t += line(c, yBottom - rowH * (rows.length + 1), c, yBottom, 'thin');
    t += line(bx, hdrY, bx + W, hdrY, 'thick');
    const hdr = ['Поз.', 'Наименование', 'Бр.', 'Чертеж / стандарт'];
    hdr.forEach((hText, i) => (t += text(cols[i] + 1.5, hdrY + 4.4, hText, { anchor: 'start', size: 2.6, cls: 'label' })));
    rows.forEach((r, i) => {
      const y = hdrY - rowH * (i + 1);
      let row = line(bx, y, bx + W, y, 'thin');
      row += text(cols[0] + cw[0] / 2, y + 4.5, String(r.pos), { size: 2.9 });
      row += text(cols[1] + 1.5, y + 4.5, r.name, { anchor: 'start', size: 2.8 });
      row += text(cols[2] + cw[2] / 2, y + 4.5, String(r.qty), { size: 2.9 });
      row += text(cols[3] + 1.5, y + 4.5, r.spec, { anchor: 'start', size: 2.8 });
      t += note(r.key, row, { x: bx, y, w: W, h: rowH });
    });
    s += note('bom', text(bx + W / 2, yBottom - rowH * (rows.length + 1) - 3, 'СПЕЦИФИКАЦИЯ', { size: 3.2, cls: 'label' }), {
      x: bx + W / 2 - 20,
      y: yBottom - rowH * (rows.length + 1) - 8,
      w: 40,
      h: 6,
    });
    s += t;
  }

  s += notesBlock(26, 230, 'ТЕХНИЧЕСКИ ИЗИСКВАНИЯ', [
    { t: '1. Междуосие 60 ± 0,03 mm.', key: 'a' },
    { t: '2. Отпечатък ≥ 40 % по височина, ≥ 70 % по ширина.', key: 'check' },
    { t: '3. Предавката се върти на ръка без заяждане.', key: 'rot' },
    { t: '4. Смазка за открити предавки; разработване 2 h.', key: 'oil' },
  ]);
  s += titleBlock(410, 287, {
    name: 'Цилиндрична зъбна предавка',
    material: 'Сглобен чертеж',
    scale: '1:1',
    number: 'EL-SG-000',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '1/6',
    mass: '≈ 3,2 kg',
  });
  return s + sheetEnd();
}
