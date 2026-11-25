/**
 * Theory booklet: six pages with animated SVG illustrations computed from the same involute math
 * as the 3D model (tooth shapes, line of action, contact points, undercut trochoid).
 */
import type { TheoryPage } from '../../core/types';
import { contactRatio, deg, gearDims, gearOutline, inv, matingPhase, minTeethNoUndercut, polygonPath } from '../../core/involute';
import { animated, arcPath, arrowDefs, label, makeRoot, svg } from '../../ui/illus';
import { tr } from '../../i18n';

const PIN = '#4d82b3';
const GEAR = '#c4913f';
const ACC = 'var(--accent)';
const NSW = { 'vector-effect': 'non-scaling-stroke' };
const bg = (s: string): { bg: string } => ({ bg: s });

const EPS = contactRatio(2, 20, 40, 20);
const comma = (v: number, d = 2): string => v.toFixed(d).replace('.', ',');

/** Group in "math" coordinates (mm, y up) placed at screen (x, y) with scale k. */
function mathGroup(parent: Element, x: number, y: number, k: number): SVGGElement {
  return svg('g', { transform: `translate(${x} ${y}) scale(${k} ${-k})` }, parent);
}

function gear(
  parent: Element,
  z: number,
  phase: number,
  fill: string,
  o: { backlash?: number; bore?: number; spoke?: string; m?: number; opacity?: number } = {},
): SVGGElement {
  const m = o.m ?? 2;
  const g = svg('g', {}, parent);
  svg(
    'path',
    {
      d: polygonPath(gearOutline({ m, z, phase, backlash: o.backlash ?? 0.05, flankSegments: 8 })),
      fill,
      'fill-opacity': o.opacity ?? 0.88,
      stroke: 'var(--text)',
      'stroke-width': 1,
      'stroke-linejoin': 'round',
      ...NSW,
    },
    g,
  );
  const bore = o.bore ?? (m * z) / 8;
  svg('circle', { r: bore, fill: 'var(--surface)', stroke: 'var(--text)', 'stroke-width': 1, ...NSW }, g);
  if (o.spoke) {
    svg('line', { x1: bore, y1: 0, x2: (m * z) / 2 - m * 1.6, y2: 0, stroke: o.spoke, 'stroke-width': 3, 'stroke-linecap': 'round', ...NSW }, g);
  }
  return g;
}

const rotDeg = (rad: number): string => `rotate(${((rad * 180) / Math.PI).toFixed(3)})`;

// ------------------------------------------------------------------ Page 1

function page1(host: HTMLElement) {
  const root = makeRoot(host);
  arrowDefs(root, 'p1', 'var(--accent)');
  const k = 2.75;
  const c1x = 92;
  const c2x = c1x + 60 * k;
  const cy = 132;
  const g1w = mathGroup(root, c1x, cy, k);
  const g2w = mathGroup(root, c2x, cy, k);
  const g1 = gear(g1w, 20, 0, PIN, { spoke: '#ffffff' });
  const g2 = gear(g2w, 40, matingPhase(40), GEAR, { spoke: '#ffffff' });
  const r1 = 22 * k + 12;
  const r2 = 42 * k + 10;
  svg('path', { d: arcPath(c1x, cy, r1, 200, 120), fill: 'none', stroke: ACC, 'stroke-width': 3, 'marker-end': 'url(#ah-p1)' }, root);
  svg('path', { d: arcPath(c2x, cy, r2, -30, 30), fill: 'none', stroke: ACC, 'stroke-width': 3, 'marker-end': 'url(#ah-p1)' }, root);
  label(root, c1x, cy + 22 * k + 34, 'z₁ = 20 · задвижващо', { size: 13, weight: 700 });
  label(root, c2x, 290, 'z₂ = 40 · задвижвано', { size: 13, weight: 700 });
  label(root, c1x - 2, 22, 'n₁, M₁', { size: 14, color: ACC, weight: 700 });
  const pp = svg('circle', { cx: c1x + 20 * k, cy, r: 4, fill: ACC }, root);
  pp.setAttribute('stroke', 'var(--surface)');
  label(root, c1x + 20 * k + 4, 16, 'зацепване', { size: 12, color: 'var(--text-dim)' });
  svg('line', { x1: c1x + 20 * k, y1: 21, x2: c1x + 20 * k, y2: cy - 8, stroke: 'var(--text-dim)', 'stroke-width': 1 }, root);
  return animated(root, (t) => {
    const a = t * 0.9;
    g1.setAttribute('transform', rotDeg(a));
    g2.setAttribute('transform', rotDeg((-a * 20) / 40));
  });
}

// ------------------------------------------------------------------ Page 2

function page2(host: HTMLElement) {
  const root = makeRoot(host);
  const k = 5.2;
  const cx = 128;
  const cy = 150;
  const d = gearDims(2, 20, 20);
  const g = mathGroup(root, cx, cy, k);
  gear(g, 20, Math.PI / 2, PIN, { backlash: 0 });
  const circles = [
    { r: d.da / 2, dash: '', color: 'var(--text)', name: 'da = d + 2m = 44', y: 40 },
    { r: d.d / 2, dash: '10 4 2 4', color: ACC, name: 'd = m·z = 40', y: 98 },
    { r: d.df / 2, dash: '4 3', color: 'var(--text)', name: 'df = d − 2,5m = 35', y: 156 },
  ];
  const items = circles.map((c, i) => {
    const el = svg('circle', { cx, cy, r: c.r * k, fill: 'none', stroke: c.color, 'stroke-width': 1.4, 'stroke-dasharray': c.dash }, root);
    const ang = deg(-28 - i * 14);
    const px = cx + c.r * k * Math.cos(ang);
    const py = cy + c.r * k * Math.sin(ang);
    const ln = svg('polyline', { points: `${px},${py} 262,${c.y} 268,${c.y}`, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1 }, root);
    const tx = label(root, 272, c.y + 4, c.name, { anchor: 'start', size: 13, weight: 600 });
    return { el, ln, tx };
  });
  // Pitch p between two neighbouring tooth centres on the pitch circle.
  const a0 = Math.PI / 2;
  const a1 = Math.PI / 2 - (2 * Math.PI) / 20;
  const rp = (d.d / 2) * k;
  const pArc = svg('path', { d: arcPath(cx, cy, rp, -(a0 * 180) / Math.PI, -(a1 * 180) / Math.PI), fill: 'none', stroke: ACC, 'stroke-width': 4, 'stroke-linecap': 'round' }, root);
  const pLab = label(root, 272, 216, 'p = π·m = 6,28', { anchor: 'start', size: 13, weight: 600 });
  svg('polyline', { points: `${cx + rp * Math.cos(-(a0 + a1) / 2) + 4},${cy + rp * Math.sin(-(a0 + a1) / 2) - 4} 262,212 268,212`, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1 }, root);
  label(root, 272, 262, 'm = 2 mm,  z = 20', { anchor: 'start', size: 13, color: 'var(--text-dim)' });
  const all = [...items.map((i) => [i.el, i.tx] as const), [pArc, pLab] as const];
  return animated(root, (t) => {
    const active = Math.floor(t / 1.6) % all.length;
    all.forEach(([shape, txt], i) => {
      const on = i === active;
      shape.setAttribute('stroke-width', on ? (i === 3 ? '6' : '3.2') : i === 3 ? '4' : '1.4');
      txt.setAttribute('fill', on ? 'var(--accent)' : 'var(--text)');
    });
  });
}

// ------------------------------------------------------------------ Page 3

function page3(host: HTMLElement) {
  const root = makeRoot(host);
  arrowDefs(root, 'p3', 'var(--accent)');
  const k = 7.5;
  const z1 = 20;
  const z2 = 40;
  const g1d = gearDims(2, z1, 20);
  const g2d = gearDims(2, z2, 20);
  const al = g1d.alpha;
  const a = 60;
  const rb1 = g1d.db / 2;
  const rb2 = g2d.db / 2;
  const Px = 200;
  const Py = 150;
  const M = (x: number, y: number): [number, number] => [Px + (x - 20) * k, Py - y * k];
  const world = mathGroup(root, Px - 20 * k, Py, k);
  const g1 = gear(world, z1, 0, PIN, { backlash: 0.04, opacity: 0.45 });
  const g2wrap = svg('g', { transform: `translate(${a} 0)` }, world);
  const g2 = gear(g2wrap, z2, matingPhase(z2), GEAR, { backlash: 0.04, opacity: 0.45 });
  // Base and pitch circles.
  for (const [cx, r, dash, col] of [
    [0, rb1, '3 3', 'var(--text-dim)'],
    [a, rb2, '3 3', 'var(--text-dim)'],
    [0, 20, '10 4 2 4', 'var(--text)'],
    [a, 40, '10 4 2 4', 'var(--text)'],
  ] as const) {
    svg('circle', { cx, cy: 0, r, fill: 'none', stroke: col, 'stroke-width': 1, 'stroke-dasharray': dash, ...NSW }, world);
  }
  // Line of action from T1 to T2.
  const dir: [number, number] = [Math.sin(al), Math.cos(al)];
  const T1: [number, number] = [rb1 * Math.cos(al), -rb1 * Math.sin(al)];
  const L = a * Math.sin(al);
  const sE = Math.sqrt((g1d.da / 2) ** 2 - rb1 * rb1);
  const sA = L - Math.sqrt((g2d.da / 2) ** 2 - rb2 * rb2);
  const at = (s: number): [number, number] => [T1[0] + dir[0] * s, T1[1] + dir[1] * s];
  const [t1x, t1y] = M(...T1);
  const [t2x, t2y] = M(...at(L));
  svg('line', { x1: t1x, y1: t1y, x2: t2x, y2: t2y, stroke: ACC, 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }, root);
  const [ax, ay] = M(...at(sA));
  const [ex, ey] = M(...at(sE));
  svg('line', { x1: ax, y1: ay, x2: ex, y2: ey, stroke: ACC, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-opacity': 0.55 }, root);
  // Common tangent at P and the pressure angle.
  svg('line', { x1: Px, y1: Py - 120, x2: Px, y2: Py + 120, stroke: 'var(--text-dim)', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, root);
  svg('path', { d: arcPath(Px, Py, 46, -90, -90 + 20), fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.4 }, root);
  label(root, Px + 10, Py - 52, 'α = 20°', { anchor: 'start', size: 13, weight: 700 });
  svg('circle', { cx: Px, cy: Py, r: 4, fill: 'var(--text)' }, root);
  label(root, Px - 10, Py + 18, 'P', { size: 14, weight: 700 });
  // Normal force along the line of action.
  const [fx, fy] = M(...at(L * 0.5 + 9));
  svg('line', { x1: Px, y1: Py, x2: fx, y2: fy, stroke: ACC, 'stroke-width': 2.4, 'marker-end': 'url(#ah-p3)' }, root);
  label(root, fx + 8, fy + 4, 'Fₙ', { anchor: 'start', size: 14, color: ACC, weight: 700 });
  label(root, 392, 22, 'линия на зацепване', { anchor: 'end', size: 12, color: ACC, weight: 700 });
  svg('line', { x1: 330, y1: 28, x2: (t2x + Px) / 2 + 30, y2: (t2y + Py) / 2 - 6, stroke: ACC, 'stroke-width': 1 }, root);
  label(root, 12, 286, 'основни окръжности (пунктир)', { anchor: 'start', size: 11, color: 'var(--text-dim)' });
  label(root, 388, 286, `ε = ${comma(EPS)}`, { anchor: 'end', size: 12, color: 'var(--text-dim)' });
  // Contact points.
  const dots = [0, 1, 2].map(() => svg('circle', { r: 5.5, fill: '#ffffff', stroke: ACC, 'stroke-width': 3 }, root));
  const psiB = Math.PI / (2 * z1) - 0.02 / 20 + inv(al);
  const omega = (2 * Math.PI) / z1 / 2.6;
  return animated(root, (t) => {
    const phi = t * omega;
    g1.setAttribute('transform', rotDeg(phi));
    g2.setAttribute('transform', rotDeg((-phi * z1) / z2));
    const base = psiB + phi + al;
    let i = 0;
    for (let kk = 0; kk < z1; kk++) {
      let tt = (base + (2 * Math.PI * kk) / z1) % (2 * Math.PI);
      if (tt > Math.PI) tt -= 2 * Math.PI;
      const s = rb1 * tt;
      if (s >= sA && s <= sE && i < dots.length) {
        const [x, y] = M(...at(s));
        dots[i].setAttribute('cx', x.toFixed(2));
        dots[i].setAttribute('cy', y.toFixed(2));
        dots[i].setAttribute('visibility', 'visible');
        i++;
      }
    }
    for (; i < dots.length; i++) dots[i].setAttribute('visibility', 'hidden');
  });
}

// ------------------------------------------------------------------ Page 4

function page4(host: HTMLElement) {
  const root = makeRoot(host);
  arrowDefs(root, 'p4', 'var(--accent)');
  const k = 2.5;
  const c1x = 100;
  const c2x = c1x + 60 * k;
  const cy = 125;
  const g1 = gear(mathGroup(root, c1x, cy, k), 20, 0, PIN, { spoke: '#ffffff' });
  const g2 = gear(mathGroup(root, c2x, cy, k), 40, matingPhase(40), GEAR, { spoke: '#ffffff' });
  svg('path', { d: arcPath(c1x, cy, 22 * k + 10, 210, 130), fill: 'none', stroke: ACC, 'stroke-width': 3, 'marker-end': 'url(#ah-p4)' }, root);
  svg('path', { d: arcPath(c2x, cy, 42 * k + 8, -40, 25), fill: 'none', stroke: ACC, 'stroke-width': 3, 'marker-end': 'url(#ah-p4)' }, root);
  label(root, c1x, 28, 'обратно на часовника', { size: 11, color: 'var(--text-dim)' });
  label(root, c2x, 14, 'по часовника', { size: 11, color: 'var(--text-dim)' });
  const n1 = label(root, 20, 262, '', { anchor: 'start', size: 14, weight: 700 });
  const n2 = label(root, 20, 284, '', { anchor: 'start', size: 14, weight: 700 });
  label(root, 380, 284, 'i = z₂/z₁ = 2', { anchor: 'end', size: 15, color: ACC, weight: 800 });
  return animated(root, (t) => {
    const a = t * 1.1;
    g1.setAttribute('transform', rotDeg(a));
    g2.setAttribute('transform', rotDeg(-a / 2));
    const rev = a / (2 * Math.PI);
    n1.textContent = tr(`колело z₁: ${comma(rev, 2)} об.`);
    n2.textContent = tr(`колело z₂: ${comma(rev / 2, 2)} об.`);
  });
}

// ------------------------------------------------------------------ Page 5

function page5(host: HTMLElement) {
  const root = makeRoot(host);
  arrowDefs(root, 'p5', 'var(--text)');
  const k = 1.75;
  const c1x = 66;
  const c2x = c1x + 60 * k;
  const cy = 118;
  gear(mathGroup(root, c1x, cy, k), 20, 0, PIN, { backlash: 0.1 });
  gear(mathGroup(root, c2x, cy, k), 40, matingPhase(40), GEAR, { backlash: 0.1 });
  for (const x of [c1x, c2x]) {
    svg('line', { x1: x, y1: cy - 6, x2: x, y2: 262, stroke: 'var(--text-dim)', 'stroke-width': 1, 'stroke-dasharray': '8 3 2 3' }, root);
  }
  svg('line', { x1: c1x, y1: 248, x2: c2x, y2: 248, stroke: 'var(--text)', 'stroke-width': 1.2, 'marker-start': 'url(#ah-p5)', 'marker-end': 'url(#ah-p5)' }, root);
  label(root, (c1x + c2x) / 2, 241, 'a = 60 mm', { size: 13, weight: 700 });
  // Magnified inset with exaggerated backlash.
  const ix = 318;
  const iy = 118;
  const ir = 72;
  const P = [c1x + 20 * k, cy];
  svg('line', { x1: P[0], y1: P[1], x2: ix - ir, y2: iy, stroke: 'var(--text-dim)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, root);
  svg('circle', { cx: P[0], cy: P[1], r: 9, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1 }, root);
  const clip = svg('clipPath', { id: 'p5clip' }, root);
  svg('circle', { cx: ix, cy: iy, r: ir }, clip);
  const inset = svg('g', { 'clip-path': 'url(#p5clip)' }, root);
  svg('circle', { cx: ix, cy: iy, r: ir, fill: 'var(--surface-2)' }, inset);
  const zk = 15;
  const w = mathGroup(inset, ix - 20 * zk, iy, zk);
  const B = 0.55;
  const p1 = gear(w, 20, 0, PIN, { backlash: B });
  const g2wrap = svg('g', { transform: 'translate(60 0)' }, w);
  gear(g2wrap, 40, matingPhase(40), GEAR, { backlash: B });
  svg('circle', { cx: ix, cy: iy, r: ir, fill: 'none', stroke: 'var(--text)', 'stroke-width': 1.5 }, root);
  label(root, ix, iy + ir + 20, 'j – страничен луфт', { size: 12, weight: 700 });
  label(root, ix, iy + ir + 36, '(увеличено ×8)', { size: 11, color: 'var(--text-dim)' });
  const amp = (B / 20) * 0.95;
  return animated(root, (t) => {
    p1.setAttribute('transform', rotDeg(amp * Math.sin(t * 2.4)));
  });
}

// ------------------------------------------------------------------ Page 6

function page6(host: HTMLElement) {
  const root = makeRoot(host);
  svg('line', { x1: 200, y1: 10, x2: 200, y2: 290, stroke: 'var(--line)', 'stroke-width': 1 }, root);
  label(root, 100, 22, 'Подрязване (z = 8)', { size: 13, weight: 700 });
  label(root, 300, 22, 'Грешно междуосие', { size: 13, weight: 700 });

  // --- Left: undercut generated by the rack cutter tip (trochoid) ---
  const m = 2;
  const z = 8;
  const d8 = gearDims(m, z, 20);
  const rp = d8.d / 2;
  const k = 13;
  const cx = 100;
  const cy = 262;
  const clipL = svg('clipPath', { id: 'p6l' }, root);
  svg('rect', { x: 4, y: 32, width: 192, height: 228 }, clipL);
  const left = svg('g', { 'clip-path': 'url(#p6l)' }, root);
  const w = mathGroup(left, cx, cy, k);
  const space = Math.PI / 2;
  svg('path', { d: polygonPath(gearOutline({ m, z, phase: space + Math.PI / z, flankSegments: 10 })), fill: 'var(--surface-3)', stroke: 'var(--text)', 'stroke-width': 1, ...NSW }, w);
  svg('circle', { r: d8.db / 2, fill: 'none', stroke: 'var(--text-dim)', 'stroke-width': 1, 'stroke-dasharray': '3 3', ...NSW }, w);
  const al = d8.alpha;
  const xc = (Math.PI * m) / 4 - 1.25 * m * Math.tan(al);
  const corner = (sx: number, phi: number): [number, number] => {
    const X = sx - rp * phi;
    const Y = rp - 1.25 * m;
    const c = Math.cos(-phi);
    const s = Math.sin(-phi);
    return [X * c - Y * s, X * s + Y * c];
  };
  for (const sx of [xc, -xc]) {
    const pts: string[] = [];
    for (let i = 0; i <= 80; i++) {
      const phi = -1.1 + (2.2 * i) / 80;
      const [x, y] = corner(sx, phi);
      if (Math.hypot(x, y) <= d8.da / 2 + 0.5) pts.push(`${x.toFixed(3)},${y.toFixed(3)}`);
    }
    svg('polyline', { points: pts.join(' '), fill: 'none', stroke: 'var(--err)', 'stroke-width': 2, ...NSW }, w);
  }
  // Moving rack tooth (tool) in the gear's frame.
  const tw = 2.25 * m * Math.tan(al);
  const rackPts = (phi: number): string => {
    const base: [number, number][] = [
      [-xc, rp - 1.25 * m],
      [xc, rp - 1.25 * m],
      [xc + tw, rp + m],
      [xc + tw + 2.5, rp + m],
      [xc + tw + 2.5, rp + m + 4],
      [-xc - tw - 2.5, rp + m + 4],
      [-xc - tw - 2.5, rp + m],
      [-xc - tw, rp + m],
    ];
    const c = Math.cos(-phi);
    const s = Math.sin(-phi);
    return base
      .map(([X, Y]) => {
        const xx = X - rp * phi;
        return `${(xx * c - Y * s).toFixed(3)},${(xx * s + Y * c).toFixed(3)}`;
      })
      .join(' ');
  };
  const rack = svg('polygon', { fill: ACC, 'fill-opacity': 0.28, stroke: ACC, 'stroke-width': 1.5, ...NSW }, w);
  label(root, 100, 282, `z = 8 < z min ≈ ${Math.round(minTeethNoUndercut(20))}`, { size: 12, color: 'var(--text-dim)' });
  label(root, 8, 150, 'подрязване', { anchor: 'start', size: 12, color: 'var(--err)', weight: 700 });

  // --- Right: centre distance error ---
  const a0 = 36;
  const kk = 2.7;
  const outer = svg('g', { transform: `translate(300 140) scale(${kk} ${-kk}) rotate(90)` }, root);
  const ga = svg('g', {}, outer);
  const gb = svg('g', {}, outer);
  const pa = gear(ga, 18, 0, PIN, { backlash: 0.05 });
  const pb = gear(gb, 18, matingPhase(18), GEAR, { backlash: 0.05 });
  const aLab = label(root, 300, 262, '', { size: 13, weight: 700 });
  const status = label(root, 300, 282, '', { size: 12, weight: 700 });
  const d18 = gearDims(2, 18, 20);
  const eps = (a: number): number => {
    const aw = Math.acos(Math.min(1, (a0 * Math.cos(d18.alpha)) / a));
    const ra = d18.da / 2;
    const rb = d18.db / 2;
    return (2 * Math.sqrt(ra * ra - rb * rb) - a * Math.sin(aw)) / d18.pb;
  };
  return animated(root, (t) => {
    const phi = Math.sin(t * 0.9) * 0.9;
    rack.setAttribute('points', rackPts(phi));
    const a = a0 + 0.6 + 1.6 * Math.sin(t * 0.8);
    ga.setAttribute('transform', `translate(${-a / 2} 0)`);
    gb.setAttribute('transform', `translate(${a / 2} 0)`);
    const rot = t * 0.5;
    pa.setAttribute('transform', rotDeg(rot));
    pb.setAttribute('transform', rotDeg(-rot));
    aLab.textContent = tr(`a = ${comma(a, 1)} mm (a₀ = 36)`);
    if (a < a0 - 0.05) {
      status.textContent = tr('интерференция – заклинване');
      status.setAttribute('fill', 'var(--err)');
    } else if (a > a0 + 0.4) {
      status.textContent = tr(`голям луфт, ε = ${comma(eps(a))}`);
      status.setAttribute('fill', 'var(--accent)');
    } else {
      status.textContent = tr(`правилно, ε = ${comma(eps(a))}`);
      status.setAttribute('fill', 'var(--ok)');
    }
  });
}

export const theory: TheoryPage[] = [
  {
    id: 'what',
    title: bg('Какво е зъбна предавка'),
    sentences: [
      bg('==Зъбната предавка== предава __въртене и въртящ момент__ между два вала чрез последователно зацепване на зъбите на две колела.'),
      bg('За разлика от ремъчната предавка тук **няма приплъзване**, затова предавателното отношение е ==точно и постоянно==.'),
      bg('Колелото, което получава момента от двигателя, е __задвижващо__, а другото – __задвижвано__. По-малкото колело в двойката се нарича още ((шестерня)).'),
      bg('Цилиндричните колела с прави зъби работят между **успоредни валове** и имат КПД около ==0,97–0,99== на стъпало.'),
    ],
    annotations: {
      caption: bg('фиг. 1 – външно зацепване на две прави зъбни колела'),
      formulaNote: bg('η ≈ 0,98 → почти без загуби'),
      sticky: bg('Оборотите падат 2 пъти → моментът расте почти 2 пъти. Мощността почти се запазва!'),
    },
    formula: 'P = M·ω  ⇒  M₂ = M₁ · i · η',
    illustration: page1,
  },
  {
    id: 'module',
    title: bg('Модул и делителна окръжност'),
    sentences: [
      bg('==Делителната окръжност== е условната окръжност, по която двете колела се __търкалят едно по друго без плъзгане__.'),
      bg('Стъпката **p** е разстоянието между два съседни зъба по делителната окръжност. ==Модулът е m = p/π== и се избира от стандартен ред (ISO 54).'),
      bg('По-голям модул означава __по-едри и по-здрави зъби__.'),
      bg('Главата на зъба е висока **m**, а петата **1,25·m**. Затова ((da = d + 2m)) и ((df = d − 2,5m)).'),
    ],
    annotations: {
      caption: bg('фиг. 2 – окръжностите на колело с z = 20'),
      formulaNote: bg('най-важната формула!'),
      sticky: bg('Модулът е „размерът“ на зъба: при m = 2 зъбът е висок 2,25·m = 4,5 mm.'),
      warning: bg('Колела с различен модул НЕ могат да работят заедно!'),
    },
    formula: 'd = m · z',
    illustration: page2,
  },
  {
    id: 'involute',
    title: bg('Еволвентен профил и ъгъл на зацепване'),
    sentences: [
      bg('Профилът на зъба е ==еволвента== – кривата, която описва краят на опънат конец, __размотаван от основната окръжност__.'),
      bg('Нормалата към еволвентата винаги допира основната окръжност, затова всички точки на контакт лежат на ==една права – линията на зацепване==.'),
      bg('Линията на зацепване минава през ((полюса P)) и сключва ъгъл **α = 20°** с общата допирателна към делителните окръжности. По нея действа силата __Fₙ__.'),
      bg(`Плътният участък е активната част. Разделена на основната стъпка pb, тя дава ==коефициента на препокриване ε ≈ ${comma(EPS)}==.`),
    ],
    annotations: {
      caption: bg('фиг. 3 – точките на контакт се движат по една права'),
      formulaNote: bg('основна окръжност'),
      sticky: bg('ε > 1: следващата двойка зъби влиза в контакт, преди предишната да излезе. Затова работи плавно.'),
    },
    formula: 'db = d · cos α',
    illustration: page3,
  },
  {
    id: 'ratio',
    title: bg('Предавателно отношение и посока'),
    sentences: [
      bg('==Предавателното отношение== е i = n₁/n₂. През зацепването минават __еднакъв брой зъби__ от двете колела, затова **n₁·z₁ = n₂·z₂**.'),
      bg('Тук ((i = 40/20 = 2)): голямото колело прави половин оборот за всеки оборот на малкото.'),
      bg('Въртящият момент нараства почти толкова пъти, колкото намаляват оборотите: ==M₂ ≈ M₁·i·η==.'),
      bg('При външно зацепване колелата се въртят __в противоположни посоки__.'),
    ],
    annotations: {
      caption: bg('фиг. 4 – броим оборотите на двете колела'),
      formulaNote: bg('i > 1 → редуктор'),
      sticky: bg('Междинно колело обръща посоката, но НЕ променя i.'),
    },
    formula: 'i = n₁ / n₂ = z₂ / z₁ = 2',
    illustration: page4,
  },
  {
    id: 'centre',
    title: bg('Междуосие и хлабина'),
    sentences: [
      bg('При колела без изместване ==делителните окръжности се допират==, а междуосието е **a = 60 mm**.'),
      bg('Страничната хлабина (луфт) **j** е малка междина между неработните профили. Нужна е за __мазилния слой, топлинното разширение и неточностите__.'),
      bg('Хлабината се получава чрез ==допуски на дебелината на зъбите== и на междуосието.'),
      bg('Твърде малка хлабина → __заклинване и нагряване__; твърде голяма → __удари и шум__ при смяна на посоката.'),
    ],
    annotations: {
      caption: bg('фиг. 5 – луфтът е увеличен 8 пъти'),
      formulaNote: bg('само при x = 0!'),
      warning: bg('Луфтът НЕ се прави с раздалечаване на колелата!'),
    },
    formula: 'a = m · (z₁ + z₂) / 2',
    illustration: page5,
  },
  {
    id: 'mistakes',
    title: bg('Чести грешки'),
    sentences: [
      bg('==Подрязване==: при малък брой зъби върхът на инструмента (__червената траектория__) отнема част от основата на зъба и го отслабва.'),
      bg('За α = 20° и x = 0 подрязване няма при ((z ≥ 17)). При по-малко зъби се прилага **положително изместване** x > 0.'),
      bg('==Грешно междуосие==: по-голямо a → по-голям луфт и по-малко ε; по-малко a → __интерференция и заклинване__.'),
      bg('Колела с различен модул или ъгъл на профила **не могат да работят заедно**.'),
    ],
    annotations: {
      caption: bg('фиг. 6 – вляво инструментът подрязва зъба, вдясно междуосието се мени'),
      formulaNote: bg('за α = 20°'),
      sticky: bg('Лек срещу подрязване: положително изместване x > 0.'),
      warning: bg('z < 17 → подрязване!'),
    },
    formula: 'z<sub>min</sub> = 2 / sin²α ≈ 17',
    illustration: page6,
  },
];
