/** Part drawings of the helical gear z₂ and the bevel gear z₄. */
import type { DrawingNote } from '../../../core/types';
import { lt } from '../../../i18n';
import { circle, dim, f, leader, line, note, part3d, path, polyline, roughness, sheetEnd, sheetStart, titleBlock } from '../../../ui/svgdraw';
import { datum, fcf, FH, iso1328 } from '../../../ui/gdt';
import { helicalSpan, W_EI, W_ES } from '../measure';
import { A1, B2, BB, BETA, D2, DE4, DELTA4, GEAR2_BODY, KEY2, KEY3, MB, MN, RE, Z1, Z2, Z3, Z4 } from '../params';
import { bevelProfile, HEL } from './derived';
import { BEVEL_NOTES, HELICAL_NOTES } from './gearNotes';
import { COMMON_NOTES, L, N, T, dataTable, diaInside, dms, generalRoughness, hd, nb, requirements, vd } from './kit';

type P = [number, number];
const pd = (pts: P[]): string => pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('') + 'Z';
const hatched = (pts: P[]): string => path(pd(pts), 'hatch') + polyline(pts, 'thick', true);

/** Bore with a hub keyway on the top, seen along the axis, centre (x, y), scale k. */
function keyedBore(x: number, y: number, r: number, b: number, t2: number, k: number): string {
  const R = r * k;
  const kb = (b / 2) * k;
  const kT = (r + t2) * k;
  const kE = Math.sqrt(R * R - kb * kb);
  return path(
    `M${f(x - kb)} ${f(y - kE)}L${f(x - kb)} ${f(y - kT)}L${f(x + kb)} ${f(y - kT)}L${f(x + kb)} ${f(y - kE)}A${f(R)} ${f(R)} 0 1 1 ${f(x - kb)} ${f(y - kE)}Z`,
    'thick',
  );
}

const HUB_NOTES: Record<string, DrawingNote> = {
  bore: N(
    L('Отвор H7', 'Bore H7'),
    L(
      'Система на отвора: отворът е H7 (0…+0,021), валът k6. Получава се преходна сглобка – колелото се центрира точно, а моментът се предава от шпонката.',
      'Hole-basis system: the bore is H7 (0…+0.021), the shaft k6. The result is a transition fit – the gear is centred accurately and the key transmits the torque.',
    ),
  ),
  hubkey: N(
    L('Канал в главината JS9', 'Hub keyway JS9'),
    L(
      'Полето JS9 (симетрично ±) на канала в главината дава малко по-свободна сглобка от N9 на вала – колелото се надява по-лесно.',
      'The JS9 zone (symmetric ±) of the hub keyway gives a slightly looser fit than N9 on the shaft – the gear slides on more easily.',
    ),
  ),
  hubdepth: N(
    L('Дълбочина d + t₂', 'Depth d + t₂'),
    L('Мери се от отсрещната страна на отвора до дъното на канала. Допускът е само в плюс.', 'Measured from the opposite side of the bore to the bottom of the keyway. The tolerance is plus only.'),
  ),
  hub: N(L('Главина', 'Hub'), L('Главината е по-широка от диска и носи отвора с шпонковия канал.', 'The hub is wider than the web and carries the bore with the keyway.')),
  fit: N(
    L('Сглобка ø26 H7/k6', 'Fit ø26 H7/k6'),
    L('Отвор H7 (0…+0,021) и вал k6 (+0,002…+0,015): от хлабина 0,019 до натяг 0,015 mm.', 'Bore H7 (0…+0.021) and shaft k6 (+0.002…+0.015): from 0.019 mm clearance to 0.015 mm interference.'),
  ),
};

// ============================================================================ helical gear z₂
export const gear2Notes: Record<string, DrawingNote> = {
  ...COMMON_NOTES,
  ...HELICAL_NOTES,
  ...HUB_NOTES,
  halfsection: N(
    L('Полуразрез', 'Half section'),
    L(
      'Горната половина е разрез, долната – изглед. При симетричен детайл така на една фигура се виждат и вътрешната форма (венец, диск, главина), и външната (наклонът на зъбите).',
      'The upper half is a section, the lower a view. For a symmetric part one figure then shows both the inside (rim, web, hub) and the outside (the hand of the teeth).',
    ),
  ),
  rim: N(L('Венец ø88', 'Rim ø88'), L('Под зъбите остава венец, дебел поне 2,5…3 модула, за да не се пукне при огъване на зъба.', 'Under the teeth a rim at least 2.5…3 modules thick remains, so it does not crack when the tooth bends.')),
  web: N(L('Диск 8 mm', 'Web 8 mm'), L('Тънкият диск с отвори олекотява колелото, без да намалява твърдостта на венеца.', 'The thin web with holes makes the gear lighter without weakening the rim.')),
  holes: N(L('Олекотяващи отвори', 'Lightening holes'), L('6 отвора ø13 на окръжност ø66 – по-малка маса и инерция.', '6 holes ø13 on a ø66 circle – less mass and inertia.')),
  endview: N(L('Изглед отстрани (1:1)', 'Side view (1:1)'), L('Показва отворите в диска и шпонковия канал. Зъбите – само с окръжността на върховете и делителната окръжност.', 'Shows the holes in the web and the keyway. The teeth only as the tip and pitch circles.')),
  radii: N(L('Радиуси R2', 'Radii R2'), L('Преходите диск–венец и диск–главина са закръглени, за да няма концентрация на напрежения.', 'The web-to-rim and web-to-hub transitions are rounded to avoid stress concentration.')),
  nitr: N(
    L('Азотиране', 'Nitriding'),
    L(
      'След подобряване повърхността се насища с азот при ~520 °C: твърдост ≥ 600 HV в слой 0,3…0,5 mm, почти без деформации – зъбите не се шлифоват след това.',
      'After quenching and tempering the surface is enriched with nitrogen at ~520 °C: hardness ≥ 600 HV in a 0.3…0.5 mm layer, almost without distortion – the teeth need no grinding afterwards.',
    ),
  ),
};

function gear2Svg(): string {
  const B = GEAR2_BODY;
  const k = 2;
  const Xm = 82;
  const Ym = 142;
  const ra = (HEL.da2 / 2) * k;
  const rp = (D2 / 2) * k;
  const rf = (HEL.df2 / 2) * k;
  const rri = B.rimInner * k;
  const rh = B.hubR * k;
  const rb = B.bore * k;
  const kTop = (B.bore + KEY2.t2) * k;
  const w = B2 * k;
  const ww = (B.web / 2) * k;
  const hIn = (B.holePitchR - B.holeR) * k;
  const hOut = (B.holePitchR + B.holeR) * k;
  const x0 = Xm - w / 2;
  const x1 = Xm + w / 2;
  const c = 1 * k;
  const y = (r: number): number => Ym - r;

  let s = sheetStart();
  // Upper half: section through a lightening hole and the keyway.
  const hubWeb: P[] = [
    [x0, y(kTop)],
    [x0, y(rh)],
    [Xm - ww, y(rh)],
    [Xm - ww, y(hIn)],
    [Xm + ww, y(hIn)],
    [Xm + ww, y(rh)],
    [x1, y(rh)],
    [x1, y(kTop)],
  ];
  const rimWeb: P[] = [
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
  const sec = hatched(hubWeb) + hatched(rimWeb) + line(x0, y(rf), x1, y(rf));
  // Lower half: view – outline of the rim, pitch line and the hand of the helix (left hand: up to the right).
  let view = polyline([
    [x0, Ym],
    [x0, Ym + ra - c],
    [x0 + c, Ym + ra],
    [x1 - c, Ym + ra],
    [x1, Ym + ra - c],
    [x1, Ym],
  ]);
  view += line(x0 + c, Ym + ra, x0 + c, Ym) + line(x1 - c, Ym + ra, x1 - c, Ym);
  const dy = (w - 8) * Math.tan(BETA);
  view += [40, 56, 72].map((o) => line(x0 + 4, Ym + o + dy / 2, x1 - 4, Ym + o - dy / 2, 'thin')).join('');
  s += note('halfsection', sec + view, { x: x0, y: y(ra), w, h: 2 * ra });
  for (const sg of [1, -1]) s += line(x0 - 5, Ym - sg * rp, x1 + 5, Ym - sg * rp, 'center');
  s += line(x0 - 8, Ym, x1 + 8, Ym, 'center');
  s += T(Xm, y(ra) - 16, L('Полуразрез (2:1)', 'Half section (2:1)'), { size: 3.4, cls: 'label' });

  s += vd(x0 + c, Ym + ra, x0 + c, y(ra), x0 - 16, `ø${nb(HEL.da2, 0)}h11`, { note: 'da', tol: ['0', '−0,220'] });
  s += vd(x1, y(rb), x1, y(-rb), x1 + 10, 'ø26H7', { note: 'bore', tol: ['+0,021', '0'], size: 3 });
  s += vd(x1, y(rh), x1, Ym + rh, x1 + 24, 'ø44', { note: 'hub' });
  s += vd(Xm + ww, y(rri), Xm + ww, Ym + rri, x1 + 38, 'ø88', { note: 'rim' });
  s += hd(x0, y(ra) + c, x1, y(ra) + c, y(ra) - 8, String(B2), { note: 'len' });
  s += hd(Xm - ww, y(hIn), Xm + ww, y(hIn), y((hIn + hOut) / 2), String(B.web), { note: 'web', outside: true, size: 3 });
  s += leader(x0 + 0.7, y(ra) + 0.7, x0 - 12, y(ra) - 8, '1×45°', 'chamfer', false);
  s += leader(Xm - ww - 0.3, y(rri) + 0.3, x0 - 6, y((rri + hOut) / 2) - 4, 'R2', 'radii', false);
  s += roughness(Xm - 4, y(rb), '1,6', 'ra16', true);

  // Side view, 1:1.
  const Xe = 222;
  const Ye = 150;
  let ev = circle(Xe, Ye, HEL.da2 / 2) + circle(Xe, Ye, D2 / 2, 'center');
  ev += circle(Xe, Ye, B.rimInner) + circle(Xe, Ye, B.hubR) + circle(Xe, Ye, B.holePitchR, 'center');
  for (let i = 0; i < B.holes; i++) {
    const a = Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / B.holes;
    ev += circle(Xe + B.holePitchR * Math.cos(a), Ye - B.holePitchR * Math.sin(a), B.holeR);
  }
  ev += keyedBore(Xe, Ye, B.bore, KEY2.b, KEY2.t2, 1);
  s += note('endview', ev, { x: Xe - 18, y: Ye + HEL.da2 / 2 + 2, w: 36, h: 10 });
  s += line(Xe - HEL.da2 / 2 - 5, Ye, Xe + HEL.da2 / 2 + 5, Ye, 'center') + line(Xe, Ye - HEL.da2 / 2 - 5, Xe, Ye + HEL.da2 / 2 + 5, 'center');
  s += T(Xe, Ye - HEL.da2 / 2 - 10, L('Изглед отстрани (1:1)', 'Side view (1:1)'), { size: 3.4, cls: 'label' });
  const ha = Math.PI / 2 - Math.PI / 6;
  s += leader(
    Xe + B.holePitchR * Math.cos(ha) + B.holeR * 0.7,
    Ye - B.holePitchR * Math.sin(ha) - B.holeR * 0.7,
    Xe + 40,
    Ye - 62,
    lt(L('6× ø13 на ø66', '6× ø13 on ø66')),
    'holes',
  );
  s += leader(Xe + KEY2.b / 2, Ye - B.bore - KEY2.t2 + 0.4, Xe - 20, Ye - 66, '8JS9 (±0,018)', 'hubkey', false);
  s += diaInside(Xe + 2.2, Ye - KEY2.t2 / 2, B.bore + KEY2.t2 / 2, nb(2 * B.bore + KEY2.t2, 1), { note: 'hubdepth', tol: ['+0,2', '0'], size: 2.4 });

  // Tolerancing: the bore is datum A; runout of the teeth and of the rim face, the keyway centred.
  const tol2 = iso1328(7, MN, D2, B2);
  const um = (v: number): string => nb(v / 1000, 3);
  s += datum(x1 + 10, Ym + rb + 0.4, 'A', 'down', 12, 'bore');
  s += fcf(Xe - FH / 2, Ye + HEL.da2 / 2 + 8, 'runout', um(tol2.Fr), ['A'], { from: 'top', to: [Xe, Ye + HEL.da2 / 2 + 0.6], note: 'runout' });
  s += fcf(x1 + 14, y(ra) + 5, 'runout', '0,02', ['A'], { from: 'left', to: [x1 + 0.6, y(ra) + 8.8], arrowAngle: Math.PI, note: 'axrunout' });
  // Symmetry of the hub keyway: the frame hangs under its width dimension (8JS9).
  s += fcf(Xe - 64, Ye - 64.6, 'sym', '0,02', ['A'], { note: 'sym' }) + line(Xe - 64 + FH / 2, Ye - 64.6, Xe - 64 + FH / 2, Ye - 66, 'thin');
  const span = helicalSpan(MN, Z2);
  s += part3d(300, 140, 104, 58, 'gear2', lt(L('изглед за справка', 'reference view')));

  s += dataTable(300, 16, L('ДАННИ ЗА ЗЪБНОТО КОЛЕЛО', 'GEAR DATA'), [
    [L('Нормален модул', 'Normal module'), 'mₙ', nb(MN, 0), 'mn'],
    [L('Брой зъби', 'Number of teeth'), 'z', String(Z2), 'z'],
    [L('Ъгъл на наклона', 'Helix angle'), 'β', dms(BETA), 'beta'],
    [L('Посока на наклона', 'Hand of helix'), '—', lt(L('лява', 'left')), 'hand'],
    [L('Изходен контур', 'Basic rack'), 'αₙ', '20°, ISO 53', 'alpha'],
    [L('Коеф. на изместване', 'Profile shift'), 'x', '0', 'x'],
    [L('Делителен диаметър', 'Pitch diameter'), 'd', nb(D2, 3), 'd'],
    [L('Ширина на венеца', 'Face width'), 'b', String(B2), 'b'],
    [L('Степен на точност', 'Accuracy grade'), '—', '7 (ISO 1328)', 'grade'],
    [L('Спрегнато колело', 'Mating gear'), 'z₁', `${Z1} (EL-HB-001)`, 'mate'],
    [L('Междуосие', 'Centre distance'), 'a', `${A1} ± 0,025`, 'a'],
    [L('Брой зъби в размера', 'Teeth spanned'), 'k', String(span.k), 'span'],
    [L('Размер през k зъба', 'Span measurement'), 'W', `${nb(span.W, 3)} ${nb(W_ES, 2)}/${nb(W_EI, 2)}`, 'span'],
    [L('Единична стъпка', 'Single pitch'), 'fpt', `±${um(tol2.fpt)}`, 'iso1328'],
    [L('Натрупана стъпка', 'Cumulative pitch'), 'Fp', um(tol2.Fp), 'iso1328'],
    [L('Профил', 'Profile'), 'Fα', um(tol2.Fa), 'iso1328'],
    [L('Линия на зъба', 'Helix'), 'Fβ', um(tol2.Fb), 'iso1328'],
    [L('Радиално биене', 'Radial runout'), 'Fr', um(tol2.Fr), 'iso1328'],
  ]);

  s += generalRoughness(372, 236);
  s += requirements(26, 262, [
    { t: L('Подобряване 28…32 HRC, азотиране ≥ 600 HV, слой 0,3…0,5 mm.', 'Q+T 28…32 HRC, nitrided ≥ 600 HV, layer 0.3…0.5 mm.'), key: 'nitr' },
    { t: L('Неуказани радиуси R2, фаски 0,5×45°. Общи допуски ISO 2768-mK.', 'Radii not shown R2, chamfers 0.5×45°. General tolerances ISO 2768-mK.'), key: 'iso2768' },
    { t: L('Сглобка с вала: ø26 H7/k6, шпонка 8×7×16.', 'Fit on the shaft: ø26 H7/k6, key 8×7×16.'), key: 'fit' },
  ]);
  s += titleBlock(410, 287, {
    name: lt(L(`Косозъбо колело z = ${Z2}`, `Helical gear z = ${Z2}`)),
    material: '42CrMo4 (EN 10083-3)',
    scale: '2:1 (1:1)',
    number: 'EL-HB-004',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '6/7',
    mass: '0,86 kg',
  });
  return s + sheetEnd();
}

// ============================================================================ bevel gear z₄
const BP4 = bevelProfile(Z4, DELTA4);
const DISK_R = DE4 / 2 - 4;
const HUB_R = 20;
const REAR = 28; // rear (locating) face, = shoulder of the output shaft

export const gear4Notes: Record<string, DrawingNote> = {
  ...COMMON_NOTES,
  ...BEVEL_NOTES,
  ...HUB_NOTES,
  section: N(
    L('Осов разрез', 'Axial section'),
    L(
      'Разрезът минава през оста. Линиите на върховете и на петите сочат към върха на конуса; челото на широкия край е по допълнителния конус – перпендикулярно на делителния.',
      'The section passes through the axis. The tip and root lines point to the cone apex; the face at the wide end lies on the back cone – perpendicular to the pitch cone.',
    ),
  ),
  heel: N(
    L('11,49 – от ръба до опорното чело', '11.49 – from the edge to the locating face'),
    L(
      'Разстоянието от ръба на върховете при широкия край до опорното чело. По него се стругова заготовката и се проверява монтажното разстояние.',
      'The distance from the tip edge at the wide end to the locating face. The blank is turned to it and the mounting distance is checked with it.',
    ),
  ),
  contact: N(
    L('Контактно петно', 'Contact pattern'),
    L(
      'Двойката се проверява с боя: петното трябва да е по средата на зъба и да заема поне 60 % от дължината му. Ако е в края – монтажното разстояние се коригира с подложки.',
      'The pair is checked with marking paste: the pattern must be in the middle of the tooth over at least 60 % of its length. If it is at an end, the mounting distance is corrected with shims.',
    ),
  ),
  disk: N(L('Опорен диск', 'Backing disc'), L('Диск зад зъбите – прави колелото твърдо срещу осовата сила.', 'A disc behind the teeth – it makes the gear stiff against the axial force.')),
  endview: N(L('Изглед откъм главината (1:1)', 'View from the hub (1:1)'), L('Показва отвора с шпонковия канал.', 'Shows the bore with the keyway.')),
};

function gear4Svg(): string {
  const k = 2;
  const X0 = 64; // apex
  const Ym = 140;
  const X = (sx: number): number => X0 + k * sx;
  const Y = (r: number, sg: 1 | -1 = 1): number => Ym - sg * k * r;
  const p = BP4;
  const zBack = p.rootHeel[0];

  let s = sheetStart();
  let sec = '';
  for (const sg of [1, -1] as const) {
    const inner = sg === 1 ? 13 + KEY3.t2 : 13;
    const poly: [number, number][] = [
      [p.rootToe[0], inner],
      p.rootToe,
      p.tipToe,
      p.tipHeel,
      p.rootHeel,
      [zBack, DISK_R],
      [zBack + 4, DISK_R],
      [zBack + 4, HUB_R],
      [REAR, HUB_R],
      [REAR, inner],
    ];
    sec += hatched(poly.map(([a, r]) => [X(a), Y(r, sg)] as P));
    sec += line(X(p.rootToe[0]), Y(p.rootToe[1], sg), X(p.rootHeel[0]), Y(p.rootHeel[1], sg));
  }
  // Edge of the bore below the keyway (seen through the cut).
  sec += line(X(p.rootToe[0]), Y(Math.sqrt(13 * 13 - 16)), X(REAR), Y(Math.sqrt(13 * 13 - 16)));
  s += note('section', sec, { x: X(p.tipToe[0]), y: Y(p.tipHeel[1]), w: (REAR - p.tipToe[0]) * k, h: 2 * k * p.tipHeel[1] });
  let cones = '';
  const pe = (RE + 5) / RE;
  for (const sg of [1, -1] as const) cones += line(X(0), Ym, X(p.pitchHeel[0] * pe), Y(p.pitchHeel[1] * pe, sg), 'center');
  s += cones + line(X(0) - 6, Ym, X(REAR) + 8, Ym, 'center');
  s += note('apex', circle(X(0), Ym, 1.2, 'thin'), { x: X(0) - 5, y: Ym - 5, w: 10, h: 10 });
  s += leader(X(0) - 0.8, Ym + 0.8, X(0) - 10, Ym + 24, lt(L('връх', 'apex')), 'apex', false);
  s += T(X(14), Y(p.tipHeel[1]) - 26, L('Осов разрез (2:1)', 'Axial section (2:1)'), { size: 3.4, cls: 'label' });

  // Dimensions.
  s += vd(X(p.tipHeel[0]), Y(p.tipHeel[1], -1), X(p.tipHeel[0]), Y(p.tipHeel[1]), X(REAR) + 52, `ø${nb(p.dae, 2)}h11`, {
    note: 'dae',
    tol: ['0', '−0,190'],
  });
  s += vd(X(REAR), Y(13, -1), X(REAR), Y(13), X(REAR) + 10, 'ø26H7', { note: 'bore', tol: ['+0,021', '0'], size: 3 });
  s += vd(X(REAR), Y(HUB_R, -1), X(REAR), Y(HUB_R), X(REAR) + 24, 'ø40', { note: 'hub' });
  s += vd(X(zBack + 4), Y(DISK_R, -1), X(zBack + 4), Y(DISK_R), X(REAR) + 38, `ø${nb(2 * DISK_R, 0)}`, { note: 'disk' });
  s += hd(X(p.tipHeel[0]), Y(p.tipHeel[1]), X(REAR), Y(HUB_R), Y(p.tipHeel[1]) - 10, nb(REAR - p.tipHeel[0], 2), { note: 'heel', size: 3 });
  s += hd(X(0), Ym + 2, X(REAR), Y(HUB_R, -1), Y(p.tipHeel[1], -1) + 16, String(REAR), { note: 'mount' });
  const ph = p.pitchHeel;
  const pt = p.pitchToe;
  s += dim(X(pt[0]), Y(pt[1]), X(ph[0]), Y(ph[1]), 14, String(BB), { note: 'b', size: 3 });
  s += dim(X(0), Ym, X(ph[0]), Y(ph[1], -1), -12, `Rₑ ${nb(RE, 2)}`, { note: 'Re', size: 3 });
  s += leader(X(p.tipToe[0]) - 0.5, Y(p.tipToe[1]) + 0.3, X(p.tipToe[0]) - 14, Y(p.tipToe[1]) - 8, '0,5×45°', 'chamfer', false);
  s += roughness(X(REAR) - 14, Y(13, -1), '1,6', 'ra16', true);

  // View from the hub, 1:1.
  const Xe = 238;
  const Ye = 150;
  let ev = circle(Xe, Ye, p.dae / 2) + circle(Xe, Ye, DE4 / 2, 'center') + circle(Xe, Ye, DISK_R) + circle(Xe, Ye, HUB_R);
  ev += keyedBore(Xe, Ye, 13, KEY3.b, KEY3.t2, 1);
  s += note('endview', ev, { x: Xe - 18, y: Ye + p.dae / 2 + 2, w: 36, h: 10 });
  s += line(Xe - p.dae / 2 - 5, Ye, Xe + p.dae / 2 + 5, Ye, 'center') + line(Xe, Ye - p.dae / 2 - 5, Xe, Ye + p.dae / 2 + 5, 'center');
  s += T(Xe, Ye - p.dae / 2 - 10, L('Изглед откъм главината (1:1)', 'View from the hub (1:1)'), { size: 3.4, cls: 'label' });
  s += leader(Xe + KEY3.b / 2, Ye - 13 - KEY3.t2 + 0.4, Xe + 26, Ye - 52, '8JS9 (±0,018)', 'hubkey');
  s += diaInside(Xe + 2.2, Ye - KEY3.t2 / 2, 13 + KEY3.t2 / 2, nb(26 + KEY3.t2, 1), { note: 'hubdepth', tol: ['+0,2', '0'], size: 2.4 });

  // Tolerancing: the bore is datum A, the locating (rear) face datum B.
  s += datum(X(REAR) + 10, Y(13, -1) + 0.4, 'A', 'down', 12, 'bore');
  s += datum(X(REAR) + 0.4, Y(16.5), 'B', 'right', 3, 'datum');
  const mid: P = [(p.tipToe[0] + p.tipHeel[0]) / 2, (p.tipToe[1] + p.tipHeel[1]) / 2];
  // ISO 17485, grade 8 (tolerance diameter ≈ dₑ): pitch and runout of the teeth.
  const g8 = 4;
  const FpT = (0.025 * DE4 + 0.3 * MB + 19) * g8;
  const fptT = (0.003 * DE4 + 0.3 * MB + 5) * g8;
  const FrT = 0.8 * FpT;
  const um = (v: number): string => nb(Math.round(v) / 1000, 3);
  s += fcf(24, 56, 'runout', um(FrT), ['A'], { from: 'right', to: [X(mid[0]) - 0.4, Y(mid[1]) - 0.4], note: 'runout' });
  s += fcf(X(REAR) + 4, Y(p.tipHeel[1], -1) + 3, 'perp', '0,015', ['A'], { from: 'top', knee: [X(REAR) + 7.8, Y(16.5, -1)], to: [X(REAR) + 0.6, Y(16.5, -1)], arrowAngle: Math.PI, note: 'perp' });
  // Chordal tooth thickness at the outer end (virtual gear zᵥ = z / cos δ).
  const zv = Z4 / Math.cos(DELTA4);
  const dv = MB * zv;
  const sn = (Math.PI * MB) / 2;
  const sChord = dv * Math.sin(sn / dv);
  const hChord = MB + (dv / 2) * (1 - Math.cos(sn / dv));
  s += part3d(300, 140, 104, 58, 'gear4', lt(L('изглед за справка', 'reference view')));

  s += dataTable(300, 16, L('ДАННИ ЗА КОНИЧНОТО КОЛЕЛО', 'BEVEL GEAR DATA'), [
    [L('Модул (външен)', 'Outer module'), 'mₑ', nb(MB, 1), 'me'],
    [L('Брой зъби', 'Number of teeth'), 'z', String(Z4), 'z'],
    [L('Форма на зъба', 'Tooth form'), '—', lt(L('прави', 'straight')), 'form'],
    [L('Изходен контур', 'Basic rack'), 'αₙ', '20°', 'alpha'],
    [L('Делителен конус', 'Pitch cone'), 'δ', dms(DELTA4), 'delta'],
    [L('Конус на върховете', 'Face cone'), 'δa', dms(DELTA4 + p.thetaA), 'deltaA'],
    [L('Външно конусно разст.', 'Outer cone dist.'), 'Rₑ', nb(RE, 2), 'Re'],
    [L('Ширина', 'Face width'), 'b', String(BB), 'b'],
    [L('Външен делит. диаметър', 'Outer pitch dia.'), 'dₑ', nb(DE4, 1), 'de'],
    [L('Коеф. на изместване', 'Profile shift'), 'x', '0', 'x'],
    [L('Монтажно разстояние', 'Mounting distance'), '—', String(REAR), 'mount'],
    [L('Степен на точност', 'Accuracy grade'), '—', '8 (ISO 17485)', 'grade'],
    [L('Спрегнато колело', 'Mating gear'), 'z₃', `${Z3} (EL-HB-002)`, 'mate'],
    [L('Ъгъл между осите', 'Shaft angle'), 'Σ', '90°', 'sigma'],
    [L('Хордална дебелина (външна)', 'Chordal thickness (outer)'), 's̄ₑ', `${nb(sChord, 3)} −0,05/−0,10`, 'chordal'],
    [L('Хордална височина', 'Chordal height'), 'h̄ₐₑ', nb(hChord, 3), 'chordal'],
    [L('Единична стъпка', 'Single pitch'), 'fpt', `±${um(fptT)}`, 'iso1328'],
    [L('Радиално биене', 'Radial runout'), 'Fr', um(FrT), 'iso1328'],
  ]);

  s += generalRoughness(372, 236);
  s += requirements(26, 250, [
    { t: L('Зъбите: циментиране и закаляване 58…62 HRC.', 'Teeth: case-hardened 58…62 HRC.'), key: 'case' },
    { t: L('Контактно петно по средата на зъба, ≥ 60 % от дължината.', 'Contact pattern in the middle of the tooth, ≥ 60 % of its length.'), key: 'contact' },
    { t: L('Общи допуски ISO 2768-mK.', 'General tolerances ISO 2768-mK.'), key: 'iso2768' },
    { t: L('Сглобка с вала: ø26 H7/k6, шпонка 8×7×14.', 'Fit on the shaft: ø26 H7/k6, key 8×7×14.'), key: 'fit' },
  ]);
  s += titleBlock(410, 287, {
    name: lt(L(`Конично колело z = ${Z4}`, `Bevel gear z = ${Z4}`)),
    material: '18CrNiMo7-6 (EN 10084)',
    scale: '2:1 (1:1)',
    number: 'EL-HB-005',
    author: 'Engineering Lab',
    date: '2026',
    sheet: '7/7',
    mass: '0,38 kg',
  });
  return s + sheetEnd();
}

export const gear2Sheet = { id: 'gear2', title: L(`Косозъбо колело z₂`, 'Helical gear z₂'), render: gear2Svg, notes: gear2Notes };
export const gear4Sheet = { id: 'gear4', title: L(`Конично колело z₄`, 'Bevel gear z₄'), render: gear4Svg, notes: gear4Notes };
