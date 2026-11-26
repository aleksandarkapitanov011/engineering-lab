import type { CatalogEntry, CategoryDef, Mechanism } from './types';

const categoryList: CategoryDef[] = [];
const entries: CatalogEntry[] = [];

/** Adds a catalogue folder. Folders are shown in the order they are registered. */
export function registerCategory(cat: CategoryDef): void {
  if (categoryList.some((c) => c.id === cat.id)) throw new Error(`Duplicate category id: ${cat.id}`);
  categoryList.push(cat);
}

export function categories(): readonly CategoryDef[] {
  return categoryList;
}

export function getCategory(id: string): CategoryDef | undefined {
  return categoryList.find((c) => c.id === id);
}

export function registerEntry(entry: CatalogEntry): void {
  if (entries.some((e) => e.id === entry.id)) {
    throw new Error(`Duplicate catalogue id: ${entry.id}`);
  }
  if (!categoryList.some((c) => c.id === entry.category)) {
    throw new Error(`${entry.id}: unknown category ${entry.category}`);
  }
  entries.push(entry);
}

export function catalogue(): readonly CatalogEntry[] {
  return entries;
}

/** Entries of one folder, in registration order. */
export function entriesIn(categoryId: string): CatalogEntry[] {
  return entries.filter((e) => e.category === categoryId);
}

export function getMechanism(id: string): Mechanism | undefined {
  const e = entries.find((x) => x.id === id);
  return e && e.kind === 'mechanism' ? e : undefined;
}
