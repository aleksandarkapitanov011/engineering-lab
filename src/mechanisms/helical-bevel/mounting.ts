/**
 * Mounting errors of the bevel pair: the pinion or the gear sits too deep or too far along its axis
 * (wrong shims), so the two cone apexes no longer meet.
 *
 * Model (straight teeth, rigid bodies + tooth stiffness):
 *  - moving a gear along its axis by ΔA changes the approach normal to the pitch cone by ΔA·sin δ;
 *    on each flank the normal gap changes by Δa·sin α;
 *  - the nominal backlash and the gear's turn that closes it both grow in proportion to the cone distance R
 *    (tooth sizes scale with R), so a uniform approach cannot be taken up evenly: the contact moves to the
 *    narrow end (toe) when the pair is too deep and to the wide end (heel) when it is too far;
 *  - the teeth are crowned lengthwise (ease-off c at the ends) and elastic (mesh stiffness cγ), which gives
 *    the length of the contact pattern and the load distribution w(R) (KHβ = w_max / w_mean).
 * Units: mm, N.
 */
import * as THREE from 'three';
import type { LabValue, LabWarning, LText, MountingDef, MountingOverlay, MountingResult, StressPlot } from '../../core/types';
import { lt } from '../../i18n';
import { cssColour, rainbow } from '../../three/colormap';
import { labelSprite } from '../../three/forceArrows';
import { computeGearbox } from './forces';
import { AXIS_Y, BB, DELTA3, DELTA4, RE } from './params';

const L = (bg: string, en: string): LText => ({ bg, en });
const nb = (v: number, d = 0): string => v.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v: number, d = 2): string => (v > 0 ? '+' : v < 0 ? '−' : '') + nb(Math.abs(v), d);

const ALPHA = (20 * Math.PI) / 180;
export const MOUNT = {
  /** Normal backlash at the heel of the nominal pair (0.08 mm circumferential), mm. */
  jn0: 0.08 * Math.cos(ALPHA),
  /** Lengthwise crowning: ease-off at each end of the face, mm. */
  crown: 0.012,
  /** Mesh stiffness per unit face width, N/mm per mm of approach (≈ 12 N/(mm·µm)). */
  c: 12000,
  /** Mounting distances from the cone apex to the locating faces (drawings EL-HB-002 / 005). */
  A3: 42,
  A4: 28,
};

const RI = RE - BB;
const RMID = RE - BB / 2;
const N = 121;
const Rs = Array.from({ length: N }, (_, i) => RI + (BB * i) / (N - 1));
const ease = (R: number): number => MOUNT.crown * ((R - RMID) / (BB / 2)) ** 2;

export interface BevelMount {
  /** Approach normal to the pitch cone (+ = deeper into mesh), mm. */
  da: number;
  /** Smallest normal backlash along the face, referred to the heel, mm (< 0: the teeth jam). */
  jn: number;
  jam: boolean;
  /** Load per unit length along the face (N/mm) at the cone distances Rs. */
  w: number[];
  Rs: number[];
  /** Pattern: first and last loaded cone distance and the load centre, mm. */
  R1: number;
  R2: number;
  Rc: number;
  KHb: number;
}

/** Contact of the bevel pair with the gears displaced along their axes by dA3, dA4 (+ = away from the apex). */
export function analyseBevelMount(dA3: number, dA4: number, Fn: number): BevelMount {
  const da = -(dA3 * Math.sin(DELTA3) + dA4 * Math.sin(DELTA4));
  const U = da * Math.sin(ALPHA);
  // Backlash: both flanks, the nominal one scaled with R, plus the crowning at the ends.
  const jn = Math.min(...Rs.map((R) => (((MOUNT.jn0 * R) / RE + 2 * ease(R) - 2 * da * Math.sin(ALPHA)) * RE) / R));
  // Drive flank gap after the gear has turned until it touches: g(R) = a·R + ease(R) − U, min g = 0.
  const minGap = (a: number): number => Math.min(...Rs.map((R) => a * R + ease(R) - U));
  let lo = -0.2;
  let hi = 0.2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (minGap(mid) > 0) hi = mid;
    else lo = mid;
  }
  const a = (lo + hi) / 2;
  const g = Rs.map((R) => a * R + ease(R) - U);
  // Elastic approach δ that carries the load: ∫ c·max(0, δ − g) dR = Fn.
  const dR = BB / (N - 1);
  const load = (d: number): number => g.reduce((s, gi) => s + MOUNT.c * Math.max(0, d - gi) * dR, 0);
  let d0 = 0;
  let d1 = 0.5;
  for (let i = 0; i < 80; i++) {
    const mid = (d0 + d1) / 2;
    if (load(mid) < Fn) d0 = mid;
    else d1 = mid;
  }
  const delta = (d0 + d1) / 2;
  const w = g.map((gi) => MOUNT.c * Math.max(0, delta - gi));
  const loaded = Rs.filter((_, i) => w[i] > 1e-9);
  const total = w.reduce((s, x) => s + x, 0);
  const Rc = total > 0 ? Rs.reduce((s, R, i) => s + R * w[i], 0) / total : RMID;
  const wMean = Fn / BB;
  return {
    da,
    jn,
    jam: jn < 0,
    w,
    Rs,
    R1: loaded.length ? loaded[0] : RMID,
    R2: loaded.length ? loaded[loaded.length - 1] : RMID,
    Rc,
    KHb: Math.max(...w) / wMean,
  };
}

/** Developed flank of a gear tooth (toe left, heel right) with the contact pattern and the load curve. */
function patternPlot(m: BevelMount): StressPlot {
  return {
    label: L('Отпечатък на контакта върху зъба на z₄', 'Contact pattern on a tooth of z₄'),
    draw(ctx, w, h, colour) {
      ctx.clearRect(0, 0, w, h);
      const padX = 34;
      const x = (R: number): number => padX + ((R - RI) / BB) * (w - 2 * padX);
      const base = h - 40;
      const hTooth = (R: number): number => ((h - 110) * R) / RE; // tooth height scales with R
      const top = (R: number): number => base - hTooth(R);
      // Tooth flank outline.
      ctx.fillStyle = 'rgba(154,166,178,0.18)';
      ctx.strokeStyle = 'rgba(154,166,178,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x(RI), base);
      ctx.lineTo(x(RE), base);
      ctx.lineTo(x(RE), top(RE));
      ctx.lineTo(x(RI), top(RI));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Pitch line.
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x(RI), base - hTooth(RI) * 0.55);
      ctx.lineTo(x(RE), base - hTooth(RE) * 0.55);
      ctx.stroke();
      ctx.setLineDash([]);
      // Pattern: coloured by the load relative to the mean.
      const wMean = m.w.reduce((s, v) => s + v, 0) / m.w.length || 1;
      for (let i = 0; i < m.Rs.length - 1; i++) {
        if (m.w[i] <= 0 && m.w[i + 1] <= 0) continue;
        const v = Math.min(1, (m.w[i] / wMean) * 0.5);
        const R = m.Rs[i];
        const hh = hTooth(R) * 0.62 * Math.min(1, 0.35 + (m.w[i] / (Math.max(...m.w) || 1)) * 0.65);
        ctx.fillStyle = colour(v);
        ctx.fillRect(x(R), base - hTooth(R) * 0.55 - hh / 2, x(m.Rs[i + 1]) - x(R) + 0.6, hh);
      }
      // Load curve above.
      const wMax = Math.max(...m.w, 1e-9);
      const yW = (v: number): number => 46 - (v / wMax) * 34;
      ctx.strokeStyle = '#ff7a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      m.Rs.forEach((R, i) => (i ? ctx.lineTo(x(R), yW(m.w[i])) : ctx.moveTo(x(R), yW(m.w[i]))));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(154,166,178,0.7)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x(RI), yW(wMean));
      ctx.lineTo(x(RE), yW(wMean));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#9aa6b2';
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lt(L('тесен край', 'toe')), x(RI) - 20, h - 14);
      ctx.textAlign = 'right';
      ctx.fillText(lt(L('широк край', 'heel')), x(RE) + 20, h - 14);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff7a1a';
      ctx.fillText(`w(R), KHβ = ${nb(m.KHb, 2)}`, padX, 10);
      if (m.jam) {
        ctx.fillStyle = '#ff3b3b';
        ctx.textAlign = 'center';
        ctx.font = '700 14px system-ui, sans-serif';
        ctx.fillText(lt(L('ЗАКЛИНВАНЕ', 'JAMMED')), w / 2, base - hTooth(RMID) / 2);
      }
      ctx.textAlign = 'left';
    },
  };
}

/** Pattern along the contact line in 3D (static: the mesh line does not move). */
function createOverlay(m: BevelMount, dA3: number, dA4: number): MountingOverlay {
  const group = new THREE.Group();
  const apex = new THREE.Vector3(0, AXIS_Y, 0);
  const g = new THREE.Vector3(-Math.cos(DELTA3), 0, Math.sin(DELTA3));
  const at = (R: number): THREE.Vector3 => apex.clone().addScaledVector(g, R);
  const mats: THREE.Material[] = [];
  const mat = (color: string, opacity = 1): THREE.MeshBasicMaterial => {
    const mm = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity });
    mats.push(mm);
    return mm;
  };
  const seg = (p0: THREE.Vector3, p1: THREE.Vector3, r: number, mm: THREE.Material): void => {
    const geo = new THREE.CylinderGeometry(r, r, p0.distanceTo(p1), 8);
    const mesh = new THREE.Mesh(geo, mm);
    mesh.position.copy(p0).add(p1).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    group.add(mesh);
  };
  seg(at(RI), at(RE), 0.18, mat('#9aa6b2', 0.8));
  seg(apex, at(RI), 0.1, mat('#9aa6b2', 0.45));
  const wMean = m.w.reduce((s, v) => s + v, 0) / m.w.length || 1;
  for (let i = 0; i < m.Rs.length - 1; i += 2) {
    if (m.w[i] <= 0) continue;
    const c = cssColour(rainbow(Math.min(1, (m.w[i] / wMean) * 0.5)));
    seg(at(m.Rs[i]), at(m.Rs[Math.min(m.Rs.length - 1, i + 2)]), 0.55, mat(c));
  }
  // The apexes of the two pitch cones (they meet when the shims are right).
  const dot = (p: THREE.Vector3, color: string): void => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), mat(color));
    s.position.copy(p);
    group.add(s);
  };
  dot(apex.clone().add(new THREE.Vector3(-dA3, 0, 0)), '#5b8bb8');
  dot(apex.clone().add(new THREE.Vector3(0, 0, dA4)), '#c27a45');
  const label = (text: string, p: THREE.Vector3, color: string): void => {
    const s = labelSprite(text, color, 2.4);
    s.position.copy(p);
    group.add(s);
  };
  label(lt(L('тесен край', 'toe')), at(RI).add(new THREE.Vector3(3, 0, -2)), '#9aa6b2');
  label(lt(L('широк край', 'heel')), at(RE).add(new THREE.Vector3(-3, 0, 3)), '#9aa6b2');
  label(lt(L('върхове на конусите', 'cone apexes')), apex.clone().add(new THREE.Vector3(4, 0, -4)), '#ffffff');
  group.traverse((o) => {
    o.renderOrder = 42;
    (o as THREE.Mesh).raycast = () => undefined;
  });
  return {
    object: group,
    update() {
      // Static: the contact line of the mesh stays in place while the gears turn.
    },
    dispose() {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
        const sp = o as THREE.Sprite;
        if (sp.isSprite) {
          (sp.material as THREE.SpriteMaterial).map?.dispose();
          sp.material.dispose();
        }
      });
      mats.forEach((mm) => mm.dispose());
      group.removeFromParent();
    },
  };
}

export function createMounting(): MountingDef {
  const fmtA = (v: number): string => `${signed(v, 2)} mm`;
  return {
    title: L('Монтажни грешки на коничната двойка', 'Mounting errors of the bevel pair'),
    intro: L(
      'При коничните колела двата върха на конусите трябва да съвпаднат. Положението на всяко колело по оста му се нагласява с подложки до монтажното разстояние от чертежа (42 и 28 mm). Промени го и виж хлабината и къде по зъба отива контактът.',
      'In a bevel pair the two cone apexes must meet. The position of each gear along its axis is set with shims to the mounting distance from the drawing (42 and 28 mm). Change it and see the backlash and where along the tooth the contact goes.',
    ),
    params: [
      {
        id: 'dA3',
        label: L('Малко колело z₃: отклонение от 42 mm', 'Pinion z₃: deviation from 42 mm'),
        kind: 'range',
        min: -0.3,
        max: 0.5,
        step: 0.01,
        default: 0,
        format: fmtA,
        hint: L('„−“ = колелото е по-близо до върха (по-дълбоко в зацепване), „+“ = по-далеч.', '“−” = the gear is closer to the apex (deeper in mesh), “+” = farther away.'),
      },
      {
        id: 'dA4',
        label: L('Голямо колело z₄: отклонение от 28 mm', 'Gear z₄: deviation from 28 mm'),
        kind: 'range',
        min: -0.3,
        max: 0.5,
        step: 0.01,
        default: 0,
        format: fmtA,
      },
      {
        id: 'P',
        label: L('Мощност P', 'Power P'),
        kind: 'choice',
        options: [0.18, 0.37, 0.75, 1.1, 1.5],
        default: 0.37,
        format: (v) => `${nb(v, 2)} kW`,
      },
    ],
    presets: [
      { label: L('Точен монтаж', 'Correct mounting'), values: { dA3: 0, dA4: 0 } },
      { label: L('z₃ твърде навътре', 'z₃ too deep'), values: { dA3: -0.2, dA4: 0 } },
      { label: L('z₄ твърде навън', 'z₄ too far out'), values: { dA3: 0, dA4: 0.3 } },
      { label: L('Двете навън', 'Both too far'), values: { dA3: 0.3, dA4: 0.3 } },
      { label: L('Заклинване', 'Jamming'), values: { dA3: -0.15, dA4: -0.15 } },
    ],
    camera: { target: [-26, AXIS_Y, 14], dir: [0.12, 1, 0.42], radius: 34 },
    focusParts: ['shaft2', 'gear4'],
    patternTitle: L('Отпечатък на контакта по зъба', 'Contact pattern along the tooth'),
    patternNote: L(
      'Така изглежда зъбът на голямото колело, ако се намаже с боя и двойката се завърти под товар – стандартната проверка при монтаж на конични колела. Цветът е натоварването спрямо средното; оранжевата крива отгоре е товарът w по дължината на зъба. Зъбите са леко бъчвовидни (по 12 µm в краищата), затова при точен монтаж петното е в средата.',
      'This is the tooth of the gear after marking paste and a turn under load – the standard check when mounting bevel gears. The colour is the load relative to the mean; the orange curve on top is the load w along the tooth. The teeth are slightly crowned (12 µm at the ends), so with correct mounting the pattern sits in the middle.',
    ),
    evaluate(v, n1): MountingResult {
      const r = computeGearbox({ P: v.P, n1: Math.max(n1, 10), KA: 1 });
      const Fn = r.bev.Ft / Math.cos(ALPHA);
      const m = analyseBevelMount(v.dA3, v.dA4, Fn);
      const pos = (m.Rc - RI) / BB;
      const warnings: LabWarning[] = [];
      if (m.jam) {
        warnings.push({
          level: 'error',
          text: L(
            'Зъбите заклинват: няма хлабина и при тесния край. Колелата са твърде навътре – добави подложки.',
            'The teeth jam: there is no backlash even at the toe. The gears are too deep – add shims.',
          ),
        });
      } else if (pos < 0.38) {
        warnings.push({
          level: 'warn',
          text: L(
            'Петното е към тесния край: двойката е твърде навътре. Отдалечи едно от колелата от върха (добави подложка).',
            'The pattern is towards the toe: the pair is too deep. Move one gear away from the apex (add a shim).',
          ),
        });
      } else if (pos > 0.62) {
        warnings.push({
          level: 'warn',
          text: L(
            'Петното е към широкия край: двойката е твърде навън. Приближи едно от колелата до върха (махни подложка).',
            'The pattern is towards the heel: the pair is too far apart. Move one gear towards the apex (remove a shim).',
          ),
        });
      } else {
        warnings.push({ level: 'ok', text: L('Петното е в средата на зъба – монтажът е правилен.', 'The pattern is in the middle of the tooth – the mounting is correct.') });
      }
      if (!m.jam && m.jn > 0.2) {
        warnings.push({ level: 'warn', text: L('Голяма хлабина: предавката ще чука при смяна на посоката.', 'Large backlash: the drive will knock when the direction reverses.') });
      }
      if (m.KHb > 1.8 && !m.jam) {
        warnings.push({
          level: 'warn',
          text: L(`Товарът е съсредоточен: KHβ = ${nb(m.KHb, 2)}.`, `The load is concentrated: KHβ = ${nb(m.KHb, 2)}.`),
        });
      }
      warnings.push({
        level: 'info',
        text: L(
          'Правило от практиката: колело навътре → петното отива към тесния край и хлабината намалява; колело навън → към широкия край и хлабината расте.',
          'Rule from practice: a gear moved in → the pattern goes to the toe and the backlash shrinks; moved out → to the heel and the backlash grows.',
        ),
      });
      const values: LabValue[] = [
        { label: L('Монтажни разстояния z₃ / z₄', 'Mounting distances z₃ / z₄'), value: `${nb(MOUNT.A3 + v.dA3, 2)} / ${nb(MOUNT.A4 + v.dA4, 2)} mm` },
        { label: L('Сближаване по нормалата Δa = −ΣΔA·sin δ', 'Approach along the normal Δa = −ΣΔA·sin δ'), value: `${signed(m.da * 1000, 0)} µm` },
        { label: L('Хлабина jn (най-малката, към широкия край)', 'Backlash jn (smallest, referred to the heel)'), value: m.jam ? '< 0' : `${nb(m.jn, 3)} mm` },
        {
          label: L('Петно: от … до … от тесния край', 'Pattern: from … to … from the toe'),
          value: m.jam ? '—' : `${nb(m.R1 - RI, 1)} … ${nb(m.R2 - RI, 1)} mm (${nb((100 * (m.R2 - m.R1)) / BB)} %)`,
        },
        { label: L('Център на петното', 'Centre of the pattern'), value: m.jam ? '—' : `${nb(100 * pos)} % ${lt(L('от ширината', 'of the face'))}` },
        { label: L('Неравномерност KHβ = w_max / w_ср', 'Load factor KHβ = w_max / w_mean'), value: m.jam ? '—' : nb(m.KHb, 2) },
        { label: L('Нормална сила Fₙ = Ft / cos α', 'Normal force Fₙ = Ft / cos α'), value: `${nb(Fn)} N` },
      ];
      return {
        values,
        warnings,
        poses: {
          s2: { origin: [-v.dA3, AXIS_Y, 0], axis: [-1, 0, 0], phase: 0 },
          s3: { origin: [0, AXIS_Y, v.dA4], axis: [0, 0, 1], phase: 0 },
        },
        plot: patternPlot(m),
        createOverlay: () => createOverlay(m, v.dA3, v.dA4),
      };
    },
  };
}
