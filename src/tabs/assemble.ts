/**
 * TAB 2 — Сглоби: Lego-style assembly game driven by the mechanism's assembly steps.
 * Drag a card onto the model, or tap a card and then the highlighted target.
 */
import type { AppContext, TabSpec, TabView } from '../app/context';
import type { Mechanism } from '../core/types';
import { AssemblyEngine, computeStars, isBetterScore, type ScoreRecord } from '../core/assembly';
import { storage } from '../core/storage';
import { fmt, lt, t } from '../i18n';
import { Viewer, webglAvailable } from '../three/viewer';
import { MechanismScene } from '../three/mechanismScene';
import { renderThumbnails } from '../three/thumbnails';
import { h, fromHTML, pulseClass } from '../ui/dom';
import { icons } from '../ui/icons';
import { showDialog } from '../ui/sheet';

const REWARD_RPM = 600;
const DROP_RADIUS_PX = 110;

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function starsEl(n: number): HTMLElement {
  const el = h('div', { class: 'stars', 'aria-label': `${n} / 3` });
  for (let i = 1; i <= 3; i++) {
    const s = fromHTML(i <= n ? icons.starFill : icons.star);
    if (i > n) s.classList.add('off');
    el.appendChild(s);
  }
  return el;
}

function createAssembleTab(mech: Mechanism, ctx: AppContext): TabView {
  const fixed = mech.parts.filter((p) => p.fixed).map((p) => p.id);
  const stepIds = mech.assembly.steps.map((s) => s.partId);
  const nameOf = (id: string): string => lt(mech.parts.find((p) => p.id === id)?.meta.name ?? { bg: id });

  let engine = new AssemblyEngine(mech.assembly.steps, fixed);
  let selected: string | null = null;
  let startedAt: number | null = null;
  let finishedTime: number | null = null;
  let reward = false;

  let viewer: Viewer | null = null;
  let scene: MechanismScene | null = null;
  let radius = 100;
  const cleanups: (() => void)[] = [];

  // ----- DOM -----
  const viewport = h('div', { class: 'viewport' });
  const timeEl = h('span', null, '0:00');
  const mistakesEl = h('span', null, '0');
  const bestEl = h('span');
  const resetBtn = h('button', { class: 'icon-btn', 'aria-label': t('asmReset'), html: icons.reset });
  const hud = h(
    'div',
    { class: 'asm-hud' },
    h('div', { class: 'hud-pill', title: t('asmTime') }, fromHTML(icons.timer), timeEl),
    h('div', { class: 'hud-pill err', title: t('asmMistakes') }, fromHTML(icons.alert), mistakesEl),
    h('div', { class: 'hud-pill', title: t('asmBest') }, fromHTML(icons.star), bestEl),
    h('div', { class: 'hud-spacer' }),
    resetBtn,
  );
  const progressBar = h('div');
  const progress = h('div', { class: 'asm-progress' }, progressBar);
  const hintIcon = h('span');
  const hintText = h('div');
  const hintBox = h('div', { class: 'asm-hint info', role: 'status', 'aria-live': 'polite' }, hintIcon, hintText);
  const placeBtn = h('button', { class: 'btn primary place-btn', hidden: true }, t('asmPlaceHere'));
  const trayScroll = h('div', { class: 'tray-scroll' });
  const tray = h('div', { class: 'tray' }, h('div', { class: 'tray-label' }, t('asmTitle')), trayScroll);
  const el = h('section', { class: 'asm-tab' }, viewport, hud, progress, hintBox, placeBtn, tray);

  const cards = new Map<string, HTMLElement>();
  for (const id of stepIds) {
    const img = h('img', { alt: '', draggable: 'false' }) as HTMLImageElement;
    const card = h(
      'button',
      { class: 'part-card', 'data-part': id, 'aria-label': nameOf(id) },
      img,
      h('span', null, nameOf(id)),
    );
    cards.set(id, card);
    trayScroll.appendChild(card);
    attachCardGestures(card, id);
  }

  let hintTimer = 0;
  const showHint = (kind: 'info' | 'error', title: string | null, text: string, ms = 0): void => {
    hintBox.className = `asm-hint ${kind === 'info' ? 'info' : ''}`;
    hintIcon.innerHTML = kind === 'info' ? icons.check : icons.alert;
    hintText.replaceChildren(...(title ? [h('strong', null, title)] : []), text);
    window.clearTimeout(hintTimer);
    if (ms) hintTimer = window.setTimeout(hideHint, ms);
  };
  const hideHint = (): void => hintBox.classList.add('hide');

  const bestLabel = (): string => {
    const b = storage.bestScore(mech.id);
    return b ? `${b.stars}/3 · ${mmss(b.timeSec)}` : t('asmNone');
  };

  const elapsed = (): number =>
    finishedTime ?? (startedAt === null ? 0 : (performance.now() - startedAt) / 1000);

  const updateHud = (): void => {
    timeEl.textContent = mmss(elapsed());
    mistakesEl.textContent = String(engine.mistakes);
    bestEl.textContent = bestLabel();
    const done = stepIds.filter((id) => engine.isInstalled(id)).length;
    progressBar.style.width = `${(100 * done) / stepIds.length}%`;
    for (const [id, c] of cards) {
      c.classList.toggle('installed', engine.isInstalled(id));
      c.classList.toggle('selected', id === selected);
    }
  };
  const ticker = window.setInterval(() => {
    if (startedAt !== null && finishedTime === null) timeEl.textContent = mmss(elapsed());
  }, 500);

  const startTimer = (): void => {
    if (startedAt === null) startedAt = performance.now();
  };

  const select = (id: string | null): void => {
    selected = id;
    scene?.showGhost(id);
    placeBtn.hidden = id === null;
    viewer?.requestRender();
    updateHud();
  };

  const attempt = (id: string): void => {
    startTimer();
    const r = engine.tryInstall(id);
    if (r.ok) {
      scene?.setInstalled(id, true, true);
      select(null);
      showHint('info', null, nameOf(id), 1600);
      if (r.complete) finish();
    } else if (r.reason === 'missing-prerequisites') {
      const card = cards.get(id)!;
      pulseClass(card, 'shake');
      card.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      showHint(
        'error',
        `${t('asmMissing')}: ${r.missing.map(nameOf).join(', ')}`,
        lt(r.step.hint),
        9000,
      );
      select(null);
    }
    updateHud();
  };

  const finish = (): void => {
    finishedTime = elapsed();
    const rec: ScoreRecord = {
      stars: computeStars(engine.mistakes, finishedTime, mech.assembly.parTimeSec),
      timeSec: Math.round(finishedTime),
      mistakes: engine.mistakes,
    };
    const prev = storage.bestScore(mech.id);
    const better = isBetterScore(rec, prev);
    if (better) storage.setBestScore(mech.id, rec);
    reward = true;
    updateHud();
    window.setTimeout(() => {
      const body = h(
        'div',
        { class: 'result' },
        starsEl(rec.stars),
        h(
          'div',
          { class: 'result-grid' },
          h('div', null, h('span', null, t('asmTime')), mmss(rec.timeSec)),
          h('div', null, h('span', null, t('asmMistakes')), fmt(rec.mistakes)),
        ),
        better ? h('div', { class: 'new-best' }, t('asmNewBest')) : h('div', { class: 'new-best', style: 'color:var(--text-dim)' }, `${t('asmBest')}: ${bestLabel()}`),
      );
      showDialog(t('asmDone'), body, [
        { label: t('asmToModel'), onClick: () => ctx.goToTab('model') },
        { label: t('asmAgain'), primary: true, onClick: reset },
      ]);
    }, 900);
  };

  const reset = (): void => {
    engine = new AssemblyEngine(mech.assembly.steps, fixed);
    startedAt = null;
    finishedTime = null;
    reward = false;
    if (scene) {
      scene.inputAngle = 0;
      for (const id of stepIds) scene.setInstalled(id, false);
    }
    select(null);
    showHint('info', null, t('asmIntro'));
    updateHud();
  };
  resetBtn.addEventListener('click', reset);
  placeBtn.addEventListener('click', () => {
    if (selected) attempt(selected);
  });

  /** Screen-space distance from a point to the ghost's centre. */
  const nearGhost = (x: number, y: number): boolean => {
    if (!viewer || !scene || !selected) return false;
    const ghost = scene.ghostObject();
    if (ghost && viewer.raycast(x, y, [ghost]).length) return true;
    const c = viewer.project(scene.partCenter(selected));
    return Math.hypot(c.x - x, c.y - y) < DROP_RADIUS_PX;
  };

  function attachCardGestures(card: HTMLElement, id: string): void {
    let start: { x: number; y: number; pid: number } | null = null;
    let dragging = false;
    let proxy: HTMLElement | null = null;

    card.addEventListener('pointerdown', (e) => {
      if (engine.isInstalled(id) || finishedTime !== null) return;
      start = { x: e.clientX, y: e.clientY, pid: e.pointerId };
      dragging = false;
      // Touch pointers are captured implicitly; do the same for mouse/pen so moves outside the card arrive.
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.pid) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragging && dy < -14 && Math.abs(dy) > Math.abs(dx)) {
        dragging = true;
        card.setPointerCapture(e.pointerId);
        startTimer();
        select(id);
        proxy = h('div', { class: 'drag-proxy' });
        const img = card.querySelector('img');
        if (img?.src) proxy.appendChild(h('img', { src: img.src, alt: '' }));
        document.body.appendChild(proxy);
      }
      if (dragging && proxy) {
        proxy.style.left = `${e.clientX}px`;
        proxy.style.top = `${e.clientY}px`;
        proxy.style.borderColor = nearGhost(e.clientX, e.clientY) ? 'var(--ok)' : 'var(--accent)';
      }
    });
    const end = (e: PointerEvent, cancelled: boolean): void => {
      if (!start || e.pointerId !== start.pid) return;
      const wasDragging = dragging;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      start = null;
      dragging = false;
      proxy?.remove();
      proxy = null;
      if (wasDragging) {
        if (!cancelled && nearGhost(e.clientX, e.clientY)) attempt(id);
        // Dropped elsewhere: keep the selection so the user can still tap the target.
      } else if (!cancelled && moved < 10) {
        startTimer();
        hideHint();
        select(selected === id ? null : id);
      }
    };
    card.addEventListener('pointerup', (e) => end(e, false));
    card.addEventListener('pointercancel', (e) => end(e, true));
    // Keyboard: Enter/Space toggles selection (click fires for keyboard activation only).
    card.addEventListener('click', (e) => {
      if ((e as MouseEvent).detail === 0) select(selected === id ? null : id);
    });
  }

  const positionPlaceBtn = (): void => {
    if (!viewer || !scene || !selected) return;
    const c = viewer.project(scene.partCenter(selected));
    const r = el.getBoundingClientRect();
    placeBtn.style.left = `${Math.min(Math.max(c.x - r.left, 70), r.width - 70)}px`;
    placeBtn.style.top = `${Math.min(Math.max(c.y - r.top - 56, 90), r.height - 230)}px`;
  };

  reset();

  return {
    el,
    activate() {
      if (viewer) return;
      if (!webglAvailable()) {
        viewport.replaceChildren(h('p', { class: 'webgl-error' }, t('webglError')));
        return;
      }
      viewer = new Viewer(viewport, ctx.theme());
      viewer.setInsets(70, 0);
      scene = new MechanismScene(mech);
      viewer.scene.add(scene.root);
      const sphere = scene.boundingSphere();
      radius = sphere.radius * 0.95;
      viewer.setFloor(scene.minY(), 700, [sphere.center.x, 0, sphere.center.z]);
      viewer.viewFrom(mech.camera.views.iso, mech.camera.target, radius, false);
      for (const id of stepIds) scene.setInstalled(id, engine.isInstalled(id));
      if (selected) scene.showGhost(selected);
      const s = scene;
      const v = viewer;
      cleanups.push(
        v.addFrameHandler((dt) => {
          if (reward) s.advance(dt, REWARD_RPM, 1 / 30);
          const anim = s.update(dt);
          if (selected) positionPlaceBtn();
          return anim || reward;
        }),
        v.onTap((e) => {
          if (selected && nearGhost(e.clientX, e.clientY)) attempt(selected);
        }),
        ctx.onThemeChange((th) => v.setTheme(th)),
      );
      renderThumbnails(mech, stepIds, (id, url) => {
        const img = cards.get(id)?.querySelector('img');
        if (img) img.src = url;
      });
      updateHud();
    },
    deactivate() {
      cleanups.splice(0).forEach((f) => f());
      scene?.dispose();
      viewer?.dispose();
      scene = null;
      viewer = null;
    },
    dispose() {
      window.clearInterval(ticker);
      window.clearTimeout(hintTimer);
    },
  };
}

export const assembleTab: TabSpec = {
  id: 'assemble',
  label: 'tabAssemble',
  icon: 'assemble',
  create: createAssembleTab,
};
