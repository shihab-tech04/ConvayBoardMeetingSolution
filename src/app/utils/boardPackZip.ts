/**
 * DC-25: deterministic ZIP (stored/no-compression) for server-authorized board-pack files.
 * This utility does NOT establish access rights. Call it only on documents returned by a
 * server-side pack entitlement/manifest RPC and independently authorized by document RLS.
 * No new third-party dependency or browser/network API required.
 */
export interface BoardPackZipEntry { name: string; bytes: Uint8Array }
const MAX_FILES = 400;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const UTF8_FLAG = 0x0800;
const CRC_POLY = 0xedb88320;
const textEncoder = new TextEncoder();

const crcTable = (() => {
  const result = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let i = 0; i < 8; i++) c = (c & 1) ? (CRC_POLY ^ (c >>> 1)) : (c >>> 1);
    result[n] = c >>> 0;
  }
  return result;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const b of bytes) crc = (crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

/** Neutralizes ZIP-slip paths and Windows filename control characters. */
export function safeBoardPackEntryName(input: string): string {
  if (typeof input !== "string") throw new Error("Document file name is missing.");
  const leaf = input.replace(/\\/g, "/").split("/").pop() ?? "";
  const safe = leaf.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "_").replace(/^\.+/, "").trim();
  if (!safe || safe === "." || safe === "..") throw new Error("Invalid document file name.");
  return safe.slice(0, 220);
}

function uniqueName(input: string, used: Set<string>): string {
  const safe = safeBoardPackEntryName(input);
  const at = safe.lastIndexOf(".");
  const base = at > 0 ? safe.slice(0, at) : safe;
  const ext = at > 0 ? safe.slice(at) : "";
  let out = safe;
  let n = 2;
  while (used.has(out.toLocaleLowerCase("en-US"))) {
    out = `${base.slice(0, 180)} (${n++})${ext}`;
    if (n > 10000) throw new Error("Too many duplicate file names.");
  }
  used.add(out.toLocaleLowerCase("en-US"));
  return out;
}

function u16(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff; buf[offset+1] = (value >>> 8) & 0xff;
}
function u32(buf: Uint8Array, offset: number, value: number) {
  buf[offset] = value & 0xff; buf[offset+1] = (value >>> 8) & 0xff;
  buf[offset+2] = (value >>> 16) & 0xff; buf[offset+3] = (value >>> 24) & 0xff;
}

/** Creates a standards-compliant ZIP without third-party code or data descriptors. */
export function createBoardPackZip(entries: readonly BoardPackZipEntry[]): Uint8Array {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > MAX_FILES) {
    throw new Error(`Board pack must contain 1–${MAX_FILES} authorized documents.`);
  }
  const used = new Set<string>();
  const items = entries.map(item => {
    if (!item || !ArrayBuffer.isView(item.bytes) ||
        Object.prototype.toString.call(item.bytes) !== "[object Uint8Array]") {
      throw new Error("Invalid document content.");
    }
    if (item.bytes.byteLength > MAX_FILE_BYTES) throw new Error("Document exceeds ZIP size limit.");
    const name = textEncoder.encode(uniqueName(item.name, used));
    if (name.length > 65535) throw new Error("Document name is too long.");
    return { name, bytes: item.bytes, crc: crc32(item.bytes) };
  });
  let localSize = 0, centralSize = 0, sumPayload = 0;
  for (const item of items) {
    localSize += 30 + item.name.length + item.bytes.length;
    centralSize += 46 + item.name.length;
    sumPayload += item.bytes.length;
  }
  if (sumPayload > MAX_TOTAL_BYTES || localSize + centralSize + 22 > 0xffffffff) {
    throw new Error("Board pack exceeds ZIP size limit.");
  }
  const out = new Uint8Array(localSize + centralSize + 22);
  const offsets: number[] = [];
  let position = 0;
  for (const item of items) {
    offsets.push(position);
    u32(out, position, 0x04034b50);
    u16(out, position+4, 20);            // minimum ZIP version
    u16(out, position+6, UTF8_FLAG);
    u16(out, position+8, 0);             // store; no compression
    u16(out, position+10, 0);            // deterministic time
    u16(out, position+12, 0);            // deterministic date
    u32(out, position+14, item.crc);
    u32(out, position+18, item.bytes.length);
    u32(out, position+22, item.bytes.length);
    u16(out, position+26, item.name.length);
    u16(out, position+28, 0);
    out.set(item.name, position+30);
    out.set(item.bytes, position+30+item.name.length);
    position += 30 + item.name.length + item.bytes.length;
  }
  const centralOffset = position;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    u32(out, position, 0x02014b50);
    u16(out, position+4, 20);
    u16(out, position+6, 20);
    u16(out, position+8, UTF8_FLAG);
    u16(out, position+10, 0);
    u16(out, position+12, 0);
    u16(out, position+14, 0);
    u32(out, position+16, item.crc);
    u32(out, position+20, item.bytes.length);
    u32(out, position+24, item.bytes.length);
    u16(out, position+28, item.name.length);
    u16(out, position+30, 0);
    u16(out, position+32, 0);
    u16(out, position+34, 0);
    u16(out, position+36, 0);
    u32(out, position+38, 0);
    u32(out, position+42, offsets[i]);
    out.set(item.name, position+46);
    position += 46+item.name.length;
  }
  const centralLength = position - centralOffset;
  u32(out, position, 0x06054b50);
  u16(out, position+4, 0);
  u16(out, position+6, 0);
  u16(out, position+8, items.length);
  u16(out, position+10, items.length);
  u32(out, position+12, centralLength);
  u32(out, position+16, centralOffset);
  u16(out, position+20, 0);
  return out;
}

export interface AuthorizedBoardPackFile {
  documentId: string;
  versionId: string;
  fileName: string;
}

/**
 * The manifest must come from a server-side eligibility-gated endpoint, never a
 * local/mock registry. Each original is independently fetched under document RLS.
 * Missing or unauthorized versions fail the whole pack; never silently fall back to latest.
 * A separate server audit acknowledgement MUST succeed before making this Blob available.
 */
export async function composeAuthorizedBoardPack(
  files: readonly AuthorizedBoardPackFile[],
  loadOriginal: (documentId: string, versionId: string) => Promise<Blob | null>,
  recordAudit: (documents: readonly AuthorizedBoardPackFile[]) => Promise<string>,
): Promise<Blob> {
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_FILES) {
    throw new Error("No authorized board pack documents were returned.");
  }
  const seen = new Set<string>();
  const entries: BoardPackZipEntry[] = [];
  for (const entry of files) {
    if (!entry || !entry.documentId?.trim() || !entry.versionId?.trim()) {
      throw new Error("Invalid authorized board pack manifest.");
    }
    const key = `${entry.documentId}\u0000${entry.versionId}`;
    if (seen.has(key)) throw new Error("Board pack manifest contains duplicate document versions.");
    seen.add(key);
    const blob = await loadOriginal(entry.documentId, entry.versionId);
    if (!blob) throw new Error("A board pack document is missing or you do not have access.");
    if (blob.size > MAX_FILE_BYTES) throw new Error("Document exceeds ZIP size limit.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    entries.push({name: entry.fileName, bytes});
  }
  const archive = createBoardPackZip(entries);
  const auditId = await recordAudit(files);
  if (typeof auditId !== "string" || !auditId.trim()) {
    throw new Error("Board pack audit was not confirmed. Download cancelled.");
  }
  return new Blob([archive.buffer as ArrayBuffer], {type:"application/zip"});
}
