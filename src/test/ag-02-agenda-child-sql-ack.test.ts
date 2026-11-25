import { describe, expect, it, vi } from "vitest";
import { saveAgendaChildWithAck } from "../app/components/agenda/agendaChildPersistence";

describe("AG-02 agenda child server-confirmed persistence", () => {
  it("returns the same child only after SQL-backed create ACK", async () => {
    let resolve: ((value: boolean) => void) | undefined;
    const pending = new Promise<boolean>(r => { resolve = r; });
    const write = vi.fn(() => pending);
    let completed = false;
    const result = saveAgendaChildWithAck("agd-child-1", write).then(id => {
      completed = true;
      return id;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(write).toHaveBeenCalledTimes(1);
    resolve?.(true);
    await expect(result).resolves.toBe("agd-child-1");
    expect(completed).toBe(true);
  });
  it("accepts the same server ACK contract for an existing-child update", async () => {
    await expect(saveAgendaChildWithAck("agd-existing", async () => true)).resolves.toBe("agd-existing");
  });
  it("never returns a child ID after registry rejects the write", async () => {
    await expect(saveAgendaChildWithAck("agd-child-1", async () => false)).rejects.toThrow(/was not saved/i);
  });
  it("surfaces SQL/network denial instead of reporting saved", async () => {
    await expect(saveAgendaChildWithAck("agd-child-1", async () => { throw new Error("403 denied"); }))
      .rejects.toThrow("403 denied");
  });
  it("rejects invalid identity before any write", async () => {
    const write = vi.fn(async () => true);
    await expect(saveAgendaChildWithAck("", write)).rejects.toThrow(/identity/i);
    await expect(saveAgendaChildWithAck(" invalid ", write)).rejects.toThrow(/identity/i);
    expect(write).not.toHaveBeenCalled();
  });
  it("does not treat an undefined server acknowledgement as success", async () => {
    const write = vi.fn(async () => undefined as unknown as boolean);
    await expect(saveAgendaChildWithAck("agd-child-1", write)).rejects.toThrow(/was not saved/i);
  });
});
