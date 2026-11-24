/**
 * TAB 1 — Модел: animated 3D model, speed control, readouts, exploded view, section, part info,
 * and (if the mechanism defines one) the parameter lab that regenerates the model live.
 */
import type { AppContext, TabSpec, TabView } from '../app/context';
import type { LabDef, LabResult, Mechanism, PartDef } from '../core/types';
import { solveSpeeds } from '../core/kinematics';
import { fmt, lt, t } from '../i18n';
import { Viewer, webglAvailable } from '../three/viewer';
import { MechanismScene } from '../three/mechanismScene';
import { h, fromHTML } from '../ui/dom';
import { icons } from '../ui/icons';
import { createSheet } from '../ui/sheet';

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

/** Builds the lab panel UI for a LabDef. Calls `onResult` (debounced) whenever a value changes. */
function createLabPanel(lab: LabDef, onResult: (r: LabResult, changed: boolean) => void): { el: HTMLElement; reset(): void } {
  const values: Record<string, number> = {};
  for (const p of lab.params) values[p.id] = p.default;
  const isDefault = (): boolean => lab.params.every((p) => values[p.id] === p.default);

  const outputs = new Map<string, HTMLOutputElement>();
  const inputs = new Map<string, HTMLInputElement>();
  const choiceRows = new Map<string, HTMLElement>();
  const warningsEl = h('ul', { class: 'lab-warnings', 'aria-live': 'polite' });
  const valuesEl = h('dl', { class: 'lab-values' });

  let timer = 0;
  const run = (immediate = false): void => {
    window.clearTimeout(timer);
    const go = (): void => {
      const r = lab.evaluate({ ...values });
      warningsEl.replaceChildren(
        ...r.warnings.map((w) => h('li', { class: `lab-warn ${w.level}` }, h('span', { class: 'lab-warn-icon', html: WARN_ICON[w.level] }), h('span', null, lt(w.text)))),
      );
      valuesEl.replaceChildren(...r.values.flatMap((v) => [h('dt', null, lt(v.label)), h('dd', null, v.value)]));
      onResult(r, !isDefault());
    };
    if (immediate) go();
    else timer = window.setTimeout(go, 120);
  };

  const sync = (): void => {
    for (const p of lab.params) {
      const v = values[p.id];
      outputs.get(p.id)!.textContent = p.format ? p.format(v) : String(v);
      const input = inputs.get(p.id);
      if (input) input.value = String(v);
      choiceRows.get(p.id)?.querySelectorAll<HTMLButtonElement>('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.v) === v));
      });
    }
  };

  const set = (id: string, v: number, immediate = false): void => {
    values[id] = v;
    sync();
    run(immediate);
  };

  const params = lab.params.map((p) => {
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
      const input = h('input', {
        type: 'range',
        min: p.min,
        max: p.max,
        step: p.step,
        value: p.default,
        'aria-label': lt(p.label),
      }) as HTMLInputElement;
      input.addEventListener('input', () => set(p.id, Number(input.value)));
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
            sync();
            run(true);
          },
        },
        lt(pr.label),
      ),
    ),
  );

  const reset = (): void => {
    for (const p of lab.params) values[p.id] = p.default;
    sync();
    run(true);
  };

  const el = h(
    'div',
    { class: 'lab' },
    h('p', { class: 'lab-intro' }, lt(lab.intro)),
    presets,
    ...params,
    h('div', { class: 'info-label' }, t('labChecks')),
    warningsEl,
    h('div', { class: 'info-label' }, t('labValues')),
    valuesEl,
    h('button', { class: 'btn', style: 'margin-top:14px;width:100%', onclick: reset }, fromHTML(icons.reset), t('labReset')),
  );
  sync();
  return { el, reset };
}

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
  let labOpen = false;

  let viewer: Viewer | null = null;
  let scene: MechanismScene | null = null;
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

  const explodeBtn = h('button', { class: 'tool-btn', 'aria-pressed': 'false' }, fromHTML(icons.explode), h('span', null, t('explode')));
  const sectionBtn = h('button', { class: 'tool-btn', 'aria-pressed': 'false' }, fromHTML(icons.section), h('span', null, t('section')));
  const labBtn = base.lab
    ? h('button', { class: 'tool-btn', 'aria-pressed': 'false' }, fromHTML(icons.sliders), h('span', null, t('lab')), h('span', { class: 'tool-badge', hidden: true }))
    : null;
  const toolCol = h('div', { class: 'tool-col' }, explodeBtn, sectionBtn, labBtn);

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

  const panel = h(
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
  el.append(h('div', { class: 'overlay-top' }, viewBtns), toolCol, hint, panel);
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
    scene?.setArrows(rpm > 0, shown);
    viewer?.requestRender();
  };

  playBtn.addEventListener('click', () => {
    playing = !playing;
    updateReadouts();
  });
  slider.addEventListener('input', () => {
    rpm = Number(slider.value);
    updateReadouts();
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

  /** Keeps the model centred in the space left above whatever covers the bottom of the view. */
  const updateInsets = (refit = false): void => {
    if (!viewer) return;
    const bottom = sheet.isOpen() ? sheet.el.offsetHeight : panel.offsetHeight;
    viewer.setInsets(56, bottom + 16);
    if (refit) viewer.viewFrom(viewer.viewDirection(), mech.camera.target, radius, true);
  };

  const select = (id: string | null): void => {
    selected = id;
    scene?.highlight(id);
    viewer?.requestRender();
    hint.classList.toggle('hidden', id !== null);
    if (id) {
      const def = mech.parts.find((p) => p.id === id);
      if (!def) return;
      labOpen = false;
      labBtn?.setAttribute('aria-pressed', 'false');
      sheet.open(lt(def.meta.name), partInfo(def));
    } else if (!labOpen) {
      sheet.close();
    }
  };

  // ----- Scene (re)building -----
  const buildScene = (fit: boolean): void => {
    if (!viewer) return;
    if (scene) {
      inputAngle = scene.inputAngle;
      scene.dispose();
    }
    scene = new MechanismScene(mech);
    scene.inputAngle = inputAngle;
    viewer.scene.add(scene.root);
    const sphere = scene.boundingSphere();
    const newRadius = sphere.radius * 0.92;
    viewer.setFloor(scene.minY(), 900, [sphere.center.x, 0, sphere.center.z]);
    const bigChange = newRadius > radius * 1.2 || newRadius < radius * 0.75;
    radius = newRadius;
    if (fit) viewer.viewFrom(mech.camera.views.iso, mech.camera.target, radius, false);
    else viewer.viewFrom(viewer.viewDirection(), mech.camera.target, radius, bigChange);
    scene.setExploded(exploded);
    scene.setSection(section);
    if (selected && mech.parts.some((p) => p.id === selected)) scene.highlight(selected);
    else selected = null;
    updateReadouts();
    viewer.requestRender();
  };

  // ----- Parameter lab -----
  const labPanel = base.lab
    ? createLabPanel(base.lab, (r, changed) => {
        mech = changed ? r.mechanism : base;
        labBtn!.querySelector<HTMLElement>('.tool-badge')!.hidden = !changed;
        buildReadouts();
        buildScene(false);
      })
    : null;

  const openLab = (): void => {
    if (!base.lab || !labPanel) return;
    if (selected) {
      selected = null;
      scene?.highlight(null);
    }
    labOpen = true;
    labBtn!.setAttribute('aria-pressed', 'true');
    hint.classList.add('hidden');
    sheet.open(lt(base.lab.title), labPanel.el, { kicker: lt(base.title) });
    // Wait for the sheet's slide-in so its height is final, then frame the model above it.
    window.setTimeout(() => updateInsets(true), 300);
  };
  labBtn?.addEventListener('click', () => {
    if (labOpen) sheet.close();
    else openLab();
  });

  sheet.onClose(() => {
    const wasLab = labOpen;
    labOpen = false;
    labBtn?.setAttribute('aria-pressed', 'false');
    if (selected) select(null);
    hint.classList.remove('hidden');
    updateInsets(wasLab);
  });

  return {
    el,
    activate() {
      if (viewer) return;
      if (!webglAvailable()) {
        viewport.replaceChildren(h('p', { class: 'webgl-error' }, t('webglError')));
        return;
      }
      viewer = new Viewer(viewport, ctx.theme());
      updateInsets();
      buildScene(true);
      const v = viewer;
      cleanups.push(
        v.addFrameHandler((dt) => {
          const s = scene;
          if (!s) return false;
          if (playing && rpm > 0) s.advance(dt, rpm, VISUAL_SCALE);
          const anim = s.update(dt);
          return anim || (playing && rpm > 0);
        }),
        v.onTap((e) => {
          const s = scene;
          if (!s) return;
          const hit = v.raycast(e.clientX, e.clientY, s.pickables())[0];
          const id = hit ? s.partIdOf(hit.object) : null;
          if (id) select(id === selected ? null : id);
          else if (!labOpen) select(null);
        }),
        ctx.onThemeChange((th) => v.setTheme(th)),
      );
      updateReadouts();
    },
    deactivate() {
      cleanups.splice(0).forEach((f) => f());
      if (scene) inputAngle = scene.inputAngle;
      scene?.dispose();
      viewer?.dispose();
      scene = null;
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
