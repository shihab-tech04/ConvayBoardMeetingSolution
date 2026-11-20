import { describe, expect, it, vi } from "vitest";
import type { ParticipantGroup } from "../app/data/boardMeetingData";
import {
  createParticipantGroup, updateParticipantGroup,
  type ParticipantGroupGateway,
} from "../app/pages/governance/participantGroupPersistence";

const identity = {id:"PG-001", created_at:"2026-11-20T00:00:00.000Z"};
const values: Record<string,unknown> = {
  group_name:"Committee Delegates", group_type:"Static", status:"Active",
  meeting_role:"Participant", voting_eligible:true, governance_body:"Audit Committee",
};
function fakeGateway(initial:ParticipantGroup[]=[]):ParticipantGroupGateway {
  let records=[...initial];
  return {
    list:vi.fn(async()=>records.map(x=>({...x}))),
    create:vi.fn(async r=>{records=[...records,r];return true;}),
    update:vi.fn(async (id,patch)=>{records=records.map(r=>r.id===id?{...r,...patch}:r);return true;}),
  };
}
describe("GV-13 participant group persistence and readback",()=>{
 it("creates only after SQL ACK and readback, preserving all form attributes",async()=>{
  const g=fakeGateway();const record=await createParticipantGroup(values,identity,g);
  expect(record.group_id).toBe("PG-001");
  expect(record.meeting_role).toBe("Participant");
  expect(record.voting_eligible).toBe(true);
  expect(g.list).toHaveBeenCalledTimes(2);
 });
 it("rejects missing name/type without mutation",async()=>{
  const g=fakeGateway();
  await expect(createParticipantGroup({...values,group_name:""},identity,g)).rejects.toThrow(/name/);
  await expect(createParticipantGroup({...values,group_type:""},identity,g)).rejects.toThrow(/type/);
  expect(g.create).not.toHaveBeenCalled();
 });
 it("rejects duplicate ID and canonical name/type before a new write",async()=>{
  const g=fakeGateway();await createParticipantGroup(values,identity,g);
  await expect(createParticipantGroup(values,identity,g)).rejects.toThrow(/already exists/);
  await expect(createParticipantGroup({...values,group_name:" committee delegates "},{...identity,id:"PG-002"},g)).rejects.toThrow(/already exists/);
  expect(g.create).toHaveBeenCalledOnce();
 });
 it("retains error on failed write or missing SQL readback",async()=>{
  const g=fakeGateway();g.create=vi.fn(async()=>false);
  await expect(createParticipantGroup(values,identity,g)).rejects.toThrow(/not confirmed/);
  g.create=vi.fn(async()=>true);
  await expect(createParticipantGroup(values,identity,g)).rejects.toThrow(/readback/);
 });
 it("updates only supplied fields, without wiping membership and metadata",async()=>{
  const g=fakeGateway();await createParticipantGroup(values,identity,g);
  await expect(updateParticipantGroup("PG-001",{description:"Updated"},g)).resolves.toBe(true);
  const r=(await g.list())[0];
  expect(r.member_count).toBe("0");
  expect(r.meeting_role).toBe("Participant");
  expect(r.voting_eligible).toBe(true);
  expect(r.description).toBe("Updated");
 });
 it("refuses invalid status, type or toggle rather than inventing a result",async()=>{
  const g=fakeGateway();
  await expect(createParticipantGroup({...values,status:"Deleted"},identity,g)).rejects.toThrow(/status/);
  await expect(createParticipantGroup({...values,group_type:"Security Admin"},identity,g)).rejects.toThrow(/type/);
  await expect(createParticipantGroup({...values,voting_eligible:"yes"},identity,g)).rejects.toThrow(/eligibility/);
  expect(g.create).not.toHaveBeenCalled();
 });
 it("denies missing record and failed update without UI success",async()=>{
  const g=fakeGateway();
  await expect(updateParticipantGroup("unknown",{group_name:"New"},g)).rejects.toThrow(/not found/);
  await createParticipantGroup(values,identity,g);
  g.update=vi.fn(async()=>false);
  await expect(updateParticipantGroup("PG-001",{description:"No"},g)).rejects.toThrow(/not confirmed/);
 });
 it("denies ACK with stale or missing updated record",async()=>{
  const g=fakeGateway();await createParticipantGroup(values,identity,g);
  g.update=vi.fn(async()=>true);
  await expect(updateParticipantGroup("PG-001",{description:"Not persisted"},g)).rejects.toThrow(/readback/);
 });
});
