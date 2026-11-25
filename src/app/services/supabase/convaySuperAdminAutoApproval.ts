import { convayAuth } from "./convayAuth";

/**
 * Root-admin authoring policy: status is approved ONLY by authoritative SQL.
 * This helper is never an authorization boundary, an optimistic UI write,
 * document publishing, a board vote, or a minutes signature.
 */
export type SuperAdminAutoApprovalKind = "agenda" | "document" | "minutes";
export interface SuperAdminAutoApprovalReceipt {
  agenda_id?: string;
  document_id?: string;
  minutes_id?: string;
  status: "Approved";
  auto_approved: true;
  items_approved?: number;
  version_id?: string;
  signed?: false;
  idempotent?: true;
  actor_id?: string;
}
const fn: Record<SuperAdminAutoApprovalKind,string> = {
  agenda:"convay_superadmin_finalize_agenda",
  document:"convay_superadmin_finalize_document",
  minutes:"convay_superadmin_finalize_minutes",
};
const idKey: Record<SuperAdminAutoApprovalKind,string> = {
  agenda:"agenda_id",document:"document_id",minutes:"minutes_id",
};
const arg: Record<SuperAdminAutoApprovalKind,string> = {
  agenda:"p_agenda_id",document:"p_document_id",minutes:"p_minutes_id",
};
function isRecord(value:unknown):value is Record<string,unknown> {
  return typeof value==="object" && value!==null && !Array.isArray(value);
}

export async function finalizeOwnSuperAdminContent(
  kind:SuperAdminAutoApprovalKind,id:string,
):Promise<SuperAdminAutoApprovalReceipt> {
  if (!/^[A-Za-z0-9-]{3,180}$/.test(id)) throw new Error("Invalid content identity");
  const result=await convayAuth.authenticatedRequest("/rest/v1/rpc/"+fn[kind],{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({[arg[kind]]:id}),
  });
  const data:unknown=await result.json().catch(()=>null);
  if (!result.ok) {
    const reason=isRecord(data)&&typeof data.message==="string"
      ? data.message : "Automatic approval was not confirmed by SQL; the saved content remains in review.";
    throw new Error(reason);
  }
  if (!isRecord(data)||data[idKey[kind]]!==id||data.status!=="Approved"
      ||data.auto_approved!==true
      ||(kind==="agenda" && data.idempotent!==true
        && (!Number.isSafeInteger(data.items_approved)||Number(data.items_approved)<1))
      ||(kind==="minutes" && data.signed!==false && data.idempotent!==true)
      ||(kind==="document" && data.idempotent!==true && typeof data.version_id!=="string")) {
    throw new Error("Automatic approval SQL receipt failed verification");
  }
  return data as unknown as SuperAdminAutoApprovalReceipt;
}
