/** DC-25: authenticated HTTP transport for the existing fail-closed ZIP pipeline. */
import { prepareAuthorizedBoardPackDownload, type AuthorizedBoardPackDownload } from "./boardPackDownloadGateway.ts";
import { validatePinnedOriginal, type OriginalContentIdentity } from "../../services/repositories/documentOriginalIdentity.ts";

type AuthenticatedRequest = (path: string, init?: RequestInit) => Promise<Response>;

/** The requester must bind the active actor, never a service-role key. */
export async function prepareServerBoardPackDownload(
  packId: string, frozenRevision: number, request: AuthenticatedRequest,
  assertCurrent: () => void,
): Promise<AuthorizedBoardPackDownload> {
  if (!Number.isSafeInteger(frozenRevision) || frozenRevision < 1) {
    throw new Error("Refresh the published board pack before downloading.");
  }
  const checkedRequest = async (path: string, init?: RequestInit): Promise<Response> => {
    assertCurrent();
    const response = await request(path, init);
    assertCurrent();
    if (!response.ok) throw new Error("The authorized board-pack request failed.");
    return response;
  };
  const rpc = async (name: string, body: Record<string, string>): Promise<unknown> => {
    const response = await checkedRequest(`/rest/v1/rpc/${name}`, {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body),
    });
    const result: unknown = await response.json();
    assertCurrent();
    return result;
  };
  const result = await prepareAuthorizedBoardPackDownload(packId, {
    requestManifest: async id => {
      const result = await rpc("convay_board_pack_download_manifest", {p_pack:id});
      if (typeof result !== "object" || result === null ||
          (result as Record<string,unknown>).frozenRevision !== frozenRevision) {
        throw new Error("The published board-pack revision changed. Refresh before downloading.");
      }
      return result;
    },
    loadOriginal: async (documentId, versionId) => {
      const query = new URLSearchParams({
        id:"eq.file:" + documentId + ":" + versionId,
        select:"id,document_id,version_id,content_type,storage_path,size", limit:"2",
      });
      const response = await checkedRequest("/rest/v1/convay_document_content?" + query.toString());
      const records: unknown = await response.json();
      assertCurrent();
      if (!Array.isArray(records) || records.length !== 1 || !records[0] || typeof records[0] !== "object") {
        throw new Error("The selected historical original is unavailable or ambiguous.");
      }
      const record = records[0] as OriginalContentIdentity;
      validatePinnedOriginal(record, documentId, versionId);
      const original = await checkedRequest("/storage/v1/object/authenticated/convay-documents/" + record.storage_path);
      const blob = await original.blob();
      assertCurrent();
      if (blob.size !== record.size) throw new Error("The historical original byte count changed.");
      return blob;
    },
    confirmReceipt: (id, manifestId) => rpc("convay_board_pack_download_receipt", {p_pack:id,p_manifest:manifestId}),
  });
  assertCurrent();
  return result;
}
