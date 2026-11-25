import { describe, expect, it, vi } from "vitest";
import type { GovernanceBody } from "../app/data/boardMeetingData";
import {
  createGovernanceBody, updateGovernanceBody, type GovernanceBodyGateway,
} from "../app/pages/psr-verification/governanceBodyPersistence";
const valid: Record<string, unknown> = {
  body_name: "Audit Committee", body_type: "Committee",
  chairperson: "User A", status: "Active", mandate: "Review controls",
};
const id = { id: "GB-001", created_at: "2026-11-20T00:00:00.000Z" };
function makeGateway(seed: GovernanceBody[] = []) {
  let saved = [...seed];
  const gateway: GovernanceBodyGateway = {
    list: vi.fn(async () => saved.map((b) => ({...b}))),
    create: vi.fn(async (body) => { saved = [...saved, body]; return true; }),
    update: vi.fn(async (key, patch) => {
      saved = saved.map((body) => body.id === key ? {...body, ...patch} : body);
      return true;
    }),
  };
  return gateway;
}
describe("GV-10 governance body SQL acknowledgement and readback", () => {
  it("creates one body only after the SQL acknowledgement and authoritative readback", async () => {
    const gateway = makeGateway();
    const body = await createGovernanceBody(valid, id, gateway);
    expect(body.body_id).toBe("GB-001");
    expect(gateway.create).toHaveBeenCalledOnce();
    expect(gateway.list).toHaveBeenCalledTimes(2);
  });
  it("denies missing required name/type/chairperson before a write", async () => {
    const gateway = makeGateway();
    await expect(createGovernanceBody({...valid,body_name:""}, id, gateway)).rejects.toThrow(/required/);
    await expect(createGovernanceBody({...valid,chairperson:""}, id, gateway)).rejects.toThrow(/required/);
    expect(gateway.create).not.toHaveBeenCalled();
  });
  it("denies an existing body ID or duplicate visible body name/type", async () => {
    const gateway = makeGateway();
    await createGovernanceBody(valid, id, gateway);
    await expect(createGovernanceBody(valid, id, gateway)).rejects.toThrow(/already exists/);
    await expect(createGovernanceBody({...valid,body_name:" AUDIT committee "}, {id:"GB-002",created_at:id.created_at},gateway)).rejects.toThrow(/already exists/);
    expect(gateway.create).toHaveBeenCalledTimes(1);
  });
  it("keeps an unacknowledged failed create as failure", async () => {
    const gateway = makeGateway();
    gateway.create = vi.fn(async () => false);
    await expect(createGovernanceBody(valid,id,gateway)).rejects.toThrow(/not saved/);
  });
  it("rejects a provider ACK without SQL readback", async () => {
    const gateway = makeGateway();
    gateway.create = vi.fn(async () => true);
    await expect(createGovernanceBody(valid,id,gateway)).rejects.toThrow(/readback/);
  });
  it("does not silently drop a selected charter file", async () => {
    const gateway = makeGateway();
    await expect(createGovernanceBody({...valid,charter:[{name:"charter.pdf"}]},id,gateway)).rejects.toThrow(/Charter upload/);
    expect(gateway.create).not.toHaveBeenCalled();
  });
  it("updates supplied fields only, preserving unaffected mandate and identity", async () => {
    const gateway = makeGateway();
    await createGovernanceBody(valid,id,gateway);
    expect(await updateGovernanceBody("GB-001",{body_name:"Risk Committee"},gateway)).toBe(true);
    const result=(await gateway.list())[0];
    expect(result.body_name).toBe("Risk Committee");
    expect(result.mandate).toBe("Review controls");
    expect(result.body_id).toBe("GB-001");
  });
  it("fails closed on a denied update or conflicting readback", async () => {
    const gateway = makeGateway();
    await createGovernanceBody(valid,id,gateway);
    gateway.update = vi.fn(async () => false);
    await expect(updateGovernanceBody("GB-001",{mandate:"changed"},gateway)).rejects.toThrow(/not confirmed/);
    gateway.update = vi.fn(async () => true);
    await expect(updateGovernanceBody("GB-001",{mandate:"changed"},gateway)).rejects.toThrow(/readback/);
  });
  it("rejects unsupported status, type and impossible date before writing", async () => {
    const gateway = makeGateway();
    await expect(createGovernanceBody({...valid,status:"Unknown"},id,gateway)).rejects.toThrow(/status/);
    await expect(createGovernanceBody({...valid,body_type:"Private"},id,gateway)).rejects.toThrow(/type/);
    await expect(createGovernanceBody({...valid,establishment_date:"2026-02-31"},id,gateway)).rejects.toThrow(/date/);
    expect(gateway.create).not.toHaveBeenCalled();
  });
  it("rejects editing a missing record instead of reporting success", async () => {
    const gateway = makeGateway();
    await expect(updateGovernanceBody("missing",{body_name:"New"},gateway)).rejects.toThrow(/not found/);
    expect(gateway.update).not.toHaveBeenCalled();
  });
});
