/**
 * Convay authentication + administrative API.
 * Uses the project's public publishable key; never stores a service-role key.
 * Auth credentials and password verification are handled by Supabase Auth.
 */
const SUPABASE_URL = "https://cnrueblhgvdonplirlhv.supabase.co";
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6ojMU_R8I-sLQQFR64RTQw_p8qZasMm";
const SESSION_KEY = "convay.supabase.session.v1";

export interface ConvayProfile {
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  account_role: "super_admin" | "user";
  account_status: "active" | "inactive" | "suspended";
  phone?: string | null;
  user_type?: string | null;
  employee_id?: string | null;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
  invitation_status?: "pending" | "verified" | "accepted" | null;
  email_verified_at?: string | null;
}
interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}
interface StoredSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  expiresAt: number;
}
export type UserMutation = {
  name?: string;
  email?: string;
  password?: string;
  username?: string;
  phone?: string;
  user_type?: string;
  employee_id?: string;
  status?: string;
  user_id?: string;
};

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const result = JSON.parse(raw) as StoredSession;
    if (!result.accessToken || !result.refreshToken || !result.userId) return null;
    return result;
  } catch { return null; }
}
function saveSession(session: StoredSession, persistent?: boolean): void {
  const useLocal = persistent ?? localStorage.getItem(SESSION_KEY) !== null;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  (useLocal ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
}
function eraseSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}
async function responseBody(res: Response): Promise<Record<string, any>> {
  try { return await res.json() as Record<string, any>; }
  catch { return {}; }
}
function errorMessage(body: Record<string, any>, fallback: string): string {
  const message = body.error_description ?? body.message ?? body.msg ?? body.error;
  return typeof message === "string" ? message : fallback;
}
function toSession(tokens: Tokens): StoredSession {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    userId: tokens.user.id,
    expiresAt: Date.now() + Math.max(0, tokens.expires_in - 30) * 1000,
  };
}
async function refresh(existing: StoredSession): Promise<StoredSession | null> {
  try {
    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: existing.refreshToken }),
    });
    if (!res.ok) { eraseSession(); return null; }
    const session = toSession(await res.json() as Tokens);
    saveSession(session);
    return session;
  } catch { return null; }
}
let refreshRequest: Promise<StoredSession | null> | null = null;
async function validSession(): Promise<StoredSession | null> {
  const session = readSession();
  if (!session) return null;
  if (session.expiresAt > Date.now() + 15000) return session;
  if (!refreshRequest) {
    refreshRequest = refresh(session).finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}
async function selfProfile(session: StoredSession): Promise<ConvayProfile> {
  const query = new URLSearchParams({
    select: "user_id,username,display_name,email,account_role,account_status,phone,user_type,employee_id,created_at,updated_at",
    user_id: "eq." + session.userId,
  });
  const res = await fetch(SUPABASE_URL + "/rest/v1/user_profiles?" + query.toString(), {
    headers: { apikey: API_KEY, Authorization: "Bearer " + session.accessToken },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Unable to verify your account profile");
  const rows = await res.json() as ConvayProfile[];
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0].account_status !== "active") {
    throw new Error("Your account is not active. Contact the administrator.");
  }
  return rows[0];
}

export const convayAuth = {
  async signIn(identifier: string, password: string, remember: boolean): Promise<ConvayProfile> {
    const entry = identifier.trim();
    if (!entry || !password) throw new Error("Enter your username or email and password");
    // The sole Super Admin may use their short username; other users use email.
    const email = entry.toLowerCase() === "shihab" ? "shihabshajib01@gmail.com" : entry;
    const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await responseBody(res);
    if (!res.ok || !body.access_token) throw new Error(errorMessage(body, "Invalid username or password"));
    const session = toSession(body as unknown as Tokens);
    let profile: ConvayProfile;
    try { profile = await selfProfile(session); }
    catch (error) { eraseSession(); throw error; }
    saveSession(session, remember);
    return profile;
  },

  async restore(): Promise<ConvayProfile | null> {
    const session = await validSession();
    if (!session) return null;
    try { return await selfProfile(session); }
    catch { eraseSession(); return null; }
  },

  async signOut(): Promise<void> {
    const session = readSession();
    eraseSession();
    if (!session) return;
    try {
      await fetch(SUPABASE_URL + "/auth/v1/logout", {
        method: "POST",
        headers: { apikey: API_KEY, Authorization: "Bearer " + session.accessToken },
      });
    } catch { /* Local session cleared even if the network is unavailable. */ }
  },


  async access<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const session = await validSession();
    if (!session) throw new Error("Session expired. Please sign in again.");
    const res = await fetch(SUPABASE_URL + "/functions/v1/convay-access", {
      method: "POST",
      headers: { apikey: API_KEY, Authorization: "Bearer " + session.accessToken,
        "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await responseBody(res);
    if (!res.ok) throw new Error(errorMessage(body, "Unable to update access"));
    return body as T;
  },



  /** Authenticated REST/Storage transport, never a service-role key. */
  async authenticatedRequest(path: string, init: RequestInit = {}): Promise<Response> {
    const session = await validSession();
    if (!session) throw new Error("Session expired. Sign in again.");
    const res = await fetch(SUPABASE_URL + path, {
      ...init,
      headers: {
        apikey: API_KEY,
        Authorization: "Bearer " + session.accessToken,
        ...init.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await responseBody(res);
      throw new Error(errorMessage(body, "Request failed (" + res.status + ")"));
    }
    return res;
  },




  async memberDirectory(): Promise<Array<{
    user_id: string; display_name: string; email: string; phone: string | null;
    employee_id: string | null; user_type: string; role_ids: string[]; role_names: string[];
  }>> {
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_member_directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const records = await res.json();
    if (!Array.isArray(records)) throw new Error("Invalid member directory response");
    return records;
  },

  async applyBatch(operations: Array<{
    entity_key: string;
    action: "create" | "update" | "delete";
    record_id?: string;
    payload?: { id?: string; [key: string]: unknown };
  }>): Promise<number> {
    if (!operations.length) throw new Error("No changes supplied");
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_apply_entity_batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_ops: operations }),
    });
    const result = await res.json() as number;
    if (result !== operations.length) {
      throw new Error("The meeting could not be saved completely");
    }
    return result;
  },

  /**
   * Approve a pending meeting through the permission-checked SQL operation.
   * The database verifies mtg_approve and performs only this lifecycle change.
   */
  async approveMeeting(recordId: string, approvalRemark = ""): Promise<Record<string, unknown>> {
    const id = recordId.trim();
    if (!id) throw new Error("A meeting ID is required");
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_approve_meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_record_id: id,
        p_approval_remark: approvalRemark.trim() || null,
      }),
    });
    const approved = await res.json() as Record<string, unknown>;
    if (approved.id !== id || approved.approval_status !== "Approved") {
      throw new Error("Supabase did not confirm the meeting approval.");
    }
    return approved;
  },

  /** Reject a pending meeting through the permission-checked SQL operation. */
  async rejectMeeting(recordId: string, rejectionReason: string): Promise<Record<string, unknown>> {
    const id = recordId.trim();
    const cleanReason = rejectionReason.trim();
    if (!id) throw new Error("A meeting ID is required");
    if (cleanReason.length < 5) {
      throw new Error("Please provide a reason (at least 5 characters)");
    }
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_reject_meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_record_id: id,
        p_rejection_reason: cleanReason,
      }),
    });
    const rejected = await res.json() as Record<string, unknown>;
    if (
      rejected.id !== id ||
      rejected.approval_status !== "Rejected" ||
      rejected.rejection_reason !== cleanReason ||
      typeof rejected.rejected_by !== "string" ||
      typeof rejected.rejected_at !== "string"
    ) {
      throw new Error("Supabase did not confirm the meeting rejection.");
    }
    return rejected;
  },

  /** Schedule an approved meeting through the permission-checked SQL transition. */
  async scheduleMeeting(recordId: string): Promise<Record<string, unknown>> {
    const id = recordId.trim();
    if (!id) throw new Error("A meeting ID is required");
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_schedule_meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_record_id: id }),
    });
    if (!res.ok) throw new Error(errorMessage(await responseBody(res), "Unable to schedule the meeting."));
    const scheduled = await res.json() as Record<string, unknown>;
    if (
      scheduled.id !== id ||
      scheduled.approval_status !== "Scheduled" ||
      typeof scheduled.scheduled_by !== "string" ||
      typeof scheduled.scheduled_at !== "string"
    ) {
      throw new Error("Supabase did not confirm the meeting schedule.");
    }
    return scheduled;
  },

  /** Publish a scheduled meeting through the permission-checked SQL transition. */
  async publishMeeting(recordId: string): Promise<Record<string, unknown>> {
    const id = recordId.trim();
    if (!id) throw new Error("A meeting ID is required");
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_publish_meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_record_id: id }),
    });
    if (!res.ok) throw new Error(errorMessage(await responseBody(res), "Unable to publish the meeting."));
    const published = await res.json() as Record<string, unknown>;
    if (
      published.id !== id ||
      published.approval_status !== "Published" ||
      typeof published.published_by !== "string" ||
      typeof published.published_at !== "string"
    ) {
      throw new Error("Supabase did not confirm the meeting publication.");
    }
    return published;
  },

  /** Reschedule a meeting through the permission-checked, audited SQL operation. */
  async rescheduleMeeting(
    recordId: string,
    schedule: { meeting_date: string; start_time: string; end_time: string; reason: string },
  ): Promise<Record<string, unknown>> {
    const id = recordId.trim();
    const reason = schedule.reason.trim();
    if (!id) throw new Error("A meeting ID is required");
    if (!schedule.meeting_date || !schedule.start_time || !schedule.end_time) {
      throw new Error("A new date, start time and end time are required");
    }
    if (schedule.start_time >= schedule.end_time) {
      throw new Error("Meeting end time must be later than start time");
    }
    if (reason.length < 5) {
      throw new Error("Please provide a rescheduling reason (at least 5 characters)");
    }
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_reschedule_meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_record_id: id,
        p_new_meeting_date: schedule.meeting_date,
        p_new_start_time: schedule.start_time,
        p_new_end_time: schedule.end_time,
        p_reschedule_reason: reason,
      }),
    });
    const rescheduled = await res.json() as Record<string, unknown>;
    if (
      rescheduled.id !== id ||
      rescheduled.approval_status !== "Rescheduled" ||
      rescheduled.status !== "Rescheduled" ||
      rescheduled.meeting_date !== schedule.meeting_date ||
      String(rescheduled.start_time ?? "").slice(0, 5) !== schedule.start_time ||
      String(rescheduled.end_time ?? "").slice(0, 5) !== schedule.end_time ||
      rescheduled.reschedule_reason !== reason ||
      typeof rescheduled.rescheduled_by !== "string" ||
      typeof rescheduled.rescheduled_at !== "string" ||
      !Array.isArray(rescheduled.reschedule_history)
    ) {
      throw new Error("Supabase did not confirm the meeting reschedule.");
    }
    return rescheduled;
  },

  /** Return a pending meeting for revision through the narrowly scoped SQL operation. */
  async requestMeetingRevision(recordId: string, instructions: string): Promise<Record<string, unknown>> {
    const id = recordId.trim();
    const cleanInstructions = instructions.trim();
    if (!id) throw new Error("A meeting ID is required");
    if (cleanInstructions.length < 10) {
      throw new Error("Please provide revision instructions (at least 10 characters)");
    }
    const res = await this.authenticatedRequest("/rest/v1/rpc/convay_request_meeting_revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p_record_id: id,
        p_revision_instructions: cleanInstructions,
      }),
    });
    const revised = await res.json() as Record<string, unknown>;
    if (
      revised.id !== id ||
      revised.approval_status !== "Revision Requested" ||
      revised.revision_instructions !== cleanInstructions
    ) {
      throw new Error("Supabase did not confirm the meeting revision request.");
    }
    return revised;
  },

  async registry<T extends { id: string }>(
    entity: string,
    action: "list" | "create" | "update" | "delete",
    record?: T,
    version?: number,
  ): Promise<{ records: Array<{ payload: T; revision: number }>; revision?: number }> {
    const session = await validSession();
    if (!session) throw new Error("Your session has expired. Sign in again.");
    const endpoint = new URL(SUPABASE_URL + "/rest/v1/convay_entity_records");
    const headers: Record<string, string> = {
      apikey: API_KEY,
      Authorization: "Bearer " + session.accessToken,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    endpoint.searchParams.set("entity_key", "eq." + entity);
    if (action === "list") {
      const rows: Array<{ payload: T; revision: number }> = [];
      // Use explicit pages rather than silently dropping records at the PostgREST max_rows limit.
      let page = 0;
      while (page < 100) {
        const url = new URL(endpoint);
        url.searchParams.set("select", "payload,revision");
        url.searchParams.set("order", "updated_at.desc");
        url.searchParams.set("limit", "1000");
        url.searchParams.set("offset", String(page * 1000));
        const res = await fetch(url.toString(), { headers, cache: "no-store" });
        if (!res.ok) throw new Error(errorMessage(await responseBody(res), "Unable to load " + entity));
        const batch = await res.json() as Array<{ payload: T; revision: number }>;
        if (!Array.isArray(batch)) throw new Error("Invalid record response");
        rows.push(...batch);
        if (batch.length < 1000) break;
        page += 1;
      }
      return { records: rows };
    }
    if (!record?.id) throw new Error("A record ID is required");
    const mutatingUrl = new URL(endpoint);
    mutatingUrl.searchParams.set("record_id", "eq." + record.id);
    mutatingUrl.searchParams.set("select", "record_id,revision");
    if (action !== "create" && typeof version !== "number") {
      throw new Error("Record revision is missing. Reload before editing.");
    }
    if (action !== "create") mutatingUrl.searchParams.set("revision", "eq." + version);
    const method = action === "create" ? "POST" : action === "update" ? "PATCH" : "DELETE";
    headers.Prefer = "return=representation";
    const body = action === "create"
      ? JSON.stringify({ entity_key: entity, record_id: record.id, payload: record })
      : action === "update" ? JSON.stringify({ payload: record }) : undefined;
    const url = action === "create" ? new URL(SUPABASE_URL + "/rest/v1/convay_entity_records?select=record_id,revision") : mutatingUrl;
    const res = await fetch(url.toString(), { method, headers, body });
    if (!res.ok) throw new Error(errorMessage(await responseBody(res), "Unable to save " + entity));
    const result = await res.json() as Array<{ record_id: string; revision: number }>;
    if (!Array.isArray(result) || result.length !== 1 || result[0].record_id !== record.id) {
      throw new Error("The record changed or is inaccessible. Reload and try again.");
    }
    return { records: [], revision: result[0].revision };
  },


  async users(action: "list" | "invite" | "update" | "set_status" | "set_password" | "delete", payload: UserMutation = {}):
    Promise<{ users?: ConvayProfile[]; user?: ConvayProfile; ok?: boolean }> {
    const session = await validSession();
    if (!session) throw new Error("Session expired. Please sign in again.");
    const res = await fetch(SUPABASE_URL + "/functions/v1/convay-users", {
      method: "POST",
      headers: {
        apikey: API_KEY,
        Authorization: "Bearer " + session.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await responseBody(res);
    if (!res.ok) throw new Error(errorMessage(body, "Unable to complete user operation"));
    return body;
  },

  /** Confirm that the one-time Supabase invitation link belongs to a verified email. */
  async verifyInvitation(accessToken: string): Promise<{ email: string }> {
    if (!accessToken) throw new Error("This invitation link is invalid or expired.");
    const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: API_KEY, Authorization: "Bearer " + accessToken },
      cache: "no-store",
    });
    const body = await responseBody(res);
    if (!res.ok || typeof body.email !== "string" || !body.email_confirmed_at) {
      throw new Error("Verify your email from the invitation link before setting a password.");
    }
    return { email: body.email };
  },

  /** Complete a real Supabase Auth invitation using the verified link token. */
  async completeInvitation(accessToken: string, email: string, password: string): Promise<ConvayProfile> {
    if (!accessToken || !email || password.length < 8) {
      throw new Error("A valid invitation and password of at least 8 characters are required.");
    }
    const res = await fetch(SUPABASE_URL + "/functions/v1/convay-users", {
      method: "POST",
      headers: {
        apikey: API_KEY,
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "accept_invite", email, password }),
      cache: "no-store",
    });
    const body = await responseBody(res);
    if (!res.ok) throw new Error(errorMessage(body, "Unable to activate this invitation"));
    const profile = await this.signIn(email, password, false);
    if (profile.account_status !== "active") {
      await this.signOut();
      throw new Error("Convay did not confirm the activated account.");
    }
    return profile;
  },
};

export function profileToCurrentUser(profile: ConvayProfile) {
  const name = profile.display_name || profile.username;
  return {
    id: profile.user_id,
    name,
    shortName: name.trim().split(/\s+/).map(s => s.charAt(0)).slice(0, 2).join("").toUpperCase(),
    designation: profile.account_role === "super_admin" ? "Super Admin" : "User",
    email: profile.email,
    circle: "",
    zone: "Convay",
    employeeId: profile.employee_id || profile.user_id,
    role: profile.account_role,
  };
}
