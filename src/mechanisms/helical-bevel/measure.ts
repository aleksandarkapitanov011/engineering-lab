/**
 * Measuring exercise: span measurement of the helical gear z₂ with a disc micrometer.
 *
 * For a helical gear the span is measured in the NORMAL section: the disc faces are tangent to the flanks
 * along the base helix, so the instrument is turned by the base helix angle βb. Formula (ISO 21771):
 *   W_kn = mₙ·cos αₙ·[π(k − 0.5) + z·inv αₜ] + 2·x·mₙ·sin αₙ,
 * with k from the virtual number of teeth z_w = z·inv αₜ / inv αₙ. The face width must exceed W·sin βb.
 */
import type { LText, MeasureDef, MeasureOverlay, MeasureSample } from '../../core/types';
import { inv } from '../../core/involute';
import { discMicrometer } from '../common/discMicrometer';
import { ALPHA_N, ALPHA_T, AXIS_Y, BETA, D2, HEL_BACKLASH, MN, STAGE1_Z, Z2 } from './params';

const L = (bg: string, en: string): LText => ({ bg, en });
const n2 = (v: number): string => v.toFixed(2).replace('.', ',');
const e2 = (v: number): string => v.toFixed(2);
const n3 = (v: number): string => v.toFixed(3).replace('.', ',');
const e3 = (v: number): string => v.toFixed(3);

const AN = (ALPHA_N * Math.PI) / 180;
/** Base helix angle. */
export const BETA_B = Math.atan(Math.tan(BETA) * Math.cos(ALPHA_T));

/** Span measurement of a helical gear in the normal section: teeth spanned k and W_kn (mm). */
export function helicalSpan(mn: number, z: number, x = 0): { k: number; W: number; zw: number } {
  const zw = (z * inv(ALPHA_T)) / inv(AN);
  const k = Math.max(2, Math.round((zw * ALPHA_N) / 180 + 0.5));
  const W = mn * Math.cos(AN) * (Math.PI * (k - 0.5) + z * inv(ALPHA_T)) + 2 * x * mn * Math.sin(AN);
  return { k, W, zw };
}

/** Deviations of W (thinner teeth give the backlash). */
export const W_ES = -0.05;
export const W_EI = -0.1;

export function createMeasure(): MeasureDef {
  const { k, W } = helicalSpan(MN, Z2);
  const nominal = Math.round(W * 100) / 100;
  const upper = Math.round((nominal + W_ES) * 100);
  const lower = Math.round((nominal + W_EI) * 100);
  // The 3D gear is cut with HEL_BACKLASH removed from the transverse tooth thickness on the pitch circle:
  // in the normal section that is ×cos β, and on W ×cos αₙ.
  const modelW = Math.round((W - HEL_BACKLASH * Math.cos(BETA) * Math.cos(AN)) * 100) / 100;
  const rb = (D2 / 2) * Math.cos(ALPHA_T);
  const sub = '₀₁₂₃₄₅₆₇₈₉';
  const Wk = `W${String(k).split('').map((c) => sub[Number(c)]).join('')}`;
  const verdictOf = (hund: number): string => (hund > upper ? 'rework' : hund < lower ? 'scrap' : 'ok');
  const explainOf = (actual: number): LText => {
    const dW = actual - nominal;
    const ds = dW / Math.cos(AN);
    const v = verdictOf(Math.round(actual * 100));
    const sign = dW >= 0 ? '+' : '−';
    const bg = `${Wk} = ${n2(actual)} mm, отклонение ${sign}${n2(Math.abs(dW))} mm. Нормалната дебелина на зъба е ${ds >= 0 ? 'по-голяма' : 'по-малка'} с ΔW/cos αₙ = ${n3(Math.abs(ds))} mm.`;
    const en = `${Wk} = ${e2(actual)} mm, deviation ${sign}${e2(Math.abs(dW))} mm. The normal tooth thickness is ${ds >= 0 ? 'larger' : 'smaller'} by ΔW/cos αₙ = ${e3(Math.abs(ds))} mm.`;
    if (v === 'ok')
      return L(`${bg} В полето ${n2(lower / 100)}…${n2(upper / 100)} – годно.`, `${en} Within ${e2(lower / 100)}…${e2(upper / 100)} – accepted.`);
    if (v === 'rework')
      return L(
        `${bg} Над горната граница ${n2(upper / 100)}: зъбите са твърде дебели, хлабината няма да стигне. Поправим брак – колелото се връща за дошлифоване.`,
        `${en} Above the upper limit ${e2(upper / 100)}: the teeth are too thick and the backlash will not be enough. Reworkable – the gear goes back for more grinding.`,
      );
    return L(
      `${bg} Под долната граница ${n2(lower / 100)}: зъбите са изтънени повече от допуснатото. Окончателен брак.`,
      `${en} Below the lower limit ${e2(lower / 100)}: the teeth are thinner than allowed. Scrap.`,
    );
  };

  return {
    title: L('Виртуално измерване', 'Virtual measurement'),
    intro: L(
      `Провери партида косозъби колела z₂ = ${Z2}. При косите зъби размерът през ${k} зъба ${Wk} се мери в нормалното сечение: микрометърът е завъртян на ъгъла на основната винтова линия βb = ${n2((BETA_B * 180) / Math.PI)}°, за да легнат дисковете по зъбите. Затова ширината на колелото трябва да е поне W·sin βb + 5 mm. Завърти барабана, отчети скалата и реши дали колелото е годно.`,
      `Check a batch of helical gears z₂ = ${Z2}. For helical teeth the span over ${k} teeth ${Wk} is measured in the normal section: the micrometer is turned by the base helix angle βb = ${e2((BETA_B * 180) / Math.PI)}°, so the discs lie along the teeth. That is why the face width must be at least W·sin βb + 5 mm. Turn the thimble, read the scale and decide whether the gear is good.`,
    ),
    quantity: L(`${Wk} – размер през ${k} зъба (нормално сечение)`, `${Wk} – span over ${k} teeth (normal section)`),
    spec: { nominal, es: W_ES, ei: W_EI },
    resolution: 0.01,
    range: [25, 50],
    verdicts: [
      { id: 'ok', label: L('Годно', 'Accept') },
      { id: 'rework', label: L('Брак – поправим', 'Reject – rework') },
      { id: 'scrap', label: L('Брак – окончателен', 'Reject – scrap') },
    ],
    samples(count, rng) {
      const pick = (a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));
      const kinds: ('ok' | 'rework' | 'scrap')[] = ['ok', 'rework', 'scrap'];
      while (kinds.length < count - 1) kinds.push(kinds[Math.floor(rng() * 3)]);
      for (let i = kinds.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
      }
      const values = kinds.slice(0, count - 1).map((kind) =>
        kind === 'ok' ? pick(lower, upper) : kind === 'rework' ? pick(upper + 1, upper + 8) : pick(lower - 8, lower - 1),
      );
      // The first one is the gear of the 3D model itself.
      return [Math.round(modelW * 100), ...values].map((hund): MeasureSample => ({ actual: hund / 100, verdict: verdictOf(hund), explain: explainOf(hund / 100) }));
    },
    camera: { target: [-STAGE1_Z, AXIS_Y + rb + 10, 0], dir: [-1, 0.42, 0.32], radius: 52 },
    focusParts: ['gear2', 'shaft2'],
    createOverlay(): MeasureOverlay {
      return discMicrometer({
        rb,
        z: Z2,
        k,
        Wnom: W,
        tooth0: (angles) => Math.PI / Z2 + (angles.s2 ?? 0), // tooth 0 of z₂ is at π/z₂ (parts.ts)
        viewAngle: Math.PI / 2, // on top of the gear
        centre: [-STAGE1_Z, AXIS_Y, 0],
        axis: [-1, 0, 0],
        tilt: BETA_B, // left-hand gear: the discs follow the teeth
      });
    },
  };
}

/** Face width needed for the measurement (b ≥ W·sin βb + 5 mm). */
export const minFaceWidth = (): number => helicalSpan(MN, Z2).W * Math.sin(BETA_B) + 5;
