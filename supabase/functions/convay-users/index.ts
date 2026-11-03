import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const response = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers });

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!url || !serviceKey) throw new Error("Supabase server configuration missing");
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Payload = {
  action?: string;
  user_id?: string;
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  status?: string;
  phone?: string;
  user_type?: string;
  employee_id?: string;
};

function failOnBadInput(p: Payload, creating = false): string | null {
  if (p.name !== undefined && (!p.name.trim() || p.name.trim().length > 120)) return "Name must be 1–120 characters";
  if (p.email !== undefined && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()) || p.email.length > 254)) return "A valid email is required";
  if (p.phone !== undefined && p.phone.length > 40) return "Phone is too long";
  if (p.employee_id !== undefined && p.employee_id.length > 80) return "Employee ID is too long";
  if (p.user_type !== undefined && p.user_type.length > 80) return "User type is too long";
  if (p.username !== undefined && (!/^[A-Za-z0-9._-]{2,80}$/.test(p.username))) return "Username must contain 2–80 letters, numbers, . _ or -";
  if (p.password !== undefined && p.password.length < 6) return "Password must contain at least 6 characters";
  if (creating && (!p.name?.trim() || !p.email?.trim() || !p.password)) return "Name, email and password are required";
  return null;
}

async function audit(actor: string, subject: string | null, action: string) {
  const { error } = await admin.from("user_admin_audit").insert({
    actor_id: actor, subject_id: subject, action,
  });
  if (error) console.error("Audit write failed", error.message);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return response(405, { error: "Method not allowed" });
  try {
    const bearer = req.headers.get("Authorization");
    const match = bearer?.match(/^Bearer\s+(.+)$/i);
    if (!match) return response(401, { error: "Sign in required" });
    const { data: auth, error: authError } = await admin.auth.getUser(match[1]);
    if (authError || !auth?.user) return response(401, { error: "Invalid session" });

    // Only the single actual Super Admin in the authoritative database can run this function.
    const { data: actor, error: actorError } = await admin
      .from("user_profiles").select("account_role,account_status")
      .eq("user_id", auth.user.id).maybeSingle();
    if (actorError || !actor || actor.account_role !== "super_admin" || actor.account_status !== "active") {
      return response(403, { error: "Super Admin access required" });
    }

    const raw = await req.text();
    if (raw.length > 10000) return response(413, { error: "Request too large" });
    let body: Payload;
    try { body = JSON.parse(raw) as Payload; }
    catch { return response(400, { error: "Invalid JSON" }); }
    const action = body.action ?? "";
    const fields = "user_id,username,display_name,email,account_role,account_status,phone,user_type,employee_id,created_at,updated_at";
    if (action === "list") {
      const { data, error } = await admin.from("user_profiles")
        .select(fields).order("created_at", { ascending: false });
      if (error) return response(500, { error: "Unable to load users" });
      return response(200, { users: data });
    }
    if (action === "create") {
      const problem = failOnBadInput(body, true);
      if (problem) return response(400, { error: problem });
      const name = body.name!.trim(), email = body.email!.trim().toLowerCase();
      const username = (body.username?.trim() || email.split("@")[0]).toLowerCase();
      if (!/^[a-z0-9._-]{2,80}$/.test(username)) return response(400, { error: "Choose a valid unique username" });
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password: body.password!, email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (createError || !created.user) return response(409, { error: createError?.message || "User creation failed" });

      const userId = created.user.id;
      const { data: user, error: insertError } = await admin.from("user_profiles")
        .insert({
          user_id: userId, username, display_name: name, email,
          account_role: "user", account_status: "active",
          phone: body.phone?.trim() || null, user_type: body.user_type || "Internal Employee",
          employee_id: body.employee_id?.trim() || null,
        }).select(fields).single();
      if (insertError) {
        await admin.auth.admin.deleteUser(userId);
        return response(409, { error: insertError.code === "23505" ? "Email or username already exists" : "Unable to save user profile" });
      }
      await audit(auth.user.id, userId, "user_created");
      return response(201, { user });
    }
    if (!["update","set_status","set_password","delete"].includes(action)) {
      return response(400, { error: "Unsupported action" });
    }
    if (!body.user_id || !/^[0-9a-fA-F-]{36}$/.test(body.user_id)) {
      return response(400, { error: "Valid user ID required" });
    }
    const { data: target, error: targetError } = await admin.from("user_profiles")
      .select(fields).eq("user_id", body.user_id).maybeSingle();
    if (targetError || !target) return response(404, { error: "User not found" });
    if (target.account_role === "super_admin" || body.user_id === auth.user.id) {
      return response(403, { error: "The sole Super Admin account cannot be changed here" });
    }

    if (action === "update") {
      const issue = failOnBadInput(body);
      if (issue) return response(400, { error: issue });
      const changes: Record<string, string | null> = {};
      if (body.name !== undefined) changes.display_name = body.name.trim();
      if (body.phone !== undefined) changes.phone = body.phone.trim() || null;
      if (body.employee_id !== undefined) changes.employee_id = body.employee_id.trim() || null;
      if (body.user_type !== undefined) changes.user_type = body.user_type.trim() || "Internal Employee";
      if (body.username !== undefined) changes.username = body.username.trim().toLowerCase();
      if (body.email !== undefined) {
        const email = body.email.trim().toLowerCase();
        const { error } = await admin.auth.admin.updateUserById(body.user_id, { email, email_confirm: true });
        if (error) return response(409, { error: error.message });
        changes.email = email;
      }
      const { data: user, error } = await admin.from("user_profiles")
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq("user_id", body.user_id).select(fields).single();
      if (error) return response(409, { error: error.code === "23505" ? "Email or username already exists" : "Unable to update user" });
      await audit(auth.user.id, body.user_id, "user_updated");
      return response(200, { user });
    }

    if (action === "set_password") {
      if (!body.password || body.password.length < 6) return response(400, { error: "Password must contain at least 6 characters" });
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
      if (error) return response(400, { error: error.message });
      await audit(auth.user.id, body.user_id, "user_password_changed");
      return response(200, { ok: true });
    }

    if (action === "set_status") {
      if (!["active","inactive","suspended"].includes(body.status ?? "")) return response(400, { error: "Invalid status" });
      const active = body.status === "active";
      const { error: authError } = await admin.auth.admin.updateUserById(
        body.user_id, { ban_duration: active ? "none" : "876000h" },
      );
      if (authError) return response(500, { error: "Unable to update account access" });
      const { data: user, error } = await admin.from("user_profiles")
        .update({ account_status: body.status, updated_at: new Date().toISOString() })
        .eq("user_id", body.user_id).select(fields).single();
      if (error) return response(500, { error: "Unable to update account status" });
      await audit(auth.user.id, body.user_id, active ? "user_activated" : "user_disabled");
      return response(200, { user });
    }

    // Remove both profile and identity, preserving the independent audit trail.
    const { error: profileDeleteError } = await admin.from("user_profiles")
      .delete().eq("user_id", body.user_id);
    if (profileDeleteError) return response(500, { error: "Unable to delete user profile" });
    const { error: deleteError } = await admin.auth.admin.deleteUser(body.user_id);
    if (deleteError) {
      await admin.from("user_profiles").insert(target);
      return response(500, { error: "Unable to delete authentication user" });
    }
    await audit(auth.user.id, body.user_id, "user_deleted");
    return response(200, { ok: true });
  } catch (error) {
    console.error("Convay user administration failure", error instanceof Error ? error.message : error);
    return response(500, { error: "User management request failed" });
  }
});