/**
 * WS-F UAM-01: latest-only Super Admin user-directory read.
 *
 * This controls UI presentation only. The Convay users Edge Function remains
 * the sole authority for deciding which verified actor can read accounts.
 * Old, malformed or failed responses must not expose a cached user list.
 */
export interface DirectoryUserShape {
  user_id: string;
  display_name: string;
  email: string;
  account_role: string;
  account_status: string;
}
export type UserDirectoryUpdate<T> =
  | { phase: "loading"; users: []; error: "" }
  | { phase: "ready"; users: T[]; error: "" }
  | { phase: "error"; users: []; error: string };

export interface UserDirectoryStatsState {
  accessLoaded: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string;
}

/** A zero count is authoritative only after an authorized directory read succeeds. */
export function isUserDirectoryStatsUnavailable(state: UserDirectoryStatsState): boolean {
  return !state.accessLoaded || !state.isSuperAdmin || state.loading || Boolean(state.error.trim());
}

function validDirectoryUser(value: unknown): value is DirectoryUserShape {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.user_id === "string" && user.user_id.length > 0
    && typeof user.display_name === "string"
    && typeof user.email === "string"
    && (user.account_role === "user" || user.account_role === "super_admin")
    && ["active", "inactive", "suspended"].includes(String(user.account_status));
}

export function createLatestUserDirectoryRead<T extends DirectoryUserShape>() {
  let epoch = 0;
  return {
    invalidate() { epoch += 1; },
    async load(
      read: () => Promise<{ users?: T[] }>,
      publish: (update: UserDirectoryUpdate<T>) => void,
    ): Promise<boolean> {
      const request = ++epoch;
      publish({ phase: "loading", users: [], error: "" });
      try {
        const response = await read();
        if (request !== epoch) return false;
        if (!response || !Array.isArray(response.users)
          || !response.users.every(validDirectoryUser)) {
          throw new Error("Invalid user directory response. Retry to reload.");
        }
        publish({ phase: "ready", users: response.users, error: "" });
        return true;
      } catch (error) {
        if (request !== epoch) return false;
        publish({
          phase: "error", users: [],
          error: error instanceof Error ? error.message : "Unable to load users",
        });
        return false;
      }
    },
  };
}
