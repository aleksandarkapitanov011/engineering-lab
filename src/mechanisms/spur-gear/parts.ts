/**
 * Parts of the spur gear pair: procedural geometry + metadata.
 */
import * as THREE from 'three';
import type { PartDef } from '../../core/types';
import { gearOutline, matingPhase } from '../../core/involute';
import {
  ballBearing,
  circlePath,
  creased,
  extrudeCentered,
  keyedBorePath,
  merge,
  roundedRect,
  shapeFromPoints,
  steppedShaft,
} from '../../three/geom';
import type { Layout } from './layout';
import {
  ALPHA,
  B1,
  B2,
  BACKLASH,
  BRG1,
  BRG1A_Z,
  BRG1B_Z,
  BRG2,
  BRG2A_Z,
  BRG2B_Z,
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
} from './params';

const PINION_COLOR = '#4d82b3';
const GEAR_COLOR = '#c4913f';

function shaftGeometry(
  segs: readonly { z0: number; z1: number; d: number }[],
  offset: number,
  key: { z0: number; z1: number },
  k: { b: number; t1: number },
): THREE.BufferGeometry {
  return steppedShaft(
    segs.map((s) => ({ z0: s.z0 - offset, z1: s.z1 - offset, r: s.d / 2 })),
    1,
    { z0: key.z0 - offset, z1: key.z1 - offset, b: k.b, t1: k.t1 },
  );
}

function keyGeometry(shaftR: number, k: { b: number; h: number; t1: number; L: number }): THREE.BufferGeometry {
  // Cross-section in XY: X is radial (height h), Y is width b. Extruded along Z (length L).
  const g = extrudeCentered(roundedRect(k.h, k.b, 0.6), k.L, { bevel: 0.4, curveSegments: 4 });
  g.translate(shaftR - k.t1 + k.h / 2, 0, 0);
  return creased(g, 30);
}

function pinionGeometry(L: Layout): THREE.BufferGeometry {
  const { m, z1, x1 } = L.cfg;
  const shape = shapeFromPoints(gearOutline({ m, z: z1, x: x1, alphaDeg: ALPHA, backlash: BACKLASH, phase: 0 }));
  // An integral pinion (pinion shaft) has no bore: the teeth are cut directly on the shaft.
  if (!L.integral1) shape.holes.push(keyedBorePath(10, KEY1.b, KEY1.t2));
  return creased(extrudeCentered(shape, B1, { bevel: 0.45, curveSegments: 40 }), 40);
}

function gearGeometry(L: Layout): THREE.BufferGeometry {
  const { m, z2, x1 } = L.cfg;
  const outline = shapeFromPoints(
    gearOutline({ m, z: z2, x: -x1, alphaDeg: ALPHA, backlash: BACKLASH, phase: matingPhase(z2) }),
  );
  const rimInner = L.g2.df / 2 - Math.max(2.5 * m, 3);
  const hubR = 20;
  if (rimInner - hubR < 8) {
    // Too small for a web: a solid gear body with a bore (or none if integral).
    if (!L.integral2) outline.holes.push(keyedBorePath(12.5, KEY2.b, KEY2.t2));
    return creased(extrudeCentered(outline, B2, { bevel: 0.45, curveSegments: 48 }), 40);
  }
  const rim = outline;
  rim.holes.push(circlePath(rimInner));
  const rimGeo = extrudeCentered(rim, B2, { bevel: 0.45, curveSegments: 72 });

  const web = new THREE.Shape();
  web.absarc(0, 0, rimInner + 1, 0, Math.PI * 2, false);
  web.holes.push(circlePath(hubR - 0.5));
  const span = rimInner - hubR;
  if (span >= 12) {
    // Lightening holes in the web.
    const n = span > 40 ? 8 : 6;
    const hr = Math.min(span / 2 - 2.5, 14);
    const R = (rimInner + hubR) / 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      web.holes.push(circlePath(hr, R * Math.cos(a), R * Math.sin(a)));
    }
  }
  const webGeo = extrudeCentered(web, 6, { bevel: 0.3, curveSegments: 40 });

  const hub = new THREE.Shape();
  hub.absarc(0, 0, hubR, 0, Math.PI * 2, false);
  hub.holes.push(keyedBorePath(12.5, KEY2.b, KEY2.t2));
  const hubGeo = extrudeCentered(hub, B2, { bevel: 0.5, curveSegments: 48 });

  return creased(merge([rimGeo, webGeo, hubGeo]), 40);
}

function baseGroup(
  L: Layout,
  kit: { translucent: (c: string, o: number) => THREE.Material; darkSteel: () => THREE.Material },
): THREE.Group {
  const g = new THREE.Group();
  const A = L.a;
  const AXIS_Y = L.axisY;
  const left = Math.max(45, L.g1.da / 2 + 12);
  const right = Math.max(45, L.g2.da / 2 + 12);
  // Plate (in XZ), top face at y = 0.
  const plateW = A + left + right;
  const plateShape = roundedRect(plateW, 155, 8);
  const plate = extrudeCentered(plateShape, 8, { bevel: 0.8, curveSegments: 6 });
  plate.rotateX(-Math.PI / 2);
  plate.translate(-left + plateW / 2, -4, -2.5);
  g.add(new THREE.Mesh(plate, kit.translucent('#8796a6', 0.42)));

  // Bearing supports: one pillow per bearing, so they still build when the bearings clash.
  const pillow = (cx: number, boreR: number): THREE.Shape => {
    const s = new THREE.Shape();
    s.moveTo(cx - 30, 0);
    s.lineTo(cx + 30, 0);
    s.lineTo(cx + 30, AXIS_Y);
    s.absarc(cx, AXIS_Y, 30, 0, Math.PI, false);
    s.lineTo(cx - 30, 0);
    s.holes.push(circlePath(boreR + 0.15, cx, AXIS_Y));
    return s;
  };
  const shapes = [pillow(0, BRG1.D / 2), pillow(A, BRG2.D / 2)];
  for (const z of [WALL_A_Z, WALL_B_Z]) {
    for (const s of shapes) {
      const w = extrudeCentered(s, WALL_T, { bevel: 0.6, curveSegments: 40 });
      w.translate(0, 0, z);
      g.add(new THREE.Mesh(w, kit.translucent('#9fb3c8', 0.3)));
    }
  }
  // Hex bolts fixing each support to the plate.
  const bolts: THREE.BufferGeometry[] = [];
  for (const z of [WALL_A_Z, WALL_B_Z]) {
    for (const x of [-22, A + 22]) {
      const b = new THREE.CylinderGeometry(4.2, 4.2, 4, 6);
      b.translate(x, 2 + 0.01, z + WALL_T / 2 + 6);
      bolts.push(b);
    }
  }
  const boltMesh = new THREE.Mesh(merge(bolts), kit.darkSteel());
  g.add(boltMesh);
  return g;
}

const txt = (bg: string, en?: string) => ({ bg, en });

/** All parts for a given layout. Keys are left out where a gear is integral with its shaft. */
export function makeParts(L: Layout): PartDef[] {
  const { m, z1, z2, x1 } = L.cfg;
  const n = (v: number): string => (Math.round(v * 100) / 100).toString().replace('.', ',');
  const G1 = L.g1;
  const G2 = L.g2;
  const all: PartDef[] = [
  {
    id: 'base',
    fixed: true,
    position: [0, 0, 0],
    explode: { offset: [0, 0, 0], order: 0 },
    build: ({ materials }) => baseGroup(L, materials),
    meta: {
      name: txt('Основа с лагерни опори', 'Base plate with bearing supports'),
      material: txt('Сив чугун EN-GJL-250 (показан полупрозрачен)', 'Grey cast iron EN-GJL-250'),
      func: txt(
        'Носи лагерите и осигурява точното междуосие a = 60 mm и успоредността на двата вала. Грешка тук директно влошава зацепването.',
      ),
      dims: [
        { label: txt('Междуосие'), value: `${n(L.a)} mm` },
        { label: txt('Отвори за лагери'), value: 'ø42 H7 / ø47 H7' },
        { label: txt('Плоча'), value: '150 × 155 × 8 mm' },
      ],
    },
  },
  {
    id: 'shaft1',
    body: 's1',
    position: [0, 0, 0],
    explode: { offset: [0, 0, 0], order: 0 },
    approach: [0, 70, 0],
    build: ({ materials }) =>
      new THREE.Mesh(shaftGeometry(SHAFT1_SEGMENTS, SHAFT1_OFFSET, SHAFT1_KEYWAY, KEY1), materials.steel()),
    meta: {
      name: txt('Вал 1 (входящ)', 'Shaft 1 (input)'),
      material: txt('Стомана C45, подобрена (220–250 HB)'),
      func: txt(
        'Получава въртящия момент от двигателя и го предава чрез шпонката на малкото колело. Лагерува се в два сачмени лагера.',
      ),
      dims: [
        { label: txt('Диаметри'), value: 'ø20 k6 / ø20 h9, рамо ø24' },
        { label: txt('Дължина'), value: '120 mm' },
        { label: txt('Шпонков канал'), value: '6 N9 × 16 mm, t₁ = 3,5' },
      ],
    },
  },
  {
    id: 'key1',
    body: 's1',
    position: [0, 0, 0],
    explode: { offset: [18, 0, 0], order: 2, frame: 'spin' },
    build: ({ materials }) => new THREE.Mesh(keyGeometry(10, KEY1), materials.darkSteel()),
    meta: {
      name: txt('Призматична шпонка 6×6×16', 'Parallel key 6×6×16'),
      material: txt('Стомана C45, калибрирана'),
      func: txt(
        'Предава въртящия момент от вала към главината на колелото чрез натиск върху страничните си стени. Изчислява се на смачкване.',
      ),
      dims: [
        { label: txt('b × h × l'), value: '6 × 6 × 16 mm' },
        { label: txt('Дълбочини'), value: 't₁ = 3,5 mm (вал), t₂ = 2,8 mm (главина)' },
      ],
    },
  },
  {
    id: 'pinion',
    body: 's1',
    position: [0, 0, 0],
    explode: { offset: [0, 0, 40], order: 1 },
    build: ({ materials }) => new THREE.Mesh(pinionGeometry(L), materials.paint(PINION_COLOR, 0.55, 0.35)),
    meta: {
      name: txt(`Зъбно колело z₁ = ${z1} (малко)`, `Pinion z1 = ${z1}`),
      material: txt('Стомана 40Cr, повърхностно закалени зъби 48–52 HRC'),
      func: txt(
        L.integral1
          ? 'Задвижващото колело. Венецът е твърде тънък за отвор с шпонка, затова е изработено заедно с вала (вал-зъбно колело).'
          : `Задвижващото колело. Зацепва се с колелото z₂ = ${z2}, намалява оборотите ${n(z2 / z1)} пъти и увеличава въртящия момент.`,
      ),
      dims: [
        { label: txt('Параметри'), value: `m = ${n(m)} mm, z = ${z1}, α = 20°, x = ${n(x1)}` },
        { label: txt('Диаметри'), value: `d = ${n(G1.d)}, da = ${n(G1.da)}, df = ${n(G1.df)} mm` },
        { label: txt('Ширина / отвор'), value: L.integral1 ? '20 mm / вал-зъбно колело' : '20 mm / ø20 H7' },
      ],
    },
  },
  {
    id: 'brg1A',
    body: 's1',
    position: [0, 0, BRG1A_Z],
    spin: { outer: 0, balls: 0.4 },
    explode: { offset: [0, 0, -50], order: 1 },
    build: ({ materials }) =>
      ballBearing(BRG1.d, BRG1.D, BRG1.B, BRG1.n, BRG1.ball, { ring: materials.bearingSteel, ball: materials.chrome }),
    meta: {
      name: txt('Сачмен лагер 6004 – опора A', 'Ball bearing 6004 – A'),
      material: txt('Лагерна стомана 100Cr6'),
      func: txt(
        'Опира се в рамото на вала. Поема радиалната сила от зацепването и осевите сили, като позволява въртене с малко триене.',
      ),
      dims: [
        { label: txt('d × D × B'), value: '20 × 42 × 12 mm' },
        { label: txt('Тела'), value: `${BRG1.n} сачми ø6,35 mm` },
        { label: txt('Сглобка'), value: 'вал ø20 k6, корпус ø42 H7' },
      ],
    },
  },
  {
    id: 'brg1B',
    body: 's1',
    position: [0, 0, BRG1B_Z],
    spin: { outer: 0, balls: 0.4 },
    explode: { offset: [0, 0, 62], order: 0 },
    build: ({ materials }) =>
      ballBearing(BRG1.d, BRG1.D, BRG1.B, BRG1.n, BRG1.ball, { ring: materials.bearingSteel, ball: materials.chrome }),
    meta: {
      name: txt('Сачмен лагер 6004 – опора B', 'Ball bearing 6004 – B'),
      material: txt('Лагерна стомана 100Cr6'),
      func: txt('Втората опора на вал 1. Застава непосредствено до колелото и заедно с рамото го фиксира по оста.'),
      dims: [
        { label: txt('d × D × B'), value: '20 × 42 × 12 mm' },
        { label: txt('Тела'), value: `${BRG1.n} сачми ø6,35 mm` },
      ],
    },
  },
  {
    id: 'shaft2',
    body: 's2',
    position: [0, 0, 0],
    explode: { offset: [0, 0, 0], order: 0 },
    approach: [0, 70, 0],
    build: ({ materials }) =>
      new THREE.Mesh(shaftGeometry(SHAFT2_SEGMENTS, SHAFT2_OFFSET, SHAFT2_KEYWAY, KEY2), materials.steel()),
    meta: {
      name: txt('Вал 2 (изходящ)', 'Shaft 2 (output)'),
      material: txt('Стомана C45, подобрена (220–250 HB)'),
      func: txt(
        'Носи голямото колело и предава намалените обороти и увеличения въртящ момент към работната машина.',
      ),
      dims: [
        { label: txt('Диаметри'), value: 'ø25 k6 / ø25 h9, рамо ø30' },
        { label: txt('Дължина'), value: '120 mm' },
        { label: txt('Шпонков канал'), value: '8 N9 × 14 mm, t₁ = 4,0' },
      ],
    },
  },
  {
    id: 'key2',
    body: 's2',
    position: [0, 0, 0],
    explode: { offset: [20, 0, 0], order: 2, frame: 'spin' },
    build: ({ materials }) => new THREE.Mesh(keyGeometry(12.5, KEY2), materials.darkSteel()),
    meta: {
      name: txt('Призматична шпонка 8×7×14', 'Parallel key 8×7×14'),
      material: txt('Стомана C45, калибрирана'),
      func: txt('Свързва вал 2 с голямото колело. Предава въртящия момент, който тук е два пъти по-голям от този на вал 1.'),
      dims: [
        { label: txt('b × h × l'), value: '8 × 7 × 14 mm' },
        { label: txt('Дълбочини'), value: 't₁ = 4,0 mm (вал), t₂ = 3,3 mm (главина)' },
      ],
    },
  },
  {
    id: 'gear2',
    body: 's2',
    position: [0, 0, 0],
    explode: { offset: [0, 0, 36], order: 1 },
    build: ({ materials }) => new THREE.Mesh(gearGeometry(L), materials.paint(GEAR_COLOR, 0.6, 0.38)),
    meta: {
      name: txt(`Зъбно колело z₂ = ${z2} (голямо)`, `Gear z2 = ${z2}`),
      material: txt('Стомана C45, подобрена 240–280 HB'),
      func: txt(
        `Задвижваното колело. Върти се в обратна посока с n₂ = n₁·${z1}/${z2}. Дискът с олекотяващи отвори намалява масата и инерцията.`,
      ),
      dims: [
        { label: txt('Параметри'), value: `m = ${n(m)} mm, z = ${z2}, α = 20°, x = ${n(-x1)}` },
        { label: txt('Диаметри'), value: `d = ${n(G2.d)}, da = ${n(G2.da)}, df = ${n(G2.df)} mm` },
        { label: txt('Ширина / отвор'), value: L.integral2 ? '18 mm / вал-зъбно колело' : '18 mm / ø25 H7' },
      ],
    },
  },
  {
    id: 'brg2A',
    body: 's2',
    position: [0, 0, BRG2A_Z],
    spin: { outer: 0, balls: 0.4 },
    explode: { offset: [0, 0, -50], order: 1 },
    build: ({ materials }) =>
      ballBearing(BRG2.d, BRG2.D, BRG2.B, BRG2.n, BRG2.ball, { ring: materials.bearingSteel, ball: materials.chrome }),
    meta: {
      name: txt('Сачмен лагер 6005 – опора A', 'Ball bearing 6005 – A'),
      material: txt('Лагерна стомана 100Cr6'),
      func: txt('Опира се в рамото ø30 на вал 2 и поема радиалната сила от зацепването.'),
      dims: [
        { label: txt('d × D × B'), value: '25 × 47 × 12 mm' },
        { label: txt('Тела'), value: `${BRG2.n} сачми ø7,14 mm` },
      ],
    },
  },
  {
    id: 'brg2B',
    body: 's2',
    position: [0, 0, BRG2B_Z],
    spin: { outer: 0, balls: 0.4 },
    explode: { offset: [0, 0, 58], order: 0 },
    build: ({ materials }) =>
      ballBearing(BRG2.d, BRG2.D, BRG2.B, BRG2.n, BRG2.ball, { ring: materials.bearingSteel, ball: materials.chrome }),
    meta: {
      name: txt('Сачмен лагер 6005 – опора B', 'Ball bearing 6005 – B'),
      material: txt('Лагерна стомана 100Cr6'),
      func: txt('Втората опора на вал 2, застава до главината на голямото колело.'),
      dims: [
        { label: txt('d × D × B'), value: '25 × 47 × 12 mm' },
        { label: txt('Тела'), value: `${BRG2.n} сачми ø7,14 mm` },
      ],
    },
  },
];
  return all.filter((p) => !(p.id === 'key1' && L.integral1) && !(p.id === 'key2' && L.integral2));
}
