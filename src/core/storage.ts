import type { ScoreRecord } from './assembly';

const PREFIX = 'engineering-lab:';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or disabled: ignore */
  }
}

export type Theme = 'dark' | 'light';

export const storage = {
  bestScore(mechId: string): ScoreRecord | null {
    return read<ScoreRecord>(`best:${mechId}`);
  },
  setBestScore(mechId: string, rec: ScoreRecord): void {
    write(`best:${mechId}`, rec);
  },
  theme(): Theme {
    return read<Theme>('theme') ?? 'dark';
  },
  setTheme(t: Theme): void {
    write('theme', t);
  },
  quizBest(mechId: string): number | null {
    return read<number>(`quiz:${mechId}`);
  },
  setQuizBest(mechId: string, v: number): void {
    write(`quiz:${mechId}`, v);
  },
  measureBest(mechId: string): number | null {
    return read<number>(`measure:${mechId}`);
  },
  setMeasureBest(mechId: string, v: number): void {
    write(`measure:${mechId}`, v);
  },
};
