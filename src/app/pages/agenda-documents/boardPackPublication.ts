/** DC-23: authoritative publication receipt. A generic edit cannot publish a pack. */
export interface PublicationIntent { recordId: string; revision: number; version: string }
export interface PublicationReceipt { recordId: string; revision: number; approvalStatus: "Published"; manifestId: string; version: string }
const validUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function publishBoardPack(
  intent: PublicationIntent, request: (path: string, init: RequestInit) => Promise<Response>, assertCurrent: () => void,
): Promise<PublicationReceipt> {
  if (!intent.recordId || !intent.version || !Number.isSafeInteger(intent.revision) || intent.revision < 1 || intent.revision >= Number.MAX_SAFE_INTEGER) {
    throw new Error("The approved board-pack revision is missing. Refresh before publishing.");
  }
  assertCurrent();
  const response = await request("/rest/v1/rpc/convay_publish_board_pack", {
    method: "POST", headers: {"Content-Type":"application/json"},
    body: JSON.stringify({p_pack:intent.recordId,p_revision:intent.revision}),
  });
  assertCurrent();
  if (!response.ok) throw new Error("Board-pack publication was not confirmed. Retry the same request or refresh.");
  const result: unknown = await response.json();
  assertCurrent();
  if (typeof result !== "object" || result === null || Array.isArray(result)) throw new Error("Invalid publication receipt.");
  const row = result as Record<string,unknown>;
  if (row.recordId !== intent.recordId || row.revision !== intent.revision+1 || row.approvalStatus !== "Published" ||
      row.version !== intent.version || typeof row.manifestId !== "string" || !validUuid.test(row.manifestId)) {
    throw new Error("Publication was not confirmed for this exact approved version. Retry the same request or refresh.");
  }
  return row as unknown as PublicationReceipt;
}
