/**
 * Data model for a mechanism module. The app shell only talks to these types,
 * so a new mechanism is a new folder that exports a `Mechanism` object.
 */
import type * as THREE from 'three';
import type { MaterialKit } from '../three/materials';

export type Vec3 = [number, number, number];

/** Localised content text. `bg` is required; other languages fall back to `bg`. */
export interface LText {
  bg: string;
  en?: string;
}

export interface PartDimension {
  label: LText;
  value: string;
}

export interface PartMeta {
  name: LText;
  material: LText;
  func: LText;
  dims: PartDimension[];
}

export interface ExplodeSpec {
  /** Offset when fully exploded (mm). In the body frame, or the spinning frame if `frame === 'spin'`. */
  offset: Vec3;
  /** Lower orders move first when exploding and return last. */
  order: number;
  frame?: 'body' | 'spin';
}

export interface PartBuildContext {
  materials: MaterialKit;
}

export interface PartDef {
  id: string;
  meta: PartMeta;
  /** Builds the part in its own local frame. For body parts, local +Z is the body axis. */
  build(ctx: PartBuildContext): THREE.Object3D;
  /** Kinematic body it rotates with. Undefined = static, placed in world coordinates. */
  body?: string;
  /** Position in the body frame (body parts: keep x = y = 0, i.e. on the axis). */
  position: Vec3;
  /** Named children that spin at another factor of the body speed (e.g. bearing balls, outer ring). */
  spin?: Record<string, number>;
  explode: ExplodeSpec;
  /** Direction the part slides in from during the assembly game (body frame). Defaults to explode.offset. */
  approach?: Vec3;
  /** Pre-installed in the assembly game (e.g. base plate). */
  fixed?: boolean;
}

export interface KinematicBody {
  id: string;
  label: LText;
  /** Origin of the rotation axis in world coordinates (mm). */
  origin: Vec3;
  /** Unit vector of the rotation axis in world coordinates. */
  axis: Vec3;
  /** Where to draw the rotation direction arrow, in the body frame. */
  arrow?: { z: number; radius: number };
}

export type KinematicLink =
  | { kind: 'external-gear'; from: string; to: string; zFrom: number; zTo: number }
  | { kind: 'internal-gear'; from: string; to: string; zFrom: number; zTo: number }
  | { kind: 'coupling'; from: string; to: string };

export interface Kinematics {
  input: string;
  output: string;
  bodies: KinematicBody[];
  links: KinematicLink[];
}

export interface AssemblyStep {
  partId: string;
  /** Part ids that must already be installed. */
  requires: string[];
  /** Explains WHY the order matters; shown when the user tries too early. */
  hint: LText;
}

export interface AssemblyDef {
  steps: AssemblyStep[];
  /** Target time in seconds for three stars (with zero mistakes). */
  parTimeSec: number;
}

export interface DrawingNote {
  title: LText;
  body: LText;
}

export interface DrawingDef {
  id: string;
  title: LText;
  /** Returns SVG markup. Elements with `data-note="key"` are tappable and explained by `notes[key]`. */
  render(): string;
  notes: Record<string, DrawingNote>;
}

export interface IllustrationHandle {
  start(): void;
  stop(): void;
  dispose(): void;
}

/** Handwritten extras rendered around a theory page in the notebook. */
export interface TheoryAnnotations {
  /** Caption under the taped-in figure, e.g. "фиг. 3 – ...". */
  caption?: LText;
  /** Short remark next to the formula with an arrow pointing at it. */
  formulaNote?: LText;
  /** Yellow sticky note with a tip. */
  sticky?: LText;
  /** Red-pen warning. */
  warning?: LText;
}

export interface TheoryPage {
  id: string;
  title: LText;
  /**
   * 3–5 short sentences. Light notebook markup is supported:
   * ==highlighter==, __red underline__, **ink bold**, ((circled)).
   */
  sentences: LText[];
  annotations?: TheoryAnnotations;
  /** Plain text / light HTML for one key formula. */
  formula: string;
  illustration(host: HTMLElement): IllustrationHandle;
}

export interface QuizQuestion {
  q: LText;
  options: LText[];
  correct: number;
  explain: LText;
}

export interface CameraSpec {
  target: Vec3;
  /** Directions (not positions) from the target; distance is fitted to the model. */
  views: { iso: Vec3; front: Vec3; top: Vec3; side: Vec3 };
}

/** Live readout shown in the Model tab. */
export interface Readout {
  label: LText;
  value(speeds: Map<string, number>): string;
  /** Optional rotation sense to show as an icon: 1 = counter-clockwise, -1 = clockwise (seen from the front). */
  sign?(speeds: Map<string, number>): number;
}

/** A tunable design parameter in the parameter lab. */
export interface LabParam {
  id: string;
  label: LText;
  /** 'choice' picks from `options` (e.g. a standard series), 'range' is a slider. */
  kind: 'range' | 'choice';
  min?: number;
  max?: number;
  step?: number;
  options?: number[];
  default: number;
  format?(v: number): string;
  hint?: LText;
}

export interface LabPreset {
  label: LText;
  values: Record<string, number>;
}

export interface LabValue {
  label: LText;
  value: string;
}

export interface LabWarning {
  level: 'ok' | 'info' | 'warn' | 'error';
  text: LText;
}

export interface LabResult {
  values: LabValue[];
  warnings: LabWarning[];
  /** The mechanism regenerated for these parameters (shown in the Model tab). */
  mechanism: Mechanism;
}

/** Optional "what if" lab: change design parameters and see the regenerated model and checks. */
export interface LabDef {
  title: LText;
  intro: LText;
  params: LabParam[];
  presets: LabPreset[];
  evaluate(values: Record<string, number>): LabResult;
}

/** A force arrow drawn in the 3D view (world coordinates, mm and N). */
export interface ForceArrow {
  /** Application point. */
  at: Vec3;
  /** Direction of the force (need not be normalised). */
  dir: Vec3;
  magnitude: number;
  label: string;
  color: string;
  /** 'from': the arrow starts at `at`. 'to': the arrow head stops `gap` mm before `at` (pushing on it). */
  mode?: 'from' | 'to';
  gap?: number;
  /** Where the label sits along the arrow, 0 = tail, 1 = beyond the tip (default). */
  labelAt?: number;
}

/** One line of a strength check: stress vs. limit and the resulting safety factor. */
export interface StrengthCheck {
  label: LText;
  /** Short formula shown under the label. */
  formula: string;
  stress: number;
  limit: number;
  unit: string;
  safety: number;
  required: number;
  note?: LText;
}

export interface ForcesResult {
  values: LabValue[];
  checks: StrengthCheck[];
  arrows: ForceArrow[];
  warnings: LabWarning[];
}

/** Optional forces & strength panel for the Model tab. `inputRpm` comes from the speed slider. */
export interface ForcesDef {
  title: LText;
  intro: LText;
  params: LabParam[];
  evaluate(values: Record<string, number>, inputRpm: number): ForcesResult;
}

/** Overlay drawn on top of the model in the close-up view, synced with the rotation. */
export interface CloseUpOverlay {
  object: THREE.Object3D;
  /** Called every frame with the current input-shaft angle (rad). Returns live facts. */
  update(inputAngle: number): { contacts: number };
  dispose(): void;
}

/** Physical description of a running gear mesh, used to synthesise its sound. */
export interface MechanismSound {
  /** Tooth mesh frequency f = z₁·n₁/60, Hz. */
  meshFrequency: number;
  /** Tooth counts of the two meshing gears (errors repeat once per revolution of each). */
  teeth: [number, number];
  /** Transverse contact ratio: the fraction ε − 1 of each mesh cycle runs with two tooth pairs. */
  contactRatio: number;
  /** Relative load 0…1 (louder and harsher under load). */
  load: number;
}

/** Optional close-up of the working zone (e.g. the gear mesh) with overlay and sound. */
export interface CloseUpDef {
  title: LText;
  intro: LText;
  camera: { target: Vec3; dir: Vec3; radius: number };
  /** Parts kept fully visible in the close-up; the rest is faded so it does not hide the zone. */
  focusParts?: string[];
  createOverlay(): CloseUpOverlay;
  facts(inputRpm: number): LabValue[];
  sound?(inputRpm: number): MechanismSound;
}

export interface Mechanism {
  kind: 'mechanism';
  /** Optional close-up of the working zone with live overlay and sound. */
  closeUp?: CloseUpDef;
  /** Optional parameter lab for the Model tab. */
  lab?: LabDef;
  /** Optional forces & strength check for the Model tab. */
  forces?: ForcesDef;
  id: string;
  title: LText;
  subtitle: LText;
  /** Inline SVG markup used on the catalogue card. */
  thumbnail: string;
  pro?: boolean;
  parts: PartDef[];
  kinematics: Kinematics;
  readouts: Readout[];
  assembly: AssemblyDef;
  drawings: DrawingDef[];
  theory: TheoryPage[];
  quiz: QuizQuestion[];
  camera: CameraSpec;
  /** Section plane: keeps points where normal·p + constant >= 0. */
  section: { normal: Vec3; constant: number };
  /** Max input speed for the slider, rpm. */
  maxInputRpm: number;
}

/** A locked placeholder in the catalogue. */
export interface TeaserEntry {
  kind: 'teaser';
  id: string;
  title: LText;
  subtitle: LText;
  thumbnail: string;
  pro: boolean;
}

export type CatalogEntry = Mechanism | TeaserEntry;
