/**
 * Convay authentication + administrative API.
 * Uses the project's public publishable key; never stores a service-role key.
 * Auth credentials and password verification are handled by Supabase Auth.
 */
const URL = "https://cnrueblhgvdonplirlhv.supabase.co";
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
    const res = await fetch(URL + "/auth/v1/token?grant_type=refresh_token", {
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
  const res = await fetch(URL + "/rest/v1/user_profiles?" + query.toString(), {
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
    const res = await fetch(URL + "/auth/v1/token?grant_type=password", {
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
      await fetch(URL + "/auth/v1/logout", {
        method: "POST",
        headers: { apikey: API_KEY, Authorization: "Bearer " + session.accessToken },
      });
    } catch { /* Local session cleared even if the network is unavailable. */ }
  },


  async access<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const session = await validSession();
    if (!session) throw new Error("Session expired. Please sign in again.");
    const res = await fetch(URL + "/functions/v1/convay-access", {
      method: "POST",
      headers: { apikey: API_KEY, Authorization: "Bearer " + session.accessToken,
        "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await responseBody(res);
    if (!res.ok) throw new Error(errorMessage(body, "Unable to update access"));
    return body as T;
  },

  async users(action: "list" | "create" | "update" | "set_status" | "set_password" | "delete", payload: UserMutation = {}):
    Promise<{ users?: ConvayProfile[]; user?: ConvayProfile; ok?: boolean }> {
    const session = await validSession();
    if (!session) throw new Error("Session expired. Please sign in again.");
    const res = await fetch(URL + "/functions/v1/convay-users", {
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