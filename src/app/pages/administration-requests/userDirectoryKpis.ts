import type { ConvayProfile } from "../../services/supabase/convayAuth";

export interface UserDirectoryKpis {
  total: number | null;
  active: number | null;
  inactiveOrSuspended: number | null;
  superAdmins: number | null;
}

/** Counts are meaningful only after the authoritative directory read succeeds. */
export function summarizeUserDirectory(
  users: readonly ConvayProfile[],
  ready: boolean,
): UserDirectoryKpis {
  if (!ready) {
    return { total: null, active: null, inactiveOrSuspended: null, superAdmins: null };
  }

  return {
    total: users.length,
    active: users.filter(user => user.account_status === "active").length,
    inactiveOrSuspended: users.filter(user => user.account_status !== "active").length,
    superAdmins: users.filter(user => user.account_role === "super_admin").length,
  };
}

export function formatDirectoryKpi(value: number | null): string {
  return value === null ? "—" : String(value);
}
