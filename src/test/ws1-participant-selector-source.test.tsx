import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ParticipantSelectorStep } from "../app/components/forms/ParticipantSelectorStep";
import type { GovernanceBody } from "../app/data/boardMeetingData";
import type { GovernanceMembership } from "../app/data/governanceMemberships";
import type { BmsUser } from "../app/data/bmsUsers";
const body={id:"b1",body_id:"GB1",body_name:"Board",status:"Active"} as GovernanceBody;
const member={id:"m1",user_id:"u1",gov_body_id:"GB1",gov_body_name:"Board",status:"active",membership_role:"member",start_date:"2026-01-01",is_voting_member:true,counts_for_quorum:true} satisfies GovernanceMembership;
const users=[{id:"u1",name:"Member One",status:"Active"},{id:"u2",name:"Unrelated User",status:"Active"}] as BmsUser[];
function picker(memberships:GovernanceMembership[]=[member]){
 const onValuesChange=vi.fn();
 render(<ParticipantSelectorStep values={{committee:"GB1",meeting_date:"2026-11-25",participant_links_json:"[]"}} onValuesChange={onValuesChange} bmsUsers={users} orgUnits={[]} governanceBodies={[body]} governanceMemberships={memberships}/>);
 const roster=()=>JSON.parse(onValuesChange.mock.calls.at(-1)![0].participant_links_json);
 return {roster};
}
describe("PT source picker integration",()=>{
 it("does not fall back to unrelated users for an empty board",()=>{
  picker([{...member,gov_body_id:"GB2"}]);
  expect(screen.getByText("No effective quorum members found")).toBeTruthy();
  expect(screen.queryByText("Unrelated User")).toBeNull();
  expect(screen.queryByRole("checkbox")).toBeNull();
 });
 it("adds individual provenance to a selected board member and removes only that provenance",()=>{
  const {roster}=picker();
  fireEvent.click(screen.getByRole("checkbox",{name:/Member One/}));
  fireEvent.click(screen.getByRole("button",{name:/Add 1 quorum member/}));
  expect(roster()).toHaveLength(1);expect(roster()[0].selection_sources).toHaveLength(1);
  fireEvent.click(screen.getByRole("button",{name:"Individual"}));
  const checkbox=screen.getByRole("checkbox",{name:/Member One/});
  expect(checkbox).toHaveProperty("disabled",false);
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button",{name:/Add 1 participant/}));
  expect(roster()).toHaveLength(1);expect(roster()[0].selection_sources.map((s:{type:string;source_id:string})=>[s.type,s.source_id])).toEqual([["quorum","GB1"],["individual","u1"]]);
  fireEvent.click(screen.getByRole("button",{name:"Expand participant options"}));
  fireEvent.click(screen.getByRole("button",{name:"Remove Individual source for Member One"}));
  expect(roster()).toHaveLength(1);expect(roster()[0].selection_sources).toHaveLength(1);expect(roster()[0].voting_eligible).toBe(true);
 });
});
