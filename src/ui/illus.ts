/** Helpers for animated SVG illustrations in theory pages. */
import type { IllustrationHandle } from '../core/types';

const NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

export function label(
  parent: Element,
  x: number,
  y: number,
  t: string,
  o: { size?: number; anchor?: string; color?: string; weight?: number } = {},
): SVGTextElement {
  const el = svg(
    'text',
    {
      x,
      y,
      'text-anchor': o.anchor ?? 'middle',
      'font-size': o.size ?? 13,
      fill: o.color ?? 'var(--text)',
      'font-weight': o.weight ?? 500,
    },
    parent,
  );
  el.textContent = t;
  return el;
}

/** Arrow marker definitions; use marker-end="url(#ah-<id>)". */
export function arrowDefs(root: SVGSVGElement, id: string, color: string): void {
  const defs = svg('defs', {}, root);
  const m = svg(
    'marker',
    { id: `ah-${id}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
    defs,
  );
  svg('path', { d: 'M0 0L10 5L0 10z', fill: color }, m);
}

/** Circular arc path (screen coordinates, angles in degrees, clockwise when a1 > a0). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number): string => `${(cx + r * Math.cos((a * Math.PI) / 180)).toFixed(2)} ${(cy + r * Math.sin((a * Math.PI) / 180)).toFixed(2)}`;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${p(a0)}A${r} ${r} 0 ${large} ${sweep} ${p(a1)}`;
}

export function makeRoot(host: HTMLElement, w = 400, h = 300): SVGSVGElement {
  const root = svg('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img' });
  host.appendChild(root);
  return root;
}

/** requestAnimationFrame loop exposed as an IllustrationHandle. `tick` receives elapsed seconds. */
export function animated(root: SVGSVGElement, tick: (t: number, dt: number) => void): IllustrationHandle {
  let raf = 0;
  let t = 0;
  let last = 0;
  let running = false;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const loop = (now: number): void => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    tick(t, dt);
    raf = requestAnimationFrame(loop);
  };
  tick(0, 0);
  return {
    start() {
      if (running || reduce) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      root.remove();
    },
  };
}
