import { Signal } from '@angular/core';

interface ItemWithId {
  id: number;
}

export function addItem<T extends ItemWithId>(items: readonly T[], item: Omit<T, 'id'>): readonly T[] {
  return [...items, { ...item, id: nextId(items) } as T];
}

export function updateItem<T extends ItemWithId>(items: readonly T[], id: number, patch: Omit<T, 'id'>): readonly T[] {
  return items.map((current) => (current.id === id ? { ...current, ...patch } : current));
}

export function removeItem<T extends ItemWithId>(items: readonly T[], id: number): readonly T[] {
  return items.filter((item) => item.id !== id);
}

export function duplicateItem<T extends ItemWithId>(items: readonly T[], id: number): readonly T[] {
  const sourceIndex = items.findIndex((item) => item.id === id);
  if (sourceIndex === -1) {
    return items;
  }

  const duplicated = { ...items[sourceIndex], id: nextId(items) };
  return [...items.slice(0, sourceIndex + 1), duplicated, ...items.slice(sourceIndex + 1)];
}

export function findItemById<T extends ItemWithId>(items: readonly T[], id: number): T | undefined {
  return items.find((item) => item.id === id);
}

export function hasItems(signals: readonly Signal<readonly unknown[]>[]): boolean {
  return signals.some((collection) => collection().length > 0);
}

function nextId(current: readonly ItemWithId[]): number {
  return current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1;
}
