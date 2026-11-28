/**
 * Assembly drawing of the helical-bevel gearbox: section in the plane of the three shaft axes (y = AXIS_Y),
 * seen from above, scale 1:1, with balloons and the parts list. Sheet u = Xo + x, v = Yo + z (world mm).
 */
import type { DrawingNote, LText } from '../../../core/types';
import { lt } from '../../../i18n';
import { circle, dim, f, line, note, path, polyline, sheetEnd, sheetStart, text, titleBlock } from '../../../ui/svgdraw';
import { BRG_6004, BRG_6005, BRG_6006, D1, D2, DE4, DELTA4, GEAR2_BODY, HOUSING, KEY2, KEY3, RE, S1_Z, STAGE1_Z, SHAFT2_KEYWAY, SHAFT3_KEYWAY, Z4, A1 } from '../params';
import { bevelProfile, HEL } from './derived';
import { BP3, SH1, SH2, SH3 } from './shafts';
import { COMMON_NOTES, L, N, T, diaInside, hd, requirements, stepProfile, vd } from './kit';

type P = [number, number];
const Xo = 200;
const Yo = 100;

/** A shaft axis on the sheet: origin (world x, z), direction of s and of r. */
interface Ax {
  o: P;
  d: P;
  n: P;
}
const AX1: Ax = { o: [0, S1_Z], d: [-1, 0], n: [0, 1] };
const AX2: Ax = { o: [0, 0], d: [-1, 0], n: [0, 1] };
const AX3: Ax = { o: [0, 0], d: [0, 1], n: [1, 0] };
const at = (a: Ax, s: number, r: number): P => [Xo + a.o[0] + a.d[0] * s + a.n[0] * r, Yo + a.o[1] + a.d[1] * s + a.n[1] * r];
const W = (x: number, z: number): P => [Xo + x, Yo + z];
const pd = (pts: P[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
const hatched = (pts: P[]): string => path(pd(pts), 'hatch') + polyline(pts, 'thick', true);
const seg = (a: P, b: P, cls: Parameters<typeof line>[4] = 'thick'): string => line(a[0], a[1], b[0], b[1], cls);

function shaftOutline(a: Ax, prof: P[], edges: P[]): string {
  let s = '';
  for (const sg of [1, -1]) s += polyline(prof.map(([sx, r]) => at(a, sx, sg * r)));
  for (const [sx, r] of edges) s += seg(at(a, sx, r), at(a, sx, -r));
  return s;
}

function bearing(a: Ax, sx: number, b: { d: number; D: number; B: number }): string {
  let s = '';
  for (const sg of [1, -1]) {
    const r0 = sg * (b.d / 2);
    const r1 = sg * (b.D / 2);
    const rect: P[] = [at(a, sx - b.B / 2, r0), at(a, sx + b.B / 2, r0), at(a, sx + b.B / 2, r1), at(a, sx - b.B / 2, r1)];
    s += `<path d="${pd(rect)}" style="fill:#f7f5ef"/>` + polyline(rect, 'thick', true);
    const rm = (r0 + r1) / 2;
    s += seg(at(a, sx - b.B / 2 + 2, rm), at(a, sx + b.B / 2 - 2, rm), 'thin') + seg(at(a, sx, r0 + sg * 2), at(a, sx, r1 - sg * 2), 'thin');
  }
  return s;
}

function rectW(x0: number, x1: number, z0: number, z1: number): P[] {
  return [W(x0, z0), W(x1, z0), W(x1, z1), W(x0, z1)];
}

function balloon(n: number, dot: P, pos: P, key: string): string {
  const [bx, by] = W(...pos);
  const [dx, dy] = W(...dot);
  const ang = Math.atan2(dy - by, dx - bx);
  const r = 4;
  let s = line(bx + r * Math.cos(ang), by + r * Math.sin(ang), dx, dy, 'thin') + circle(dx, dy, 0.7, 'thin').replace('class="thin"', 'class="arrow"');
  s += circle(bx, by, r, 'thin') + text(bx, by + 1.4, String(n), { size: 4 });
  return note(key, s, { x: bx - r - 1, y: by - r - 1, w: 2 * r + 2, h: 2 * r + 2 });
}

const BOM: { key: string; name: LText; qty: number; mat: string }[] = [
  { key: 'p1', name: L('Корпус', 'Housing'), qty: 1, mat: 'EN-GJL-250' },
  { key: 'p2', name: L('Входящ вал-зъбно колело', 'Input pinion shaft'), qty: 1, mat: '18CrNiMo7-6 · EL-HB-001' },
  { key: 'p3', name: L('Междинен вал с конично колело', 'Intermediate shaft, bevel pinion'), qty: 1, mat: '18CrNiMo7-6 · EL-HB-002' },
  { key: 'p4', name: L('Косозъбо колело z₂ = 51', 'Helical gear z₂ = 51'), qty: 1, mat: '42CrMo4 · EL-HB-004' },
  { key: 'p5', name: L('Изходящ вал', 'Output shaft'), qty: 1, mat: '42CrMo4 · EL-HB-003' },
  { key: 'p6', name: L(`Конично колело z₄ = ${Z4}`, `Bevel gear z₄ = ${Z4}`), qty: 1, mat: '18CrNiMo7-6 · EL-HB-005' },
  { key: 'p7', name: L('Лагер 6004', 'Bearing 6004'), qty: 3, mat: 'ISO 15' },
  { key: 'p8', name: L('Лагер 6006', 'Bearing 6006'), qty: 2, mat: 'ISO 15' },
  { key: 'p9', name: L('Лагер 6005', 'Bearing 6005'), qty: 1, mat: 'ISO 15' },
  { key: 'p10', name: L('Шпонка 8×7×16', 'Key 8×7×16'), qty: 1, mat: 'C45 · ISO 773' },
  { key: 'p11', name: L('Шпонка 8×7×14', 'Key 8×7×14'), qty: 1, mat: 'C45 · ISO 773' },
  { key: 'p12', name: L('Капак на лагер, проходен', 'Bearing cap, through'), qty: 2, mat: 'EN-GJL-200' },
  { key: 'p13', name: L('Капак на лагер, глух', 'Bearing cap, blind'), qty: 1, mat: 'EN-GJL-200' },
  { key: 'p14', name: L('Маншет 18×30×7', 'Lip seal 18×30×7'), qty: 1, mat: 'NBR · ISO 6194' },
  { key: 'p15', name: L('Маншет 22×35×7', 'Lip seal 22×35×7'), qty: 1, mat: 'NBR · ISO 6194' },
];

export const assemblyNotes: Record<string, DrawingNote> = {
  title: COMMON_NOTES.title,
  section: N(
    L('Разрез през осите', 'Section through the axes'),
    L(
      'Трите оси лежат в една хоризонтална равнина, затова един разрез показва всички валове, колела, лагери и стени. Валовете и шпонките не се срязват надлъжно – рисуват се в изглед; колелата и корпусът са щриховани.',
      'The three axes lie in one horizontal plane, so a single section shows every shaft, gear, bearing and wall. Shafts and keys are not cut lengthwise – they are drawn in view; the gears and the housing are hatched.',
    ),
  ),
  bearings: N(
    L('Опростено изобразяване на лагерите', 'Simplified bearings'),
    L(
      'По ISO 8826-1 търкалящият лагер се рисува като правоъгълник с изправен кръст – без пръстените и телата.',
      'To ISO 8826-1 a rolling bearing is drawn as a rectangle with an upright cross – without the rings and balls.',
    ),
  ),
  mesh: N(
    L('Зацепване в разрез', 'Mesh in a section'),
    L(
      'В зоната на зацепване зъбите на едното колело са видими, а върховете на другото – с прекъсната линия (скрити зад тях), по ISO 2203.',
      'In the mesh zone the teeth of one gear are visible and the tips of the other are dashed (hidden behind them), to ISO 2203.',
    ),
  ),
  apex: N(
    L('Общ връх на конусите', 'Common cone apex'),
    L(
      'Осите на вал 2 и вал 3 се пресичат точно в общия връх на делителните конуси. Монтажните разстояния 42 и 28 mm от чертежите на колелата водят до тази точка.',
      'The axes of shafts 2 and 3 cross exactly at the common apex of the pitch cones. The mounting distances 42 and 28 mm from the gear drawings lead to this point.',
    ),
  ),
  a: N(
    L('Междуосие 70 ± 0,025', 'Centre distance 70 ± 0.025'),
    L('Междуосието на косозъбото стъпало се осигурява от отворите в корпуса.', 'The centre distance of the helical stage is held by the bores of the housing.'),
  ),
  bom: N(
    L('Спецификация', 'Parts list'),
    L(
      'Всяка позиция в балончетата на чертежа има ред тук: наименование, брой и материал или стандарт. Стандартните части (лагери, шпонки) нямат собствен чертеж.',
      'Every balloon on the drawing has a row here: name, quantity and material or standard. Standard parts (bearings, keys) have no drawing of their own.',
    ),
  ),
  contact: N(
    L('Контактно петно и хлабина', 'Contact pattern and backlash'),
    L(
      'Коничната двойка се регулира с подложки, докато петното от боята застане по средата на зъба. Хлабината се мери с индикатор на обиколката на колелото.',
      'The bevel pair is adjusted with shims until the paste pattern sits in the middle of the tooth. The backlash is measured with a dial gauge on the gear rim.',
    ),
  ),
  fits: N(
    L('Сглобки', 'Fits'),
    L(
      'Колела на вала: H7/k6. Вътрешните пръстени на лагерите се въртят – на вала k6 (натяг). Външните стоят – в корпуса H7 (може да се плъзгат осово).',
      'Gears on the shafts: H7/k6. The inner bearing rings rotate – k6 on the shaft (interference). The outer rings stand still – H7 in the housing (they can slide axially).',
    ),
  ),
  caps: N(
    L('Капаци и уплътнения', 'Caps and seals'),
    L(
      'Лагерите се затварят с капаци, закрепени с болтове към главините на корпуса. Капакът с отвор (проходен) носи маншет – гумено уплътнение с пружина, което притиска устна към вала и не пуска маслото навън. Където валът не излиза, капакът е глух.',
      'The bearings are closed by caps bolted to the bosses of the housing. A cap with a hole (through cap) carries a lip seal – a rubber ring with a spring that presses a lip onto the shaft and keeps the oil in. Where no shaft comes out, the cap is blind.',
    ),
  ),
  overall: N(
    L('Габаритни размери', 'Overall dimensions'),
    L('Външните размери на корпуса – нужни за мястото, където редукторът се монтира.', 'The outside size of the housing – needed for the place where the gearbox is mounted.'),
  ),
  connect: N(
    L('Присъединителни размери', 'Connecting dimensions'),
    L(
      'Краищата на входящия и изходящия вал: диаметър k6 и дължина. По тях се избират съединителите към двигателя и към работната машина.',
      'The ends of the input and output shafts: diameter k6 and length. The couplings to the motor and to the driven machine are chosen from them.',
    ),
  ),
  oil: N(
    L('Мазане', 'Lubrication'),
    L('Колелата газят в масло и го разпръскват към лагерите. ISO VG 220 е обичайният вискозитет за индустриални редуктори.', 'The gears dip into the oil and splash it onto the bearings. ISO VG 220 is the usual viscosity for industrial gearboxes.'),
  ),
};
BOM.forEach((b) => (assemblyNotes[b.key] = N(b.name, L(`Позиция в спецификацията: ${b.mat}.`, `Item of the parts list: ${b.mat}.`))));

function assemblySvg(): string {
  const H = HOUSING;
  const t = H.wall / 2;
  let s = sheetStart();
  s += `<defs><pattern id="hatchx" patternUnits="userSpaceOnUse" width="2.4" height="2.4" patternTransform="rotate(-45)">
    <rect width="2.4" height="2.4" fill="#e8e2d6"/><line x1="0" y1="0" x2="0" y2="2.4" stroke="#1d232b" stroke-width="0.22"/></pattern></defs>
    <style>.tdraw .hatchx{fill:url(#hatchx);stroke:none}</style>`;
  let g = '';

  // ---- Housing walls (hatched), with the bores left open.
  const xIn0 = H.leftWallX - t;
  const walls: P[][] = [
    rectW(H.leftWallX - t, H.leftWallX + t, H.z0, -21),
    rectW(H.leftWallX - t, H.leftWallX + t, 21, S1_Z - 21),
    rectW(H.leftWallX - t, H.leftWallX + t, S1_Z + 21, H.z1),
    rectW(H.ribX - t, H.ribX + t, H.z0 + H.wall, -BRG_6006.D / 2),
    rectW(H.ribX - t, H.ribX + t, BRG_6006.D / 2, S1_Z - 21),
    rectW(H.ribX - t, H.ribX + t, S1_Z + 21, H.frontWallZ - t),
    rectW(H.x1 - H.wall, H.x1, H.z0, H.z1),
    rectW(xIn0, H.x1, H.z0, H.z0 + H.wall),
    rectW(xIn0, -BRG_6005.D / 2, H.frontWallZ - t, H.frontWallZ + t),
    rectW(BRG_6005.D / 2, H.x1, H.frontWallZ - t, H.frontWallZ + t),
    rectW(-40, -BRG_6006.D / 2, H.outRibZ - t, H.outRibZ + t),
    rectW(BRG_6006.D / 2, 40, H.outRibZ - t, H.outRibZ + t),
  ];
  for (const w of walls) g += hatched(w);

  // ---- Gear z₂ (section): hub + web + rim; teeth hatched only off the mesh, root line on the mesh side.
  const B = GEAR2_BODY;
  const c2 = STAGE1_Z;
  const w2 = 11;
  for (const sg of [1, -1]) {
    const inner = sg === 1 ? B.bore + KEY2.t2 : B.bore;
    const rOut = sg === 1 ? HEL.df2 / 2 : HEL.da2 / 2;
    const poly: P[] = [
      [c2 - w2, inner],
      [c2 - w2, B.hubR],
      [c2 - B.web / 2, B.hubR],
      [c2 - B.web / 2, B.rimInner],
      [c2 - w2, B.rimInner],
      [c2 - w2, rOut],
      [c2 + w2, rOut],
      [c2 + w2, B.rimInner],
      [c2 + B.web / 2, B.rimInner],
      [c2 + B.web / 2, B.hubR],
      [c2 + w2, B.hubR],
      [c2 + w2, inner],
    ];
    g += hatched(poly.map(([sx, r]) => at(AX2, sx, sg * r)));
  }
  g += seg(at(AX2, c2 - w2, HEL.df2 / 2), at(AX2, c2 - w2, HEL.da2 / 2)) + seg(at(AX2, c2 + w2, HEL.df2 / 2), at(AX2, c2 + w2, HEL.da2 / 2));
  g += seg(at(AX2, c2 - w2, HEL.da2 / 2), at(AX2, c2 + w2, HEL.da2 / 2), 'hidden-line');

  // ---- Gear z₄ (section): full teeth away from the mesh, root only on the mesh side (x < 0).
  const p4 = bevelProfile(Z4, DELTA4);
  const zBack = p4.rootHeel[0];
  const diskR = DE4 / 2 - 4;
  for (const sg of [1, -1]) {
    const inner = sg === 1 ? 13 + KEY3.t2 : 13;
    const teeth: P[] = sg === 1 ? [p4.rootToe, p4.tipToe, p4.tipHeel, p4.rootHeel] : [p4.rootToe, p4.rootHeel];
    const poly: P[] = [[p4.rootToe[0], inner], ...teeth, [zBack, diskR], [zBack + 4, diskR], [zBack + 4, 20], [28, 20], [28, inner]];
    g += hatched(poly.map(([sx, r]) => at(AX3, sx, sg * r)));
  }
  g += seg(at(AX3, p4.tipToe[0], -p4.tipToe[1]), at(AX3, p4.tipHeel[0], -p4.tipHeel[1]), 'hidden-line');
  g += seg(at(AX3, p4.rootToe[0], -p4.rootToe[1]), at(AX3, p4.tipToe[0], -p4.tipToe[1]), 'hidden-line');
  g += seg(at(AX3, p4.rootHeel[0], -p4.rootHeel[1]), at(AX3, p4.tipHeel[0], -p4.tipHeel[1]), 'hidden-line');

  // ---- Shafts in view (drawn over the hubs).
  const sh1 = stepProfile(SH1, 1);
  g += `<g>${shaftOutline(AX1, sh1.prof, sh1.edges)}</g>`;
  for (const sg of [1, -1]) {
    g += seg(at(AX1, 71, (sg * HEL.df1) / 2), at(AX1, 95, (sg * HEL.df1) / 2), 'thin');
    g += seg(at(AX1, 69, (sg * D1) / 2), at(AX1, 97, (sg * D1) / 2), 'center');
    g += seg(at(AX2, 70, (sg * D2) / 2), at(AX2, 96, (sg * D2) / 2), 'center');
  }
  const pin: P[] = [[24, 10.5], [24.5, 11], [BP3.rootToe[0], 11], BP3.tipToe, BP3.tipHeel, BP3.rootHeel, [BP3.rootHeel[0], 11], [40, 11]];
  const rest = stepProfile(SH2, 1, true);
  g += shaftOutline(AX2, [...pin, ...rest.prof], [[24, 10.5], BP3.tipToe, BP3.tipHeel, BP3.rootHeel, [40, 18], ...rest.edges]);
  for (const sg of [1, -1]) g += seg(at(AX2, BP3.rootToe[0], sg * BP3.rootToe[1]), at(AX2, BP3.rootHeel[0], sg * BP3.rootHeel[1]), 'thin');
  const sh3 = stepProfile(SH3, 1);
  g += shaftOutline(AX3, sh3.prof, sh3.edges);
  // Keys (in view).
  g += polyline([at(AX2, SHAFT2_KEYWAY.z0, 9), at(AX2, SHAFT2_KEYWAY.z1, 9), at(AX2, SHAFT2_KEYWAY.z1, 16), at(AX2, SHAFT2_KEYWAY.z0, 16)], 'thick', true);
  g += polyline([at(AX3, SHAFT3_KEYWAY.z0 + 0.5, 9), at(AX3, SHAFT3_KEYWAY.z1 - 0.5, 9), at(AX3, SHAFT3_KEYWAY.z1 - 0.5, 16), at(AX3, SHAFT3_KEYWAY.z0 + 0.5, 16)], 'thick', true);
  // Pitch cones and axes.
  const pe = (RE + 6) / RE;
  for (const sg of [1, -1]) {
    g += seg(W(0, 0), at(AX2, BP3.pitchHeel[0] * pe, sg * BP3.pitchHeel[1] * pe), 'center');
    g += seg(W(0, 0), at(AX3, p4.pitchHeel[0] * pe, sg * p4.pitchHeel[1] * pe), 'center');
  }
  g += seg(W(-176, S1_Z), W(-36, S1_Z), 'center') + seg(W(-132, 0), W(6, 0), 'center') + seg(W(0, -6), W(0, 166), 'center');
  s += note('section', g, { x: W(-40, -60)[0], y: W(-40, -60)[1], w: 30, h: 20 });

  // Bearings (simplified, ISO 8826-1).
  let b = '';
  b += bearing(AX1, 120, BRG_6004) + bearing(AX1, 48, BRG_6004);
  b += bearing(AX2, 120, BRG_6004) + bearing(AX2, 48, BRG_6006);
  b += bearing(AX3, 40, BRG_6006) + bearing(AX3, 106, BRG_6005);
  s += note('bearings', b, { x: W(-126, S1_Z - 21)[0], y: W(-126, S1_Z - 21)[1], w: 12, h: 42 });

  // Bearing bosses (part of the housing) with bolted end caps; through caps carry a lip seal (ISO 6194,
  // simplified to ISO 9222-1: a rectangle with the diagonal of the lip).
  {
    const caps: { a: Ax; face: number; brgEnd: number; D: number; shaft?: number; seal?: number }[] = [
      { a: AX1, face: 125, brgEnd: 126, D: BRG_6004.D, shaft: 18, seal: 30 },
      { a: AX2, face: 125, brgEnd: 126, D: BRG_6004.D },
      { a: AX3, face: H.frontWallZ + t, brgEnd: 112, D: BRG_6005.D, shaft: 22, seal: 35 },
    ];
    const poly = (a: Ax, pts: P[], sg: number): P[] => pts.map(([sx, r]) => at(a, sx, sg * r));
    let cg = '';
    for (const c of caps) {
      const rB = c.D / 2;
      const rO = rB + 12;
      const s0 = c.face;
      const s1 = s0 + 12; // outer face of the boss
      const s2 = s1 + 6; // outer face of the cap flange
      for (const sg of [1, -1]) {
        cg += hatched(poly(c.a, [[s0, rB], [s1, rB], [s1, rO], [s0, rO]], sg));
        if (c.shaft && c.seal) {
          const rh = c.shaft / 2 + 1.5;
          const rs = c.seal / 2;
          const capPts: P[] = [[c.brgEnd, rh], [s2 - 7, rh], [s2 - 7, rs], [s2, rs], [s2, rO - 1], [s1, rO - 1], [s1, rB], [c.brgEnd, rB]];
          const pts = poly(c.a, capPts, sg);
          cg += path(pd(pts), 'hatchx') + polyline(pts, 'thick', true);
          const seal = poly(c.a, [[s2 - 7, c.shaft / 2], [s2, c.shaft / 2], [s2, rs], [s2 - 7, rs]], sg);
          cg += `<path d="${pd(seal)}" style="fill:#fff"/>` + polyline(seal, 'thick', true) + seg(seal[0], seal[2], 'thin');
        }
      }
      if (!c.shaft) {
        const blind: P[] = [[c.brgEnd, -rB], [s1, -rB], [s1, -(rO - 1)], [s2, -(rO - 1)], [s2, rO - 1], [s1, rO - 1], [s1, rB], [c.brgEnd, rB]];
        const pts = blind.map(([sx, r]) => at(c.a, sx, r));
        cg += path(pd(pts), 'hatchx') + polyline(pts, 'thick', true);
      }
    }
    s += note('caps', cg, { x: W(-143, S1_Z - 33)[0], y: W(-143, S1_Z - 33)[1], w: 18, h: 66 });
  }

  // Overall dimensions of the housing and the connecting dimensions of the shaft ends.
  {
    const [hx0, hy0] = W(H.x0, H.z0);
    const [hx1, hy1] = W(H.x1, H.z1);
    s += hd(hx0, hy1, hx1, hy1, hy1 + 12, String(H.x1 - H.x0), { note: 'overall' });
    s += vd(hx1, hy0, hx1, hy1, hx1 + 12, String(H.z1 - H.z0), { note: 'overall' });
    // Input end ø18k6, 27 mm beyond the cap.
    const i0 = at(AX1, 143, -9);
    const i1 = at(AX1, 170, -9);
    s += hd(i0[0], i0[1], i1[0], i1[1], i0[1] - 10, '27', { note: 'connect' });
    s += diaInside(at(AX1, 162, 0)[0], at(AX1, 162, 0)[1], 9, 'ø18k6', { note: 'connect', size: 3 });
    // Output end ø22k6, 31 mm beyond the cap.
    const o0 = at(AX3, 129, 11);
    const o1 = at(AX3, 160, 11);
    s += vd(o0[0], o0[1], o1[0], o1[1], o0[0] + 9, '31', { note: 'connect' });
    const oc = at(AX3, 150, 0);
    s += dim(oc[0] - 11, oc[1], oc[0] + 11, oc[1], 0, 'ø22k6', { note: 'connect', size: 3 });
  }

  // Mesh zones and the cone apex.
  s += note('mesh', '', { x: W(-96, 48)[0], y: W(-96, 48)[1], w: 26, h: 9 });
  s += note('apex', circle(Xo, Yo, 1.4, 'thin'), { x: Xo - 5, y: Yo - 5, w: 10, h: 10 });
  {
    const [kx, ky] = W(12, -34);
    s += note(
      'apex',
      line(Xo + 1, Yo - 1, kx, ky, 'thin') + line(kx, ky, kx + 44, ky, 'thin') + T(kx + 1, ky - 1, L('общ връх на конусите', 'common cone apex'), { anchor: 'start', size: 3 }),
      { x: kx, y: ky - 5, w: 46, h: 7 },
    );
  }
  // Centre distance of the helical stage.
  s += vd(W(-128, 0)[0], W(-128, 0)[1], W(-172, S1_Z)[0], W(-172, S1_Z)[1], W(-177, 0)[0], `${A1} ± 0,025`, { note: 'a', size: 3 });

  // Balloons.
  s += balloon(1, [-30, H.z0 + 4], [-30, -84], 'p1');
  s += balloon(2, [-160, S1_Z], [-160, 102], 'p2');
  s += balloon(3, [-108, 4], [-150, 30], 'p3');
  s += balloon(4, [-83, -40], [-100, -84], 'p4');
  s += balloon(5, [3, 140], [26, 150], 'p5');
  s += balloon(6, [28, 22], [84, 50], 'p6');
  s += balloon(7, [-120, S1_Z + 17], [-146, 122], 'p7');
  s += balloon(8, [18, 40], [84, 66], 'p8');
  s += balloon(9, [-15, 106], [-42, 132], 'p9');
  s += balloon(10, [-83, 12], [-62, -84], 'p10');
  s += balloon(11, [12, 18], [84, 34], 'p11');
  s += balloon(12, [-140, S1_Z + 22], [-168, 124], 'p12');
  s += balloon(13, [-140, -16], [-168, -30], 'p13');
  s += balloon(14, [-139.5, S1_Z + 12], [-178, 96], 'p14');
  s += balloon(15, [14, 126.5], [46, 140], 'p15');

  // Parts list, top right (clear of the housing).
  const tx = 280;
  const TW = 128;
  const rh = 7;
  const ty = 16;
  const cw = [9, 54, 9, 56];
  const head = [L('Поз.', 'Item'), L('Наименование', 'Name'), L('Бр.', 'Qty'), L('Материал / стандарт', 'Material / standard')];
  let bom = `<rect class="thick" x="${tx}" y="${f(ty)}" width="${TW}" height="${f(rh * (BOM.length + 1))}"/>`;
  let headRow = '';
  let x = tx;
  head.forEach((hd, i) => {
    headRow += text(x + (i === 1 || i === 3 ? 1.5 : cw[i] / 2), ty + 4.8, lt(hd), { size: 2.4, cls: 'label', anchor: i === 1 || i === 3 ? 'start' : 'middle' });
    x += cw[i];
  });
  BOM.forEach((row, i) => {
    const y = ty + rh * (i + 1);
    let r = line(tx, y, tx + TW, y, i === 0 ? 'thick' : 'thin');
    r += text(tx + cw[0] / 2, y + 4.8, String(i + 1), { size: 2.8 });
    r += text(tx + cw[0] + 1.5, y + 4.8, lt(row.name), { anchor: 'start', size: 2.4 });
    r += text(tx + cw[0] + cw[1] + cw[2] / 2, y + 4.8, String(row.qty), { size: 2.8 });
    r += text(tx + cw[0] + cw[1] + cw[2] + 1.5, y + 4.8, row.mat, { anchor: 'start', size: 2.3 });
    bom += note(row.key, r, { x: tx, y, w: TW, h: rh });
  });
  x = tx;
  for (let i = 0; i < 3; i++) {
    x += cw[i];
    bom += line(x, ty, x, ty + rh * (BOM.length + 1), 'thin');
  }
  s += bom + note('bom', headRow, { x: tx, y: ty, w: TW, h: rh });

  s += requirements(26, 240, [
    { t: L('Конична двойка: контактно петно по средата, ≥ 60 %.', 'Bevel pair: contact pattern centred, ≥ 60 %.'), key: 'contact' },
    { t: L('Сглобки: колела H7/k6, лагери k6 / H7.', 'Fits: gears H7/k6, bearings k6 / H7.'), key: 'fits' },
    { t: L('Масло ISO VG 220, мазане чрез разпръскване.', 'Oil ISO VG 220, splash lubrication.'), key: 'oil' },
    { t: L('Маншетите – със смазана устна, пружината към маслото.', 'Lip seals: lip greased, spring towards the oil.'), key: 'caps' },
  ]);
  s += titleBlock(410, 287, {
    name: lt(L('Цилиндрично-коничен редуктор', 'Helical-bevel gearbox')),
    material: lt(L('Сборен чертеж – разрез', 'Assembly – section')),
    scale: '1:1',
    number: 'EL-HB-010',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '2/7',
    mass: '≈ 9 kg',
  });
  return s + sheetEnd();
}

export const assemblySheet = { id: 'assembly', title: L('Сборен чертеж', 'Assembly'), render: assemblySvg, notes: assemblyNotes };
