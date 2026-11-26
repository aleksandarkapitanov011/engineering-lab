/**
 * Drawing kit of the helical-bevel gearbox: bilingual text helpers, a stepped-shaft view generator,
 * keyway sections, data tables and the notes shared by several sheets. Sheet units are mm.
 */
import type { DrawingNote, LText } from '../../../core/types';
import { lt } from '../../../i18n';
import { arrowHead, dim, f, leader, line, note, path, polyline, roughness, text, type TextOpts } from '../../../ui/svgdraw';

export const L = (bg: string, en: string): LText => ({ bg, en });
export const N = (title: LText, body: LText): DrawingNote => ({ title, body });
/** Bulgarian decimal comma (text() converts it to a point in English). */
export const nb = (v: number, d = 1): string => v.toFixed(d).replace('.', ',');
/** Angle in degrees and minutes, e.g. 13°43′. */
export const dms = (rad: number): string => {
  const deg = (rad * 180) / Math.PI;
  let d = Math.floor(deg);
  let m = Math.round((deg - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  return `${d}°${String(m).padStart(2, '0')}′`;
};
/** Text in the current language. */
export const T = (x: number, y: number, t: LText, o: TextOpts = {}): string => text(x, y, lt(t), o);

// ------------------------------------------------------------------------------------- dimensions
type DimO = Parameters<typeof dim>[6];

/** Horizontal dimension between two points at possibly different heights, line at y = yl. */
export function hd(xa: number, ya: number, xb: number, yb: number, yl: number, label: string, o: DimO = {}): string {
  const ext =
    line(xa, ya + 0.8 * (Math.sign(yl - ya) || 1), xa, yl + 1.8 * (Math.sign(yl - ya) || 1), 'thin') +
    line(xb, yb + 0.8 * (Math.sign(yl - yb) || 1), xb, yl + 1.8 * (Math.sign(yl - yb) || 1), 'thin');
  const d = dim(xa, yl, xb, yl, 0, label, o);
  return o?.note ? d.replace('<rect class="hit"', `${ext}<rect class="hit"`) : ext + d;
}

/** Vertical dimension between two points, line at x = xl. */
export function vd(xa: number, ya: number, xb: number, yb: number, xl: number, label: string, o: DimO = {}): string {
  const ext =
    line(xa + 0.8 * Math.sign(xl - xa), ya, xl + 1.8 * Math.sign(xl - xa), ya, 'thin') +
    line(xb + 0.8 * Math.sign(xl - xb), yb, xl + 1.8 * Math.sign(xl - xb), yb, 'thin');
  const [y1, y2] = ya > yb ? [ya, yb] : [yb, ya];
  const d = dim(xl, y1, xl, y2, 0, label, o);
  return o?.note ? d.replace('<rect class="hit"', `${ext}<rect class="hit"`) : ext + d;
}

/** Diameter dimension inside the outline (arrows touch the surfaces from inside). */
export const diaInside = (x: number, yc: number, r: number, label: string, o: DimO = {}): string => dim(x, yc + r, x, yc - r, 0, label, o);

// ------------------------------------------------------------------------------------- shafts
/** One cylindrical step of a shaft: [s0, s1, diameter] in mm, plus what it is for. */
export interface ShaftStep {
  s0: number;
  s1: number;
  d: number;
  /** Diameter label (e.g. "ø20k6"), its deviations and note key. Omitted = no diameter dimension. */
  label?: string;
  tol?: [string, string];
  key?: string;
  /** Ra on the surface (e.g. "0,8"); its note key is `ra` + value without the comma. */
  ra?: string;
  /** Where the diameter label and the roughness sit along the step (default: the middle). */
  at?: number;
}

export interface ShaftFrame {
  /** Sheet x of shaft position s. */
  X(s: number): number;
  /** Sheet y of radius r above (sign = 1) or below (−1) the axis. */
  Y(r: number, sign?: 1 | -1): number;
  S: number;
  Yc: number;
}

export const frame = (X0: number, s0: number, Yc: number, S: number): ShaftFrame => ({
  X: (s) => X0 + S * (s - s0),
  Y: (r, sign = 1) => Yc - sign * S * r,
  S,
  Yc,
});

/**
 * Top half-profile [s, r] of a stepped shaft with end chamfers `c` (mm), and the positions of the
 * visible circular edges ([s, r]: a line across the shaft at s, of half-length r).
 * `openStart` / `openEnd` leave that end without a chamfer (the profile continues in another piece).
 */
export function stepProfile(steps: ShaftStep[], c: number, openStart = false, openEnd = false): { prof: [number, number][]; edges: [number, number][] } {
  const first = steps[0];
  const last = steps[steps.length - 1];
  const prof: [number, number][] = [];
  const edges: [number, number][] = [];
  if (openStart) prof.push([first.s0, first.d / 2]);
  else {
    prof.push([first.s0, first.d / 2 - c], [first.s0 + c, first.d / 2]);
    edges.push([first.s0, first.d / 2 - c], [first.s0 + c, first.d / 2]);
  }
  steps.forEach((st, i) => {
    if (i < steps.length - 1) {
      const nx = steps[i + 1];
      prof.push([st.s1, st.d / 2], [st.s1, nx.d / 2]);
      edges.push([st.s1, Math.max(st.d, nx.d) / 2]);
    }
  });
  if (openEnd) prof.push([last.s1, last.d / 2]);
  else {
    prof.push([last.s1 - c, last.d / 2], [last.s1, last.d / 2 - c]);
    edges.push([last.s1 - c, last.d / 2], [last.s1, last.d / 2 - c]);
  }
  return { prof, edges };
}

/** Draws a symmetric profile (top half given) with its edge lines. */
export function drawProfile(F: ShaftFrame, prof: [number, number][], edges: [number, number][]): string {
  const top = prof.map(([s, r]) => [F.X(s), F.Y(r)] as [number, number]);
  const bot = prof.map(([s, r]) => [F.X(s), F.Y(r, -1)] as [number, number]);
  let s = polyline(top) + polyline(bot);
  for (const [sx, r] of edges) s += line(F.X(sx), F.Y(r), F.X(sx), F.Y(r, -1));
  return s;
}

/** Flat-ended keyway seen from above (on the axis). */
export function keywayView(F: ShaftFrame, s0: number, s1: number, b: number): string {
  const y0 = F.Yc - (b / 2) * F.S;
  const y1 = F.Yc + (b / 2) * F.S;
  return polyline(
    [
      [F.X(s0), y0],
      [F.X(s1), y0],
      [F.X(s1), y1],
      [F.X(s0), y1],
    ],
    'thick',
    true,
  );
}

/**
 * Length dimensions of the steps as a chain at `yChain` (one step left out, so the chain stays open)
 * and the overall length at `yTotal`. `keys[i]` is the note of step i.
 */
export function lengthChain(F: ShaftFrame, steps: ShaftStep[], skip: number, yChain: number, yTotal: number, totalKey: string, keys: string[]): string {
  let s = '';
  steps.forEach((st, i) => {
    if (i === skip) return;
    const w = (st.s1 - st.s0) * F.S;
    s += hd(F.X(st.s0), F.Y(st.d / 2), F.X(st.s1), F.Y(st.d / 2), yChain, nb(st.s1 - st.s0, Number.isInteger(st.s1 - st.s0) ? 0 : 1), {
      note: keys[i],
      outside: w < 9,
      size: w < 14 ? 3 : 3.5,
    });
  });
  const a = steps[0];
  const b = steps[steps.length - 1];
  s += hd(F.X(a.s0), F.Y(a.d / 2), F.X(b.s1), F.Y(b.d / 2), yTotal, nb(b.s1 - a.s0, 0), { note: totalKey });
  return s;
}

/** Diameter dimensions and roughness symbols of the steps. Short steps get a leader instead. */
export function stepDiameters(F: ShaftFrame, steps: ShaftStep[]): string {
  let s = '';
  for (const st of steps) {
    const xm = F.X(st.at ?? (st.s0 + st.s1) / 2);
    const w = (st.s1 - st.s0) * F.S;
    if (st.label) {
      if (w >= 14) s += diaInside(xm, F.Yc, (st.d / 2) * F.S, st.label, { note: st.key, tol: st.tol, size: w < 22 ? 2.9 : 3.3 });
      else s += leader(xm, F.Y(st.d / 2) + 0.6, xm + 6, F.Y(st.d / 2) - 12, st.label, st.key);
    }
    if (st.ra) s += roughness(xm + (w >= 14 ? 3 : 0), F.Y(st.d / 2, -1), st.ra, `ra${st.ra.replace(',', '')}`, true);
  }
  return s;
}

/** Cutting-plane marks of section `id` at x (arrows pointing in `dir`), around a shaft of radius r. */
export function cutMarks(x: number, Yc: number, rSheet: number, id: string, dir: 1 | -1 = 1): string {
  let s = '';
  for (const y0 of [Yc - rSheet - 5, Yc + rSheet + 5]) {
    const y1 = y0 + (y0 < Yc ? -6 : 6);
    s += `<line class="thick" style="stroke-width:0.9" x1="${f(x)}" y1="${f(y0)}" x2="${f(x)}" y2="${f(y1)}"/>`;
    s += line(x, y1, x + 8 * dir, y1, 'thin') + arrowHead(x + 8 * dir, y1, dir === 1 ? 0 : Math.PI);
    s += text(x + 10 * dir, y1 + 1.4, id, { size: 5, anchor: dir === 1 ? 'start' : 'end' });
  }
  return s;
}

/**
 * Cross-section through a shaft keyway (keyway on the +x side), centre (Xs, Ys), scale S.
 * Returns the hatched section with the width (N9) and depth (d − t₁) dimensions.
 */
export function keySection(
  Xs: number,
  Ys: number,
  S: number,
  id: string,
  k: { d: number; b: number; t1: number; bTol: [string, string] },
  keys: { section: string; width: string; depth: string },
): string {
  const R = (k.d / 2) * S;
  const kb = (k.b / 2) * S;
  const kd = (k.d / 2 - k.t1) * S;
  const xc = Math.sqrt(R * R - kb * kb);
  const d = `M${f(Xs + xc)} ${f(Ys - kb)}A${f(R)} ${f(R)} 0 1 0 ${f(Xs + xc)} ${f(Ys + kb)}L${f(Xs + kd)} ${f(Ys + kb)}L${f(Xs + kd)} ${f(Ys - kb)}Z`;
  let s = note(keys.section, path(d, 'hatch') + path(d, 'thick') + text(Xs, Ys - R - 9, `${id}–${id}`, { size: 5, cls: 'title-big' }), {
    x: Xs - 12,
    y: Ys - R - 15,
    w: 24,
    h: 8,
  });
  s += line(Xs - R - 4, Ys, Xs + R + 4, Ys, 'center') + line(Xs, Ys - R - 4, Xs, Ys + R + 4, 'center');
  s += vd(Xs + xc, Ys + kb, Xs + xc, Ys - kb, Xs + R + 9, `${k.b}N9`, { note: keys.width, tol: k.bTol, size: 3 });
  s += hd(Xs - R, Ys, Xs + kd, Ys + kb, Ys + R + 10, nb(k.d - k.t1, 1), { note: keys.depth, tol: ['0', '−0,1'], size: 3 });
  return s;
}

// ------------------------------------------------------------------------------------- tables
export type Row = [LText | string, string, string, string?];

/** Table with a title, rows [name, symbol, value, note key]. Returns markup and its height. */
export function dataTable(x: number, y: number, title: LText, rows: Row[], cw: [number, number, number] = [52, 14, 34]): string {
  const rh = 6.2;
  const tw = cw[0] + cw[1] + cw[2];
  let s = `<rect class="thick" x="${f(x)}" y="${f(y)}" width="${f(tw)}" height="${f(rh * (rows.length + 1))}"/>`;
  s += text(x + tw / 2, y + 4.4, lt(title), { size: 3, cls: 'label' });
  rows.forEach((row, i) => {
    const yy = y + rh * (i + 1);
    let r = line(x, yy, x + tw, yy, 'thin');
    r += text(x + 1.5, yy + 4.4, typeof row[0] === 'string' ? row[0] : lt(row[0]), { anchor: 'start', size: 2.6 });
    r += text(x + cw[0] + cw[1] / 2, yy + 4.4, row[1], { size: 2.8 });
    r += text(x + cw[0] + cw[1] + 1.5, yy + 4.4, row[2], { anchor: 'start', size: 2.6 });
    s += row[3] ? note(row[3], r, { x, y: yy, w: tw, h: rh }) : r;
  });
  s += line(x + cw[0], y + rh, x + cw[0], y + rh * (rows.length + 1), 'thin');
  s += line(x + cw[0] + cw[1], y + rh, x + cw[0] + cw[1], y + rh * (rows.length + 1), 'thin');
  return s;
}

/** Numbered list of technical requirements (each line tappable). */
export function requirements(x: number, y: number, rows: { t: LText; key?: string }[]): string {
  let s = text(x, y, lt(L('ТЕХНИЧЕСКИ ИЗИСКВАНИЯ', 'TECHNICAL REQUIREMENTS')), { anchor: 'start', size: 3.4, cls: 'label' });
  rows.forEach((r, i) => {
    const yy = y + 6 + i * 5.2;
    const t = `${i + 1}. ${lt(r.t)}`;
    const el = text(x, yy, t, { anchor: 'start', size: 3.1 });
    s += r.key ? note(r.key, el, { x: x - 1, y: yy - 4, w: t.length * 1.75 + 2, h: 5.4 }) : el;
  });
  return s;
}

/** General roughness symbol “Ra … (√)” near the title block. */
export function generalRoughness(x: number, y: number, ra = '3,2'): string {
  const sym = roughness(x, y, ra);
  const paren =
    text(x + 21, y - 4, '(', { size: 7 }) +
    `<path class="thin" style="stroke-width:0.3" d="M${f(x + 24)} ${f(y - 6)}L${f(x + 25.5)} ${f(y - 3.5)}L${f(x + 28)} ${f(y - 9)}"/>` +
    text(x + 30.5, y - 4, ')', { size: 7 });
  return note('ra-general', sym + paren, { x: x - 5, y: y - 13, w: 40, h: 15 });
}

// ------------------------------------------------------------------------------------- shared notes
export const COMMON_NOTES: Record<string, DrawingNote> = {
  total: N(
    L('Обща дължина', 'Overall length'),
    L(
      'Габаритният размер на вала. Веригата от дължините над него нарочно е отворена – един участък не е размерен, за да няма затворена размерна верига: всички неточности се натрупват в най-малко отговорния участък.',
      'The overall length of the shaft. The chain of lengths above it is deliberately left open – one step has no dimension, so there is no closed dimension chain: all errors add up in the least important step.',
    ),
  ),
  len: N(
    L('Дължина на участък', 'Length of a step'),
    L(
      'Дължините на лагерните шийки са равни на ширината на лагера, а на седлата – на ширината на главината. Без указан допуск важат общите допуски ISO 2768-m.',
      'Bearing seats are as long as the bearing is wide, gear seats as long as the hub. Without a stated tolerance the general tolerances ISO 2768-m apply.',
    ),
  ),
  k6: N(
    L('Лагерна шийка k6', 'Bearing seat k6'),
    L(
      'Вътрешният пръстен на лагера се върти заедно с вала, затова сяда с лек натяг: валът е k6, а отворът на пръстена има отрицателен допуск (клас P0). Пръстенът не се превърта под товар. Шийката се шлифова.',
      'The inner ring of the bearing turns with the shaft, so it sits with a light interference: the shaft is k6 and the ring bore has a negative tolerance (class P0). The ring cannot creep under load. The seat is ground.',
    ),
  ),
  seat: N(
    L('Седло на колело k6', 'Gear seat k6'),
    L(
      'С отвор H7 на главината дава преходна сглобка H7/k6: колелото се центрира точно, а моментът се предава от шпонката.',
      'With an H7 hub bore it gives the transition fit H7/k6: the gear is centred accurately and the key transmits the torque.',
    ),
  ),
  end: N(
    L('Свободен край k6', 'Shaft end k6'),
    L(
      'Краят за съединителя. По стандарт (IEC 60072 / DIN 748) краищата на валовете се изпълняват k6, за да се центрира точно главината на съединителя.',
      'The end for the coupling. By standard (IEC 60072 / DIN 748) shaft ends are made k6, so that the coupling hub is centred accurately.',
    ),
  ),
  free: N(
    L('Свободен диаметър', 'Free diameter'),
    L(
      'Диаметър без сглобка – само струговане, с общ допуск. Стъпалата между седлата дават рамене, в които опират лагерите и главините.',
      'A diameter with no fit – only turned, with a general tolerance. The steps between the seats give shoulders against which the bearings and hubs bear.',
    ),
  ),
  shoulder: N(
    L('Рамо', 'Shoulder'),
    L(
      'Рамото определя осовото положение на лагера или колелото. Диаметърът му е по-малък от рамото на пръстена на лагера, за да остане място за изваждач при демонтаж.',
      'The shoulder fixes the axial position of the bearing or gear. Its diameter is smaller than the ring shoulder of the bearing, leaving room for a puller when dismantling.',
    ),
  ),
  keyway: N(
    L('Шпонков канал N9', 'Keyway N9'),
    L(
      'Ширината на канала е по ISO 773 / DIN 6885 според диаметъра на вала. Полето N9 дава леко стегната сглобка на шпонката във вала, за да не се движи при смяна на посоката на момента.',
      'The keyway width follows ISO 773 / DIN 6885 for the shaft diameter. The N9 zone gives a slightly tight fit of the key in the shaft, so it does not move when the torque reverses.',
    ),
  ),
  depth: N(
    L('Дълбочина d − t₁', 'Depth d − t₁'),
    L(
      'Дълбочината се задава от отсрещната образуваща до дъното на канала, за да се мери директно с шублер. Допускът е само в минус.',
      'The depth is given from the opposite generatrix to the bottom of the keyway, so it can be measured directly with a calliper. The tolerance is minus only.',
    ),
  ),
  keypos: N(
    L('Положение на канала', 'Keyway position'),
    L(
      'Каналът е по-къс от главината и започва малко след рамото, за да не отслабва вала там, където огъването е най-голямо.',
      'The keyway is shorter than the hub and starts a little after the shoulder, so it does not weaken the shaft where the bending is largest.',
    ),
  ),
  section: N(
    L('Разрез', 'Section'),
    L(
      'Напречно сечение през шпонковия канал. Стрелките при секущата равнина показват посоката на гледане; щриховката под 45° означава срязан материал.',
      'A cross-section through the keyway. The arrows at the cutting plane show the viewing direction; 45° hatching means cut material.',
    ),
  ),
  ra08: N(
    L('Ra 0,8 µm', 'Ra 0.8 µm'),
    L(
      'Шлифована повърхнина на шийките и седлата. Без нея върховете на грапавините се смачкват при монтажа и натягът изчезва.',
      'A ground surface of the seats. Without it the peaks of the roughness are flattened during assembly and the interference is lost.',
    ),
  ),
  ra16: N(
    L('Ra 1,6 µm', 'Ra 1.6 µm'),
    L('Фино струговане – напр. челата, в които опират лагерите, и работните повърхнини на зъбите.', 'Fine turning – e.g. the faces the bearings bear against and the working flanks of the teeth.'),
  ),
  'ra-general': N(
    L('Обща грапавост (√)', 'General roughness (√)'),
    L(
      'Знакът до основния надпис важи за всички неозначени повърхнини. Символът в скоби означава „освен означените на чертежа“.',
      'The symbol next to the title block applies to all surfaces not marked. The symbol in brackets means “except those marked on the drawing”.',
    ),
  ),
  chamfer: N(
    L('Фаски', 'Chamfers'),
    L('Фаските улесняват надяването на лагерите и главините и премахват острите ръбове. 1×45° е катет 1 mm под 45°.', 'Chamfers make it easier to slide bearings and hubs on and remove sharp edges. 1×45° is a 1 mm leg at 45°.'),
  ),
  iso2768: N(
    L('ISO 2768-mK', 'ISO 2768-mK'),
    L(
      'Общи допуски за размери без указан допуск (клас m – среден) и за форма и разположение (клас K).',
      'General tolerances for dimensions without a stated tolerance (class m – medium) and for form and position (class K).',
    ),
  ),
  case: N(
    L('Циментиране и закаляване', 'Case hardening'),
    L(
      'Повърхността на зъбите се насища с въглерод и се закалява до 58…62 HRC, а сърцевината остава жилава. Така зъбите издържат на контактно напрежение до ~1500 MPa и на удари. След закаляването зъбите се шлифоват.',
      'The surface of the teeth is enriched with carbon and hardened to 58…62 HRC while the core stays tough. The teeth then withstand contact stresses up to ~1500 MPa and shocks. After hardening the teeth are ground.',
    ),
  ),
  gearteeth: N(
    L('Зъбите в изглед (ISO 2203)', 'Teeth in a view (ISO 2203)'),
    L(
      'На чертеж зъбите не се рисуват: окръжността на върховете е с дебела линия, делителната – с щрих-пунктир, а на петите – с тънка. Наклонът на косите зъби се показва с три тънки успоредни линии.',
      'Teeth are not drawn: the tip circle is a thick line, the pitch circle dash-dot and the root circle thin. The hand of helical teeth is shown with three thin parallel lines.',
    ),
  ),
  table: N(
    L('Таблица с данни за колелото', 'Gear data table'),
    L(
      'Зъбите се изработват по данните в таблицата (горе вдясно по ISO 1340), а не по размери на чертежа: модул, брой зъби, ъгли, изместване и точност.',
      'The teeth are cut from the data in the table (top right, ISO 1340), not from dimensions on the drawing: module, number of teeth, angles, profile shift and accuracy grade.',
    ),
  ),
  grade: N(
    L('Степен на точност', 'Accuracy grade'),
    L('По ISO 1328: 1 е най-точната, 12 – най-грубата. 7…8 е обичайно за шлифовани колела на редуктори.', 'To ISO 1328: 1 is the finest, 12 the coarsest. 7…8 is usual for the ground gears of a gearbox.'),
  ),
  title: N(
    L('Основен надпис', 'Title block'),
    L('Наименование, материал, мащаб, номер на чертежа и автор, по ISO 7200.', 'Name, material, scale, drawing number and author, to ISO 7200.'),
  ),
};
