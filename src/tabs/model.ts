/**
 * TAB 1 — Модел: animated 3D model, speed control, readouts, exploded view, section, part info.
 */
import type { TabSpec, TabView } from '../app/context';
import type { Mechanism, PartDef } from '../core/types';
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

function createModelTab(mech: Mechanism, ctx: Parameters<TabSpec['create']>[1]): TabView {
  const viewport = h('div', { class: 'viewport' });
  const el = h('section', { class: 'model-tab' }, viewport);
  const sheet = createSheet(el);

  // State survives deactivate/activate (the WebGL resources do not).
  let rpm = Math.round(mech.maxInputRpm / 3);
  let playing = true;
  let exploded = false;
  let section = false;
  let selected: string | null = null;
  let inputAngle = 0;

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
  const toolCol = h('div', { class: 'tool-col' }, explodeBtn, sectionBtn);

  const playBtn = h('button', { class: 'play-btn', 'aria-label': t('pause') });
  const slider = h('input', {
    type: 'range',
    min: '0',
    max: String(mech.maxInputRpm),
    step: '50',
    value: String(rpm),
    'aria-label': t('inputSpeed'),
  }) as HTMLInputElement;
  const rpmLabel = h('output', { class: 'rpm-value' });
  const readouts = h('div', { class: 'readouts' });
  const readoutEls = mech.readouts.map((r) => {
    const v = h('span', { class: 'ro-value' });
    const icon = h('span', { class: 'ro-icon' });
    const box = h('div', { class: 'readout' }, h('span', { class: 'ro-label' }, lt(r.label)), h('span', { class: 'ro-main' }, v, icon));
    readouts.append(box);
    return { r, v, icon };
  });

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

  const select = (id: string | null): void => {
    selected = id;
    scene?.highlight(id);
    viewer?.requestRender();
    hint.classList.toggle('hidden', id !== null);
    if (id) {
      const def = mech.parts.find((p) => p.id === id)!;
      sheet.open(lt(def.meta.name), partInfo(def));
    } else {
      sheet.close();
    }
  };
  sheet.onClose(() => {
    if (selected) select(null);
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
      viewer.setInsets(56, panel.offsetHeight + 16);
      scene = new MechanismScene(mech);
      scene.inputAngle = inputAngle;
      viewer.scene.add(scene.root);
      const sphere = scene.boundingSphere();
      radius = sphere.radius * 0.92;
      viewer.setFloor(scene.minY(), 700, [sphere.center.x, 0, sphere.center.z]);
      viewer.viewFrom(mech.camera.views.iso, mech.camera.target, radius, false);
      scene.setExploded(exploded);
      scene.setSection(section);
      if (selected) scene.highlight(selected);
      const s = scene;
      const v = viewer;
      cleanups.push(
        v.addFrameHandler((dt) => {
          if (playing && rpm > 0) s.advance(dt, rpm, VISUAL_SCALE);
          const anim = s.update(dt);
          return anim || (playing && rpm > 0);
        }),
        v.onTap((e) => {
          const hit = v.raycast(e.clientX, e.clientY, s.pickables())[0];
          const id = hit ? s.partIdOf(hit.object) : null;
          select(id && id !== selected ? id : id === selected ? selected : null);
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
