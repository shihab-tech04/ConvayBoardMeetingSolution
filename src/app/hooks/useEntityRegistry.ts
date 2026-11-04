import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { convayAuth } from "../services/supabase/convayAuth";

export interface EntityRecord {
  id: string;
  [key: string]: unknown;
}
export interface EntityRegistry<T extends { id: string }> {
  items: T[];
  add: (item: T) => void | Promise<boolean>;
  update: (id: string, patch: Partial<T>) => void | Promise<boolean>;
  remove: (id: string) => void | Promise<boolean>;
  getById: (id: string) => T | undefined;
  loading?: boolean;
  error?: string | null;
  refresh?: () => Promise<void>;
}

interface Cache<T extends { id: string }> {
  items: T[];
  versions: Map<string, number>;
  loaded: boolean;
  pending: Promise<void> | null;
  queue: Promise<void>;
  error: string | null;
}
const caches = new Map<string, Cache<EntityRecord>>();
const NO_LEGACY_RECORDS = new Set(["bms.users", "bms.roles.canonical"]);
const fixtureMode = import.meta.env.MODE === "test";

function store<T extends { id: string }>(key: string): Cache<T> {
  let item = caches.get(key);
  if (!item) {
    item = {
      items: [], versions: new Map(), loaded: false,
      pending: null, queue: Promise.resolve(), error: null,
    };
    caches.set(key, item);
  }
  return item as Cache<T>;
}
function signal(eventName: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(eventName));
}
export function clearEntityRegistryCache() {
  for (const [key, state] of caches) {
    state.items = []; state.versions.clear(); state.loaded = false;
    state.error = null;
  }
  caches.clear();
  if (typeof window !== "undefined") window.dispatchEvent(new Event("convay:entity-cache-cleared"));
}

/**
 * Entity registry compatibility adapter.
 * Runtime: 49 allowlisted SQL-backed registries, no sample records or localStorage.
 * Unit-test mode: existing deterministic fixtures for legacy tests only.
 * All server writes are serialized per collection and revision-checked; failures
 * are surfaced to the user rather than silently saved in the browser.
 */
export function createEntityRegistry<T extends { id: string }>(
  storageKey: string,
  eventName: string,
  mockData: T[],
): () => EntityRegistry<T> {
  if (fixtureMode) {
    function read(): T[] {
      try { return JSON.parse(localStorage.getItem(storageKey) || "[]") as T[]; }
      catch { return []; }
    }
    function merge(custom: T[]) {
      const byId = new Map(custom.map(x => [x.id, x]));
      const oldIds = new Set(mockData.map(x => x.id));
      return [
        ...custom.filter(x => !oldIds.has(x.id)),
        ...mockData.map(x => byId.get(x.id) ?? x),
      ];
    }
    function save(items: T[]) {
      localStorage.setItem(storageKey, JSON.stringify(items));
      signal(eventName);
    }
    return function useTestRegistry() {
      const [custom, setCustom] = useState(read);
      useEffect(() => {
        const update = () => setCustom(read());
        window.addEventListener("storage", update);
        window.addEventListener(eventName, update);
        return () => {
          window.removeEventListener("storage", update);
          window.removeEventListener(eventName, update);
        };
      }, []);
      const add = useCallback((item: T) => {
        const next = [item, ...read()];
        save(next); setCustom(next);
      }, []);
      const update = useCallback((id: string, patch: Partial<T>) => {
        const target = merge(read()).find(x => x.id === id);
        if (!target) return;
        const nextItem = { ...target, ...patch };
        const originals = read();
        const next = originals.some(x => x.id === id)
          ? originals.map(x => x.id === id ? nextItem : x)
          : [...originals, nextItem];
        save(next); setCustom(next);
      }, []);
      const remove = useCallback((id: string) => {
        const next = read().filter(x => x.id !== id);
        save(next); setCustom(next);
      }, []);
      const getById = useCallback((id: string) => merge(read()).find(x => x.id === id), []);
      return { items: merge(custom), add, update, remove, getById };
    };
  }

  const load = async (force = false) => {
    const state = store<T>(storageKey);
    if (NO_LEGACY_RECORDS.has(storageKey)) {
      state.loaded = true;
      state.items = [];
      state.versions.clear();
      signal(eventName);
      return;
    }
    if (state.pending) return state.pending;
    if (state.loaded && !force) return;
    const promise = (async () => {
      try {
        const result = await convayAuth.registry<T>(storageKey, "list");
        state.items = result.records.map(x => x.payload);
        state.versions = new Map(result.records.map(x => [x.payload.id, x.revision]));
        state.loaded = true;
        state.error = null;
        signal(eventName);
      } catch (error) {
        state.error = error instanceof Error ? error.message : "Records could not be loaded";
        state.loaded = false;
        signal(eventName);
        throw error;
      }
    })();
    state.pending = promise;
    try { await promise; } finally { state.pending = null; }
  };

  function mutate(action: "create" | "update" | "delete", item: T | { id: string }, patch?: Partial<T>) {
    const state = store<T>(storageKey);
    if (NO_LEGACY_RECORDS.has(storageKey)) {
      toast.error("Use the authorized User, Role or Permission Management screen.");
      return Promise.resolve(false);
    }
    // Never update local state before the server acknowledges the write.
    // A single queue prevents overlapping writes from silently losing revisions.
    const queued = state.queue.then(async () => {
      if (!state.loaded) await load();
      const previous = state.items.find(x => x.id === item.id);
      const revision = state.versions.get(item.id);
      if (action === "create" && previous) throw new Error("This record already exists");
      if (action !== "create" && (!previous || revision === undefined)) {
        throw new Error("Record not found. Refresh the page and try again.");
      }
      const full = action === "update" ? { ...previous!, ...patch, id: item.id } :
        action === "create" ? item as T : { id: item.id } as T;
      const result = await convayAuth.registry<T>(storageKey, action, full, revision);
      if (action === "delete") {
        state.items = state.items.filter(x => x.id !== item.id);
        state.versions.delete(item.id);
      } else {
        state.items = action === "create"
          ? [full, ...state.items] : state.items.map(x => x.id === item.id ? full : x);
        state.versions.set(item.id, result.revision!);
      }
      state.error = null;
      signal(eventName);
    });
    const operation = queued.then(() => true).catch(error => {
      state.error = error instanceof Error ? error.message : "Unable to save changes";
      toast.error(state.error);
      signal(eventName);
      void load(true).catch(() => undefined);
      return false;
    });
    state.queue = operation.then(() => undefined);
    return operation;
  }

  return function useServerRegistry(): EntityRegistry<T> {
    const [, rerender] = useState(0);
    useEffect(() => {
      let active = true;
      const sync = () => { if (active) rerender(x => x + 1); };
      window.addEventListener(eventName, sync);
      window.addEventListener("convay:entity-cache-cleared", sync);
      // Browser-local seed data is intentionally never imported into production SQL.
      void load().catch(() => undefined);
      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") void load(true).catch(() => undefined);
      };
      document.addEventListener("visibilitychange", refreshWhenVisible);
      return () => {
        active = false;
        window.removeEventListener(eventName, sync);
        window.removeEventListener("convay:entity-cache-cleared", sync);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
      };
    }, []);
    const state = store<T>(storageKey);
    const add = useCallback((item: T) => mutate("create", item), []);
    const update = useCallback((id: string, patch: Partial<T>) => {
      return mutate("update", { id }, patch);
    }, []);
    const remove = useCallback((id: string) => mutate("delete", { id }), []);
    const getById = useCallback((id: string) =>
      store<T>(storageKey).items.find(x => x.id === id), []);
    const refresh = useCallback(() => load(true), []);
    return {
      items: state.items, add, update, remove, getById, refresh,
      loading: !state.loaded && !NO_LEGACY_RECORDS.has(storageKey),
      error: state.error,
    };
  };
}