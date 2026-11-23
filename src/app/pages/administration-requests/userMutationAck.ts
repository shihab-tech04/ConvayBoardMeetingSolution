/**
 * WS-F UAM-14: presentation-level server-ACK validation for the existing
 * Convay Super Admin user API. This never authorizes a mutation; the hosted
 * convay-users Edge function must enforce identity, roles and persistence.
 */
export type UserAckAction = "invite" | "update" | "set_status" | "set_password" | "delete";
export interface ExpectedUserAck {
  userId?: string;
  email?: string;
  roleId?: string;
  displayName?: string;
  status?: "active" | "inactive" | "suspended";
}
type UserAckRecord = {
  user_id?: unknown;
  display_name?: unknown;
  email?: unknown;
  account_status?: unknown;
  invitation_status?: unknown;
  assigned_role_id?: unknown;
};
type UserAckResponse = { user?: UserAckRecord; ok?: unknown } | null | undefined;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const fail = (): never => {
  throw new Error("Server did not confirm this user change. Reload users before retrying.");
};

/** Reject any malformed or mismatched HTTP-success acknowledgement. */
export function requireUserMutationAck(
  action: UserAckAction,
  response: UserAckResponse,
  expected: ExpectedUserAck = {},
): void {
  if (action === "set_password" || action === "delete") {
    if (response?.ok !== true) fail();
    return;
  }
  const user = response?.user;
  if (!user || typeof user.user_id !== "string" || !UUID_RE.test(user.user_id)) fail();
  if (expected.userId && user!.user_id !== expected.userId) fail();
  if (action === "invite") {
    // An invitation must not be presented as a completed active account.
    if (!expected.email || typeof user!.email !== "string"
      || normalizeEmail(user!.email) !== normalizeEmail(expected.email)
      || user!.invitation_status !== "pending"
      || user!.account_status !== "inactive") fail();
    if (expected.roleId && user!.assigned_role_id !== expected.roleId) fail();
  }
  if (action === "update" && expected.displayName !== undefined
    && user!.display_name !== expected.displayName) fail();
  if (action === "set_status" && (!expected.status || user!.account_status !== expected.status)) fail();
}
