import { describe, expect, it, vi } from "vitest";
import {
  createBoardPackZip,
  safeBoardPackEntryName,
  composeAuthorizedBoardPack,
  crc32,
} from "../app/utils/boardPackZip";

const bytes = (s: string) => new TextEncoder().encode(s);
const files = [
  { documentId: "document-1", versionId: "v1", fileName: "Board report.pdf" },
  { documentId: "document-2", versionId: "v2", fileName: "Board report.pdf" },
];

describe("DC-25 fail-closed audited board-pack ZIP", () => {
  it("matches ZIP CRC-32 standard vector", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
  });
  it("normalizes ZIP-slip and duplicate filenames", () => {
    expect(safeBoardPackEntryName("../secret/notes.pdf")).toBe("notes.pdf");
    const archive = createBoardPackZip([
      { name: "../../notes.pdf", bytes: bytes("one") },
      { name: "notes.pdf", bytes: bytes("two") },
    ]);
    expect(archive[0]).toBe(0x50);
    expect(archive[1]).toBe(0x4b);
  });
  it("rejects malformed filenames", () => {
    expect(() => safeBoardPackEntryName("../..")).toThrow();
    expect(() => safeBoardPackEntryName("\\\\")).toThrow();
  });
  it("rejects absent file content", async () => {
    const recordAudit = vi.fn().mockResolvedValue("audit-1");
    await expect(composeAuthorizedBoardPack(files, async file => file === "document-2" ? null : new Blob(["one"]), recordAudit))
      .rejects.toThrow(/missing or you do not have access/);
    expect(recordAudit).not.toHaveBeenCalled();
  });
  it("never falls back to latest version", async () => {
    const loadOriginal = vi.fn();
    await expect(composeAuthorizedBoardPack([{ documentId: "document-1", versionId: "", fileName: "one.pdf" }], loadOriginal, async () => "ok"))
      .rejects.toThrow(/Invalid authorized/);
    expect(loadOriginal).not.toHaveBeenCalled();
  });
  it("rejects duplicate document/version references", async () => {
    await expect(composeAuthorizedBoardPack([files[0], files[0]], async () => new Blob(["one"]), async () => "ok"))
      .rejects.toThrow(/duplicate/);
  });
  it("does not provide ZIP unless audit confirmation succeeds", async () => {
    await expect(composeAuthorizedBoardPack(files, async () => new Blob(["content"]), async () => ""))
      .rejects.toThrow(/audit was not confirmed/);
  });
  it("downloads exact linked versions with a server audit acknowledgement", async () => {
    const loadOriginal = vi.fn().mockResolvedValue(new Blob(["file"]));
    const recordAudit = vi.fn().mockResolvedValue("audit-55");
    const archive = await composeAuthorizedBoardPack(files, loadOriginal, recordAudit);
    expect(archive.type).toBe("application/zip");
    expect(loadOriginal).toHaveBeenCalledWith("document-1", "v1");
    expect(loadOriginal).toHaveBeenCalledWith("document-2", "v2");
    expect(recordAudit).toHaveBeenCalledOnce();
  });
});
