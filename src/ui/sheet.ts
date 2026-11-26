import { h, capturePointer } from './dom';
import { icons } from './icons';
import { t } from '../i18n';

export interface Sheet {
  el: HTMLElement;
  open(title: string, body: Node, opts?: { kicker?: string }): void;
  close(): void;
  isOpen(): boolean;
  onClose(fn: () => void): void;
  /** Collapsed = only the title bar shows; the panel stays active. */
  isCollapsed(): boolean;
  setCollapsed(on: boolean): void;
  /** Called whenever the visible height changes (open, close, collapse, expand). */
  onResize(fn: () => void): void;
}

/**
 * Non-modal bottom sheet anchored inside a tab. The 3D view or drawing above stays interactive.
 * Collapse it to its title bar with the chevron (or a swipe down) to see more of the view while the
 * panel stays active; close it with the cross.
 */
export function createSheet(host: HTMLElement): Sheet {
  const titleEl = h('h3', { class: 'sheet-title' });
  const kickerEl = h('div', { class: 'sheet-kicker' });
  const bodyEl = h('div', { class: 'sheet-body' });
  const closeBtn = h('button', { class: 'icon-btn sheet-close', 'aria-label': t('close'), html: icons.close });
  const collapseBtn = h('button', { class: 'icon-btn sheet-collapse', 'aria-label': t('collapse'), 'aria-expanded': 'true', html: icons.chevronDown });
  const handle = h('div', { class: 'sheet-handle', 'aria-hidden': 'true' });
  const el = h(
    'section',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'false', 'aria-hidden': 'true' },
    handle,
    h('header', { class: 'sheet-head' }, h('div', { class: 'sheet-titles' }, kickerEl, titleEl), h('div', { class: 'sheet-btns' }, collapseBtn, closeBtn)),
    bodyEl,
  );
  host.appendChild(el);
  const closeListeners: (() => void)[] = [];
  const resizeListeners: (() => void)[] = [];
  let open = false;
  let collapsed = false;
  const resized = (): void => resizeListeners.forEach((f) => f());

  const setCollapsed = (on: boolean): void => {
    if (collapsed === on) return;
    collapsed = on;
    el.classList.toggle('collapsed', on);
    collapseBtn.innerHTML = on ? icons.chevronUp : icons.chevronDown;
    collapseBtn.setAttribute('aria-label', t(on ? 'expand' : 'collapse'));
    collapseBtn.setAttribute('aria-expanded', String(!on));
    resized();
  };
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  });
  // A collapsed sheet opens again with a tap on its title bar; a tap on the handle toggles it.
  // A drag also ends in a click, which is ignored.
  let dragged = false;
  el.querySelector('.sheet-head')!.addEventListener('click', (e) => {
    if (dragged || !open) return;
    if (collapsed && !(e.target as Element).closest('button')) setCollapsed(false);
  });
  handle.addEventListener('click', () => {
    if (!dragged && open) setCollapsed(!collapsed);
  });

  const close = (): void => {
    if (!open) return;
    open = false;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    el.style.transform = '';
    setCollapsed(false);
    closeListeners.forEach((f) => f());
    resized();
  };
  closeBtn.addEventListener('click', close);

  // Swipe down to collapse (or to close an already collapsed sheet), swipe up to expand.
  let startY = 0;
  let dy = 0;
  let dragging = false;
  const onDown = (e: PointerEvent): void => {
    dragging = true;
    dragged = false;
    startY = e.clientY;
    dy = 0;
    el.style.transition = 'none';
    capturePointer(e.target as Element, e.pointerId);
  };
  const onMove = (e: PointerEvent): void => {
    if (!dragging) return;
    dy = e.clientY - startY;
    el.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };
  const onUp = (): void => {
    if (!dragging) return;
    dragging = false;
    dragged = Math.abs(dy) > 6;
    el.style.transition = '';
    el.style.transform = '';
    if (dy > 70) {
      if (collapsed) close();
      else setCollapsed(true);
    } else if (dy < -40) setCollapsed(false);
  };
  for (const target of [handle, el.querySelector('.sheet-head') as HTMLElement]) {
    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  return {
    el,
    open(title, body, opts) {
      titleEl.textContent = title;
      kickerEl.textContent = opts?.kicker ?? '';
      kickerEl.hidden = !opts?.kicker;
      bodyEl.replaceChildren(body);
      bodyEl.scrollTop = 0;
      open = true;
      el.style.transform = '';
      setCollapsed(false);
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      resized();
    },
    close,
    isOpen: () => open,
    onClose: (fn) => closeListeners.push(fn),
    isCollapsed: () => collapsed,
    setCollapsed,
    onResize: (fn) => resizeListeners.push(fn),
  };
}

/** Simple modal dialog (used for locked catalogue entries and results). */
export function showDialog(title: string, body: Node, actions: { label: string; primary?: boolean; onClick?: () => void }[]): () => void {
  const backdrop = h('div', { class: 'dialog-backdrop' });
  const close = (): void => {
    backdrop.classList.remove('show');
    window.setTimeout(() => backdrop.remove(), 200);
  };
  const box = h(
    'div',
    { class: 'dialog', role: 'dialog', 'aria-modal': 'true' },
    h('h3', null, title),
    h('div', { class: 'dialog-body' }, body),
    h(
      'div',
      { class: 'dialog-actions' },
      ...actions.map((a) =>
        h(
          'button',
          {
            class: a.primary ? 'btn primary' : 'btn',
            onclick: () => {
              close();
              a.onClick?.();
            },
          },
          a.label,
        ),
      ),
    ),
  );
  backdrop.appendChild(box);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('show'));
  return close;
}
