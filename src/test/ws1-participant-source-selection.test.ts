import { describe, expect, it } from "vitest";
import { appendParticipantSource, removeParticipantSource, hasParticipantSource, resolveSelectedBody, effectiveBoardMemberships, consistentParticipantClassification } from "../app/pages/return-register/participantSourceSelection";
import type { DraftParticipantLink } from "../app/components/forms/ParticipantSelectorStep";
import type { GovernanceBody } from "../app/data/boardMeetingData";
import type { GovernanceMembership } from "../app/data/governanceMemberships";
const source = {type:"individual",source_id:"u1",source_label:"Individual"};
const other = {type:"division",source_id:"d1",source_label:"Division"};
const roster:DraftParticipantLink = {id:"r1",user_id:"u1",user_name:"Member",user_designation:"",org_path:"",member_category:"quorum",participant_type:"Member",is_required:false,voting_eligible:true,quorum_eligible:true,selection_sources:[source]};
const body = {id:"b1",body_id:"GB1",body_name:"Board",status:"Active"} as GovernanceBody;
const member = {id:"m1",user_id:"u1",gov_body_id:"GB1",gov_body_name:"Board",status:"active",membership_role:"member",start_date:"2026-01-01",is_voting_member:true,counts_for_quorum:true} satisfies GovernanceMembership;
describe("PT-01–05 board selection and source integrity",()=>{
 it("deduplicates the same source",()=>expect(appendParticipantSource(roster,source)).toBe(roster));
 it("adds another source without duplicating a person or changing eligibility",()=>{
  expect(appendParticipantSource(roster,other)).toEqual({...roster,selection_sources:[source,other]});
 });
 it("removes only the specified source",()=>expect(removeParticipantSource(appendParticipantSource(roster,other),"division","d1",false)).toEqual(roster));
 it("removes an optional person only after last source is removed",()=>expect(removeParticipantSource(roster,"individual","u1",false)).toBeNull());
 it("protects the final source of mandatory leadership",()=>expect(removeParticipantSource(roster,"individual","u1",true)).toBe(roster));
 it("does not remove the leadership source even with another source",()=>{
  const leadership = {...roster,selection_sources:[{...source,source_label:"Meeting Leadership"},other]};expect(removeParticipantSource(leadership,"individual","u1",true)).toBe(leadership);
 });
 it("checks exact source IDs",()=>{expect(hasParticipantSource(roster,"individual","u1")).toBe(true);expect(hasParticipantSource(roster,"individual","u2")).toBe(false)});
 it("prefers a unique body ID and refuses ambiguous names",()=>{
  const duplicate={...body,id:"b2",body_id:"GB2"};expect(resolveSelectedBody([body,duplicate],"GB1")).toBe(body);expect(resolveSelectedBody([body,duplicate],"Board")).toBeUndefined();
 });
 it("requires an active selected body",()=>expect(resolveSelectedBody([{...body,status:"Inactive"}],"GB1")).toBeUndefined());
 it("selects only effective members by body ID, not equal display names",()=>{
  const rows=[member,{...member,id:"m2",user_id:"u2",gov_body_id:"GB2"},{...member,id:"m3",user_id:"u3",start_date:"2027-01-01"},{...member,id:"m4",user_id:"u4",end_date:"2026-10-01"},{...member,id:"m5",user_id:"u5",status:"terminated" as const}];expect(effectiveBoardMemberships(body,rows,"2026-11-25")).toEqual([member]);
 });
 it("does not select ambiguous active assignments",()=>expect(effectiveBoardMemberships(body,[member,{...member,id:"m2"}],"2026-11-25")).toEqual([]));
 it("never falls back without verified body and date",()=>{expect(effectiveBoardMemberships(undefined,[member],"2026-11-25")).toEqual([]);expect(effectiveBoardMemberships(body,[member],"")).toEqual([])});
 it("denies observer voting/quorum and reconciles explicit general classification",()=>{
  expect(consistentParticipantClassification({...roster,participant_type:"Observer"})).toMatchObject({member_category:"general",voting_eligible:false,quorum_eligible:false});expect(consistentParticipantClassification({...roster,member_category:"general"}).quorum_eligible).toBe(false);
 });
});
