/**
 * UAM status consistency across Supabase Auth and the authoritative SQL profile.
 * Auth Admin and PostgREST cannot share a transaction. Prefer observed SQL
 * readback over an ambiguous network acknowledgement; never report success
 * unless SQL confirms the target status.
 */
export type ManagedAccountStatus = "active" | "inactive" | "suspended";
export type StatusTransitionResult<T> =
  | { kind: "confirmed"; profile: T }
  | { kind: "reverted" }
  | { kind: "uncertain" }
  | { kind: "restore_failed" };

export function priorBanDuration(bannedUntil: string | null | undefined, nowMs: number): string {
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Auth status snapshot timestamp");
  if (!bannedUntil) return "none";
  const until = Date.parse(bannedUntil);
  if (!Number.isFinite(until)) throw new Error("Unverifiable previous Auth ban state");
  const seconds = Math.ceil((until - nowMs) / 1000);
  // Never clear a future ban merely because the profile previously said active.
  return seconds > 0 ? `${seconds}s` : "none";
}

/**
 * Safe two-service transition. On a failed SQL write, only revert Auth after
 * a fresh SQL read proves the old state is still authoritative. If the read
 * cannot be established, avoid a second potentially destructive mutation.
 */
export async function applyAccountStatusWithReadback<T>(args: {
  nextStatus: ManagedAccountStatus;
  previousStatus: ManagedAccountStatus;
  previousBannedUntil: string | null | undefined;
  nowMs: number;
  setAuthBan: (duration: string) => Promise<void>;
  saveProfile: (status: ManagedAccountStatus) => Promise<void>;
  readProfile: () => Promise<T>;
  getProfileStatus: (profile: T) => ManagedAccountStatus | null;
}): Promise<StatusTransitionResult<T>> {
  // Validate the entire rollback plan before changing either system.
  const originalBan = priorBanDuration(args.previousBannedUntil, args.nowMs);
  await args.setAuthBan(args.nextStatus === "active" ? "none" : "876000h");

  let writeFailed = false;
  try {
    await args.saveProfile(args.nextStatus);
  } catch {
    writeFailed = true;
  }

  let observed: T;
  try {
    observed = await args.readProfile();
  } catch {
    return { kind: "uncertain" };
  }
  const actualStatus = args.getProfileStatus(observed);
  if (actualStatus === args.nextStatus) {
    return { kind: "confirmed", profile: observed };
  }
  // A successful write with stale/contradictory readback, or an unrelated
  // concurrent change, must not be hidden by an automatic Auth rollback.
  if (!writeFailed || actualStatus !== args.previousStatus) {
    return { kind: "uncertain" };
  }
  try {
    await args.setAuthBan(originalBan);
    return { kind: "reverted" };
  } catch {
    return { kind: "restore_failed" };
  }
}
