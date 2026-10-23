import { useState, useEffect, useCallback } from "react";

export interface EntityRecord {
  id: string;
  [key: string]: unknown;
}

export interface EntityRegistry<T extends EntityRecord> {
  items: T[];
  add: (item: T) => void;
  update: (id: string, patch: Partial<T>) => void;
  remove: (id: string) => void;
  getById: (id: string) => T | undefined;
}

/**
 * Factory that produces a registry hook for any entity type.
 * Follows the same localStorage + custom-event pattern as useUserRegistry.
 *
 * Usage:
 *   export const useMeetingRegistry = createEntityRegistry<Meeting>(
 *     "bms.meetings", "bms:meetings-updated", MOCK_MEETINGS
 *   );
 */
export function createEntityRegistry<T extends EntityRecord>(
  storageKey: string,
  eventName: string,
  mockData: T[],
): () => EntityRegistry<T> {
  function loadCustom(): T[] {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T[]) : [];
    } catch {
      return [];
    }
  }

  function saveCustom(items: T[]): void {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(eventName));
    } catch { /* ignore */ }
  }

  function mergeWithMock(custom: T[]): T[] {
    const customById = new Map(custom.map(i => [i.id, i]));
    const merged = mockData.map(i => customById.get(i.id) ?? i);
    const baseIds = new Set(mockData.map(i => i.id));
    const newItems = custom.filter(i => !baseIds.has(i.id));
    return [...newItems, ...merged];
  }

  return function useRegistry(): EntityRegistry<T> {
    const [custom, setCustom] = useState<T[]>(loadCustom);

    useEffect(() => {
      const sync = () => setCustom(loadCustom());
      window.addEventListener("storage", sync);
      window.addEventListener(eventName, sync);
      return () => {
        window.removeEventListener("storage", sync);
        window.removeEventListener(eventName, sync);
      };
    }, []);

    const items: T[] = mergeWithMock(custom);

    const add = useCallback((item: T) => {
      const existing = loadCustom();
      const updated = [item, ...existing];
      setCustom(updated);
      saveCustom(updated);
    }, []);

    const update = useCallback((id: string, patch: Partial<T>) => {
      const all = mergeWithMock(loadCustom());
      const target = all.find(i => i.id === id);
      if (!target) return;
      const updatedItem: T = { ...target, ...patch };
      const existing = loadCustom();
      const idx = existing.findIndex(i => i.id === id);
      const updated = idx >= 0
        ? existing.map(i => (i.id === id ? updatedItem : i))
        : [...existing, updatedItem];
      setCustom(updated);
      saveCustom(updated);
    }, []);

    const remove = useCallback((id: string) => {
      const updated = loadCustom().filter(i => i.id !== id);
      setCustom(updated);
      saveCustom(updated);
    }, []);

    const getById = useCallback((id: string): T | undefined => {
      return mergeWithMock(loadCustom()).find(i => i.id === id);
    }, []);

    return { items, add, update, remove, getById };
  };
}
