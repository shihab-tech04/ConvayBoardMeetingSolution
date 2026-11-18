import { describe, expect, it, vi } from "vitest";
import { runScopedEditorLoad } from "../app/pages/agenda-documents/editorLoadRecovery";

describe("DC-18 scoped async editor content loading", () => {
  it("applies successful results then completes loading", async () => {
    const values: string[] = [];
    await runScopedEditorLoad(async () => "document", () => true, v => values.push(v), () => values.push("failed"), () => values.push("done"));
    expect(values).toEqual(["document", "done"]);
  });
  it("reports and settles rejected content reads", async () => {
    const values: string[] = [];
    await runScopedEditorLoad(async () => { throw new Error("Storage down"); }, () => true, () => values.push("apply"), () => values.push("failed"), () => values.push("done"));
    expect(values).toEqual(["failed", "done"]);
  });
  it("ignores results for previous documents", async () => {
    let current = true;
    const values: string[] = [];
    await runScopedEditorLoad(async () => { current = false; return "old"; }, () => current, v => values.push(v), () => values.push("failed"), () => values.push("done"));
    expect(values).toEqual([]);
  });
  it("ignores failed reads for previous documents", async () => {
    let current = true;
    const values: string[] = [];
    await runScopedEditorLoad(async () => { current = false; throw new Error("Old file"); }, () => current, () => values.push("apply"), () => values.push("failed"), () => values.push("done"));
    expect(values).toEqual([]);
  });
  it("surfaces editor setContent failures and settles", async () => {
    const values: string[] = [];
    await runScopedEditorLoad(async () => "bad", () => true, () => { throw new Error("Parser"); }, () => values.push("failed"), () => values.push("done"));
    expect(values).toEqual(["failed", "done"]);
  });
  it("runs a synchronous load rejection through the failure handler", async () => {
    const fail = vi.fn(); const done = vi.fn();
    await runScopedEditorLoad(() => { throw new Error("sync"); }, () => true, () => {}, fail, done);
    expect(fail).toHaveBeenCalledOnce(); expect(done).toHaveBeenCalledOnce();
  });
});
