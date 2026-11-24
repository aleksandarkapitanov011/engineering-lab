import type { AssemblyStep } from './types';

export type InstallResult =
  | { ok: true; complete: boolean }
  | { ok: false; reason: 'already-installed' | 'unknown-part' }
  | { ok: false; reason: 'missing-prerequisites'; missing: string[]; step: AssemblyStep };

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

/** Pure assembly-order engine, independent of rendering. */
export class AssemblyEngine {
  private readonly installed = new Set<string>();
  private readonly byPart = new Map<string, AssemblyStep>();
  mistakes = 0;

  constructor(
    private readonly steps: AssemblyStep[],
    fixedParts: string[] = [],
  ) {
    for (const s of steps) this.byPart.set(s.partId, s);
    for (const f of fixedParts) this.installed.add(f);
  }

  isInstalled(partId: string): boolean {
    return this.installed.has(partId);
  }

  hasStep(partId: string): boolean {
    return this.byPart.has(partId);
  }

  missingFor(partId: string): string[] {
    const step = this.byPart.get(partId);
    if (!step) return [];
    return step.requires.filter((r) => !this.installed.has(r));
  }

  canInstall(partId: string): boolean {
    return this.byPart.has(partId) && !this.installed.has(partId) && this.missingFor(partId).length === 0;
  }

  /** Parts that could be installed right now. */
  available(): string[] {
    return this.steps.filter((s) => this.canInstall(s.partId)).map((s) => s.partId);
  }

  remaining(): string[] {
    return this.steps.filter((s) => !this.installed.has(s.partId)).map((s) => s.partId);
  }

  tryInstall(partId: string): InstallResult {
    const step = this.byPart.get(partId);
    if (!step) return { ok: false, reason: 'unknown-part' };
    if (this.installed.has(partId)) return { ok: false, reason: 'already-installed' };
    const missing = this.missingFor(partId);
    if (missing.length) {
      this.mistakes++;
      return { ok: false, reason: 'missing-prerequisites', missing, step };
    }
    this.installed.add(partId);
    return { ok: true, complete: this.isComplete() };
  }

  isComplete(): boolean {
    return this.steps.every((s) => this.installed.has(s.partId));
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
