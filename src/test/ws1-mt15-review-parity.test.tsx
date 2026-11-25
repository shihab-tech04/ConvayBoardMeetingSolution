import React from "react";
import { describe,expect,it,vi } from "vitest";
import { render,screen,fireEvent } from "@testing-library/react";
import { MeetingReviewPanel } from "../app/components/forms/MeetingReviewPanel";
import { meetingWizardAccess, meetingAccessBlockers } from "../app/pages/return-register/meetingAccess";
import { MEETING_TYPES, type AgendaSubmission, type AgendaDocumentLink, type BoardDocument, type DocumentVersion, type GovernanceBody, type QuorumRule } from "../app/data/boardMeetingData";
import type { BmsUser } from "../app/data/bmsUsers";
const users=[{id:"chair",name:"Canonical Chair",status:"Active"},{id:"sec",name:"Canonical Secretary",status:"Active"},{id:"org",name:"Canonical Organizer",status:"Active"}] as BmsUser[];
const roster=users.map((u,i)=>({id:"link-"+i,user_id:u.id,user_name:u.name,user_designation:"Board",org_path:"Board",member_category:"quorum",participant_type:["Chairperson","Meeting Secretary","Organizer"][i],is_required:true,attendance_requirement:"Mandatory",voting_eligible:true,quorum_eligible:true,selection_sources:[{type:"individual",source_id:u.id,source_label:"Individual"}]}));
const values={meeting_id:"MTG-12",draft_revision:"7",meeting_title:"Saved board meeting",meeting_type:MEETING_TYPES[0],committee:"body",meeting_date:"2026-12-15",start_time:"10:00",end_time:"11:00",time_zone:"Asia/Dhaka (GMT+6)",chairperson:"chair",secretary:"sec",organizer:"org",confidentiality:"Confidential",purpose:"Review financial results",description:"Exact saved description",notes:"Exact saved notes",mode:"Hybrid",venue:"Board room",participant_links_json:JSON.stringify(roster),selected_agenda_ids_json:'[{"agenda_id":"agenda-1","display_order":1}]',additional_doc_ids_json:"[]"};
const props={values,onGoToStep:vi.fn(),bmsUsers:users,governanceBodies:[{id:"body",body_id:"body",body_name:"Board",status:"Active"}] as GovernanceBody[],
allAgendas:[{id:"agenda-1",agenda_id:"agenda-1",agenda_title:"Finance",approval_status:"Approved",meeting_readiness:"Meeting Ready"}] as AgendaSubmission[],
agendaDocLinks:[{id:"link",agenda_id:"agenda-1",document_id:"doc",document_version_id:"v2"}] as AgendaDocumentLink[],
allDocuments:[{id:"doc",doc_id:"doc",doc_name:"Pinned board paper",version:"3.0",related_agenda:"agenda-1",confidentiality:"Confidential"}] as BoardDocument[],
documentVersions:[{id:"v2",version_id:"v2",document_id:"doc",version_number:"2.0"}] as DocumentVersion[],
quorumRules:[{id:"body-rule",rule_id:"body-rule",status:"Active",governance_body_id:"body",rule_type:"fixed_number",minimum_members_count:1,policy_version:1},{id:"meeting-rule",rule_id:"meeting-rule",status:"Active",meeting_id:"MTG-12",governance_body_id:"body",rule_type:"fixed_number",minimum_members_count:2,policy_version:3}] as QuorumRule[]};
describe("MT-15 exact wizard review projection",()=>{
 it("shows saved meeting context, canonical roster, exact agenda and pinned document version, and the meeting-specific policy",()=>{
  render(<MeetingReviewPanel {...props}/>);
  expect(screen.getByText("Exact saved notes")).toBeTruthy();
  expect(screen.getByText(/Chairperson · Mandatory · Voting eligible · Quorum eligible · chair/)).toBeTruthy();
  expect(screen.getByText("Finance · agenda-1")).toBeTruthy();
  expect(screen.getByText(/doc · Version 2.0 · v2/)).toBeTruthy();
  expect(screen.queryByText(/Version 3.0/)).toBeNull();
  expect(screen.getByText("meeting-rule")).toBeTruthy();
  expect(screen.queryByText("body-rule")).toBeNull();
  expect(screen.getByText("No role-based document access conflicts detected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Edit Documents"}));expect(props.onGoToStep).toHaveBeenCalledWith(2);
 });
 it("does not present corrupt selections as a ready meeting",()=>{
  render(<MeetingReviewPanel {...props} values={{...values,participant_links_json:"{broken"}}/>);
  expect(screen.getByText(/Saved participant selection is invalid/)).toBeTruthy();
  expect(screen.queryByText("Ready to Schedule")).toBeNull();
 });
 it("blocks an unavailable pinned document version instead of claiming the current version",()=>{
  render(<MeetingReviewPanel {...props} documentVersions={[]}/>);
  expect(screen.getByText("Pinned document version is unavailable: doc")).toBeTruthy();
  expect(screen.queryByText("Ready to Schedule")).toBeNull();
 });
 it("derives the approved LiveKit path only from a saved canonical identity",()=>{
  const unsaved=meetingWizardAccess({mode:"Virtual",virtual_link:"https://untrusted.invalid"});
  expect(unsaved).toMatchObject({virtual_platform:"LiveKit",virtual_link:""});
  expect(meetingAccessBlockers(unsaved)).toEqual([]);
  expect(meetingWizardAccess({mode:"Physical",venue:"Board",virtual_link:"https://untrusted.invalid"})).toMatchObject({virtual_platform:"",virtual_link:""});
  const saved=meetingWizardAccess({mode:"Hybrid",venue:"Board"},"MTG-12");
  expect(saved.virtual_link).toContain("/meetings/MTG-12/live?entry=join_meeting");
 });
});
