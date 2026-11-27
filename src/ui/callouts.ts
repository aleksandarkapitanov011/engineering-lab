/**
 * Callout labels on the 3D model: the name of every part in two tidy columns (left and right of the model),
 * each with a thin leader line and an arrow head pointing at its part, like an assembly drawing.
 * Labels never overlap: each column is sorted by the height of its parts and spread to a minimum spacing.
 */
import { h } from './dom';

export interface CalloutItem {
  id: string;
  text: string;
  /** Anchor on the part, in the host's pixel coordinates. */
  x: number;
  y: number;
}

export interface CalloutBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Top of the right column (it may start lower, under a button in the corner). */
  rightTop?: number;
}

const SVG = 'http://www.w3.org/2000/svg';
const ROW = 24; // minimum vertical spacing between labels (px)

export interface Callouts {
  el: HTMLElement;
  update(items: CalloutItem[], bounds: CalloutBounds, selected: string | null): void;
  hide(): void;
}

export function createCallouts(onPick: (id: string) => void): Callouts {
  const svg = document.createElementNS(SVG, 'svg');
  svg.classList.add('callout-lines');
  svg.innerHTML =
    '<defs><marker id="callout-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M0 1 L10 5 L0 9 z" fill="currentColor"/></marker></defs>';
  const el = h('div', { class: 'callouts', hidden: true });
  el.append(svg);
  const labels = new Map<string, { btn: HTMLButtonElement; line: SVGPathElement; dot: SVGCircleElement; w: number }>();

  const get = (id: string, text: string) => {
    let l = labels.get(id);
    if (!l) {
      const btn = h('button', { class: 'callout', type: 'button' }) as HTMLButtonElement;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        onPick(id);
      });
      el.append(btn);
      const line = document.createElementNS(SVG, 'path');
      line.setAttribute('marker-end', 'url(#callout-head)');
      const dot = document.createElementNS(SVG, 'circle');
      dot.setAttribute('r', '2.6');
      svg.append(line, dot);
      l = { btn, line, dot, w: 0 };
      labels.set(id, l);
    }
    if (l.btn.textContent !== text) {
      l.btn.textContent = text;
      l.w = 0;
    }
    if (!l.w) l.w = l.btn.offsetWidth || text.length * 7 + 16;
    return l;
  };

  /** Spreads wanted y positions (sorted) to at least ROW apart, inside [top, bottom]. */
  const spread = (ys: number[], top: number, bottom: number): number[] => {
    const out = ys.map((y) => Math.min(Math.max(y, top), bottom));
    for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + ROW);
    const over = out.length ? out[out.length - 1] - bottom : 0;
    if (over > 0) {
      out[out.length - 1] -= over;
      for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - ROW);
    }
    return out;
  };

  return {
    el,
    update(items, b, selected) {
      el.hidden = false;
      const seen = new Set(items.map((i) => i.id));
      for (const [id, l] of labels) {
        const on = seen.has(id);
        l.btn.hidden = !on;
        l.line.style.display = on ? '' : 'none';
        l.dot.style.display = on ? '' : 'none';
      }
      if (!items.length) return;
      // Split at the middle of the anchors; each side sorted from top to bottom.
      const xs = items.map((i) => i.x).sort((a, c) => a - c);
      const mid = (xs[0] + xs[xs.length - 1]) / 2;
      const sides = [items.filter((i) => i.x < mid), items.filter((i) => i.x >= mid)];
      // Keep the columns balanced: move the anchors nearest the middle to the shorter side.
      while (Math.abs(sides[0].length - sides[1].length) > 1) {
        const [from, to] = sides[0].length > sides[1].length ? [sides[0], sides[1]] : [sides[1], sides[0]];
        from.sort((a, c) => Math.abs(a.x - mid) - Math.abs(c.x - mid));
        to.push(from.shift()!);
      }
      sides.forEach((side, s) => {
        side.sort((a, c) => a.y - c.y);
        const ys = spread(
          side.map((i) => i.y),
          (s === 1 ? b.rightTop ?? b.top : b.top) + ROW / 2,
          b.bottom - ROW / 2,
        );
        side.forEach((it, k) => {
          const l = get(it.id, it.text);
          const y = ys[k];
          const left = s === 0 ? b.left : b.right - l.w;
          l.btn.style.transform = `translate(${Math.round(left)}px, ${Math.round(y - 11)}px)`;
          l.btn.classList.toggle('on', it.id === selected);
          l.btn.classList.toggle('right', s === 1);
          // Leader: horizontal from the label, then straight to the part.
          const x0 = s === 0 ? left + l.w + 2 : left - 2;
          const x1 = s === 0 ? x0 + 12 : x0 - 12;
          l.line.setAttribute('d', `M${x0.toFixed(1)} ${y.toFixed(1)} H${x1.toFixed(1)} L${it.x.toFixed(1)} ${it.y.toFixed(1)}`);
          l.line.classList.toggle('on', it.id === selected);
          l.dot.setAttribute('cx', x0.toFixed(1));
          l.dot.setAttribute('cy', y.toFixed(1));
        });
      });
    },
    hide() {
      el.hidden = true;
    },
  };
}
