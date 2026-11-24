/**
 * TAB 3 — Чертеж: SVG technical drawings with pinch-zoom, pan and tappable explanations.
 */
import type { TabSpec, TabView } from '../app/context';
import type { Mechanism } from '../core/types';
import { lt, t } from '../i18n';
import { h, capturePointer } from '../ui/dom';
import { icons } from '../ui/icons';
import { createSheet } from '../ui/sheet';

const TAP_SLOP = 7;
const NEAR_PX = 26;

function createDrawingTab(mech: Mechanism): TabView {
  const stage = h('div', { class: 'drawing-stage' });
  const paper = h('div', { class: 'drawing-sheet' });
  stage.appendChild(paper);
  const help = h('div', { class: 'drawing-help' }, t('drawHint'));
  stage.appendChild(help);

  const chips = mech.drawings.map((d, i) =>
    h('button', { class: 'chip', 'aria-pressed': String(i === 0), onclick: () => show(i) }, lt(d.title)),
  );
  const fitBtn = h('button', { class: 'chip', onclick: () => fit() }, h('span', { html: icons.expand, style: 'display:inline-flex;vertical-align:middle;margin-right:4px' }), t('drawReset'));
  const bar = h('div', { class: 'drawing-bar' }, ...chips, h('div', { style: 'flex:1' }), fitBtn);
  const el = h('section', { class: 'drawing-tab' }, bar, stage);
  const sheet = createSheet(el);

  let current = 0;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let svgW = 1;
  let svgH = 1;
  const rendered = new Map<number, string>();
  let activeNote: Element | null = null;

  const apply = (): void => {
    paper.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  const fitScale = (): number => {
    const r = stage.getBoundingClientRect();
    return Math.min(r.width / svgW, r.height / svgH) * 0.96;
  };

  const fit = (): void => {
    const r = stage.getBoundingClientRect();
    scale = fitScale();
    tx = (r.width - svgW * scale) / 2;
    ty = (r.height - svgH * scale) / 2;
    apply();
  };

  const zoomAt = (cx: number, cy: number, factor: number): void => {
    const min = fitScale() * 0.7;
    const max = 3.5;
    const ns = Math.min(max, Math.max(min, scale * factor));
    const k = ns / scale;
    tx = cx - (cx - tx) * k;
    ty = cy - (cy - ty) * k;
    scale = ns;
    apply();
  };

  function show(i: number): void {
    current = i;
    chips.forEach((c, j) => c.setAttribute('aria-pressed', String(j === i)));
    if (!rendered.has(i)) rendered.set(i, mech.drawings[i].render());
    paper.innerHTML = rendered.get(i)!;
    const svg = paper.querySelector('svg')!;
    svgW = Number(svg.getAttribute('width'));
    svgH = Number(svg.getAttribute('height'));
    activeNote = null;
    sheet.close();
    fit();
  }

  const openNote = (g: Element): void => {
    const key = g.getAttribute('data-note')!;
    const n = mech.drawings[current].notes[key];
    if (!n) return;
    activeNote?.classList.remove('active');
    paper.querySelectorAll(`[data-note="${key}"]`).forEach((e) => e.classList.add('active'));
    activeNote = g;
    sheet.open(lt(n.title), h('p', null, lt(n.body)), { kicker: lt(mech.drawings[current].title) });
  };
  sheet.onClose(() => {
    paper.querySelectorAll('[data-note].active').forEach((e) => e.classList.remove('active'));
    activeNote = null;
  });

  const tapAt = (x: number, y: number): void => {
    let target = document.elementFromPoint(x, y)?.closest('[data-note]') ?? null;
    if (!target) {
      // Forgiving taps: nearest note within a finger's width.
      let best = NEAR_PX;
      paper.querySelectorAll('[data-note] > .hit').forEach((hit) => {
        const r = hit.getBoundingClientRect();
        const dx = Math.max(r.left - x, 0, x - r.right);
        const dy = Math.max(r.top - y, 0, y - r.bottom);
        const d = Math.hypot(dx, dy);
        if (d < best) {
          best = d;
          target = hit.parentElement;
        }
      });
    }
    if (target) openNote(target);
    else sheet.close();
  };

  // ----- Gestures: 1 pointer pans, 2 pointers pinch, wheel zooms, double tap zooms. -----
  const pts = new Map<number, { x: number; y: number }>();
  let gesture: { moved: number; startX: number; startY: number; pinchDist: number; multi: boolean } | null = null;
  let lastTap = 0;

  stage.addEventListener('pointerdown', (e) => {
    capturePointer(stage, e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    paper.style.willChange = 'transform';
    if (pts.size === 1) gesture = { moved: 0, startX: e.clientX, startY: e.clientY, pinchDist: 0, multi: false };
    if (pts.size === 2 && gesture) {
      const [a, b] = [...pts.values()];
      gesture.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.multi = true;
    }
  });
  stage.addEventListener('pointermove', (e) => {
    const prev = pts.get(e.pointerId);
    if (!prev || !gesture) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pts.size === 1) {
      tx += cur.x - prev.x;
      ty += cur.y - prev.y;
      gesture.moved = Math.max(gesture.moved, Math.hypot(cur.x - gesture.startX, cur.y - gesture.startY));
      pts.set(e.pointerId, cur);
      apply();
    } else if (pts.size === 2) {
      pts.set(e.pointerId, cur);
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = stage.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left;
      const my = (a.y + b.y) / 2 - r.top;
      // Pan with the midpoint, zoom with the spread.
      const pmx = mx - (cur.x - prev.x) / 2;
      const pmy = my - (cur.y - prev.y) / 2;
      tx += mx - pmx;
      ty += my - pmy;
      if (gesture.pinchDist > 0) zoomAt(mx, my, d / gesture.pinchDist);
      gesture.pinchDist = d;
      gesture.moved = 99;
      apply();
    }
  });
  const end = (e: PointerEvent): void => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size > 0) return;
    paper.style.willChange = '';
    const g = gesture;
    gesture = null;
    if (!g || g.multi || g.moved > TAP_SLOP || e.type === 'pointercancel') return;
    const now = performance.now();
    if (now - lastTap < 300) {
      const r = stage.getBoundingClientRect();
      const fs = fitScale();
      if (scale > fs * 1.5) fit();
      else zoomAt(e.clientX - r.left, e.clientY - r.top, (fs * 3) / scale);
      lastTap = 0;
      return;
    }
    lastTap = now;
    help.hidden = true;
    tapAt(e.clientX, e.clientY);
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  const ro = new ResizeObserver(() => {
    if (!el.hidden) fit();
  });

  return {
    el,
    activate() {
      if (!paper.firstChild) show(0);
      else fit();
      ro.observe(stage);
    },
    deactivate() {
      ro.disconnect();
      sheet.close();
    },
    dispose() {
      ro.disconnect();
    },
  };
}

export const drawingTab: TabSpec = {
  id: 'drawing',
  label: 'tabDrawing',
  icon: 'drawing',
  create: (mech) => createDrawingTab(mech),
};
