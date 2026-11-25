import { convayAuth } from "../supabase/convayAuth";

/**
 * MT-CONFIG-01: a tenant-scoped meeting template configuration contract.
 * This API is administrator-only. It must not be used to bypass tenant
 * activation, meeting ownership, approval or LiveKit usage enforcement.
 */
export type MeetingFieldType =
  | "text" | "textarea" | "date" | "datetime" | "number"
  | "select" | "multiselect" | "checkbox" | "file"
  | "participants" | "agenda" | "resolution" | "quorum"
  | "meeting_room" | "duration";

export interface MeetingTemplateField {
  id: string;
  label: string;
  type: MeetingFieldType;
  required?: boolean;
  options?: string[];
}
export interface MeetingTemplateStep {
  id: string;
  title: string;
  fields: MeetingTemplateField[];
}
export interface MeetingTemplateDefinition {
  steps: MeetingTemplateStep[];
  /** Configuration metadata only — not an active approval execution rule. */
  approvals?: Record<string, unknown>;
}
export interface MeetingTemplateDirectoryEntry {
  id: string;
  tenant_id: string | null;
  template_key: string;
  title: string;
  description: string;
  source_template_id: string | null;
  revision: number;
  published_revision: number | null;
  updated_at: string;
}
export interface MeetingTemplateVersion {
  id: string;
  tenant_id: string | null;
  template_key: string;
  title: string;
  description: string;
  source_template_id: string | null;
  revision: number;
  state: "draft" | "published";
  definition: MeetingTemplateDefinition;
  current_revision: number;
  published_revision: number | null;
  published_at: string | null;
}
export interface MeetingTemplateMutationReceipt {
  template_id: string;
  tenant_id: string | null;
  revision: number;
  published_revision: number | null;
  request_id: string;
  action: "create" | "revise" | "publish" | "copy";
  meeting_activation_enabled: false;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID = /^[a-z][a-z0-9_-]{1,63}$/;
const KEY = /^[a-z][a-z0-9_-]{2,63}$/;
const FIELD_TYPES: ReadonlySet<string> = new Set([
  "text", "textarea", "date", "datetime", "number", "select", "multiselect",
  "checkbox", "file", "participants", "agenda", "resolution", "quorum",
  "meeting_room", "duration",
]);

const validUuid = (id: string | null): boolean => id === null || UUID.test(id);

export function validateMeetingTemplateDefinition(definition: MeetingTemplateDefinition): void {
  if (!definition || !Array.isArray(definition.steps)
    || definition.steps.length < 1 || definition.steps.length > 20) {
    throw new Error("A meeting template needs 1–20 ordered steps");
  }
  const seenSteps = new Set<string>();
  for (const step of definition.steps) {
    if (!ID.test(step.id) || seenSteps.has(step.id)
      || step.title.trim().length < 2 || step.title.trim().length > 100
      || !Array.isArray(step.fields) || step.fields.length > 30) {
      throw new Error("Invalid, repeated or oversized meeting step");
    }
    seenSteps.add(step.id);
    const seenFields = new Set<string>();
    for (const field of step.fields) {
      if (!ID.test(field.id) || seenFields.has(field.id)
        || field.label.trim().length < 2 || field.label.trim().length > 100
        || !FIELD_TYPES.has(field.type)
        || (field.required !== undefined && typeof field.required !== "boolean")
        || (["select", "multiselect"].includes(field.type) &&
          (!Array.isArray(field.options) || field.options.length < 1 || field.options.length > 30))) {
        throw new Error("Invalid or repeated meeting field");
      }
      seenFields.add(field.id);
    }
  }
  if (definition.approvals !== undefined &&
      (typeof definition.approvals !== "object" || definition.approvals === null
        || Array.isArray(definition.approvals))) {
    throw new Error("Approvals metadata must be an object");
  }
}

export async function templateAction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const result = await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_meeting_template_manage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ p_action: action, p_payload: payload }),
  });
  const body: unknown = await result.json().catch(() => null);
  if (!result.ok) {
    // PostgREST can return a JSON error, an HTML gateway response, or no body.
    // Do not replace the original authorization failure with a JSON parse error.
    const error = body && typeof body === "object" && !Array.isArray(body)
      && "message" in body && typeof body.message === "string"
      ? body.message : "Meeting template SQL request failed. Refresh and retry.";
    const failure=new Error(error);
    if(["create","revise","publish","copy"].includes(action) && result.status>=400 && result.status<500
      && body && typeof body==="object" && !Array.isArray(body) && "code" in body
      && typeof body.code==="string" && ["22023","22P02","23514","42501","P0002","40001","23505"].includes(body.code)){
      failure.name="TemplateMutationRejected";
    }
    throw failure;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Meeting template SQL response is invalid");
  }
  return body as T;
}

export async function listManagedTemplates(tenantId: string | null) {
  if (!validUuid(tenantId)) throw new Error("Invalid company scope");
  const result = await templateAction<{ templates: MeetingTemplateDirectoryEntry[] }>("list", { tenant_id: tenantId });
  if (!Array.isArray(result.templates)
    || result.templates.some(t => t.tenant_id !== tenantId || !UUID.test(t.id))) {
    throw new Error("SQL template directory scope did not match the requested company");
  }
  return result.templates;
}

export async function readManagedTemplate(templateId: string, revision?: number) {
  if (!UUID.test(templateId) || (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1))) {
    throw new Error("Invalid template identity or revision");
  }
  const result = await templateAction<{ template: MeetingTemplateVersion }>("read", {
    template_id: templateId, ...(revision === undefined ? {} : { revision }),
  });
  if (result.template?.id !== templateId
    || !Number.isSafeInteger(result.template.revision) || result.template.revision < 1
    || (revision !== undefined && result.template.revision !== revision)) {
    throw new Error("Template SQL readback identity was not confirmed");
  }
  return result.template;
}

export function assertTemplateMutationReadback(
  receipt: MeetingTemplateMutationReceipt,
  readback: MeetingTemplateVersion,
  expected: { action: MeetingTemplateMutationReceipt["action"]; request_id: string; tenant_id: string | null },
) {
  if (!receipt || !readback || receipt.template_id !== readback.id
    || receipt.action !== expected.action || receipt.request_id !== expected.request_id
    || receipt.tenant_id !== expected.tenant_id || readback.tenant_id !== expected.tenant_id
    || receipt.revision !== readback.revision
    || !Number.isSafeInteger(receipt.revision) || receipt.revision < 1
    || receipt.meeting_activation_enabled !== false
    || (expected.action === "publish" &&
      (readback.state !== "published" || readback.published_revision !== receipt.revision))
    || (expected.action !== "publish" && readback.state !== "draft")) {
    throw new Error("Template mutation was not confirmed by SQL readback");
  }
  return readback;
}

export async function saveTemplateVersion(
  action: MeetingTemplateMutationReceipt["action"],
  data: Record<string, unknown> & { request_id: string; tenant_id?: string | null; definition?: MeetingTemplateDefinition },
) {
  if (!UUID.test(data.request_id)) throw new Error("An idempotency request ID is required");
  if (typeof data.template_key === "string" && !KEY.test(data.template_key)) {
    throw new Error("Invalid meeting template key");
  }
  if (data.definition !== undefined) validateMeetingTemplateDefinition(data.definition);
  const receipt = await templateAction<MeetingTemplateMutationReceipt>(action, data);
  const after = await readManagedTemplate(receipt.template_id, receipt.revision);
  return assertTemplateMutationReadback(receipt, after, {
    action, request_id: data.request_id, tenant_id: data.tenant_id ?? null,
  });
}
