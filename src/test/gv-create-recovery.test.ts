import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGovernanceCreateRecovery, type GovernanceCreateAttempt } from "../app/pages/governance/governanceCreateRecovery";
import { createGovernanceBody, type GovernanceBodyGateway } from "../app/pages/psr-verification/governanceBodyPersistence";
import { createParticipantGroup, type ParticipantGroupGateway } from "../app/pages/governance/participantGroupPersistence";
import type { GovernanceBody, ParticipantGroup } from "../app/data/boardMeetingData";

function intent(id: string): GovernanceCreateAttempt {
  return { id, created_at:"2026-11-26T00:00:00.000Z", signature:"test", dispatched:false, recovered:false, assertCurrent:()=>{} };
}
const body = {body_name:"Audit",body_type:"Committee",chairperson:"Chair"};
const group = {group_name:"Delegates",group_type:"Static"};
describe("GV-10/GV-13 exact dispatched creation recovery", () => {
  it("recovers a committed governance body after missing readback without another write", async () => {
    const a = intent("GB-1");
    let rows: GovernanceBody[] = [];
    let reads = 0;
    const g: GovernanceBodyGateway = {
      list: async () => { if (++reads === 2) throw Error("offline"); return rows; },
      create: vi.fn(async r => { rows=[r]; return true; }),
      update: vi.fn(async () => false),
    };
    await expect(createGovernanceBody(body,a,g,a)).rejects.toThrow("offline");
    expect(a.dispatched).toBe(true);
    expect(await createGovernanceBody(body,a,g,a)).toEqual(rows[0]);
    expect(a.recovered).toBe(true);
    expect(g.create).toHaveBeenCalledOnce();
    await expect(createGovernanceBody(body,a,g,intent("GB-1"))).rejects.toThrow(/already exists/);
    await expect(createGovernanceBody({...body,chairperson:"Other"},a,g,a)).rejects.toThrow(/readback/);
  });
  it("recovers a participant group after a lost acknowledgement only by exact SQL data", async () => {
    const a = intent("PG-1");
    let rows: ParticipantGroup[] = [];
    const g: ParticipantGroupGateway = {
      list: async () => rows,
      create: vi.fn(async r => { rows=[r]; return false; }),
      update: vi.fn(async () => false),
    };
    await expect(createParticipantGroup(group,a,g,a)).rejects.toThrow(/not confirmed/);
    await expect(createParticipantGroup(group,a,g,a)).resolves.toEqual(rows[0]);
    expect(a.recovered).toBe(true);
    expect(g.create).toHaveBeenCalledOnce();
    await expect(createParticipantGroup(group,a,g,intent("PG-1"))).rejects.toThrow(/already exists/);
    rows=[{...rows[0],group_id:"other"}];
    await expect(createParticipantGroup(group,a,g,a)).rejects.toThrow(/already exists/);
  });
  it("does not dispatch after the authorization context changes during preflight", async () => {
    const a=intent("PG-1");
    let active=true;
    a.assertCurrent=()=>{if(!active)throw Error("scope changed");};
    const g: ParticipantGroupGateway={list:async()=>{active=false;return [];},create:vi.fn(async()=>true),update:vi.fn(async()=>false)};
    await expect(createParticipantGroup(group,a,g,a)).rejects.toThrow("scope changed");
    expect(g.create).not.toHaveBeenCalled();
  });
  it("keeps an unchanged attempt, clears it on scope reset, and rejects late completion", () => {
    const {result,unmount}=renderHook(()=>useGovernanceCreateRecovery());
    const a=result.current.begin(body,()=> "GB-1");
    expect(result.current.begin(body,()=> "GB-2")).toBe(a);
    act(()=>window.dispatchEvent(new Event("convay:entity-cache-cleared")));
    expect(()=>a.assertCurrent()).toThrow(/context changed/);
    const b=result.current.begin(body,()=> "GB-2");
    expect(b).not.toBe(a);
    expect(()=>result.current.complete(a)).toThrow(/context changed/);
    unmount();
    expect(()=>b.assertCurrent()).toThrow(/context changed/);
  });
});
