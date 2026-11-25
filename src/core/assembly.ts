import type { AssemblyStep } from './types';

export type InstallResult =
  | { ok: true; complete: boolean; skipped: string[] }
  | { ok: false; reason: 'already-installed' | 'unknown-part' | 'skipped' }
  | { ok: false; reason: 'missing-prerequisites'; missing: string[]; step: AssemblyStep };

export type RemoveResult =
  | { ok: true; complete: boolean }
  | { ok: false; reason: 'not-installed' | 'unknown-part' }
  | { ok: false; reason: 'blocked'; blockers: string[]; step: AssemblyStep };

export type GameMode = 'assemble' | 'disassemble';
export type InstallFailure = Extract<InstallResult, { ok: false }>;
export type RemoveFailure = Extract<RemoveResult, { ok: false }>;

/** Validates step data: unique parts, known prerequisites, no cycles. Returns a list of problems. */
export function validateSteps(steps: AssemblyStep[], fixedParts: string[] = []): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const s of steps) {
    if (ids.has(s.partId)) problems.push(`duplicate step for ${s.partId}`);
    ids.add(s.partId);
  }
  const known = new Set([...ids, ...fixedParts]);
  for (const s of steps) {
    for (const r of s.requires) {
      if (!known.has(r)) problems.push(`${s.partId} requires unknown part ${r}`);
      if (r === s.partId) problems.push(`${s.partId} requires itself`);
    }
    if (s.optional && !ids.has(s.optional.lockedBy)) problems.push(`${s.partId} is locked by unknown part ${s.optional.lockedBy}`);
    for (const list of [s.mount, s.dismount]) {
      if (list && !list.some((c) => c.ok)) problems.push(`${s.partId} has no correct tool`);
    }
  }
  // Cycle detection: repeatedly "install" every step whose prerequisites are met.
  const done = new Set(fixedParts);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const s of steps) {
      if (!done.has(s.partId) && s.requires.every((r) => done.has(r) || !known.has(r))) {
        done.add(s.partId);
        progressed = true;
      }
    }
  }
  const stuck = steps.filter((s) => !done.has(s.partId)).map((s) => s.partId);
  if (stuck.length) problems.push(`cycle or unreachable steps: ${stuck.join(', ')}`);
  return problems;
}

/**
 * Pure assembly / disassembly engine, independent of rendering.
 * Assembly: a part goes in when its prerequisites are in. An optional part (a key) is lost for good
 * once the part that covers it is installed first. Disassembly: everything starts installed and a part
 * comes off when nothing installed still depends on it (and nothing covers it).
 */
export class AssemblyEngine {
  private readonly installed = new Set<string>();
  private readonly byPart = new Map<string, AssemblyStep>();
  mistakes = 0;

  constructor(
    private readonly steps: AssemblyStep[],
    private readonly fixedParts: string[] = [],
    readonly mode: GameMode = 'assemble',
  ) {
    for (const s of steps) this.byPart.set(s.partId, s);
    for (const f of fixedParts) this.installed.add(f);
    if (mode === 'disassemble') for (const s of steps) this.installed.add(s.partId);
  }

  isInstalled(partId: string): boolean {
    return this.installed.has(partId);
  }

  hasStep(partId: string): boolean {
    return this.byPart.has(partId);
  }

  step(partId: string): AssemblyStep | undefined {
    return this.byPart.get(partId);
  }

  /** Optional part that can no longer be installed because the part covering it is already in. */
  isSkipped(partId: string): boolean {
    const s = this.byPart.get(partId);
    return !!s?.optional && !this.installed.has(partId) && this.installed.has(s.optional.lockedBy);
  }

  skipped(): string[] {
    return this.steps.filter((s) => this.isSkipped(s.partId)).map((s) => s.partId);
  }

  missingFor(partId: string): string[] {
    const step = this.byPart.get(partId);
    if (!step) return [];
    return step.requires.filter((r) => !this.installed.has(r));
  }

  canInstall(partId: string): boolean {
    return this.byPart.has(partId) && !this.installed.has(partId) && !this.isSkipped(partId) && this.missingFor(partId).length === 0;
  }

  /** Parts that could be installed right now. */
  available(): string[] {
    return this.steps.filter((s) => this.canInstall(s.partId)).map((s) => s.partId);
  }

  remaining(): string[] {
    return this.steps.filter((s) => !this.installed.has(s.partId) && !this.isSkipped(s.partId)).map((s) => s.partId);
  }

  /** Checks the order only (no state change, no mistake), e.g. before asking for the tool. */
  checkInstall(partId: string): InstallFailure | null {
    const step = this.byPart.get(partId);
    if (!step) return { ok: false, reason: 'unknown-part' };
    if (this.installed.has(partId)) return { ok: false, reason: 'already-installed' };
    if (this.isSkipped(partId)) return { ok: false, reason: 'skipped' };
    const missing = this.missingFor(partId);
    if (missing.length) return { ok: false, reason: 'missing-prerequisites', missing, step };
    return null;
  }

  tryInstall(partId: string): InstallResult {
    const bad = this.checkInstall(partId);
    if (bad) {
      if (bad.reason === 'missing-prerequisites' || bad.reason === 'skipped') this.mistakes++;
      return bad;
    }
    const before = new Set(this.skipped());
    this.installed.add(partId);
    const skipped = this.skipped().filter((id) => !before.has(id));
    return { ok: true, complete: this.isComplete(), skipped };
  }

  /** Installed parts that keep `partId` from coming off. */
  blockersFor(partId: string): string[] {
    const step = this.byPart.get(partId);
    const out = this.steps.filter((s) => this.installed.has(s.partId) && s.requires.includes(partId)).map((s) => s.partId);
    if (step?.optional && this.installed.has(step.optional.lockedBy) && !out.includes(step.optional.lockedBy)) out.push(step.optional.lockedBy);
    return out;
  }

  checkRemove(partId: string): RemoveFailure | null {
    const step = this.byPart.get(partId);
    if (!step || this.fixedParts.includes(partId)) return { ok: false, reason: 'unknown-part' };
    if (!this.installed.has(partId)) return { ok: false, reason: 'not-installed' };
    const blockers = this.blockersFor(partId);
    if (blockers.length) return { ok: false, reason: 'blocked', blockers, step };
    return null;
  }

  canRemove(partId: string): boolean {
    return this.checkRemove(partId) === null;
  }

  tryRemove(partId: string): RemoveResult {
    const bad = this.checkRemove(partId);
    if (bad) {
      if (bad.reason === 'blocked') this.mistakes++;
      return bad;
    }
    this.installed.delete(partId);
    return { ok: true, complete: this.isComplete() };
  }

  /** A wrong tool or another mistake outside the order rules. */
  addMistake(): void {
    this.mistakes++;
  }

  /** Parts left to handle in the current mode. */
  done(partId: string): boolean {
    return this.mode === 'assemble' ? this.installed.has(partId) || this.isSkipped(partId) : !this.installed.has(partId);
  }

  isComplete(): boolean {
    return this.steps.every((s) => this.done(s.partId));
  }
}

export interface ScoreRecord {
  stars: 1 | 2 | 3;
  timeSec: number;
  mistakes: number;
}

/** 3 stars: no mistakes within par time. 2 stars: at most 2 mistakes within 2x par. Otherwise 1. */
export function computeStars(mistakes: number, timeSec: number, parTimeSec: number): 1 | 2 | 3 {
  if (mistakes === 0 && timeSec <= parTimeSec) return 3;
  if (mistakes <= 2 && timeSec <= parTimeSec * 2) return 2;
  return 1;
}

/** True when `a` is better than `b`: more stars, then fewer mistakes, then faster. */
export function isBetterScore(a: ScoreRecord, b: ScoreRecord | null | undefined): boolean {
  if (!b) return true;
  if (a.stars !== b.stars) return a.stars > b.stars;
  if (a.mistakes !== b.mistakes) return a.mistakes < b.mistakes;
  return a.timeSec < b.timeSec;
}
