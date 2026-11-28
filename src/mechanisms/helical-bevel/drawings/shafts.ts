/** Part drawings of the three shafts (scale 2:1). */
import type { DrawingNote } from '../../../core/types';
import { lt } from '../../../i18n';
import { circle, dim, f, leader, line, part3d, sheetEnd, sheetStart, titleBlock } from '../../../ui/svgdraw';
import { centreHole, datum, detailMark, fcf, FH, undercutDetail } from '../../../ui/gdt';
import { BETA, D1, DE3, DELTA3, MB, MN, RE, BB, SHAFT1_KEYWAY, SHAFT2_KEYWAY, SHAFT3_KEYWAY, SHAFT3_OUT_KEYWAY, Z1, Z2, Z3, Z4, A1, B1 } from '../params';
import { bevelProfile, HEL, steelMass } from './derived';
import { BEVEL_NOTES, HELICAL_NOTES } from './gearNotes';
import {
  COMMON_NOTES,
  L,
  N,

  cutMarks,
  dataTable,
  dms,
  drawProfile,
  frame,
  generalRoughness,
  hd,
  keySection,
  keywayView,
  lengthChain,
  nb,
  requirements,
  stepDiameters,
  stepProfile,
  type ShaftFrame,
  type ShaftStep,
} from './kit';

const S = 2;
const K6_SMALL: [string, string] = ['+0,012', '+0,001']; // ø10…18
const K6: [string, string] = ['+0,015', '+0,002']; // ø18…30
const N9_6: [string, string] = ['0', '−0,030'];
const N9_8: [string, string] = ['0', '−0,036'];

const chamferLeader = (F: ShaftFrame, s: number, r: number, dx: number, below = false): string =>
  below
    ? leader(F.X(s) + 0.6 * Math.sign(dx), F.Y(r, -1) - 0.6, F.X(s) + dx, F.Y(r, -1) + 16, '1×45°', 'chamfer', dx > 0)
    : leader(F.X(s) + 0.6 * Math.sign(dx), F.Y(r) + 0.6, F.X(s) + dx, F.Y(r) - 16, '1×45°', 'chamfer', dx > 0);

/** Three thin lines showing the hand of a helical gear in a view (right hand: down to the right on the sheet). */
function helixLines(F: ShaftFrame, s0: number, s1: number, right: boolean, y0: number): string {
  const x0 = F.X(s0 + 3);
  const x1 = F.X(s1 - 3);
  const dy = (x1 - x0) * Math.tan(BETA) * (right ? 1 : -1);
  return [0, 7, 14].map((o) => line(x0, y0 + o - dy / 2, x1, y0 + o + dy / 2, 'thin')).join('');
}

// ============================================================================ shaft 1
export const SH1: ShaftStep[] = [
  { s0: 42, s1: 54, d: 20, label: 'ø20k6', tol: K6, key: 'k6', ra: '0,8' },
  { s0: 54, s1: 71, d: 24, label: 'ø24', key: 'shoulder' },
  { s0: 71, s1: 95, d: HEL.da1, label: `ø${nb(HEL.da1, 0)}h11`, tol: ['0', '−0,160'], key: 'da' },
  { s0: 95, s1: 114, d: 24, label: 'ø24', key: 'free' },
  { s0: 114, s1: 126, d: 20, label: 'ø20k6', tol: K6, key: 'k6', ra: '0,8' },
  { s0: 126, s1: 170, d: 18, label: 'ø18k6', tol: K6_SMALL, key: 'end', ra: '0,8', at: 130.5 },
];

export const shaft1Notes: Record<string, DrawingNote> = {
  ...COMMON_NOTES,
  ...HELICAL_NOTES,
  pinion: N(
    L('Вал-зъбно колело', 'Pinion shaft'),
    L(
      'Колелото z₁ = 17 е твърде малко за отвор и шпонка (диаметърът на петите е 30 mm), затова зъбите се нарязват направо на вала. Валът и зъбите са от една циментирана стомана.',
      'The pinion z₁ = 17 is too small for a bore and a key (its root diameter is 30 mm), so the teeth are cut straight on the shaft. Shaft and teeth are one case-hardened steel.',
    ),
  ),
};

function shaft1Svg(): string {
  const F = frame(30, 42, 115, S);
  const { prof, edges } = stepProfile(SH1, 1);
  let s = sheetStart();
  s += drawProfile(F, prof, edges);
  s += keywayView(F, SHAFT1_KEYWAY.z0, SHAFT1_KEYWAY.z1, SHAFT1_KEYWAY.b);
  s += line(F.X(42) - 6, F.Yc, F.X(170) + 6, F.Yc, 'center');
  // Teeth (ISO 2203): pitch line dash-dot, root line thin, hand of the helix.
  let teeth = '';
  for (const sg of [1, -1] as const) {
    teeth += line(F.X(69), F.Y(D1 / 2, sg), F.X(97), F.Y(D1 / 2, sg), 'center');
    teeth += line(F.X(71), F.Y(HEL.df1 / 2, sg), F.X(95), F.Y(HEL.df1 / 2, sg), 'thin');
  }
  teeth += helixLines(F, 71, 95, true, F.Yc + 9);
  s += `<g data-note="pinion"><rect class="hit" x="${f(F.X(71))}" y="${f(F.Yc + 4)}" width="${f(24 * S)}" height="22" rx="1.5"/>${teeth}</g>`;

  s += lengthChain(F, SH1, 3, F.Yc - 53, F.Yc - 63, 'total', SH1.map(() => 'len'));
  s += stepDiameters(F, SH1);
  // Keyway on the input end.
  const yk = F.Yc + 40;
  s += hd(F.X(126), F.Y(9, -1), F.X(SHAFT1_KEYWAY.z0), F.Yc + 6, yk, '9', { note: 'keypos', outside: true });
  s += hd(F.X(SHAFT1_KEYWAY.z0), F.Yc + 6, F.X(SHAFT1_KEYWAY.z1), F.Yc + 6, yk, '25', { note: 'keypos' });
  s += cutMarks(F.X(140), F.Yc, 9 * S, 'A');
  s += keySection(372, 150, S, 'A', { d: 18, b: 6, t1: 3.5, bTol: N9_6 }, { section: 'section', width: 'keyway', depth: 'depth' });
  s += chamferLeader(F, 42, 10, 10) + chamferLeader(F, 170, 9, 10, true);

  s += dataTable(300, 16, L('ДАННИ ЗА ЗЪБНОТО КОЛЕЛО', 'GEAR DATA'), [
    [L('Нормален модул', 'Normal module'), 'mₙ', nb(MN, 0), 'mn'],
    [L('Брой зъби', 'Number of teeth'), 'z', String(Z1), 'z'],
    [L('Ъгъл на наклона', 'Helix angle'), 'β', dms(BETA), 'beta'],
    [L('Посока на наклона', 'Hand of helix'), '—', lt(L('дясна', 'right')), 'hand'],
    [L('Изходен контур', 'Basic rack'), 'αₙ', '20°, ISO 53', 'alpha'],
    [L('Коеф. на изместване', 'Profile shift'), 'x', '0', 'x'],
    [L('Делителен диаметър', 'Pitch diameter'), 'd', nb(D1, 3), 'd'],
    [L('Ширина на венеца', 'Face width'), 'b', String(B1), 'b'],
    [L('Степен на точност', 'Accuracy grade'), '—', '7 (ISO 1328)', 'grade'],
    [L('Спрегнато колело', 'Mating gear'), 'z₂', `${Z2} (EL-HB-004)`, 'mate'],
    [L('Междуосие', 'Centre distance'), 'a', `${A1} ± 0,025`, 'a'],
  ]);

  // Tolerancing: datums on the bearing seats, runouts relative to A–B, the keyway centred on the axis.
  {
    const yb = F.Y(10, -1);
    s += datum(F.X(44.5), yb, 'A', 'down', 5, 'datum') + datum(F.X(116.5), yb, 'B', 'down', 5, 'datum');
    const tipB = F.Y(HEL.da1 / 2, -1);
    s += fcf(F.X(83) - FH / 2, tipB + 9, 'runout', '0,03', ['A-B'], { to: [F.X(83), tipB + 0.6], from: 'top', note: 'runout' });
    const endT = F.Y(9);
    s += fcf(F.X(152) - FH / 2, endT - 26, 'runout', '0,02', ['A-B'], { to: [F.X(152), endT - 0.6], note: 'runout' });
    // The shoulders the bearings bear against.
    s += fcf(F.X(54) + 0.6, F.Yc - 50, 'runout', '0,02', ['A-B'], { knee: [F.X(50), F.Y(11)], to: [F.X(54) - 0.6, F.Y(11)], arrowAngle: 0, note: 'axrunout' });
    s += fcf(F.X(95) + 1, F.Yc - 50, 'runout', '0,02', ['A-B'], { from: 'right', knee: [F.X(118), F.Yc - 46.2], to: [F.X(114) + 0.6, F.Y(11)], arrowAngle: Math.PI, note: 'axrunout' });
    // Keyway centred on the axis (in section A–A).
    s += fcf(350, 186, 'sym', '0,02', ['A-B'], { from: 'top', knee: [353.8, 176], to: [372 + 12.2, 150 + 6.4], note: 'sym' });
    s += centreHole(F.X(42), F.Yc, S, -1, null, 'centre') + centreHole(F.X(170), F.Yc, S, 1, null, 'centre');
    s += detailMark(F.X(54), F.Y(10), 6, 'X', 'detail') + undercutDetail(298, 226, 8, 2, 'X');
    s += part3d(24, 13, 92, 30, 'shaft1', lt(L('изглед за справка', 'reference view')));
  }

  s += generalRoughness(372, 236);
  s += requirements(26, 206, [
    { t: L('Зъбите: циментиране и закаляване 58…62 HRC, дълбочина 0,6…0,9 mm, шлифовани.', 'Teeth: case-hardened 58…62 HRC, depth 0.6…0.9 mm, ground.'), key: 'case' },
    { t: L('Неуказани фаски 0,5×45°, радиуси R0,5.', 'Chamfers not shown 0.5×45°, radii R0.5.'), key: 'chamfer' },
    { t: L('Общи допуски ISO 2768-mK.', 'General tolerances ISO 2768-mK.'), key: 'iso2768' },
    { t: L('Лагерни шийки ø20 k6 за лагери 6004.', 'Bearing seats ø20 k6 for bearings 6004.'), key: 'k6' },
    { t: L('Зъбите в изглед – по ISO 2203.', 'Teeth in the view to ISO 2203.'), key: 'gearteeth' },
    { t: L('Центрови отвори ISO 6411-A2/4,25 в двата края.', 'Centre holes ISO 6411-A2/4.25 at both ends.'), key: 'centre' },
  ]);
  s += titleBlock(410, 287, {
    name: lt(L('Входящ вал-зъбно колело', 'Input pinion shaft')),
    material: '18CrNiMo7-6 (EN 10084)',
    scale: '2:1',
    number: 'EL-HB-001',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '3/7',
    mass: `${nb(steelMass(SH1), 2)} kg`,
  });
  return s + sheetEnd();
}

// ============================================================================ shaft 2
export const BP3 = bevelProfile(Z3, DELTA3);
export const SH2: ShaftStep[] = [
  { s0: 40, s1: 42, d: 36, label: 'ø36', key: 'shoulder' },
  { s0: 42, s1: 55, d: 30, label: 'ø30k6', tol: K6, key: 'k6', ra: '0,8' },
  { s0: 55, s1: 72, d: 28, label: 'ø28', key: 'shoulder' },
  { s0: 72, s1: 94, d: 26, label: 'ø26k6', tol: K6, key: 'seat', ra: '0,8', at: 73.5 },
  { s0: 94, s1: 114, d: 24, label: 'ø24', key: 'free' },
  { s0: 114, s1: 126, d: 20, label: 'ø20k6', tol: K6, key: 'k6', ra: '0,8' },
];

export const shaft2Notes: Record<string, DrawingNote> = {
  ...COMMON_NOTES,
  ...BEVEL_NOTES,
  pinion: N(
    L('Конично колело на вала', 'Bevel pinion on the shaft'),
    L(
      'Коничното колело z₃ е изработено заедно с вала и стои конзолно – извън двата лагера. Линиите на върховете и на петите сочат към върха на конуса (вляво).',
      'The bevel pinion z₃ is made in one piece with the shaft and is overhung – outside the two bearings. The tip and root lines point to the cone apex (left).',
    ),
  ),
};

function shaft2Svg(): string {
  const F = frame(46, 0, 115, S);
  const c = 0.5;
  // Pinion part (custom), then the stepped shaft from s = 40.
  const pin: [number, number][] = [
    [24, 11 - c],
    [24 + c, 11],
    [BP3.rootToe[0], 11],
    BP3.tipToe,
    BP3.tipHeel,
    BP3.rootHeel,
    [BP3.rootHeel[0], 11],
    [40, 11],
  ];
  const rest = stepProfile(SH2, 1, true);
  const prof = [...pin, ...rest.prof];
  const edges: [number, number][] = [
    [24, 11 - c],
    [24 + c, 11],
    [BP3.tipToe[0], BP3.tipToe[1]],
    [BP3.tipHeel[0], BP3.tipHeel[1]],
    [BP3.rootHeel[0], BP3.rootHeel[1]],
    [40, 18],
    ...rest.edges,
  ];
  let s = sheetStart();
  s += drawProfile(F, prof, edges);
  s += keywayView(F, SHAFT2_KEYWAY.z0, SHAFT2_KEYWAY.z1, SHAFT2_KEYWAY.b);
  s += line(F.X(0) - 6, F.Yc, F.X(126) + 6, F.Yc, 'center');
  // Cones: pitch (dash-dot to the apex), root (thin).
  let cones = '';
  const pe = (RE + 4) / RE;
  for (const sg of [1, -1] as const) {
    cones += line(F.X(0), F.Yc, F.X(BP3.pitchHeel[0] * pe), F.Y(BP3.pitchHeel[1] * pe, sg), 'center');
    cones += line(F.X(BP3.rootToe[0]), F.Y(BP3.rootToe[1], sg), F.X(BP3.rootHeel[0]), F.Y(BP3.rootHeel[1], sg), 'thin');
  }
  s += `<g data-note="pinion"><rect class="hit" x="${f(F.X(BP3.tipToe[0]))}" y="${f(F.Y(BP3.tipHeel[1]))}" width="${f((BP3.rootHeel[0] - BP3.tipToe[0]) * S)}" height="${f(
    (BP3.tipHeel[1] - 12) * S,
  )}" rx="1.5"/>${cones}</g>`;
  s += `<g data-note="apex"><rect class="hit" x="${f(F.X(0) - 5)}" y="${f(F.Yc - 5)}" width="10" height="10" rx="1.5"/>${circle(F.X(0), F.Yc, 1.2, 'thin')}</g>`;
  s += leader(F.X(0) - 0.8, F.Yc - 0.8, F.X(0) - 10, F.Yc - 24, lt(L('връх', 'apex')), 'apex', false);

  // Chain: the pinion part counts as one step [24, 40].
  const chainSteps: ShaftStep[] = [{ s0: 24, s1: 40, d: 2 * BP3.tipHeel[1] }, ...SH2];
  s += lengthChain(F, chainSteps, 5, F.Yc - 56, F.Yc - 66, 'total', chainSteps.map(() => 'len'));
  s += stepDiameters(F, SH2);
  // Bevel dimensions: Rₑ and b along the lower pitch line, mounting distance, tip diameter.
  const ph = BP3.pitchHeel;
  const pt = BP3.pitchToe;
  s += dim(F.X(0), F.Yc, F.X(ph[0]), F.Y(ph[1], -1), -12, `Rₑ ${nb(RE, 2)}`, { note: 'Re', size: 3 });
  s += dim(F.X(pt[0]), F.Y(pt[1], -1), F.X(ph[0]), F.Y(ph[1], -1), -26, `${BB}`, { note: 'b', size: 3 });
  s += hd(F.X(0), F.Yc + 2, F.X(42), F.Y(15, -1), F.Yc + 66, '42', { note: 'mount' });
  s += leader(F.X(BP3.tipHeel[0]) + 0.5, F.Y(BP3.tipHeel[1]) - 0.5, F.X(BP3.tipHeel[0]) + 4, F.Yc - 74, `ø${nb(BP3.dae, 2)}h11`, 'dae');
  // Keyway of the gear seat.
  const yk = F.Yc + 46;
  s += hd(F.X(72), F.Y(13, -1), F.X(SHAFT2_KEYWAY.z0), F.Yc + 8, yk, '3', { note: 'keypos', outside: true });
  s += hd(F.X(SHAFT2_KEYWAY.z0), F.Yc + 8, F.X(SHAFT2_KEYWAY.z1), F.Yc + 8, yk, '16', { note: 'keypos' });
  s += cutMarks(F.X(88), F.Yc, 13 * S, 'A');
  s += keySection(362, 158, S, 'A', { d: 26, b: 8, t1: 4, bTol: N9_8 }, { section: 'section', width: 'keyway', depth: 'depth' });
  s += chamferLeader(F, 126, 10, 10, true);

  s += dataTable(314, 16, L('ДАННИ ЗА КОНИЧНОТО КОЛЕЛО', 'BEVEL GEAR DATA'), [
    [L('Модул (външен)', 'Outer module'), 'mₑ', nb(MB, 1), 'me'],
    [L('Брой зъби', 'Number of teeth'), 'z', String(Z3), 'z'],
    [L('Форма на зъба', 'Tooth form'), '—', lt(L('прави', 'straight')), 'form'],
    [L('Изходен контур', 'Basic rack'), 'αₙ', '20°', 'alpha'],
    [L('Делителен конус', 'Pitch cone'), 'δ', dms(DELTA3), 'delta'],
    [L('Конус на върховете', 'Face cone'), 'δa', dms(DELTA3 + BP3.thetaA), 'deltaA'],
    [L('Външно конусно разст.', 'Outer cone dist.'), 'Rₑ', nb(RE, 2), 'Re'],
    [L('Ширина', 'Face width'), 'b', String(BB), 'b'],
    [L('Външен делит. диаметър', 'Outer pitch dia.'), 'dₑ', nb(DE3, 1), 'de'],
    [L('Коеф. на изместване', 'Profile shift'), 'x', '0', 'x'],
    [L('Монтажно разстояние', 'Mounting distance'), '—', '42', 'mount'],
    [L('Степен на точност', 'Accuracy grade'), '—', '8 (ISO 17485)', 'grade'],
    [L('Спрегнато колело', 'Mating gear'), 'z₄', `${Z4} (EL-HB-005)`, 'mate'],
    [L('Ъгъл между осите', 'Shaft angle'), 'Σ', '90°', 'sigma'],
  ], [44, 12, 34]);

  // Tolerancing: A on the ø20 seat (bearing A), B on the ø30 seat (bearing B).
  {
    s += datum(F.X(116.5), F.Y(10, -1), 'A', 'down', 5, 'datum') + datum(F.X(44.5), F.Y(15, -1), 'B', 'down', 5, 'datum');
    s += fcf(F.X(78) - FH / 2, F.Yc - 50, 'runout', '0,02', ['A-B'], { to: [F.X(78), F.Y(13) - 0.6], note: 'runout' });
    // Teeth of the bevel pinion: runout of the face cone.
    const mid: [number, number] = [(BP3.tipToe[0] + BP3.tipHeel[0]) / 2, (BP3.tipToe[1] + BP3.tipHeel[1]) / 2];
    s += fcf(F.X(0) + 2, F.Yc - 50, 'runout', '0,04', ['A-B'], { from: 'right', to: [F.X(mid[0]) - 0.4, F.Y(mid[1]) - 0.5], note: 'runout' });
    // Both shoulders the bearings bear against (faces towards +s).
    s += fcf(F.X(94) + 4, F.Yc - 50, 'runout', '0,02', ['A-B'], {
      knee: [F.X(118), F.Y(11)],
      to: [F.X(114) + 0.6, F.Y(11)],
      arrowAngle: Math.PI,
      note: 'axrunout',
    });
    s += fcf(F.X(55) + 4, F.Yc - 50, 'runout', '0,02', ['A-B'], { knee: [F.X(46), F.Y(16.5)], to: [F.X(42) + 0.6, F.Y(16.5)], arrowAngle: Math.PI, note: 'axrunout' });
    s += fcf(338, 202, 'sym', '0,02', ['A-B'], { from: 'top', knee: [341.8, 196], to: [362 + 18 + 1.2, 158 + 8 + 0.4], note: 'sym' });
    s += centreHole(F.X(24), F.Yc, S, -1, null, 'centre') + centreHole(F.X(126), F.Yc, S, 1, null, 'centre');
    s += detailMark(F.X(114), F.Y(10), 6, 'X', 'detail') + undercutDetail(292, 218, 8, 2, 'X', true);
    s += part3d(24, 13, 66, 30, 'shaft2', lt(L('изглед за справка', 'reference view')));
  }

  s += generalRoughness(372, 236);
  s += requirements(26, 206, [
    { t: L('Зъбите: циментиране и закаляване 58…62 HRC, дълбочина 0,6…0,9 mm.', 'Teeth: case-hardened 58…62 HRC, depth 0.6…0.9 mm.'), key: 'case' },
    { t: L('Монтажното разстояние 42 се спазва с подложки при сглобяване.', 'The mounting distance 42 is set with shims at assembly.'), key: 'mount' },
    { t: L('Неуказани фаски 0,5×45°, радиуси R0,5.', 'Chamfers not shown 0.5×45°, radii R0.5.'), key: 'chamfer' },
    { t: L('Общи допуски ISO 2768-mK.', 'General tolerances ISO 2768-mK.'), key: 'iso2768' },
    { t: L('Лагери 6006 (ø30 k6) и 6004 (ø20 k6).', 'Bearings 6006 (ø30 k6) and 6004 (ø20 k6).'), key: 'k6' },
    { t: L('Центрови отвори ISO 6411-A2/4,25 в двата края.', 'Centre holes ISO 6411-A2/4.25 at both ends.'), key: 'centre' },
  ]);
  s += titleBlock(410, 287, {
    name: lt(L('Междинен вал с конично колело', 'Intermediate shaft with bevel pinion')),
    material: '18CrNiMo7-6 (EN 10084)',
    scale: '2:1',
    number: 'EL-HB-002',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '4/7',
    mass: `${nb(steelMass([{ s0: 24, s1: 40, d: 30 }, ...SH2]), 2)} kg`,
  });
  return s + sheetEnd();
}

// ============================================================================ shaft 3
export const SH3: ShaftStep[] = [
  { s0: 8, s1: 28, d: 26, label: 'ø26k6', tol: K6, key: 'seat', ra: '0,8', at: 9.5 },
  { s0: 28, s1: 34, d: 32, label: 'ø32', key: 'shoulder' },
  { s0: 34, s1: 47, d: 30, label: 'ø30k6', tol: K6, key: 'k6', ra: '0,8' },
  { s0: 47, s1: 100, d: 28, label: 'ø28', key: 'free' },
  { s0: 100, s1: 112, d: 25, label: 'ø25k6', tol: K6, key: 'k6', ra: '0,8' },
  { s0: 112, s1: 160, d: 22, label: 'ø22k6', tol: K6, key: 'end', ra: '0,8', at: 116 },
];

export const shaft3Notes: Record<string, DrawingNote> = {
  ...COMMON_NOTES,
  qt: N(
    L('Подобряване 42CrMo4', 'Quenched and tempered 42CrMo4'),
    L(
      'Закаляване и високо отвръщане до 28…32 HRC: висока якост на умора при огъване и усукване – изходящият вал предава най-големия момент.',
      'Quenching and high tempering to 28…32 HRC: high fatigue strength in bending and torsion – the output shaft carries the largest torque.',
    ),
  ),
};

function shaft3Svg(): string {
  const F = frame(34, 8, 100, S);
  const { prof, edges } = stepProfile(SH3, 1);
  let s = sheetStart();
  s += drawProfile(F, prof, edges);
  s += keywayView(F, SHAFT3_KEYWAY.z0, SHAFT3_KEYWAY.z1, SHAFT3_KEYWAY.b) + keywayView(F, SHAFT3_OUT_KEYWAY.z0, SHAFT3_OUT_KEYWAY.z1, SHAFT3_OUT_KEYWAY.b);
  s += line(F.X(8) - 6, F.Yc, F.X(160) + 6, F.Yc, 'center');
  s += lengthChain(F, SH3, 3, F.Yc - 44, F.Yc - 54, 'total', SH3.map(() => 'len'));
  s += stepDiameters(F, SH3);
  const yk = F.Yc + 46;
  s += hd(F.X(8), F.Y(13, -1), F.X(SHAFT3_KEYWAY.z0), F.Yc + 8, yk, '3', { note: 'keypos', outside: true });
  s += hd(F.X(SHAFT3_KEYWAY.z0), F.Yc + 8, F.X(SHAFT3_KEYWAY.z1), F.Yc + 8, yk, '14', { note: 'keypos' });
  s += hd(F.X(112), F.Y(11, -1), F.X(SHAFT3_OUT_KEYWAY.z0), F.Yc + 6, yk, '8', { note: 'keypos', outside: true });
  s += hd(F.X(SHAFT3_OUT_KEYWAY.z0), F.Yc + 6, F.X(SHAFT3_OUT_KEYWAY.z1), F.Yc + 6, yk, '30', { note: 'keypos' });
  s += cutMarks(F.X(22), F.Yc, 13 * S, 'A', -1);
  s += cutMarks(F.X(135), F.Yc, 11 * S, 'B');
  s += keySection(262, 194, S, 'A', { d: 26, b: 8, t1: 4, bTol: N9_8 }, { section: 'section', width: 'keyway', depth: 'depth' });
  s += keySection(346, 194, S, 'B', { d: 22, b: 6, t1: 3.5, bTol: N9_6 }, { section: 'section', width: 'keyway', depth: 'depth' });
  // One label for both end chamfers (the left one would cover the runout frame of the gear seat).
  s += leader(F.X(160) - 0.6, F.Y(11) + 0.6, F.X(160) + 10, F.Y(11) - 16, '1×45° (2×)', 'chamfer');

  // Tolerancing: A on the ø30 seat (bearing A), B on the ø25 seat (bearing B).
  {
    s += datum(F.X(36.5), F.Y(15, -1), 'A', 'down', 5, 'datum') + datum(F.X(102.5), F.Y(12.5, -1), 'B', 'down', 5, 'datum');
    s += fcf(F.X(12) - FH / 2, F.Yc - 40, 'runout', '0,02', ['A-B'], { to: [F.X(12), F.Y(13) - 0.6], note: 'runout' });
    s += fcf(F.X(140) - FH / 2, F.Yc - 40, 'runout', '0,02', ['A-B'], { to: [F.X(140), F.Y(11) - 0.6], note: 'runout' });
    s += fcf(F.X(49) + 4, F.Yc - 40, 'runout', '0,02', ['A-B'], { knee: [F.X(38), F.Y(15.5)], to: [F.X(34) + 0.6, F.Y(15.5)], arrowAngle: Math.PI, note: 'axrunout' });
    s += fcf(F.X(84), F.Yc - 40, 'runout', '0,02', ['A-B'], { knee: [F.X(104), F.Y(13.2)], to: [F.X(100) + 0.6, F.Y(13.2)], arrowAngle: Math.PI, note: 'axrunout' });
    s += fcf(240, 236, 'sym', '0,02', ['A-B'], { from: 'top', knee: [243.8, 232], to: [262 + 18 + 1.2, 194 + 8 + 0.4], note: 'sym' });
    s += fcf(326, 232, 'sym', '0,02', ['A-B'], { from: 'top', knee: [329.8, 228], to: [346 + 15 + 1.2, 194 + 6 + 0.4], note: 'sym' });
    s += centreHole(F.X(8), F.Yc, S, -1, null, 'centre') + centreHole(F.X(160), F.Yc, S, 1, null, 'centre');
    s += detailMark(F.X(34), F.Y(15), 6, 'X', 'detail') + undercutDetail(150, 186, 6, 1, 'X', true);
    s += part3d(24, 13, 80, 26, 'shaft3', lt(L('изглед за справка', 'reference view')));
  }

  s += generalRoughness(372, 236);
  s += requirements(26, 220, [
    { t: L('Подобряване 28…32 HRC.', 'Quenched and tempered 28…32 HRC.'), key: 'qt' },
    { t: L('Неуказани фаски 0,5×45°, радиуси R0,5.', 'Chamfers not shown 0.5×45°, radii R0.5.'), key: 'chamfer' },
    { t: L('Общи допуски ISO 2768-mK.', 'General tolerances ISO 2768-mK.'), key: 'iso2768' },
    { t: L('Лагери 6006 (ø30 k6) и 6005 (ø25 k6).', 'Bearings 6006 (ø30 k6) and 6005 (ø25 k6).'), key: 'k6' },
    { t: L('Сглобка с колелото z₄: ø26 H7/k6.', 'Fit with gear z₄: ø26 H7/k6.'), key: 'seat' },
    { t: L('Центрови отвори ISO 6411-A2/4,25 в двата края.', 'Centre holes ISO 6411-A2/4.25 at both ends.'), key: 'centre' },
  ]);
  s += titleBlock(410, 287, {
    name: lt(L('Изходящ вал', 'Output shaft')),
    material: '42CrMo4 (EN 10083-3)',
    scale: '2:1',
    number: 'EL-HB-003',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '5/7',
    mass: `${nb(steelMass(SH3), 2)} kg`,
  });
  return s + sheetEnd();
}

export const shaft1Sheet = { id: 'shaft1', title: L('Вал 1 (входящ)', 'Shaft 1 (input)'), render: shaft1Svg, notes: shaft1Notes };
export const shaft2Sheet = { id: 'shaft2', title: L('Вал 2 (междинен)', 'Shaft 2 (intermediate)'), render: shaft2Svg, notes: shaft2Notes };
export const shaft3Sheet = { id: 'shaft3', title: L('Вал 3 (изходящ)', 'Shaft 3 (output)'), render: shaft3Svg, notes: shaft3Notes };
