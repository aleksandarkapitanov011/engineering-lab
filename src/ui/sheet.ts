import { h, capturePointer } from './dom';
import { icons } from './icons';
import { t } from '../i18n';

export interface Sheet {
  el: HTMLElement;
  open(title: string, body: Node, opts?: { kicker?: string }): void;
  close(): void;
  isOpen(): boolean;
  onClose(fn: () => void): void;
}

/**
 * Non-modal bottom sheet anchored inside a tab. The 3D view or drawing above stays interactive.
 * Close with the button or by swiping it down.
 */
export function createSheet(host: HTMLElement): Sheet {
  const titleEl = h('h3', { class: 'sheet-title' });
  const kickerEl = h('div', { class: 'sheet-kicker' });
  const bodyEl = h('div', { class: 'sheet-body' });
  const closeBtn = h('button', { class: 'icon-btn sheet-close', 'aria-label': t('close'), html: icons.close });
  const handle = h('div', { class: 'sheet-handle', 'aria-hidden': 'true' });
  const el = h(
    'section',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'false', 'aria-hidden': 'true' },
    handle,
    h('header', { class: 'sheet-head' }, h('div', null, kickerEl, titleEl), closeBtn),
    bodyEl,
  );
  host.appendChild(el);
  const closeListeners: (() => void)[] = [];
  let open = false;

  const close = (): void => {
    if (!open) return;
    open = false;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    el.style.transform = '';
    closeListeners.forEach((f) => f());
  };
  closeBtn.addEventListener('click', close);

  // Swipe down to dismiss.
  let startY = 0;
  let dy = 0;
  let dragging = false;
  const onDown = (e: PointerEvent): void => {
    dragging = true;
    startY = e.clientY;
    dy = 0;
    el.style.transition = 'none';
    capturePointer(e.target as Element, e.pointerId);
  };
  const onMove = (e: PointerEvent): void => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    el.style.transform = `translateY(${dy}px)`;
  };
  const onUp = (): void => {
    if (!dragging) return;
    dragging = false;
    el.style.transition = '';
    if (dy > 70) close();
    else el.style.transform = '';
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
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
    },
    close,
    isOpen: () => open,
    onClose: (fn) => closeListeners.push(fn),
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
