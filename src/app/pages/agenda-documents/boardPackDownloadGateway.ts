/**
 * DC-25 — fail-closed adapter between a server-issued immutable pack manifest
 * and the existing deterministic ZIP composer. This is NOT an entitlement API.
 *
 * IMPORTANT: The production caller MUST implement the two server calls using
 * authenticated endpoints that re-check actor, tenant, meeting membership,
 * publication state, every document/version/object and revocation. Never pass
 * values assembled from client registries as a server manifest or receipt.
 * No UI should enable Download until those endpoints are deployed and tested.
 */
import {
  composeAuthorizedBoardPack,
  safeBoardPackEntryName,
  type AuthorizedBoardPackFile,
} from "../../utils/boardPackZip";

export interface BoardPackManifestFile extends AuthorizedBoardPackFile {
  /** Server-recorded immutable original byte size, never client-provided. */
  sizeBytes: number;
  /** Optional immutable SHA-256 (lowercase hex) when recorded by the server. */
  sha256?: string;
}

export interface BoardPackDownloadManifest {
  packId: string;
  manifestId: string;
  approvalStatus: "Published";
  frozenRevision: number;
  expiresAt: string;
  files: readonly BoardPackManifestFile[];
}

export interface BoardPackDownloadReceipt {
  receiptId: string;
  packId: string;
  manifestId: string;
}

export interface BoardPackDownloadGateway {
  /** Authenticated, server-issued, immutable manifest, NOT a local cache. */
  requestManifest(packId: string): Promise<unknown>;
  /** Fetch exact original under actor/document/version Storage RLS. */
  loadOriginal(documentId: string, versionId: string): Promise<Blob | null>;
  /** Server revalidates manifest + access then persists an actor-bound receipt. */
  confirmReceipt(packId: string, manifestId: string): Promise<unknown>;
  /** Optional deterministic clock only for tests. */
  now?: () => number;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 &&
    value.trim() === value && value.length <= 220 && !/[\u0000-\u001f\u007f]/.test(value);
}

/** An immutable board-pack pin must not resolve to the mutable original-file alias. */
function validFrozenVersionId(value: unknown): value is string {
  return validIdentifier(value) && !/^(?:latest|live)$/i.test(value);
}

function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Board pack download cancelled.", "AbortError");
}

/** Validate untrusted HTTP response shape. Authorization MUST be done by SQL. */
export function parseAuthorizedBoardPackManifest(
  input: unknown, requestedPackId: string, now: number = Date.now(),
): BoardPackDownloadManifest {
  if (!validIdentifier(requestedPackId) || !isRecord(input)) {
    throw new Error("An authorized board pack manifest is required.");
  }
  if (input.packId !== requestedPackId || !validIdentifier(input.manifestId)) {
    throw new Error("The board pack manifest does not match this request.");
  }
  if (input.approvalStatus !== "Published" ||
      !Number.isSafeInteger(input.frozenRevision) || Number(input.frozenRevision) < 1) {
    throw new Error("Only frozen, published board packs can be downloaded.");
  }
  if (typeof input.expiresAt !== "string") {
    throw new Error("The board pack authorization has expired.");
  }
  const expiration = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiration) || expiration <= now) {
    throw new Error("The board pack authorization has expired.");
  }
  if (!Array.isArray(input.files) || input.files.length < 1 || input.files.length > 400) {
    throw new Error("The authorized board pack has no valid document list.");
  }
  const seen = new Set<string>();
  const files: BoardPackManifestFile[] = input.files.map((file: unknown) => {
    if (!isRecord(file) || !validIdentifier(file.documentId) ||
        !validFrozenVersionId(file.versionId) || !validIdentifier(file.fileName)) {
      throw new Error("The board pack contains an invalid document/version.");
    }
    if (!Number.isSafeInteger(file.sizeBytes) || Number(file.sizeBytes) < 0 ||
        Number(file.sizeBytes) > 100 * 1024 * 1024 ||
        (file.sha256 !== undefined &&
         (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(file.sha256)))) {
      throw new Error("The board pack contains invalid original-file integrity metadata.");
    }
    const pair = `${file.documentId}\0${file.versionId}`;
    if (seen.has(pair)) throw new Error("The board pack contains duplicate document versions.");
    seen.add(pair);
    // Defensive filename validation; the ZIP writer also sanitizes and deduplicates.
    safeBoardPackEntryName(file.fileName);
    return {
      documentId: file.documentId, versionId: file.versionId,
      fileName: file.fileName, sizeBytes: file.sizeBytes as number,
      ...(file.sha256 !== undefined ? {sha256: file.sha256 as string} : {}),
    };
  });
  return {
    packId: input.packId as string, manifestId: input.manifestId as string,
    approvalStatus: "Published", frozenRevision: input.frozenRevision as number,
    expiresAt: input.expiresAt, files,
  };
}

function parseConfirmedReceipt(
  input: unknown, packId: string, manifestId: string,
): string {
  if (!isRecord(input) || !validIdentifier(input.receiptId) ||
      input.packId !== packId || input.manifestId !== manifestId) {
    throw new Error("Board pack download receipt was not confirmed by the server.");
  }
  return input.receiptId;
}

export interface AuthorizedBoardPackDownload {
  archive: Blob;
  receiptId: string;
  fileName: string;
}

/**
 * No bytes leave this function until all exact versions are fetched AND the
 * server acknowledges a fresh, actor-bound, reauthorized immutable receipt.
 * An abort or any document denial means no partial download is returned.
 */
export async function prepareAuthorizedBoardPackDownload(
  packId: string,
  gateway: BoardPackDownloadGateway,
  signal?: AbortSignal,
): Promise<AuthorizedBoardPackDownload> {
  if (!validIdentifier(packId)) throw new Error("Select a board pack to download.");
  assertNotCancelled(signal);
  const currentTime = gateway.now ?? Date.now;
  const manifest = parseAuthorizedBoardPackManifest(
    await gateway.requestManifest(packId), packId, currentTime(),
  );
  assertNotCancelled(signal);
  let receiptId: string | null = null;
  const fileIndex = new Map(manifest.files.map(file =>
    [`${file.documentId}\0${file.versionId}`, file] as const));
  const archive = await composeAuthorizedBoardPack(
    manifest.files,
    async (documentId, versionId) => {
      assertNotCancelled(signal);
      if (Date.parse(manifest.expiresAt) <= currentTime()) {
        throw new Error("Board pack authorization expired during download. Try again.");
      }
      const original = await gateway.loadOriginal(documentId, versionId);
      assertNotCancelled(signal);
      if (!original) return null; // The composer fails closed on a missing original.
      const expected = fileIndex.get(`${documentId}\0${versionId}`);
      if (!expected || original.size !== expected.sizeBytes) {
        throw new Error("Board pack original-file size does not match the frozen manifest.");
      }
      if (expected.sha256) {
        // Fail closed if this environment cannot verify a server-issued digest.
        if (!globalThis.crypto?.subtle) {
          throw new Error("Board pack original-file integrity cannot be verified.");
        }
        const digest = new Uint8Array(await globalThis.crypto.subtle.digest(
          "SHA-256", await original.arrayBuffer(),
        ));
        assertNotCancelled(signal);
        const actual = Array.from(digest, byte => byte.toString(16).padStart(2, "0")).join("");
        if (actual !== expected.sha256) {
          throw new Error("Board pack original-file checksum mismatch.");
        }
      }
      return original;
    },
    async () => {
      assertNotCancelled(signal);
      if (Date.parse(manifest.expiresAt) <= currentTime()) {
        throw new Error("Board pack authorization expired before the audit receipt.");
      }
      const receipt = await gateway.confirmReceipt(packId, manifest.manifestId);
      assertNotCancelled(signal);
      receiptId = parseConfirmedReceipt(receipt, packId, manifest.manifestId);
      return receiptId;
    },
  );
  assertNotCancelled(signal);
  if (!receiptId) throw new Error("A server-confirmed download receipt is required.");
  return {
    archive,
    receiptId,
    fileName: safeBoardPackEntryName(`${packId}.zip`),
  };
}
