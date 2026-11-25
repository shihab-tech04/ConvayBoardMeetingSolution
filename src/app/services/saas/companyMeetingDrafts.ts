import { convayAuth } from "../supabase/convayAuth";
import {
  readManagedTemplate, validateMeetingTemplateDefinition, type MeetingTemplateVersion,
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
  updated_at: string;
  edit_revision: number;
  wizard_step_id?: string | null;
}
export interface StagedCompanyDraft {
  draft_id: string;
  title: string;
  template_id: string;
  template_revision: number;
  definition: MeetingTemplateVersion["definition"];
  values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edit_revision: number;
  wizard_step_id?: string | null;
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
  wizard_step_id?: string;
}
export interface StagedDraftProgress { stepId: string; partial: boolean }
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object=(x:unknown):x is Record<string,unknown> =>
  typeof x==="object" && x!==null && !Array.isArray(x);

function canon(value:unknown):string {
  if (Array.isArray(value)) return "["+value.map(canon).join(",")+"]";
  if (object(value)) return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canon(value[k])).join(",")+"}";
  return JSON.stringify(value)??"null";
}
async function draftRpc(action:"list"|"read"|"create"|"update"|"discard",tenantId:string,payload:Record<string,unknown>) {
  if (!UUID.test(tenantId)) throw new Error("A valid company is required");
  const rpc=action==="create"?"convay_company_meeting_drafts":"convay_company_draft_lifecycle";
  const response=await convayAuth.authenticatedRequest("/rest/v1/rpc/"+rpc,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({p_action:action,p_tenant_id:tenantId,p_payload:payload}),
  });
  const data:unknown=await response.json().catch(()=>null);
  if (!response.ok) {
    const message=object(data)&&typeof data.message==="string"
      ? data.message : "Unable to verify company meeting draft in SQL";
    const error=new Error(message);
    // A structured SQL validation/authorization rejection of the CREATE itself
    // is definitive. A lost ACK or any later readback failure is not.
    if((action==="create"||action==="update") && response.status>=400 && response.status<500
      && object(data) && typeof data.code==="string"
      && ["22023","22P02","23514","42501","P0002","40001","23505"].includes(data.code)) {
      error.name=action==="create"?"StagedDraftCreateRejected":"StagedDraftUpdateRejected";
    }
    throw error;
  }
  if (!object(data)||data.tenant_id!==tenantId||data.meeting_activation_enabled!==false) {
    throw new Error("Company draft SQL scope/activation did not match");
  }
  return data;
}

async function progressPayload(tenantId:string,definition:MeetingTemplateVersion["definition"],action:"create"|"update",progress?:StagedDraftProgress) {
  if(!progress)return {};
  if(typeof progress.partial!=="boolean" || !definition.steps.some(step=>step.id===progress.stepId))
    throw new Error("Invalid saved wizard step");
  // The old RPC ignores unknown payload fields. Do not send a progress write
  // until the authoritative SQL explicitly advertises the paired contract.
  const capability=await draftRpc("list",tenantId,{});
  if(capability.draft_progress_supported!==true){
    const error=new Error("Wizard progress saving requires the verified SQL release");
    error.name=action==="create"?"StagedDraftCreateRejected":"StagedDraftUpdateRejected";
    throw error;
  }
  return {wizard_step_id:progress.stepId,partial_save:progress.partial};
}
export async function listStagedCompanyDrafts(tenantId:string):Promise<StagedCompanyDraftSummary[]> {
  const data=await draftRpc("list",tenantId,{});
  if (!Array.isArray(data.drafts)
    || data.drafts.some(row=>!object(row)||typeof row.draft_id!=="string"
      || !/^DRAFT-[A-F0-9]{20}$/.test(row.draft_id)
      || row.status!=="Staged Draft"
      || typeof row.title!=="string" || !UUID.test(String(row.template_id))
      || !Number.isSafeInteger(row.template_revision)||Number(row.template_revision)<1
      || !Number.isSafeInteger(row.edit_revision)||Number(row.edit_revision)<1
      || typeof row.updated_at!=="string")) {
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
    || !Number.isSafeInteger(draft.template_revision)||Number(draft.template_revision)<1
    || typeof draft.title!=="string" || typeof draft.created_at!=="string"
    || !object(draft.definition)||!Array.isArray(draft.definition.steps)
    || !object(draft.values)
    || !Number.isSafeInteger(draft.edit_revision)||Number(draft.edit_revision)<1
    || typeof draft.updated_at!=="string") {
    throw new Error("Company meeting draft SQL readback invalid");
  }
  const definition=draft.definition as unknown as MeetingTemplateVersion["definition"];
  validateMeetingTemplateDefinition(definition);
  if(draft.wizard_step_id!=null && (typeof draft.wizard_step_id!=="string" || !definition.steps.some(step=>step.id===draft.wizard_step_id)))
    throw new Error("Saved wizard step does not match the immutable SQL definition");
  return draft as unknown as StagedCompanyDraft;
}
export async function saveStagedCompanyDraft(
  tenantId:string,template:MeetingTemplateVersion,title:string,
  values:Record<string,unknown>,requestId:string,progress?:StagedDraftProgress,
):Promise<{receipt:StagedCompanyDraftReceipt;draft:StagedCompanyDraft}> {
  if (!UUID.test(tenantId)||!UUID.test(requestId)||!UUID.test(template.id)
    || template.tenant_id!==tenantId || template.state!=="published"
    || template.published_revision!==template.revision
    || !Number.isSafeInteger(template.revision)||template.revision<1
    || title.trim().length<3||title.trim().length>160||!object(values)) {
    const error=new Error("A published company template, valid title and request ID are required");
    error.name="StagedDraftCreateRejected";
    throw error;
  }
  const step=await progressPayload(tenantId,template.definition,"create",progress);
  const response=await draftRpc("create",tenantId,{
    request_id:requestId,template_id:template.id,
    template_revision:template.revision,meeting_title:title.trim(),values,...step,
  });
  if (!/^DRAFT-[A-F0-9]{20}$/.test(String(response.draft_id))
    || response.template_id!==template.id
    || response.template_revision!==template.revision
    || response.request_id!==requestId||response.status!=="Staged Draft"
    || (progress!==undefined && response.wizard_step_id!==progress.stepId)) {
    throw new Error("Company draft creation SQL receipt invalid");
  }
  const draft=await readStagedCompanyDraft(tenantId,String(response.draft_id));
  if (draft.template_id!==template.id||draft.template_revision!==template.revision
    || draft.title!==title.trim()
    || canon(draft.definition)!==canon(template.definition)
    || canon(draft.values)!==canon(values)
    || (progress!==undefined && draft.wizard_step_id!==progress.stepId)) {
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


export interface StagedCompanyDraftTransitionReceipt {
  tenant_id:string;
  draft_id:string;
  template_id:string;
  template_revision:number;
  request_id:string;
  action:"update"|"discard";
  edit_revision:number;
  status:"Staged Draft"|"Discarded";
  audit_event_id:number;
  meeting_activation_enabled:false;
  wizard_step_id?: string;
}
const draftIdValid=(id:string)=>/^DRAFT-[A-F0-9]{20}$/.test(id);
function assertDraftTransitionReceipt(
  data:Record<string,unknown>,action:"update"|"discard",tenantId:string,
  previous:Pick<StagedCompanyDraft,"draft_id"|"template_id"|"template_revision"|"edit_revision">,
  requestId:string,
):StagedCompanyDraftTransitionReceipt {
  if(data.tenant_id!==tenantId || data.draft_id!==previous.draft_id
     || data.template_id!==previous.template_id || data.template_revision!==previous.template_revision
     || data.request_id!==requestId || data.action!==action
     || data.edit_revision!==(action==="update"?previous.edit_revision+1:previous.edit_revision)
     || data.status!==(action==="update"?"Staged Draft":"Discarded")
     || data.meeting_activation_enabled!==false
     || !Number.isSafeInteger(data.audit_event_id) || Number(data.audit_event_id)<1) {
    throw new Error("Company draft lifecycle was not verified by authoritative SQL");
  }
  return data as unknown as StagedCompanyDraftTransitionReceipt;
}
export async function updateStagedCompanyDraft(
  tenantId:string,previous:StagedCompanyDraft,title:string,values:Record<string,unknown>,
  requestId:string,progress?:StagedDraftProgress,
):Promise<{receipt:StagedCompanyDraftTransitionReceipt;draft:StagedCompanyDraft}> {
  if(!UUID.test(tenantId)||!UUID.test(requestId)||!draftIdValid(previous.draft_id)
    || !UUID.test(previous.template_id)||!Number.isSafeInteger(previous.template_revision)
    || !Number.isSafeInteger(previous.edit_revision)||previous.edit_revision<1
    || !object(previous.definition)||!object(values)
    || title.trim().length<3||title.trim().length>160){
    throw new Error("A verified company draft, title, and new request ID are required");
  }
  const step=await progressPayload(tenantId,previous.definition,"update",progress);
  const response=await draftRpc("update",tenantId,{
    draft_id:previous.draft_id,expected_revision:previous.edit_revision,request_id:requestId,
    meeting_title:title.trim(),values,...step,
  });
  const receipt=assertDraftTransitionReceipt(response,"update",tenantId,previous,requestId);
  if(progress!==undefined && receipt.wizard_step_id!==progress.stepId)
    throw new Error("Company draft progress receipt did not match the requested step");
  const draft=await readStagedCompanyDraft(tenantId,previous.draft_id);
  if(draft.edit_revision!==previous.edit_revision+1
     || draft.title!==title.trim()
     || draft.template_id!==previous.template_id
     || draft.template_revision!==previous.template_revision
     || canon(draft.definition)!==canon(previous.definition)
     || canon(draft.values)!==canon(values)
     || (progress!==undefined && draft.wizard_step_id!==progress.stepId)) {
    throw new Error("Revised company draft did not match SQL versioned readback");
  }
  return {receipt,draft};
}
export async function discardStagedCompanyDraft(
  tenantId:string,previous:StagedCompanyDraft,requestId:string,
):Promise<StagedCompanyDraftTransitionReceipt> {
  if(!UUID.test(tenantId)||!UUID.test(requestId)||!draftIdValid(previous.draft_id)
    || !Number.isSafeInteger(previous.edit_revision)||previous.edit_revision<1) {
    throw new Error("A verified company draft and request ID are required");
  }
  const response=await draftRpc("discard",tenantId,{
    draft_id:previous.draft_id,expected_revision:previous.edit_revision,request_id:requestId,
  });
  const receipt=assertDraftTransitionReceipt(response,"discard",tenantId,previous,requestId);
  const remaining=await listStagedCompanyDrafts(tenantId);
  if(remaining.some(row=>row.draft_id===previous.draft_id)){
    throw new Error("Discarded draft still appears in SQL; refresh before retrying");
  }
  return receipt;
}
