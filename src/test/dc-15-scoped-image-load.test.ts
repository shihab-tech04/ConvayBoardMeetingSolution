import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { startScopedDocumentImageLoad } from "../app/components/documents/documentImageLoad";

function fixture() {
  const create = vi.fn((_file: string) => "blob:secret-image");
  const revoke = vi.fn((_url: string) => undefined);
  const ready = vi.fn((_url: string) => undefined);
  const failed = vi.fn(() => undefined);
  return { create, revoke, ready, failed };
}

describe("DC-15 private image viewer async lifetime", () => {
  it("renders a resolved image URL only for the active viewer", async () => {
    const x = fixture();
    const handle = startScopedDocumentImageLoad(async () => "file-v1", x.create, x.revoke, x.ready, x.failed);
    await handle.settled;
    expect(x.create).toHaveBeenCalledWith("file-v1");
    expect(x.ready).toHaveBeenCalledWith("blob:secret-image");
    expect(x.failed).not.toHaveBeenCalled();
    handle.cancel();
    expect(x.revoke).toHaveBeenCalledTimes(1);
    expect(x.revoke).toHaveBeenCalledWith("blob:secret-image");
  });

  it("does not create or display an image after the viewer is closed", async () => {
    const x = fixture();
    let resolve!: (value: string) => void;
    const pending = new Promise<string>(done => { resolve = done; });
    const handle = startScopedDocumentImageLoad(() => pending, x.create, x.revoke, x.ready, x.failed);
    handle.cancel();
    resolve("late-private-content");
    await handle.settled;
    expect(x.create).not.toHaveBeenCalled();
    expect(x.ready).not.toHaveBeenCalled();
  });

  it("revokes the earlier URL exactly once even if cleanup fires again", async () => {
    const x = fixture();
    const handle = startScopedDocumentImageLoad(async () => "v2", x.create, x.revoke, x.ready, x.failed);
    await handle.settled;
    handle.cancel();
    handle.cancel();
    expect(x.revoke).toHaveBeenCalledTimes(1);
  });

  it("reports a rejected load to the active viewer", async () => {
    const x = fixture();
    const handle = startScopedDocumentImageLoad(async () => { throw new Error("denied"); }, x.create, x.revoke, x.ready, x.failed);
    await handle.settled;
    expect(x.failed).toHaveBeenCalledTimes(1);
    expect(x.ready).not.toHaveBeenCalled();
  });

  it("does not report an error after the viewer was closed", async () => {
    const x = fixture();
    let reject!: (error: Error) => void;
    const pending = new Promise<string>((_resolve, fail) => { reject = fail; });
    const handle = startScopedDocumentImageLoad(() => pending, x.create, x.revoke, x.ready, x.failed);
    handle.cancel();
    reject(new Error("network"));
    await handle.settled;
    expect(x.failed).not.toHaveBeenCalled();
  });

  it("does not leak URLs when the viewer is closed during the ready callback", async () => {
    const x = fixture();
    let handle!: ReturnType<typeof startScopedDocumentImageLoad<string>>;
    handle = startScopedDocumentImageLoad(async () => "v3", x.create, x.revoke,
      url => {x.ready(url);handle.cancel();}, x.failed);
    await handle.settled;
    expect(x.revoke).toHaveBeenCalledTimes(1);
  });

  it("wires React image source to state, not a global DOM ID, and exposes retry", () => {
    const source = readFileSync("src/app/components/documents/UnifiedDocumentViewer.tsx", "utf8");
    expect(source).toContain("startScopedDocumentImageLoad(");
    expect(source).toContain("return pending.cancel");
    expect(source).toContain("src={imageUrl}");
    expect(source).toContain("setRetry(value => value + 1)");
    expect(source).not.toContain('document.getElementById("unified-viewer-image")');
  });

  it("reports failed downloads instead of silently ignoring missing/denied originals", () => {
    const source = readFileSync("src/app/components/documents/UnifiedDocumentViewer.tsx", "utf8");
    expect(source).toContain('toast.error("Unable to download this document version.');
    expect(source).toContain("disabled={downloading}");
    expect(source).toContain("getOriginalFile(documentId, versionId)");
  });
});
