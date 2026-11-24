import { convayAuth } from "../supabase/convayAuth";
import {
  readManagedTemplate, type MeetingTemplateVersion,
} from "./meetingTemplateControl";

/**
 * Pre-activation company meeting configuration only.
 * This service NEVER creates bms.meetings, schedules, authorizes LiveKit,
 * or grants a paid entitlement. A separate certified release is required.
 */
export interface StagedCompanyDraftSummary {
  draft_id: string;
  title: string;
  template_id: string;
  template_revision: number;
  status: "Staged Draft";
  created_at: string;
}
export interface StagedCompanyDraft {
  draft_id: string;
  title: string;
  template_id: string;
  template_revision: number;
  definition: MeetingTemplateVersion["definition"];
  values: Record<string, unknown>;
  created_at: string;
  status: "Staged Draft";
}
export interface StagedCompanyDraftReceipt {
  tenant_id: string;
  draft_id: string;
  template_id: string;
  template_revision: number;
  request_id: string;
  status: "Staged Draft";
  meeting_activation_enabled: false;
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object=(x:unknown):x is Record<string,unknown> =>
  typeof x==="object" && x!==null && !Array.isArray(x);

function canon(value:unknown):string {
  if (Array.isArray(value)) return "["+value.map(canon).join(",")+"]";
  if (object(value)) return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canon(value[k])).join(",")+"}";
  return JSON.stringify(value)??"null";
}
async function draftRpc(action:"list"|"read"|"create",tenantId:string,payload:Record<string,unknown>) {
  if (!UUID.test(tenantId)) throw new Error("A valid company is required");
  const response=await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_company_meeting_drafts",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({p_action:action,p_tenant_id:tenantId,p_payload:payload}),
  });
  const data:unknown=await response.json().catch(()=>null);
  if (!response.ok) {
    const message=object(data)&&typeof data.message==="string"
      ? data.message : "Unable to verify company meeting draft in SQL";
    throw new Error(message);
  }
  if (!object(data)||data.tenant_id!==tenantId||data.meeting_activation_enabled!==false) {
    throw new Error("Company draft SQL scope/activation did not match");
  }
  return data;
}

export async function listStagedCompanyDrafts(tenantId:string):Promise<StagedCompanyDraftSummary[]> {
  const data=await draftRpc("list",tenantId,{});
  if (!Array.isArray(data.drafts)
    || data.drafts.some(row=>!object(row)||typeof row.draft_id!=="string"
      || !/^DRAFT-[A-F0-9]{20}$/.test(row.draft_id)
      || row.status!=="Staged Draft"
      || typeof row.title!=="string" || !UUID.test(String(row.template_id))
      || !Number.isSafeInteger(row.template_revision)||Number(row.template_revision)<1)) {
    throw new Error("Company draft directory SQL readback invalid");
  }
  return data.drafts as StagedCompanyDraftSummary[];
}
export async function readStagedCompanyDraft(tenantId:string,draftId:string):Promise<StagedCompanyDraft> {
  if (!/^DRAFT-[A-F0-9]{20}$/.test(draftId)) throw new Error("Invalid draft ID");
  const data=await draftRpc("read",tenantId,{draft_id:draftId});
  const draft=data.draft;
  if (!object(draft)||draft.draft_id!==draftId
    || draft.status!=="Staged Draft"
    || !UUID.test(String(draft.template_id))
    || !Number.isSafeInteger(draft.template_revision)
    || !object(draft.definition)||!Array.isArray(draft.definition.steps)
    || !object(draft.values)) {
    throw new Error("Company meeting draft SQL readback invalid");
  }
  return draft as unknown as StagedCompanyDraft;
}
export async function saveStagedCompanyDraft(
  tenantId:string,template:MeetingTemplateVersion,title:string,
  values:Record<string,unknown>,requestId:string,
):Promise<{receipt:StagedCompanyDraftReceipt;draft:StagedCompanyDraft}> {
  if (!UUID.test(tenantId)||!UUID.test(requestId)||!UUID.test(template.id)
    || template.tenant_id!==tenantId || template.state!=="published"
    || template.published_revision!==template.revision
    || !Number.isSafeInteger(template.revision)||template.revision<1
    || title.trim().length<3||title.trim().length>160||!object(values)) {
    throw new Error("A published company template, valid title and request ID are required");
  }
  const response=await draftRpc("create",tenantId,{
    request_id:requestId,template_id:template.id,
    template_revision:template.revision,meeting_title:title.trim(),values,
  });
  if (!/^DRAFT-[A-F0-9]{20}$/.test(String(response.draft_id))
    || response.template_id!==template.id
    || response.template_revision!==template.revision
    || response.request_id!==requestId||response.status!=="Staged Draft") {
    throw new Error("Company draft creation SQL receipt invalid");
  }
  const draft=await readStagedCompanyDraft(tenantId,String(response.draft_id));
  if (draft.template_id!==template.id||draft.template_revision!==template.revision
    || draft.title!==title.trim()
    || canon(draft.definition)!==canon(template.definition)
    || canon(draft.values)!==canon(values)) {
    throw new Error("Company draft content did not match immutable SQL template readback");
  }
  // Check the server's versioned definition again before treating the save as
  // accepted. It cannot be altered by the browser's field configuration.
  const exact=await readManagedTemplate(template.id,template.revision);
  if (exact.tenant_id!==tenantId||exact.state!=="published"
    || canon(exact.definition)!==canon(draft.definition)) {
    throw new Error("Published template SQL snapshot mismatch");
  }
  return {receipt:response as unknown as StagedCompanyDraftReceipt,draft};
}
