import { convayAuth } from "../supabase/convayAuth";

export type CompanyLifecycle = "provisioning" | "active" | "suspended" | "offboarded";
export type CompanySummary = {
  id: string; display_name: string; lifecycle_state: CompanyLifecycle;
  created_at: string; updated_at: string;
  active_member_count: number; published_template_count: number;
};
export type CompanyMember = {
  user_id: string; membership_role: "member" | "tenant_admin";
  membership_state: "active" | "suspended" | "revoked";
  revision: number; changed_at: string; revoked_at: string | null;
  display_name: string; email: string; account_status: string;
};
export type CompanyTemplateSummary = {
  id: string; title: string; template_key: string;
  current_revision: number; published_revision: number | null; updated_at: string;
};
export type CompanyAuditEvent = {
  id: number; action: string; actor_id: string; target_user_id: string | null;
  occurred_at: string; request_id: string;
};
export type CompanyProfile = {
  company: Pick<CompanySummary, "id"|"display_name"|"lifecycle_state"|"created_at"|"updated_at">;
  members: CompanyMember[]; templates: CompanyTemplateSummary[]; events: CompanyAuditEvent[];
  tenant_isolation_certified: false; workspace_activation_enabled: false;
  subscription_activated: false; subscription_note: string;
};
export type CompanyDirectory = {
  companies: CompanySummary[];
  tenant_isolation_certified: false;
  workspace_activation_enabled: false;
};
export type CompanyProvisioningReceipt = {
  tenant_id: string; lifecycle_state: "provisioning"; action: "create";
  request_id: string; audit_event_id: number; tenant_active: false;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validUuid = (id: unknown): id is string => typeof id === "string" && UUID.test(id);
const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

async function adminRpc<T>(rpcName: string, body: Record<string, unknown>): Promise<T> {
  const response = await convayAuth.authenticatedRequest("/rest/v1/rpc/"+rpcName,{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = obj(payload) && typeof payload.message === "string" ? payload.message :
      "Company administration request failed";
    throw new Error(message);
  }
  if (!obj(payload)) throw new Error("Invalid company SQL response");
  return payload as T;
}

export function assertCompanyDirectory(raw: unknown): CompanyDirectory {
  if (!obj(raw) || !Array.isArray(raw.companies)
    || raw.tenant_isolation_certified !== false
    || raw.workspace_activation_enabled !== false) {
    throw new Error("Company SQL directory could not be verified");
  }
  const ids = new Set<string>();
  for (const item of raw.companies) {
    if (!obj(item) || !validUuid(item.id) || ids.has(item.id)
      || typeof item.display_name !== "string" || item.display_name.trim().length < 3
      || !["provisioning","active","suspended","offboarded"].includes(String(item.lifecycle_state))
      || typeof item.active_member_count !== "number" || !Number.isSafeInteger(item.active_member_count) || item.active_member_count < 0
      || typeof item.published_template_count !== "number" || !Number.isSafeInteger(item.published_template_count) || item.published_template_count < 0) {
      throw new Error("Invalid or duplicated company in SQL directory");
    }
    ids.add(item.id);
  }
  return raw as CompanyDirectory;
}

export function assertCompanyProfile(raw: unknown, companyId: string): CompanyProfile {
  if (!validUuid(companyId) || !obj(raw) || !obj(raw.company)
    || raw.company.id !== companyId
    || raw.tenant_isolation_certified !== false
    || raw.workspace_activation_enabled !== false
    || raw.subscription_activated !== false
    || !Array.isArray(raw.members) || !Array.isArray(raw.templates)
    || !Array.isArray(raw.events)) {
    throw new Error("Company SQL readback did not match the requested company");
  }
  const ids = new Set<string>();
  for (const member of raw.members) {
    if (!obj(member) || !validUuid(member.user_id) || ids.has(member.user_id)
      || !["member","tenant_admin"].includes(String(member.membership_role))
      || !["active","suspended","revoked"].includes(String(member.membership_state))) {
      throw new Error("Company SQL returned invalid member scope");
    }
    ids.add(member.user_id);
  }
  return raw as CompanyProfile;
}

export async function listCompanies(): Promise<CompanyDirectory> {
  return assertCompanyDirectory(await adminRpc("convay_company_directory",{
    p_action:"list",p_tenant_id:null,
  }));
}
export async function readCompany(companyId: string): Promise<CompanyProfile> {
  if (!validUuid(companyId)) throw new Error("Invalid company identifier");
  return assertCompanyProfile(await adminRpc("convay_company_directory",{
    p_action:"read",p_tenant_id:companyId,
  }),companyId);
}
export function assertProvisioningReadback(
  raw: CompanyProvisioningReceipt,profile: CompanyProfile,name:string,requestId:string,
): CompanyProfile {
  if (!raw || !validUuid(raw.tenant_id)
    || raw.action !== "create" || raw.request_id !== requestId
    || raw.lifecycle_state !== "provisioning" || raw.tenant_active !== false
    || !Number.isSafeInteger(raw.audit_event_id) || raw.audit_event_id < 1
    || profile.company.id !== raw.tenant_id
    || profile.company.lifecycle_state !== "provisioning"
    || profile.company.display_name !== name.trim()
    || profile.workspace_activation_enabled !== false
    || !profile.events.some(e => e.id === raw.audit_event_id
      && e.request_id === requestId && e.action === "create")) {
    throw new Error("Company provisioning not confirmed by SQL readback");
  }
  return profile;
}
export async function createProvisioningCompany(name:string,requestId:string):Promise<CompanyProfile> {
  const trimmed=name.trim();
  if (trimmed.length < 3 || trimmed.length > 160 || !validUuid(requestId)) {
    throw new Error("Enter a company name (3–160 characters)");
  }
  const receipt=await adminRpc<CompanyProvisioningReceipt>("convay_tenant_admin",{
    p_action:"create",p_request_id:requestId,p_tenant_id:null,
    p_display_name:trimmed,p_member_user_id:null,p_member_role:null,
  });
  const actual=await readCompany(receipt.tenant_id);
  return assertProvisioningReadback(receipt,actual,trimmed,requestId);
}
