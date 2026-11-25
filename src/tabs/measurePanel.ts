/**
 * Measuring exercise panel (Model tab): a batch of workpieces, a micrometer to close on each one,
 * reading the scale, deciding good / rework / scrap, feedback and a best score.
 */
import type { MeasureDef, MeasureSample } from '../core/types';
import { storage } from '../core/storage';
import { fmt, lt, t } from '../i18n';
import { h, fromHTML } from '../ui/dom';
import { icons } from '../ui/icons';
import { createMicrometerScale, readMicrometer } from '../ui/micrometer';

export const BATCH = 5;
const n2 = (v: number): string => fmt(v, 2);

/** Points: 1 for the reading, 1 for the decision. Stars: all right = 3, ≥ 80 % = 2, ≥ 50 % = 1. */
export function measureStars(points: number, max: number): number {
  return points >= max ? 3 : points >= 0.8 * max ? 2 : points >= 0.5 * max ? 1 : 0;
}

/** Parses "15,25" / "15.25"; NaN if not a number. */
export function parseReading(s: string): number {
  const v = Number(s.trim().replace(',', '.'));
  return s.trim() === '' ? NaN : v;
}

function stars(n: number): HTMLElement {
  const el = h('div', { class: 'stars', 'aria-label': `${n} / 3` });
  for (let i = 1; i <= 3; i++) {
    const s = fromHTML(i <= n ? icons.starFill : icons.star);
    if (i > n) s.classList.add('off');
    el.appendChild(s);
  }
  return el;
}

export interface MeasurePanel {
  el: HTMLElement;
  /** Starts a new batch (on open, or after a lab change). */
  restart(): void;
  state(): { reading: number; actual: number };
}

export function createMeasurePanel(mechId: string, getDef: () => MeasureDef | undefined, onChange: () => void): MeasurePanel {
  const first = getDef()!;
  let def = first;
  let samples: MeasureSample[] = [];
  let index = 0;
  let points = 0;
  let reading = 0;
  let checked = false;
  let ratchetTimer = 0;

  const sample = (): MeasureSample => samples[index];
  const contact = (): boolean => reading <= sample().actual + 1e-9;
  const clamp = (v: number): number => Math.min(def.range[1], Math.max(sample().actual, Math.round(v * 1000) / 1000));

  const progress = h('div', { class: 'meas-progress' });
  const specEl = h('div', { class: 'meas-spec' });
  const status = h('div', { class: 'meas-status', 'aria-live': 'polite' });
  const scale = createMicrometerScale((d) => turn(d));
  const input = h('input', {
    class: 'meas-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    placeholder: t('measPlaceholder'),
    'aria-label': t('measReading'),
  }) as HTMLInputElement;
  const verdictRow = h('div', { class: 'lab-choice meas-verdicts', role: 'group' });
  let verdict: string | null = null;
  const checkBtn = h('button', { class: 'btn primary meas-check' }, t('measCheck')) as HTMLButtonElement;
  const feedback = h('div', { class: 'meas-feedback', 'aria-live': 'polite' });
  const nextBtn = h('button', { class: 'btn meas-next', hidden: true }) as HTMLButtonElement;

  const render = (): void => {
    scale.set(reading, contact());
    status.textContent = contact() ? t('measContact') : t('measOpen');
    status.classList.toggle('on', contact());
    onChange();
  };

  const turn = (delta: number): void => {
    if (checked) return;
    window.clearInterval(ratchetTimer);
    reading = clamp(reading + delta);
    render();
  };

  const ratchet = (): void => {
    if (checked) return;
    window.clearInterval(ratchetTimer);
    // Turns the ratchet until it slips: fast at first, then slowly near the part.
    ratchetTimer = window.setInterval(() => {
      const gap = reading - sample().actual;
      if (gap <= 1e-9) {
        window.clearInterval(ratchetTimer);
        return;
      }
      reading = clamp(reading - Math.max(0.01, Math.min(0.08, gap * 0.25)));
      render();
    }, 30);
  };

  const step = (label: string, d: number, aria: string): HTMLElement =>
    h('button', { class: 'chip meas-step', 'aria-label': aria, onclick: () => turn(d) }, label);
  const controls = h(
    'div',
    { class: 'meas-controls' },
    step(`« ${fmt(0.5, 1)}`, 0.5, t('measOpenHalf')),
    step(`+${fmt(0.01, 2)}`, 0.01, `+${fmt(0.01, 2)} mm`),
    step(`−${fmt(0.01, 2)}`, -0.01, `−${fmt(0.01, 2)} mm`),
    step(`» ${fmt(0.5, 1)}`, -0.5, t('measCloseHalf')),
    h('button', { class: 'chip meas-ratchet', onclick: ratchet }, t('measRatchet')),
  );

  const showSample = (): void => {
    const s = sample();
    checked = false;
    verdict = null;
    input.value = '';
    input.disabled = false;
    feedback.replaceChildren();
    nextBtn.hidden = true;
    checkBtn.hidden = false;
    // Start open by 0.6…1.6 mm, on a whole hundredth.
    reading = clamp(s.actual + 0.6 + ((index * 37) % 100) / 100);
    progress.replaceChildren(
      h('span', null, `${t('measPiece')} ${index + 1} / ${samples.length}`),
      h('span', null, `${t('measPoints')}: ${points}`),
    );
    const { nominal, es, ei } = def.spec;
    const dev = (v: number): string => (v > 0 ? '+' : v < 0 ? '−' : '') + n2(Math.abs(v));
    specEl.replaceChildren(
      h('span', { class: 'meas-spec-q' }, lt(def.quantity)),
      h('span', { class: 'meas-spec-v' }, `${n2(nominal)}`, h('span', { class: 'meas-tol' }, h('span', null, dev(es)), h('span', null, dev(ei)))),
    );
    verdictRow.replaceChildren(
      ...def.verdicts.map((v) =>
        h(
          'button',
          {
            class: 'chip',
            'data-id': v.id,
            'aria-pressed': 'false',
            onclick: () => {
              if (checked) return;
              verdict = v.id;
              verdictRow.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === v.id)));
            },
          },
          lt(v.label),
        ),
      ),
    );
    render();
  };

  const finish = (): void => {
    const max = 2 * samples.length;
    const st = measureStars(points, max);
    const best = storage.measureBest(mechId);
    if (best === null || points > best) storage.setMeasureBest(mechId, points);
    feedback.replaceChildren(
      h('div', { class: 'meas-final' }, stars(st), h('div', null, `${points} / ${max} ${t('measPointsOf')}`)),
      h('p', { class: 'lab-hint' }, `${t('measBest')}: ${Math.max(best ?? 0, points)} / ${max}`),
    );
    nextBtn.textContent = t('measNewBatch');
    nextBtn.hidden = false;
  };

  checkBtn.addEventListener('click', () => {
    if (checked) return;
    const s = sample();
    const typed = parseReading(input.value);
    if (!contact()) {
      feedback.replaceChildren(h('p', { class: 'meas-warn' }, t('measCloseFirst')));
      return;
    }
    if (Number.isNaN(typed) || !verdict) {
      feedback.replaceChildren(h('p', { class: 'meas-warn' }, t('measFillIn')));
      return;
    }
    checked = true;
    input.disabled = true;
    const r = readMicrometer(s.actual);
    const readOk = Math.abs(typed - s.actual) < 0.005;
    const verdictOk = verdict === s.verdict;
    points += (readOk ? 1 : 0) + (verdictOk ? 1 : 0);
    const correctVerdict = def.verdicts.find((v) => v.id === s.verdict)!;
    feedback.replaceChildren(
      h(
        'div',
        { class: `meas-line ${readOk ? 'ok' : 'bad'}` },
        h('b', null, readOk ? t('measReadOk') : t('measReadBad')),
        ` ${r.mm} mm ${t('measSleeve')}${r.half ? ` + ${n2(0.5)}` : ''} + ${r.thimble} × ${n2(0.01)} = ${n2(s.actual)} mm`,
      ),
      h(
        'div',
        { class: `meas-line ${verdictOk ? 'ok' : 'bad'}` },
        h('b', null, verdictOk ? t('measVerdictOk') : t('measVerdictBad')),
        ` ${lt(correctVerdict.label)}`,
      ),
      h('p', { class: 'lab-hint' }, lt(s.explain)),
    );
    checkBtn.hidden = true;
    nextBtn.textContent = index + 1 < samples.length ? t('measNext') : t('measResult');
    nextBtn.hidden = false;
    progress.lastElementChild!.textContent = `${t('measPoints')}: ${points}`;
  });

  let done = false;
  nextBtn.addEventListener('click', () => {
    if (done) {
      restart();
      return;
    }
    if (!checked) return;
    if (index + 1 < samples.length) {
      index++;
      showSample();
    } else {
      done = true;
      finish();
    }
  });

  const restart = (): void => {
    def = getDef() ?? first;
    done = false;
    samples = def.samples(BATCH, Math.random);
    index = 0;
    points = 0;
    showSample();
  };

  const el = h(
    'div',
    { class: 'lab meas' },
    h('p', { class: 'lab-intro' }, lt(first.intro)),
    progress,
    specEl,
    scale.el,
    status,
    controls,
    h('label', { class: 'info-label', style: 'margin-top:14px;display:block' }, t('measReading')),
    input,
    h('div', { class: 'info-label', style: 'margin-top:12px' }, t('measDecision')),
    verdictRow,
    checkBtn,
    feedback,
    nextBtn,
  );
  restart();
  return { el, restart, state: () => ({ reading, actual: sample().actual }) };
}
