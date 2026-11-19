import { describe, it, expect, vi } from "vitest";
import { retrieveOriginalForDownload } from "../app/components/documents/documentOriginalDownload";

const file = new Blob(["presentation"]);

describe("DC-20 original-file download recovery", () => {
  it("uses the saved original file from the authoritative store", async () => {
    const load = vi.fn(async (_: string) => file);
    const dispatch = vi.fn();
    await retrieveOriginalForDownload(" DOC-01 ", "board.pptx", load, dispatch);
    expect(load).toHaveBeenCalledWith("DOC-01");
    expect(dispatch).toHaveBeenCalledWith(file, "board.pptx");
  });
  it("prefers the stored file name and removes path separators", async () => {
    const dispatch = vi.fn();
    await retrieveOriginalForDownload("doc", "backup.pptx", async () => Object.assign(new Blob(["ok"]), { name: "../../file.pptx" }), dispatch);
    expect(dispatch).toHaveBeenCalledWith(expect.any(Blob), ".._.._file.pptx");
  });
  it("does not open a link when original bytes are absent", async () => {
    const dispatch = vi.fn();
    await expect(retrieveOriginalForDownload("doc", "x.pptx", async () => null, dispatch)).rejects.toThrow("unavailable");
    expect(dispatch).not.toHaveBeenCalled();
  });
  it("blocks an empty document identity", async () => {
    const load = vi.fn(async () => file);
    await expect(retrieveOriginalForDownload(" ", "x", load, vi.fn())).rejects.toThrow("ID is missing");
    expect(load).not.toHaveBeenCalled();
  });
  it("propagates backend errors for the caller to report", async () => {
    await expect(retrieveOriginalForDownload("doc", "x", async () => { throw Error("offline"); }, vi.fn())).rejects.toThrow("offline");
  });
  it("propagates dispatch errors rather than claiming download success", async () => {
    await expect(retrieveOriginalForDownload("doc", "x", async () => file, () => { throw Error("blocked click"); })).rejects.toThrow("blocked click");
  });
  it("falls back to document when no filename exists", async () => {
    const dispatch = vi.fn();
    await retrieveOriginalForDownload("doc", " ", async () => file, dispatch);
    expect(dispatch).toHaveBeenCalledWith(file, "document");
  });
});
