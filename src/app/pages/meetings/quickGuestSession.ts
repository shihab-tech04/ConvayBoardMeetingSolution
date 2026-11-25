/**
 * Quick Meeting guest-link browser continuity is scoped to one capability.
 * Store only in this tab; never reuse another meeting's session identity.
 * This module is UI-only: server authorization still validates each request.
 */
export interface QuickGuestSessionStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const TOKEN_STORAGE_KEY = "convay.quick.guest.token";
const SESSION_KEY_PREFIX = "convay.quick.guest.session.";
const V4_SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function read(store: QuickGuestSessionStore | null, key: string): string | null {
  try { return store?.getItem(key) ?? null; } catch { return null; }
}

function write(store: QuickGuestSessionStore | null, key: string, value: string): void {
  try { store?.setItem(key, value); } catch { /* Private-mode storage can be disabled. */ }
}

/** A newly navigated capability takes precedence over any previous saved link. */
export function resolveQuickGuestShareToken(routeToken: string | undefined, store: QuickGuestSessionStore | null): string {
  return routeToken || read(store, TOKEN_STORAGE_KEY) || "";
}

export function rememberQuickGuestShareToken(routeToken: string | undefined, store: QuickGuestSessionStore | null): void {
  if (routeToken) write(store, TOKEN_STORAGE_KEY, routeToken);
}

/**
 * Each complete share token gets its own durable v4 session ID, even when
 * two different tokens happen to share the same first twelve characters.
 * Migrate the legacy short-token key only if this tab previously saved
 * that exact capability; do not borrow the old meeting's identity.
 */
export function resolveQuickGuestSessionId(
  shareToken: string,
  store: QuickGuestSessionStore | null,
  newSessionId: () => string,
): string {
  if (!shareToken) return "";
  const fullKey = SESSION_KEY_PREFIX + shareToken;
  const saved = read(store, fullKey);
  if (saved && V4_SESSION_ID.test(saved)) return saved;

  const legacyKey = SESSION_KEY_PREFIX + shareToken.slice(0, 12);
  const legacy = read(store, TOKEN_STORAGE_KEY) === shareToken ? read(store, legacyKey) : null;
  if (!saved && legacy && V4_SESSION_ID.test(legacy)) {
    write(store, fullKey, legacy);
    return legacy;
  }

  const created = newSessionId();
  if (!V4_SESSION_ID.test(created)) throw new Error("A valid guest session ID is required.");
  write(store, fullKey, created);
  return created;
}
