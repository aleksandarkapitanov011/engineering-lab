import type { CatalogEntry, Mechanism } from './types';

const entries: CatalogEntry[] = [];

export function registerEntry(entry: CatalogEntry): void {
  if (entries.some((e) => e.id === entry.id)) {
    throw new Error(`Duplicate catalogue id: ${entry.id}`);
  }
  entries.push(entry);
}

export function catalogue(): readonly CatalogEntry[] {
  return entries;
}

export function getMechanism(id: string): Mechanism | undefined {
  const e = entries.find((x) => x.id === id);
  return e && e.kind === 'mechanism' ? e : undefined;
}
