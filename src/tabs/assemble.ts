/**
 * TAB 2 — Сглоби: Lego-style assembly game driven by the mechanism's assembly steps.
 *  - Assemble: drag a card onto the model, or tap a card and then the highlighted target.
 *  - Disassemble: everything starts mounted; tap a part (in 3D or its card) to take it off.
 * Steps with tools ask HOW the part goes on / comes off (press, puller, hammer…); a wrong tool is a mistake.
 * An optional part (a key) can be forgotten: the machine then runs with the affected parts standing still.
 */
import type { AppContext, TabSpec, TabView } from '../app/context';
import type { AssemblyStep, Mechanism, ToolChoice } from '../core/types';
import { AssemblyEngine, computeStars, isBetterScore, type GameMode, type ScoreRecord } from '../core/assembly';
import { storage } from '../core/storage';
import { fmt, lt, t } from '../i18n';
import { Viewer, webglAvailable } from '../three/viewer';
import { MechanismScene } from '../three/mechanismScene';
import { renderThumbnails } from '../three/thumbnails';
import { h, fromHTML, pulseClass, capturePointer } from '../ui/dom';
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

/** Score of a finished game. Every forgotten part counts as a mistake and caps the result at one star. */
export function finalScore(mistakes: number, skipped: number, timeSec: number, parTimeSec: number): ScoreRecord {
  const m = mistakes + skipped;
  const stars = skipped > 0 ? 1 : computeStars(m, timeSec, parTimeSec);
  return { stars, timeSec: Math.round(timeSec), mistakes: m };
}

function shuffled<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function createAssembleTab(mech: Mechanism, ctx: AppContext): TabView {
  const fixed = mech.parts.filter((p) => p.fixed).map((p) => p.id);
  const stepIds = mech.assembly.steps.map((s) => s.partId);
  const nameOf = (id: string): string => lt(mech.parts.find((p) => p.id === id)?.meta.name ?? { bg: id });
  const stepOf = (id: string): AssemblyStep => mech.assembly.steps.find((s) => s.partId === id)!;

  let mode: GameMode = 'assemble';
  let engine = new AssemblyEngine(mech.assembly.steps, fixed, mode);
  let selected: string | null = null;
  let startedAt: number | null = null;
  let finishedTime: number | null = null;
  let reward = false;
  let busy = false; // a tool dialog is open

  let viewer: Viewer | null = null;
  let scene: MechanismScene | null = null;
  let radius = 100;
  const cleanups: (() => void)[] = [];
  const scoreKey = (): string => (mode === 'assemble' ? mech.id : `${mech.id}:dis`);

  // ----- DOM -----
  const viewport = h('div', { class: 'viewport' });
  const timeEl = h('span', null, '0:00');
  const mistakesEl = h('span', null, '0');
  const bestEl = h('span');
  const resetBtn = h('button', { class: 'icon-btn', 'aria-label': t('asmReset'), html: icons.reset });
  const modeBtns = (['assemble', 'disassemble'] as GameMode[]).map((m) =>
    h('button', { class: 'seg-btn', 'data-mode': m, onclick: () => setMode(m) }, t(m === 'assemble' ? 'asmModeAssemble' : 'asmModeDisassemble')),
  );
  const modeSwitch = h('div', { class: 'seg', role: 'group', 'aria-label': t('asmMode') }, ...modeBtns);
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
  const trayLabel = h('div', { class: 'tray-label' }, t('asmTitle'));
  const tray = h('div', { class: 'tray' }, h('div', { class: 'tray-head' }, trayLabel, modeSwitch), trayScroll);
  const el = h('section', { class: 'asm-tab' }, viewport, hud, progress, hintBox, placeBtn, tray);

  const cards = new Map<string, HTMLElement>();
  for (const id of stepIds) {
    const img = h('img', { alt: '', draggable: 'false' }) as HTMLImageElement;
    const card = h(
      'button',
      { class: 'part-card', 'data-part': id, 'aria-label': nameOf(id) },
      img,
      h('span', null, nameOf(id)),
      h('em', { class: 'card-tag' }, t('asmSkipped')),
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
    const b = storage.bestScore(scoreKey());
    return b ? `${b.stars}/3 · ${mmss(b.timeSec)}` : t('asmNone');
  };

  const elapsed = (): number => finishedTime ?? (startedAt === null ? 0 : (performance.now() - startedAt) / 1000);

  const updateHud = (): void => {
    timeEl.textContent = mmss(elapsed());
    mistakesEl.textContent = String(engine.mistakes);
    bestEl.textContent = bestLabel();
    const done = stepIds.filter((id) => engine.done(id)).length;
    progressBar.style.width = `${(100 * done) / stepIds.length}%`;
    for (const [id, c] of cards) {
      c.classList.toggle('installed', engine.done(id) && !engine.isSkipped(id));
      c.classList.toggle('skipped', mode === 'assemble' && engine.isSkipped(id));
      c.classList.toggle('selected', id === selected);
    }
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  };
  const ticker = window.setInterval(() => {
    if (startedAt !== null && finishedTime === null) timeEl.textContent = mmss(elapsed());
  }, 500);

  const startTimer = (): void => {
    if (startedAt === null) startedAt = performance.now();
  };

  const select = (id: string | null): void => {
    selected = id;
    if (mode === 'assemble') scene?.showGhost(id);
    else scene?.highlight(id);
    placeBtn.hidden = id === null;
    viewer?.requestRender();
    updateHud();
  };

  /**
   * Asks how the part is mounted / removed. Wrong choices count as mistakes and stay on screen with
   * the reason; the right one closes the dialog and runs `done`.
   */
  const askTool = (id: string, choices: ToolChoice[], done: (c: ToolChoice) => void): void => {
    busy = true;
    const why = h('p', { class: 'tool-why', 'aria-live': 'polite' });
    const list = h('div', { class: 'tool-list' });
    let close: () => void = () => undefined;
    for (const c of shuffled(choices)) {
      const b = h('button', { class: 'btn tool-choice' }, lt(c.label)) as HTMLButtonElement;
      b.addEventListener('click', () => {
        if (c.ok) {
          close();
          busy = false;
          done(c);
          return;
        }
        engine.addMistake();
        b.disabled = true;
        b.classList.add('wrong');
        why.replaceChildren(h('strong', null, `${t('asmWrongTool')} `), lt(c.why));
        updateHud();
      });
      list.appendChild(b);
    }
    close = showDialog(
      mode === 'assemble' ? `${t('asmHowMount')}: ${nameOf(id)}` : `${t('asmHowRemove')}: ${nameOf(id)}`,
      h('div', null, list, why),
      [
        {
          label: t('asmCancel'),
          onClick: () => {
            busy = false;
            select(null);
          },
        },
      ],
    );
  };

  const doInstall = (id: string, tool: ToolChoice | null): void => {
    const r = engine.tryInstall(id);
    if (!r.ok) return;
    scene?.setInstalled(id, true, true);
    select(null);
    showHint('info', tool ? nameOf(id) : null, tool ? lt(tool.why) : nameOf(id), tool ? 6000 : 1600);
    if (r.complete) finish();
    updateHud();
  };

  const doRemove = (id: string, tool: ToolChoice | null): void => {
    const r = engine.tryRemove(id);
    if (!r.ok) return;
    scene?.setInstalled(id, false, true);
    select(null);
    showHint('info', tool ? nameOf(id) : null, tool ? lt(tool.why) : nameOf(id), tool ? 6000 : 1600);
    if (r.complete) finish();
    updateHud();
  };

  const attempt = (id: string): void => {
    if (busy || finishedTime !== null) return;
    startTimer();
    const step = stepOf(id);
    if (mode === 'assemble') {
      const bad = engine.checkInstall(id);
      if (bad) {
        engine.tryInstall(id); // counts the mistake
        const card = cards.get(id)!;
        pulseClass(card, 'shake');
        card.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
        if (bad.reason === 'missing-prerequisites') {
          showHint('error', `${t('asmMissing')}: ${bad.missing.map(nameOf).join(', ')}`, lt(bad.step.hint), 9000);
        } else if (bad.reason === 'skipped' && step.optional) {
          showHint('error', `${nameOf(step.optional.lockedBy)} ${t('asmCovers')}`, t('asmTooLate'), 9000);
        }
        select(null);
        updateHud();
        return;
      }
      if (step.mount?.length) askTool(id, step.mount, (c) => doInstall(id, c));
      else doInstall(id, null);
    } else {
      const bad = engine.checkRemove(id);
      if (bad) {
        if (bad.reason === 'blocked') {
          engine.tryRemove(id); // counts the mistake
          pulseClass(cards.get(id)!, 'shake');
          showHint(
            'error',
            `${t('asmFirstRemove')}: ${bad.blockers.map(nameOf).join(', ')}`,
            step.removeHint ? lt(step.removeHint) : t('asmBlocked'),
            9000,
          );
        }
        select(null);
        updateHud();
        return;
      }
      if (step.dismount?.length) askTool(id, step.dismount, (c) => doRemove(id, c));
      else doRemove(id, null);
    }
  };

  const finish = (): void => {
    finishedTime = elapsed();
    const skipped = mode === 'assemble' ? engine.skipped() : [];
    const rec = finalScore(engine.mistakes, skipped.length, finishedTime, mech.assembly.parTimeSec);
    const prev = storage.bestScore(scoreKey());
    const better = isBetterScore(rec, prev);
    if (better) storage.setBestScore(scoreKey(), rec);
    const consequences = skipped.map((id) => stepOf(id).optional!);
    if (mode === 'assemble') {
      // Run the finished machine. Forgotten keys show up as parts that stand still.
      scene?.setFrozen([...new Set(consequences.flatMap((c) => c.stops))]);
      reward = true;
      if (consequences.length) showHint('error', t('asmSlipTitle'), consequences.map((c) => lt(c.consequence)).join(' '));
    }
    updateHud();
    window.setTimeout(
      () => {
        const body = h(
          'div',
          { class: 'result' },
          starsEl(rec.stars),
          consequences.length
            ? h(
                'div',
                { class: 'result-warn' },
                h('strong', null, `${t('asmForgotten')}: ${skipped.map(nameOf).join(', ')}`),
                ...consequences.map((c) => h('p', null, lt(c.consequence))),
              )
            : null,
          h(
            'div',
            { class: 'result-grid' },
            h('div', null, h('span', null, t('asmTime')), mmss(rec.timeSec)),
            h('div', null, h('span', null, t('asmMistakes')), fmt(rec.mistakes)),
          ),
          better
            ? h('div', { class: 'new-best' }, t('asmNewBest'))
            : h('div', { class: 'new-best', style: 'color:var(--text-dim)' }, `${t('asmBest')}: ${bestLabel()}`),
        );
        const title = mode === 'disassemble' ? t('asmDoneDis') : consequences.length ? t('asmDoneBroken') : t('asmDone');
        showDialog(title, body, [
          { label: t('asmToModel'), onClick: () => ctx.goToTab('model') },
          { label: t('asmAgain'), primary: true, onClick: reset },
        ]);
      },
      consequences.length ? 2600 : 900,
    );
  };

  const syncScene = (): void => {
    if (!scene) return;
    scene.setFrozen([]);
    scene.highlight(null);
    for (const id of stepIds) scene.setInstalled(id, engine.isInstalled(id));
  };

  const reset = (): void => {
    engine = new AssemblyEngine(mech.assembly.steps, fixed, mode);
    startedAt = null;
    finishedTime = null;
    reward = false;
    busy = false;
    if (scene) scene.inputAngle = 0;
    syncScene();
    select(null);
    trayLabel.textContent = mode === 'assemble' ? t('asmTitle') : t('asmTitleDis');
    placeBtn.textContent = mode === 'assemble' ? t('asmPlaceHere') : t('asmRemoveHere');
    showHint('info', null, mode === 'assemble' ? t('asmIntro') : t('asmIntroDis'));
    updateHud();
  };

  function setMode(m: GameMode): void {
    if (m === mode) return;
    mode = m;
    reset();
  }

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
      if (mode === 'assemble' && engine.isSkipped(id)) {
        const opt = stepOf(id).optional!;
        showHint('error', `${nameOf(opt.lockedBy)} ${t('asmCovers')}`, t('asmTooLate'), 9000);
        return;
      }
      if (engine.done(id) || finishedTime !== null || busy) return;
      start = { x: e.clientX, y: e.clientY, pid: e.pointerId };
      dragging = false;
      // Touch pointers are captured implicitly; do the same for mouse/pen so moves outside the card arrive.
      capturePointer(card, e.pointerId);
    });
    card.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.pid || mode !== 'assemble') return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragging && dy < -14 && Math.abs(dy) > Math.abs(dx)) {
        dragging = true;
        capturePointer(card, e.pointerId);
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
      if (selected) {
        if (mode === 'assemble') scene.showGhost(selected);
        else scene.highlight(selected);
      }
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
          if (mode === 'assemble') {
            if (selected && nearGhost(e.clientX, e.clientY)) attempt(selected);
            return;
          }
          // Disassembly: tap the part itself.
          const hit = v.raycast(e.clientX, e.clientY, s.pickables())[0];
          const id = hit ? s.partIdOf(hit.object) : null;
          if (id && stepIds.includes(id) && engine.isInstalled(id)) attempt(id);
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
