/**
 * TAB 1 — Модел: animated 3D model, speed control, readouts, exploded view, section, part info,
 * plus optional panels defined by the mechanism:
 *   - parameter lab (regenerates the model live),
 *   - forces & strength check (3D force arrows, safety factors).
 */
import type { AppContext, TabSpec, TabView } from '../app/context';
import type { CloseUpDef, CloseUpOverlay, ForcesDef, LabDef, LabParam, LabResult, Mechanism, PartDef, StrengthCheck, StressDef, StressResult } from '../core/types';
import { solveSpeeds } from '../core/kinematics';
import { fmt, lt, t } from '../i18n';
import { Viewer, webglAvailable } from '../three/viewer';
import { MechanismScene } from '../three/mechanismScene';
import { ForceArrows } from '../three/forceArrows';
import { cssColour, legendGradient, rainbow, scaleValue, type StressMode } from '../three/colormap';
import { h, fromHTML } from '../ui/dom';
import { icons } from '../ui/icons';
import { createSheet } from '../ui/sheet';

/** Extra slow motion in the close-up so the contact can be followed by eye. */
const CLOSEUP_SLOWDOWN = 10;

export const VISUAL_SCALE = 1 / 30;

export function partInfo(def: PartDef): HTMLElement {
  const dl = h('dl', { class: 'dims' });
  for (const d of def.meta.dims) dl.append(h('dt', null, lt(d.label)), h('dd', null, d.value));
  return h(
    'div',
    { class: 'part-info' },
    h('p', { class: 'part-func' }, lt(def.meta.func)),
    h('div', { class: 'info-row' }, h('span', { class: 'info-label' }, t('material')), h('span', null, lt(def.meta.material))),
    h('div', { class: 'info-label' }, t('keyDims')),
    dl,
  );
}

const WARN_ICON: Record<string, string> = {
  ok: icons.check,
  info: icons.model,
  warn: icons.alert,
  error: icons.alert,
};

function warningList(items: { level: string; text: { bg: string; en?: string } }[]): HTMLElement[] {
  return items.map((w) =>
    h('li', { class: `lab-warn ${w.level}` }, h('span', { class: 'lab-warn-icon', html: WARN_ICON[w.level] }), h('span', null, lt(w.text))),
  );
}

/** Sliders / choice chips for a list of parameters. `onChange(immediate)` fires on every edit. */
function paramControls(
  params: LabParam[],
  values: Record<string, number>,
  onChange: (immediate: boolean) => void,
): { els: HTMLElement[]; sync(): void } {
  const outputs = new Map<string, HTMLOutputElement>();
  const inputs = new Map<string, HTMLInputElement>();
  const choiceRows = new Map<string, HTMLElement>();

  const sync = (): void => {
    for (const p of params) {
      const v = values[p.id];
      outputs.get(p.id)!.textContent = p.format ? p.format(v) : String(v);
      const input = inputs.get(p.id);
      if (input) input.value = String(v);
      choiceRows.get(p.id)?.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v));
      });
    }
  };
  const set = (id: string, v: number, immediate: boolean): void => {
    values[id] = v;
    sync();
    onChange(immediate);
  };

  const els = params.map((p) => {
    const out = h('output', { class: 'lab-out' }) as HTMLOutputElement;
    outputs.set(p.id, out);
    let control: HTMLElement;
    if (p.kind === 'choice') {
      control = h(
        'div',
        { class: 'lab-choice', role: 'group', 'aria-label': lt(p.label) },
        ...(p.options ?? []).map((o) =>
          h('button', { class: 'chip', 'data-v': o, onclick: () => set(p.id, o, true) }, (p.format ? p.format(o) : String(o)).replace(' mm', '')),
        ),
      );
      choiceRows.set(p.id, control);
    } else {
      const input = h('input', { type: 'range', min: p.min, max: p.max, step: p.step, value: p.default, 'aria-label': lt(p.label) }) as HTMLInputElement;
      input.addEventListener('input', () => set(p.id, Number(input.value), false));
      inputs.set(p.id, input);
      const stepBy = (k: number): void => {
        const step = p.step ?? 1;
        const v = Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, Math.round((values[p.id] + k * step) / step) * step));
        set(p.id, Math.round(v * 1000) / 1000, true);
      };
      control = h(
        'div',
        { class: 'lab-range' },
        h('button', { class: 'icon-btn lab-step', 'aria-label': '−', onclick: () => stepBy(-1) }, '−'),
        input,
        h('button', { class: 'icon-btn lab-step', 'aria-label': '+', onclick: () => stepBy(1) }, '+'),
      );
    }
    return h(
      'div',
      { class: 'lab-param' },
      h('div', { class: 'lab-param-head' }, h('span', null, lt(p.label)), out),
      control,
      p.hint ? h('div', { class: 'lab-hint' }, lt(p.hint)) : null,
    );
  });
  sync();
  return { els, sync };
}

/** Parameter lab panel. Calls `onResult` (debounced while sliding) whenever a value changes. */
function createLabPanel(lab: LabDef, onResult: (r: LabResult, changed: boolean) => void): HTMLElement {
  const values: Record<string, number> = {};
  for (const p of lab.params) values[p.id] = p.default;
  const isDefault = (): boolean => lab.params.every((p) => values[p.id] === p.default);
  const warningsEl = h('ul', { class: 'lab-warnings', 'aria-live': 'polite' });
  const valuesEl = h('dl', { class: 'lab-values' });

  let timer = 0;
  const run = (immediate: boolean): void => {
    window.clearTimeout(timer);
    const go = (): void => {
      const r = lab.evaluate({ ...values });
      warningsEl.replaceChildren(...warningList(r.warnings));
      valuesEl.replaceChildren(...r.values.flatMap((v) => [h('dt', null, lt(v.label)), h('dd', null, v.value)]));
      onResult(r, !isDefault());
    };
    if (immediate) go();
    else timer = window.setTimeout(go, 120);
  };
  const controls = paramControls(lab.params, values, run);

  const presets = h(
    'div',
    { class: 'lab-presets' },
    ...lab.presets.map((pr) =>
      h(
        'button',
        {
          class: 'chip',
          onclick: () => {
            Object.assign(values, pr.values);
            controls.sync();
            run(true);
          },
        },
        lt(pr.label),
      ),
    ),
  );
  const reset = (): void => {
    for (const p of lab.params) values[p.id] = p.default;
    controls.sync();
    run(true);
  };
  return h(
    'div',
    { class: 'lab' },
    h('p', { class: 'lab-intro' }, lt(lab.intro)),
    presets,
    ...controls.els,
    h('div', { class: 'info-label' }, t('labChecks')),
    warningsEl,
    h('div', { class: 'info-label' }, t('labValues')),
    valuesEl,
    h('button', { class: 'btn', style: 'margin-top:14px;width:100%', onclick: reset }, fromHTML(icons.reset), t('labReset')),
  );
}

function checkRow(c: StrengthCheck): HTMLElement {
  const ok = c.safety >= c.required;
  // Bar: the required value sits at 40 % of the track; the bar is capped at 100 %.
  const pct = Math.min(100, (c.safety / c.required) * 40);
  const f = (v: number, d: number): string => fmt(v, d);
  return h(
    'li',
    { class: `chk ${ok ? 'ok' : 'bad'}` },
    h('div', { class: 'chk-head' }, h('span', { class: 'chk-label' }, lt(c.label)), h('span', { class: 'chk-s' }, `S = ${f(c.safety, 2)}`)),
    h('div', { class: 'chk-formula' }, c.formula),
    h(
      'div',
      { class: 'chk-bar', role: 'img', 'aria-label': `S = ${f(c.safety, 2)}, ${t('required')} ${f(c.required, 1)}` },
      h('div', { class: 'chk-fill', style: `width:${pct}%` }),
      h('div', { class: 'chk-req', style: 'left:40%' }),
    ),
    h(
      'div',
      { class: 'chk-nums' },
      `${f(c.stress, 0)} ${c.unit} / ${t('limit')} ${f(c.limit, 0)} ${c.unit} · ${t('required')} S ≥ ${f(c.required, 1)}`,
    ),
    c.note ? h('div', { class: 'lab-hint' }, lt(c.note)) : null,
  );
}

/** Forces & strength panel. `refresh()` re-evaluates with the current definition and input speed. */
function createForcesPanel(
  getDef: () => ForcesDef | undefined,
  getRpm: () => number,
  onArrows: (r: ReturnType<ForcesDef['evaluate']>['arrows']) => void,
): { el: HTMLElement; refresh(): void } {
  const first = getDef()!;
  const values: Record<string, number> = {};
  for (const p of first.params) values[p.id] = p.default;
  const rpmEl = h('div', { class: 'lab-hint' });
  const warningsEl = h('ul', { class: 'lab-warnings', 'aria-live': 'polite' });
  const checksEl = h('ul', { class: 'chk-list' });
  const valuesEl = h('dl', { class: 'lab-values' });

  let timer = 0;
  const refresh = (): void => {
    const def = getDef();
    if (!def) return;
    const rpm = getRpm();
    rpmEl.textContent = `${t('inputSpeed')}: n₁ = ${fmt(rpm)} ${t('rpm')}`;
    const r = def.evaluate({ ...values }, rpm);
    warningsEl.replaceChildren(...warningList(r.warnings));
    checksEl.replaceChildren(...r.checks.map(checkRow));
    valuesEl.replaceChildren(...r.values.flatMap((v) => [h('dt', null, lt(v.label)), h('dd', null, v.value)]));
    onArrows(r.arrows);
  };
  const controls = paramControls(first.params, values, (immediate) => {
    window.clearTimeout(timer);
    if (immediate) refresh();
    else timer = window.setTimeout(refresh, 60);
  });
  const legend = h(
    'div',
    { class: 'force-legend' },
    h('span', null, h('i', { style: 'background:#ff5a3c' }), 'Ft'),
    h('span', null, h('i', { style: 'background:#3c9dff' }), 'Fr'),
    h('span', null, h('i', { style: 'background:#2fbf71' }), t('reactions')),
  );
  const el = h(
    'div',
    { class: 'lab' },
    h('p', { class: 'lab-intro' }, lt(first.intro)),
    ...controls.els,
    rpmEl,
    legend,
    warningsEl,
    h('div', { class: 'info-label' }, t('forcesValues')),
    valuesEl,
    h('div', { class: 'info-label', style: 'margin-top:14px' }, t('forcesChecks')),
    checksEl,
  );
  return { el, refresh };
}

/** Close-up panel: live contact count and facts. */
function createCloseUpPanel(
  getDef: () => CloseUpDef | undefined,
  getRpm: () => number,
): { el: HTMLElement; refresh(): void; setContacts(n: number): void } {
  const first = getDef()!;
  const pairs = h('div', { class: 'cu-pairs' }, h('span', { class: 'cu-pairs-n' }, '–'), h('span', null, t('cuPairs')));
  const factsEl = h('dl', { class: 'lab-values' });
  const el = h(
    'div',
    { class: 'lab' },
    h('p', { class: 'lab-intro' }, lt(first.intro)),
    pairs,
    h('div', { class: 'cu-legend' },
      h('span', null, h('i', { style: 'background:#ff7a1a' }), t('cuActive')),
      h('span', null, h('i', { class: 'dot' }), t('cuContact')),
      h('span', null, h('i', { style: 'background:#9aa6b2' }), t('cuBase')),
      h('span', null, h('i', { style: 'background:#fff' }), t('cuPitch')),
    ),
    h('div', { class: 'info-label', style: 'margin-top:12px' }, t('cuFacts')),
    factsEl,
  );
  let last = -1;
  return {
    el,
    refresh() {
      const def = getDef();
      if (!def) return;
      factsEl.replaceChildren(...def.facts(getRpm()).flatMap((v) => [h('dt', null, lt(v.label)), h('dd', null, v.value)]));
    },
    setContacts(n) {
      if (n === last) return;
      last = n;
      pairs.querySelector('.cu-pairs-n')!.textContent = String(n);
      pairs.classList.toggle('two', n >= 2);
    },
  };
}

/** Stress panel: loads, colour scale, FE mesh plot, element checks. */
function createStressPanel(
  getDef: () => StressDef | undefined,
  getRpm: () => number,
  getAngles: () => Record<string, number>,
  onResult: (r: StressResult, mode: StressMode, maxStress: number) => void,
): { el: HTMLElement; refresh(): void } {
  const first = getDef()!;
  const values: Record<string, number> = {};
  for (const p of first.params) values[p.id] = p.default;
  let mode: StressMode = 'utilisation';
  let plotIndex = 0;
  let last: { r: StressResult; max: number } | null = null;
  let timer = 0;

  const warningsEl = h('ul', { class: 'lab-warnings', 'aria-live': 'polite' });
  const checksEl = h('ul', { class: 'chk-list' });
  const valuesEl = h('dl', { class: 'lab-values' });
  const legendLabels = h('div', { class: 'fem-legend-labels' });
  const legend = h(
    'div',
    { class: 'fem-legend' },
    h('div', { class: 'fem-legend-bar', style: `background:${legendGradient()}` }, h('span', { class: 'fem-legend-over', title: t('stressOver') })),
    legendLabels,
  );
  const canvas = h('canvas', { class: 'fem-canvas', role: 'img' }) as HTMLCanvasElement;
  const plotChips = h('div', { class: 'lab-choice', role: 'group' });
  const modeChips = h('div', { class: 'lab-choice', role: 'group' });
  const modeDefs: [StressMode, Parameters<typeof t>[0]][] = [
    ['utilisation', 'stressUtil'],
    ['absolute', 'stressAbs'],
  ];
  for (const [id, label] of modeDefs) {
    modeChips.append(
      h('button', { class: 'chip', 'data-mode': id, onclick: () => { mode = id; render(); } }, t(label)),
    );
  }

  const colourFn = (t: number): string => cssColour(rainbow(t));

  const drawPlot = (): void => {
    if (!last || !last.r.plots.length) return;
    const w = canvas.clientWidth;
    if (w === 0) {
      requestAnimationFrame(drawPlot);
      return;
    }
    const hgt = 260;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    last.r.plots[Math.min(plotIndex, last.r.plots.length - 1)].draw(ctx, w, hgt, colourFn);
  };

  const render = (): void => {
    if (!last) return;
    modeChips.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    legendLabels.replaceChildren(
      ...(mode === 'utilisation'
        ? [h('span', null, '0'), h('span', null, '50 %'), h('span', null, '100 % σдоп')]
        : [h('span', null, '0'), h('span', null, `${fmt(last.max / 2)}`), h('span', null, `${fmt(last.max)} MPa`)]),
    );
    drawPlot();
    onResult(last.r, mode, last.max);
  };

  const refresh = (): void => {
    const def = getDef();
    if (!def) return;
    const r = def.evaluate({ ...values }, getRpm(), getAngles());
    const max = Math.max(1e-9, ...r.checks.map((c) => c.stress));
    last = { r, max };
    warningsEl.replaceChildren(...warningList(r.warnings));
    checksEl.replaceChildren(...r.checks.map(checkRow));
    valuesEl.replaceChildren(...r.values.flatMap((v) => [h('dt', null, lt(v.label)), h('dd', null, v.value)]));
    plotChips.replaceChildren(
      ...r.plots.map((p, i) =>
        h('button', { class: 'chip', 'aria-pressed': String(i === plotIndex), onclick: () => { plotIndex = i; plotChips.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); drawPlot(); } }, lt(p.label)),
      ),
    );
    render();
  };
  const controls = paramControls(first.params, values, (immediate) => {
    window.clearTimeout(timer);
    if (immediate) refresh();
    else timer = window.setTimeout(refresh, 80);
  });

  const el = h(
    'div',
    { class: 'lab' },
    h('p', { class: 'lab-intro' }, lt(first.intro)),
    ...controls.els,
    h('div', { class: 'info-label', style: 'margin-top:10px' }, t('stressScale')),
    modeChips,
    legend,
    warningsEl,
    h('div', { class: 'info-label', style: 'margin-top:12px' }, t('stressPlot')),
    plotChips,
    canvas,
    h('p', { class: 'lab-hint' }, t('stressPlotNote')),
    h('div', { class: 'info-label', style: 'margin-top:12px' }, t('stressChecks')),
    checksEl,
    h('div', { class: 'info-label', style: 'margin-top:12px' }, t('stressValues')),
    valuesEl,
  );
  return { el, refresh };
}

type Panel = 'none' | 'part' | 'lab' | 'forces' | 'closeup' | 'stress';

function createModelTab(base: Mechanism, ctx: AppContext): TabView {
  const viewport = h('div', { class: 'viewport' });
  const el = h('section', { class: 'model-tab' }, viewport);
  const sheet = createSheet(el);

  // State survives deactivate/activate (the WebGL resources do not).
  let mech = base; // the lab may replace it with a regenerated variant
  let rpm = Math.round(base.maxInputRpm / 3);
  let playing = true;
  let exploded = false;
  let section = false;
  let selected: string | null = null;
  let inputAngle = 0;
  let panel: Panel = 'none';
  let lastArrows: ReturnType<ForcesDef['evaluate']>['arrows'] = [];

  let viewer: Viewer | null = null;
  let scene: MechanismScene | null = null;
  let arrows: ForceArrows | null = null;
  let radius = 100;
  const cleanups: (() => void)[] = [];

  // ----- Controls -----
  const viewBtns = h('div', { class: 'chip-row', role: 'toolbar' });
  const viewDefs: [keyof Mechanism['camera']['views'], Parameters<typeof t>[0]][] = [
    ['iso', 'viewIso'],
    ['front', 'viewFront'],
    ['top', 'viewTop'],
    ['side', 'viewSide'],
  ];
  for (const [key, label] of viewDefs) {
    viewBtns.append(
      h('button', { class: 'chip', onclick: () => viewer?.viewFrom(mech.camera.views[key], mech.camera.target, radius) }, t(label)),
    );
  }

  const toolBtn = (icon: string, label: string, badge = false): HTMLButtonElement =>
    h('button', { class: 'tool-btn', 'aria-pressed': 'false' }, fromHTML(icon), h('span', null, label), badge ? h('span', { class: 'tool-badge', hidden: true }) : null);
  const explodeBtn = toolBtn(icons.explode, t('explode'));
  const sectionBtn = toolBtn(icons.section, t('section'));
  const labBtn = base.lab ? toolBtn(icons.sliders, t('lab'), true) : null;
  const forcesBtn = base.forces ? toolBtn(icons.forces, t('forces')) : null;
  const closeUpBtn = base.closeUp ? toolBtn(icons.mesh, t('closeUp')) : null;
  const stressBtn = base.stress ? toolBtn(icons.stress, t('stress')) : null;
  const toolCol = h('div', { class: 'tool-col' }, explodeBtn, sectionBtn, labBtn, forcesBtn, closeUpBtn, stressBtn);
  let playingBeforeStress = true;
  let overlay: CloseUpOverlay | null = null;

  const playBtn = h('button', { class: 'play-btn', 'aria-label': t('pause') });
  const slider = h('input', {
    type: 'range',
    min: '0',
    max: String(base.maxInputRpm),
    step: '50',
    value: String(rpm),
    'aria-label': t('inputSpeed'),
  }) as HTMLInputElement;
  const rpmLabel = h('output', { class: 'rpm-value' });
  const readouts = h('div', { class: 'readouts' });
  let readoutEls: { r: Mechanism['readouts'][number]; v: HTMLElement; icon: HTMLElement }[] = [];
  const buildReadouts = (): void => {
    readouts.replaceChildren();
    readoutEls = mech.readouts.map((r) => {
      const v = h('span', { class: 'ro-value' });
      const icon = h('span', { class: 'ro-icon' });
      readouts.append(h('div', { class: 'readout' }, h('span', { class: 'ro-label' }, lt(r.label)), h('span', { class: 'ro-main' }, v, icon)));
      return { r, v, icon };
    });
  };
  buildReadouts();

  const controlPanel = h(
    'div',
    { class: 'control-panel' },
    h(
      'div',
      { class: 'speed-row' },
      playBtn,
      h(
        'div',
        { class: 'speed-col' },
        h('div', { class: 'speed-head' }, h('span', null, t('inputSpeed')), h('span', null, rpmLabel, ' ', t('rpm'))),
        slider,
        h('div', { class: 'speed-note' }, t('visualSlowed')),
      ),
    ),
    readouts,
  );

  const hint = h('div', { class: 'tap-hint' }, t('tapHint'));
  el.append(h('div', { class: 'overlay-top' }, viewBtns), toolCol, hint, controlPanel);
  el.appendChild(sheet.el); // keep the sheet on top of the panel

  const updateReadouts = (): void => {
    const speeds = solveSpeeds(mech.kinematics, playing ? rpm : 0);
    const shown = solveSpeeds(mech.kinematics, rpm);
    rpmLabel.textContent = fmt(rpm);
    for (const { r, v, icon } of readoutEls) {
      v.textContent = r.value(speeds);
      const s = r.sign?.(shown) ?? 0;
      icon.innerHTML = s > 0 ? icons.ccw : s < 0 ? icons.cw : '';
      icon.title = s > 0 ? 'обратно на часовниковата стрелка (гледано отпред)' : s < 0 ? 'по часовниковата стрелка (гледано отпред)' : '';
    }
    playBtn.innerHTML = playing ? icons.pause : icons.play;
    playBtn.setAttribute('aria-label', playing ? t('pause') : t('play'));
    scene?.setArrows(rpm > 0 && panel !== 'forces' && panel !== 'closeup' && panel !== 'stress', shown);
    viewer?.requestRender();
  };

  /** Keeps the model centred in the space left above whatever covers the bottom of the view. */
  const updateInsets = (refit = false, dir?: [number, number, number], zoomOut = 1): void => {
    if (!viewer) return;
    const bottom = sheet.isOpen() ? sheet.el.offsetHeight : controlPanel.offsetHeight;
    viewer.setInsets(64, bottom + 16);
    if (refit) viewer.viewFrom(dir ?? viewer.viewDirection(), mech.camera.target, radius * zoomOut, true);
  };

  /** Creates (or recreates after a lab change) the close-up overlay in the scene. */
  const syncOverlay = (): void => {
    overlay?.dispose();
    overlay = null;
    if (panel !== 'closeup' || !viewer || !mech.closeUp) return;
    overlay = mech.closeUp.createOverlay();
    viewer.scene.add(overlay.object);
    viewer.requestRender();
  };

  const setPanel = (p: Panel): void => {
    const was = panel;
    panel = p;
    labBtn?.setAttribute('aria-pressed', String(p === 'lab'));
    forcesBtn?.setAttribute('aria-pressed', String(p === 'forces'));
    closeUpBtn?.setAttribute('aria-pressed', String(p === 'closeup'));
    stressBtn?.setAttribute('aria-pressed', String(p === 'stress'));
    if (was === 'stress' && p !== 'stress') {
      scene?.paintStress(null);
      playing = playingBeforeStress;
      viewer?.requestRender();
    }
    hint.classList.toggle('hidden', p !== 'none');
    if (arrows) arrows.group.visible = p === 'forces';
    if (was === 'closeup' && p !== 'closeup') {
      if (viewer) viewer.controls.minDistance = 60;
      // A part selection applies its own highlight, which already resets every material.
      if (p !== 'part') scene?.focus(null);
    }
    if (p === 'closeup') scene?.focus(mech.closeUp?.focusParts ?? null);
    syncOverlay();
    updateReadouts();
  };

  // ----- Panels -----
  const forcesPanel = base.forces
    ? createForcesPanel(
        () => mech.forces,
        () => rpm,
        (a) => {
          lastArrows = a;
          arrows?.set(a);
          viewer?.requestRender();
        },
      )
    : null;

  const closeUpPanel = base.closeUp
    ? createCloseUpPanel(() => mech.closeUp, () => rpm)
    : null;

  const stressPanel = base.stress
    ? createStressPanel(
        () => mech.stress,
        () => rpm,
        () => scene?.bodyAngles() ?? {},
        (r, mode, max) => {
          if (panel !== 'stress' || !scene) return;
          const fields = new Map<string, (p: [number, number, number]) => [number, number, number]>();
          for (const f of r.fields) fields.set(f.partId, (p) => rainbow(scaleValue(mode, f.stress(p), f.allowable, max)));
          scene.paintStress(fields);
          viewer?.requestRender();
        },
      )
    : null;

  const labPanel = base.lab
    ? createLabPanel(base.lab, (r, changed) => {
        mech = changed ? r.mechanism : base;
        labBtn!.querySelector<HTMLElement>('.tool-badge')!.hidden = !changed;
        buildReadouts();
        buildScene(false);
      })
    : null;

  const select = (id: string | null): void => {
    selected = id;
    if (id) {
      const def = mech.parts.find((p) => p.id === id);
      if (!def) return;
      // Switch panels first: leaving the stress view restores the materials, then highlight.
      setPanel('part');
      scene?.highlight(id);
      sheet.open(lt(def.meta.name), partInfo(def));
    } else {
      scene?.highlight(null);
      if (panel === 'part') sheet.close();
    }
    viewer?.requestRender();
  };

  const clearSelection = (): void => {
    if (!selected) return;
    selected = null;
    scene?.highlight(null);
  };

  const openLab = (): void => {
    if (!base.lab || !labPanel) return;
    clearSelection();
    setPanel('lab');
    sheet.open(lt(base.lab.title), labPanel, { kicker: lt(base.title) });
    window.setTimeout(() => updateInsets(true), 300);
  };

  const openForces = (): void => {
    if (!base.forces || !forcesPanel) return;
    clearSelection();
    setPanel('forces');
    forcesPanel.refresh();
    sheet.open(lt(base.forces.title), forcesPanel.el, { kicker: lt(base.title) });
    // Forces act in the gear plane: look at it almost head-on.
    // Arrows reach beyond the model, so leave extra room around it.
    window.setTimeout(() => updateInsets(true, [0.32, 0.28, 1], 1.45), 300);
  };

  const openCloseUp = (): void => {
    if (!base.closeUp || !closeUpPanel) return;
    clearSelection();
    setPanel('closeup');
    closeUpPanel.refresh();
    sheet.open(lt(base.closeUp.title), closeUpPanel.el, { kicker: lt(base.title) });
    if (viewer) viewer.controls.minDistance = 8;
    window.setTimeout(() => {
      const cu = mech.closeUp;
      if (!viewer || !cu || panel !== 'closeup') return;
      updateInsets();
      viewer.viewFrom(cu.camera.dir, cu.camera.target, cu.camera.radius, true);
    }, 300);
  };

  const openStress = (): void => {
    if (!base.stress || !stressPanel) return;
    clearSelection();
    playingBeforeStress = playing;
    playing = false; // static analysis
    setPanel('stress');
    sheet.open(lt(base.stress.title), stressPanel.el, { kicker: lt(base.title) });
    stressPanel.refresh();
    window.setTimeout(() => updateInsets(true, mech.camera.views.iso), 300);
  };

  labBtn?.addEventListener('click', () => (panel === 'lab' ? sheet.close() : openLab()));
  stressBtn?.addEventListener('click', () => (panel === 'stress' ? sheet.close() : openStress()));
  closeUpBtn?.addEventListener('click', () => (panel === 'closeup' ? sheet.close() : openCloseUp()));
  forcesBtn?.addEventListener('click', () => (panel === 'forces' ? sheet.close() : openForces()));

  sheet.onClose(() => {
    const was = panel;
    setPanel('none');
    clearSelection();
    viewer?.requestRender();
    if (was === 'closeup') updateInsets(true, mech.camera.views.iso);
    else updateInsets(was === 'lab' || was === 'forces' || was === 'stress');
  });

  playBtn.addEventListener('click', () => {
    playing = !playing;
    updateReadouts();
  });
  slider.addEventListener('input', () => {
    rpm = Number(slider.value);
    updateReadouts();
    if (panel === 'forces') forcesPanel?.refresh();
    if (panel === 'closeup') closeUpPanel?.refresh();
    if (panel === 'stress') stressPanel?.refresh();
  });
  explodeBtn.addEventListener('click', () => {
    exploded = !exploded;
    explodeBtn.setAttribute('aria-pressed', String(exploded));
    scene?.setExploded(exploded);
    viewer?.requestRender();
  });
  sectionBtn.addEventListener('click', () => {
    section = !section;
    sectionBtn.setAttribute('aria-pressed', String(section));
    scene?.setSection(section);
    viewer?.requestRender();
  });

  // ----- Scene (re)building -----
  function buildScene(fit: boolean): void {
    if (!viewer) return;
    if (scene) {
      inputAngle = scene.inputAngle;
      scene.dispose();
    }
    scene = new MechanismScene(mech);
    scene.inputAngle = inputAngle;
    viewer.scene.add(scene.root);
    const sphere = scene.boundingSphere();
    const newRadius = sphere.radius * 0.95;
    viewer.setFloor(scene.minY(), 900, [sphere.center.x, 0, sphere.center.z]);
    const bigChange = newRadius > radius * 1.2 || newRadius < radius * 0.75;
    radius = newRadius;
    if (fit) viewer.viewFrom(mech.camera.views.iso, mech.camera.target, radius, false);
    else viewer.viewFrom(viewer.viewDirection(), mech.camera.target, radius, bigChange);
    scene.setExploded(exploded);
    scene.setSection(section);
    if (selected && mech.parts.some((p) => p.id === selected)) scene.highlight(selected);
    else selected = null;
    if (panel === 'forces') forcesPanel?.refresh();
    if (panel === 'stress') stressPanel?.refresh();
    if (panel === 'closeup') {
      scene.focus(mech.closeUp?.focusParts ?? null);
      syncOverlay();
      closeUpPanel?.refresh();
      const cu = mech.closeUp;
      if (cu) viewer.viewFrom(cu.camera.dir, cu.camera.target, cu.camera.radius, true);
    }
    updateReadouts();
    viewer.requestRender();
  }

  return {
    el,
    activate() {
      if (viewer) return;
      if (!webglAvailable()) {
        viewport.replaceChildren(h('p', { class: 'webgl-error' }, t('webglError')));
        return;
      }
      viewer = new Viewer(viewport, ctx.theme());
      arrows = new ForceArrows();
      viewer.scene.add(arrows.group);
      arrows.set(lastArrows);
      arrows.group.visible = panel === 'forces';
      updateInsets();
      buildScene(true);
      syncOverlay();
      if (panel === 'closeup') viewer.controls.minDistance = 8;
      const v = viewer;
      cleanups.push(
        v.addFrameHandler((dt) => {
          const s = scene;
          if (!s) return false;
          const slow = panel === 'closeup' ? CLOSEUP_SLOWDOWN : 1;
          if (playing && rpm > 0) s.advance(dt, rpm, VISUAL_SCALE / slow);
          const anim = s.update(dt);
          if (overlay) closeUpPanel?.setContacts(overlay.update(s.inputAngle).contacts);
          return anim || (playing && rpm > 0);
        }),
        v.onTap((e) => {
          const s = scene;
          if (!s) return;
          const hit = v.raycast(e.clientX, e.clientY, s.pickables())[0];
          const id = hit ? s.partIdOf(hit.object) : null;
          if (id) select(id === selected ? null : id);
          else if (panel === 'part' || panel === 'none') select(null);
        }),
        ctx.onThemeChange((th) => v.setTheme(th)),
      );
      updateReadouts();
    },
    deactivate() {
      cleanups.splice(0).forEach((f) => f());
      if (scene) inputAngle = scene.inputAngle;
      scene?.dispose();
      arrows?.dispose();
      overlay?.dispose();
      overlay = null;
      viewer?.dispose();
      scene = null;
      arrows = null;
      viewer = null;
    },
    dispose() {
      sheet.close();
    },
  };
}

export const modelTab: TabSpec = {
  id: 'model',
  label: 'tabModel',
  icon: 'model',
  create: createModelTab,
};
