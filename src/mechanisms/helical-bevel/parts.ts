/** Parts of the helical-bevel gearbox (geometry + catalogue information, Bulgarian and English). */
import * as THREE from 'three';
import type { LText, PartDef } from '../../core/types';
import { gearOutline, type Pt } from '../../core/involute';
import { ballBearing, circlePath, extrudeCentered, keyedBorePath, roundedRect, steppedShaft } from '../../three/geom';
import { bevelGear, helicalGear, merge, rectShape, wallPlate } from './geometry';
import {
  ALPHA_T,
  AXIS_Y,
  B1,
  B2,
  BASE_T,
  BB,
  BETA,
  BRG_6004,
  BRG_6005,
  BRG_6006,
  D1,
  D2,
  DE3,
  DE4,
  DELTA3,
  DELTA4,
  GEAR2_BODY,
  HEL_BACKLASH,
  HOUSING,
  KEY2,
  KEY3,
  MB,
  MN,
  MT,
  RE,
  S1_BRG_A,
  S1_BRG_B,
  S1_Z,
  S2_BRG_A,
  S2_BRG_B,
  S3_BRG_A,
  S3_BRG_B,
  SHAFT1,
  SHAFT1_KEYWAY,
  SHAFT2,
  SHAFT2_KEYWAY,
  SHAFT3,
  SHAFT3_KEYWAY,
  SHAFT3_OUT_KEYWAY,
  STAGE1_Z,
  Z1,
  Z2,
  Z3,
  Z4,
} from './params';

const L = (bg: string, en: string): LText => ({ bg, en });
const n = (v: number, d = 1): string => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

const HELICAL_COLOR = '#5b8bb8';
const BEVEL_COLOR = '#c27a45';
const HOUSING_COLOR = '#93a4b8';

const segs = (list: [number, number, number][]) => list.map(([z0, z1, d]) => ({ z0, z1, r: d / 2 }));

/** Helical outline in the transverse plane. */
export function helicalOutline(z: number, phase: number): Pt[] {
  return gearOutline({ m: MT, z, alphaDeg: (ALPHA_T * 180) / Math.PI, backlash: HEL_BACKLASH, phase, flankSegments: 7, tipSegments: 2, rootSegments: 3 });
}

/** Heel outline of a straight bevel gear: the spur outline with the tooth height projected on the heel plane. */
export function bevelHeel(z: number, delta: number, phase: number): Pt[] {
  const rp = (MB * z) / 2;
  const c = Math.cos(delta);
  return gearOutline({ m: MB, z, backlash: 0.08, phase, flankSegments: 6, tipSegments: 2, rootSegments: 3 }).map(([x, y]) => {
    const r = Math.hypot(x, y);
    const k = (rp + (r - rp) * c) / r;
    return [x * k, y * k] as Pt;
  });
}

/** Back-cone data of a bevel gear for bevelGear(): pitch radius at the heel and its projected root radius. */
export function bevelCone(z: number, delta: number): { rp: number; tanDelta: number; rMin: number } {
  const rp = (MB * z) / 2;
  return { rp, tanDelta: Math.tan(delta), rMin: rp - 1.25 * MB * Math.cos(delta) - 0.01 };
}

function keyGeometry(shaftR: number, k: { b: number; h: number; t1: number; L: number }, zc: number): THREE.BufferGeometry {
  const g = extrudeCentered(roundedRect(k.h, k.b, 0.6), k.L, { bevel: 0.4, curveSegments: 4 });
  g.translate(shaftR - k.t1 + k.h / 2, 0, zc);
  return g;
}

function bearing(b: typeof BRG_6004, kit: Parameters<PartDef['build']>[0]['materials']): THREE.Object3D {
  return ballBearing(b.d, b.D, b.B, b.n, b.ball, { ring: kit.bearingSteel, ball: kit.chrome });
}

function housingGroup(kit: Parameters<PartDef['build']>[0]['materials']): THREE.Group {
  const H = HOUSING;
  const g = new THREE.Group();
  const t = H.wall;
  const y0 = BASE_T;
  const wall = kit.translucent(HOUSING_COLOR, 0.26);
  const plate = kit.translucent('#7f90a3', 0.45);
  const xIn0 = H.leftWallX - t / 2;
  const xIn1 = H.x1;
  const hole = (u: number, v: number, r: number): THREE.Path => circlePath(r + 0.15, u, v);

  // Base plate with feet.
  const base = new THREE.BoxGeometry(xIn1 - xIn0 + 40, BASE_T, H.z1 - H.z0 + 10);
  base.translate((xIn0 + xIn1) / 2, BASE_T / 2, (H.z0 + H.z1) / 2);
  g.add(new THREE.Mesh(base, plate));

  const walls: THREE.BufferGeometry[] = [];
  // Left wall: bearings A of shafts 1 and 2.
  const left = rectShape(-H.z1, -H.z0, y0, H.top);
  left.holes.push(hole(-S1_Z, AXIS_Y, BRG_6004.D / 2), hole(0, AXIS_Y, BRG_6004.D / 2));
  walls.push(wallPlate(left, t, 'x', H.leftWallX));
  // Inner rib: bearings B of shafts 1 and 2.
  const rib = rectShape(-(H.frontWallZ - t / 2), -(H.z0 + t), y0, H.top);
  rib.holes.push(hole(-S1_Z, AXIS_Y, BRG_6004.D / 2), hole(0, AXIS_Y, BRG_6006.D / 2));
  walls.push(wallPlate(rib, t, 'x', H.ribX));
  // Right wall and back wall.
  walls.push(wallPlate(rectShape(-H.z1, -H.z0, y0, H.top), t, 'x', H.x1 - t / 2));
  walls.push(wallPlate(rectShape(xIn0, xIn1, y0, H.top), t, 'z', H.z0 + t / 2));
  // Front wall: bearing B of the output shaft.
  const front = rectShape(xIn0, xIn1, y0, H.top);
  front.holes.push(hole(0, AXIS_Y, BRG_6005.D / 2));
  walls.push(wallPlate(front, t, 'z', H.frontWallZ));
  // Output rib: bearing A of the output shaft.
  const outRib = rectShape(-40, 40, y0, AXIS_Y + 42);
  outRib.holes.push(hole(0, AXIS_Y, BRG_6006.D / 2));
  walls.push(wallPlate(outRib, t, 'z', H.outRibZ));
  g.add(new THREE.Mesh(merge(walls), wall));

  // Foundation bolts.
  const bolts: THREE.BufferGeometry[] = [];
  for (const x of [xIn0 - 12, xIn1 + 12]) {
    for (const z of [H.z0 + 20, H.z1 - 20]) {
      const b = new THREE.CylinderGeometry(5, 5, 5, 6);
      b.translate(x, BASE_T + 2.5, z);
      bolts.push(b);
    }
  }
  g.add(new THREE.Mesh(merge(bolts), kit.darkSteel()));
  return g;
}

export function makeParts(): PartDef[] {
  const tanB = Math.tan(BETA);
  const brgInfo = (b: typeof BRG_6004): PartDef['meta']['dims'] => [
    { label: L('d × D × B', 'd × D × B'), value: `${b.d} × ${b.D} × ${b.B} mm` },
    { label: L('Тела', 'Rolling elements'), value: `${b.n} × ø${n(b.ball, 2)} mm` },
  ];
  const bearingPart = (id: string, body: string, z: number, b: typeof BRG_6004, out: number, name: LText, func: LText): PartDef => ({
    id,
    body,
    position: [0, 0, z],
    spin: { outer: 0, balls: 0.4 },
    explode: { offset: [0, 0, out], order: 0 },
    build: ({ materials }) => bearing(b, materials),
    meta: { name, material: L('Лагерна стомана 100Cr6', 'Bearing steel 100Cr6'), func, dims: brgInfo(b) },
  });

  return [
    {
      id: 'housing',
      fixed: true,
      position: [0, 0, 0],
      explode: { offset: [0, -30, 0], order: 0 },
      build: ({ materials }) => housingGroup(materials),
      meta: {
        name: L('Корпус (показан в разрез)', 'Housing (shown cut away)'),
        material: L('Сив чугун EN-GJL-250', 'Grey cast iron EN-GJL-250'),
        func: L(
          'Носи лагерите на трите вала и пази точните им положения: междуосието на цилиндричното стъпало и пресичането на осите на коничното стъпало под 90°. Отдолу е маслената вана – колелата се мажат чрез потапяне.',
          'Holds the bearings of the three shafts and keeps their exact positions: the centre distance of the helical stage and the 90° intersection of the bevel stage axes. The oil sump is at the bottom – the gears are splash lubricated.',
        ),
        dims: [
          { label: L('Габарит', 'Overall size'), value: `${HOUSING.x1 - HOUSING.x0} × ${HOUSING.top} × ${HOUSING.z1 - HOUSING.z0} mm` },
          { label: L('Височина на осите', 'Axis height'), value: `${AXIS_Y} mm` },
        ],
      },
    },
    {
      id: 'shaft1',
      body: 's1',
      position: [0, 0, 0],
      explode: { offset: [0, 0, 70], order: 1 },
      approach: [0, 0, 90],
      build: ({ materials }) => {
        const grp = new THREE.Group();
        grp.add(new THREE.Mesh(steppedShaft(segs(SHAFT1), 0.8, SHAFT1_KEYWAY), materials.steel()));
        const teeth = helicalGear(helicalOutline(Z1, Math.PI), B1, tanB / (D1 / 2));
        teeth.translate(0, 0, STAGE1_Z);
        grp.add(new THREE.Mesh(teeth, materials.paint(HELICAL_COLOR, 0.55, 0.35)));
        return grp;
      },
      meta: {
        name: L(`Входящ вал-зъбно колело z₁ = ${Z1}`, `Input pinion shaft z₁ = ${Z1}`),
        material: L('Стомана 18CrNiMo7-6, циментирани и закалени зъби', 'Steel 18CrNiMo7-6, case-hardened teeth'),
        func: L(
          'Получава момента от двигателя. Косите зъби са нарязани направо върху вала – колелото е твърде малко за отвор с шпонка. Осовата сила от наклона на зъбите се поема от лагерите.',
          'Takes the torque from the motor. The helical teeth are cut straight on the shaft – the pinion is too small for a bore with a key. The axial force from the helix is taken by the bearings.',
        ),
        dims: [
          { label: L('Модул / наклон', 'Module / helix'), value: `mₙ = ${MN} mm, β = ${n((BETA * 180) / Math.PI, 2)}°` },
          { label: L('Зъби / ширина', 'Teeth / width'), value: `z = ${Z1}, b = ${B1} mm` },
          { label: L('Делителен диаметър', 'Pitch diameter'), value: `d = ${n(D1, 2)} mm` },
        ],
      },
    },
    bearingPart(
      'brg1A',
      's1',
      S1_BRG_A,
      BRG_6004,
      60,
      L('Лагер 6004 – вал 1, опора A', 'Bearing 6004 – shaft 1, A'),
      L('Опората до входящия край. Поема радиалната сила и част от осовата.', 'The support at the input end. Takes the radial force and part of the axial force.'),
    ),
    bearingPart(
      'brg1B',
      's1',
      S1_BRG_B,
      BRG_6004,
      -40,
      L('Лагер 6004 – вал 1, опора B', 'Bearing 6004 – shaft 1, B'),
      L('Втората опора на входящия вал, във вътрешната преграда на корпуса.', 'The second support of the input shaft, in the inner rib of the housing.'),
    ),
    {
      id: 'shaft2',
      body: 's2',
      position: [0, 0, 0],
      explode: { offset: [0, 0, 0], order: 0 },
      approach: [0, 90, 0],
      build: ({ materials }) => {
        const grp = new THREE.Group();
        grp.add(new THREE.Mesh(steppedShaft(segs(SHAFT2), 0.8, SHAFT2_KEYWAY), materials.steel()));
        const heel = bevelHeel(Z3, DELTA3, 0);
        grp.add(new THREE.Mesh(bevelGear(heel, RE * Math.cos(DELTA3), (RE - BB) / RE, bevelCone(Z3, DELTA3)), materials.paint(BEVEL_COLOR, 0.6, 0.35)));
        return grp;
      },
      meta: {
        name: L(`Междинен вал с конично колело z₃ = ${Z3}`, `Intermediate shaft with bevel pinion z₃ = ${Z3}`),
        material: L('Стомана 18CrNiMo7-6, циментирани и закалени зъби', 'Steel 18CrNiMo7-6, case-hardened teeth'),
        func: L(
          'Носи голямото косозъбо колело на първото стъпало и коничното малко колело на второто. Коничното колело е изработено заедно с вала и е конзолно – извън двата лагера.',
          'Carries the large helical gear of the first stage and the bevel pinion of the second. The bevel pinion is made in one piece with the shaft and is overhung – outside the two bearings.',
        ),
        dims: [
          { label: L('Конично колело', 'Bevel pinion'), value: `m = ${n(MB, 1)} mm, z = ${Z3}, δ = ${n((DELTA3 * 180) / Math.PI, 2)}°` },
          { label: L('Седло на колелото', 'Gear seat'), value: 'ø26 k6' },
          { label: L('Лагери', 'Bearings'), value: '6006 / 6004' },
        ],
      },
    },
    bearingPart(
      'brg2B',
      's2',
      S2_BRG_B,
      BRG_6006,
      90,
      L('Лагер 6006 – вал 2, опора B', 'Bearing 6006 – shaft 2, B'),
      L(
        'Стои непосредствено зад коничното колело и поема най-голямата сила – от конзолното зацепване. Затова е по-голям от останалите.',
        'Sits right behind the bevel pinion and takes the largest force – from the overhung mesh. That is why it is larger than the others.',
      ),
    ),
    {
      id: 'key2',
      body: 's2',
      position: [0, 0, 0],
      explode: { offset: [22, 0, 0], order: 2, frame: 'spin' },
      build: ({ materials }) => new THREE.Mesh(keyGeometry(13, KEY2, (SHAFT2_KEYWAY.z0 + SHAFT2_KEYWAY.z1) / 2), materials.darkSteel()),
      meta: {
        name: L('Призматична шпонка 8×7×16', 'Parallel key 8×7×16'),
        material: L('Стомана C45, калибрирана', 'Steel C45, bright drawn'),
        func: L('Предава момента от голямото косозъбо колело към междинния вал.', 'Transmits the torque from the large helical gear to the intermediate shaft.'),
        dims: [{ label: L('b × h × l', 'b × h × l'), value: '8 × 7 × 16 mm' }],
      },
    },
    {
      id: 'gear2',
      body: 's2',
      position: [0, 0, STAGE1_Z],
      explode: { offset: [0, 0, 60], order: 1 },
      build: ({ materials }) => {
        const b = GEAR2_BODY;
        const rim = helicalGear(helicalOutline(Z2, Math.PI / Z2), B2, -tanB / (D2 / 2), [circlePath(b.rimInner)]);
        const web = new THREE.Shape();
        web.absarc(0, 0, b.rimInner + 1, 0, Math.PI * 2, false);
        web.holes.push(circlePath(b.hubR - 0.5));
        for (let i = 0; i < b.holes; i++) {
          const a = ((i + 0.5) / b.holes) * Math.PI * 2;
          web.holes.push(circlePath(b.holeR, b.holePitchR * Math.cos(a), b.holePitchR * Math.sin(a)));
        }
        const hub = new THREE.Shape();
        hub.absarc(0, 0, b.hubR, 0, Math.PI * 2, false);
        hub.holes.push(keyedBorePath(b.bore, KEY2.b, KEY2.t2));
        const geo = merge([rim, extrudeCentered(web, b.web, { bevel: 0.3, curveSegments: 40 }), extrudeCentered(hub, B2, { bevel: 0.5, curveSegments: 40 })]);
        return new THREE.Mesh(geo, materials.paint(HELICAL_COLOR, 0.55, 0.38));
      },
      meta: {
        name: L(`Косозъбо колело z₂ = ${Z2}`, `Helical gear z₂ = ${Z2}`),
        material: L('Стомана 42CrMo4, подобрена и азотирана', 'Steel 42CrMo4, quenched, tempered and nitrided'),
        func: L(
          `Първото стъпало намалява оборотите ${n(Z2 / Z1, 0)} пъти. Косите зъби влизат в зацепване постепенно – предавката е по-тиха и по-натоварваема от правозъбата.`,
          `The first stage reduces the speed ${n(Z2 / Z1, 0)} times. The helical teeth enter the mesh gradually – the stage is quieter and carries more load than a spur one.`,
        ),
        dims: [
          { label: L('Модул / наклон', 'Module / helix'), value: `mₙ = ${MN} mm, β = ${n((BETA * 180) / Math.PI, 2)}°` },
          { label: L('Зъби / ширина', 'Teeth / width'), value: `z = ${Z2}, b = ${B2} mm` },
          { label: L('Делителен диаметър', 'Pitch diameter'), value: `d = ${n(D2, 1)} mm` },
        ],
      },
    },
    bearingPart(
      'brg2A',
      's2',
      S2_BRG_A,
      BRG_6004,
      60,
      L('Лагер 6004 – вал 2, опора A', 'Bearing 6004 – shaft 2, A'),
      L('Опората в лявата стена на корпуса.', 'The support in the left wall of the housing.'),
    ),
    {
      id: 'shaft3',
      body: 's3',
      position: [0, 0, 0],
      explode: { offset: [0, 0, 80], order: 1 },
      approach: [0, 0, 100],
      build: ({ materials }) => new THREE.Mesh(steppedShaft(segs(SHAFT3), 0.8, [SHAFT3_KEYWAY, SHAFT3_OUT_KEYWAY]), materials.steel()),
      meta: {
        name: L('Изходящ вал', 'Output shaft'),
        material: L('Стомана 42CrMo4, подобрена', 'Steel 42CrMo4, quenched and tempered'),
        func: L(
          'Оста му е под 90° спрямо входящия вал. Носи голямото конично колело и предава намалените 6 пъти обороти към работната машина.',
          'Its axis is at 90° to the input shaft. It carries the large bevel gear and delivers the speed, reduced 6 times, to the driven machine.',
        ),
        dims: [
          { label: L('Седло на колелото', 'Gear seat'), value: 'ø26 k6' },
          { label: L('Изходящ край', 'Output end'), value: 'ø22 h9' },
          { label: L('Лагери', 'Bearings'), value: '6006 / 6005' },
        ],
      },
    },
    {
      id: 'key3',
      body: 's3',
      position: [0, 0, 0],
      explode: { offset: [22, 0, 0], order: 2, frame: 'spin' },
      build: ({ materials }) => new THREE.Mesh(keyGeometry(13, KEY3, (SHAFT3_KEYWAY.z0 + SHAFT3_KEYWAY.z1) / 2), materials.darkSteel()),
      meta: {
        name: L('Призматична шпонка 8×7×14', 'Parallel key 8×7×14'),
        material: L('Стомана C45, калибрирана', 'Steel C45, bright drawn'),
        func: L('Свързва голямото конично колело с изходящия вал.', 'Connects the large bevel gear to the output shaft.'),
        dims: [{ label: L('b × h × l', 'b × h × l'), value: '8 × 7 × 14 mm' }],
      },
    },
    {
      id: 'gear4',
      body: 's3',
      position: [0, 0, 0],
      explode: { offset: [0, 0, -40], order: 1 },
      build: ({ materials }) => {
        const zHeel = RE * Math.cos(DELTA4);
        const cone = bevelCone(Z4, DELTA4);
        // The heel face of the teeth is on the back cone; inside the root circle it is flat at zBack.
        const zBack = zHeel + (cone.rp - cone.rMin) * cone.tanDelta;
        const teeth = bevelGear(bevelHeel(Z4, DELTA4, Math.PI + Math.PI / Z4), zHeel, (RE - BB) / RE, cone, [keyedBorePath(13, KEY3.b, KEY3.t2)]);
        const disk = new THREE.Shape();
        disk.absarc(0, 0, DE4 / 2 - 4, 0, Math.PI * 2, false);
        disk.holes.push(keyedBorePath(13, KEY3.b, KEY3.t2));
        const diskGeo = extrudeCentered(disk, 4, { bevel: 0.4, curveSegments: 48 });
        diskGeo.translate(0, 0, zBack + 2); // behind the teeth, clear of the pinion tips
        const hub = new THREE.Shape();
        hub.absarc(0, 0, 20, 0, Math.PI * 2, false);
        hub.holes.push(keyedBorePath(13, KEY3.b, KEY3.t2));
        const hubGeo = extrudeCentered(hub, 28 - zHeel, { bevel: 0.4, curveSegments: 40 });
        hubGeo.translate(0, 0, (28 + zHeel) / 2);
        return new THREE.Mesh(merge([teeth, diskGeo, hubGeo]), materials.paint(BEVEL_COLOR, 0.6, 0.35));
      },
      meta: {
        name: L(`Конично колело z₄ = ${Z4}`, `Bevel gear z₄ = ${Z4}`),
        material: L('Стомана 18CrNiMo7-6, циментирани и закалени зъби', 'Steel 18CrNiMo7-6, case-hardened teeth'),
        func: L(
          'Второто стъпало завърта движението на 90° и намалява оборотите още 2 пъти. Зъбите се стесняват към върха на конуса, където се пресичат осите.',
          'The second stage turns the motion through 90° and reduces the speed 2 more times. The teeth get smaller towards the cone apex, where the axes meet.',
        ),
        dims: [
          { label: L('Модул / зъби', 'Module / teeth'), value: `m = ${n(MB, 1)} mm, z = ${Z4}` },
          { label: L('Ъгъл на конуса', 'Cone angle'), value: `δ = ${n((DELTA4 * 180) / Math.PI, 2)}°` },
          { label: L('Диаметър / ширина', 'Diameter / width'), value: `dₑ = ${DE4} mm, b = ${BB} mm` },
        ],
      },
    },
    bearingPart(
      'brg3A',
      's3',
      S3_BRG_A,
      BRG_6006,
      70,
      L('Лагер 6006 – вал 3, опора A', 'Bearing 6006 – shaft 3, A'),
      L('Опората до коничното колело. Поема силите от зацепването.', 'The support next to the bevel gear. Takes the forces from the mesh.'),
    ),
    bearingPart(
      'brg3B',
      's3',
      S3_BRG_B,
      BRG_6005,
      60,
      L('Лагер 6005 – вал 3, опора B', 'Bearing 6005 – shaft 3, B'),
      L('Опората в предната стена, до изходящия край.', 'The support in the front wall, next to the output end.'),
    ),
  ];
}

/** For the drawings and the theory: pitch diameters and other derived numbers. */
export const DERIVED = { D1, D2, DE3, DE4, RE, S1_Z, KEY2, KEY3, BRG_6004, BRG_6005, BRG_6006 };
