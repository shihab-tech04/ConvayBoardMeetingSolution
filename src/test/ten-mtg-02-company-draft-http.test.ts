import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../app/services/supabase/convayAuth",()=>({convayAuth:{authenticatedRequest:vi.fn()}}));
import { convayAuth } from "../app/services/supabase/convayAuth";
import { listStagedCompanyDrafts, readStagedCompanyDraft, saveStagedCompanyDraft, updateStagedCompanyDraft, discardStagedCompanyDraft } from "../app/services/saas/companyMeetingDrafts";
import type { MeetingTemplateVersion } from "../app/services/saas/meetingTemplateControl";
import type { StagedCompanyDraft } from "../app/services/saas/companyMeetingDrafts";
const tenant="11111111-1111-4111-8111-111111111111", other="99999999-9999-4999-8999-999999999999";
const id="22222222-2222-4222-8222-222222222222",rid="33333333-3333-4333-8333-333333333333",draftId="DRAFT-1234567890ABCDEF1234";
const template:MeetingTemplateVersion={id,tenant_id:tenant,template_key:"board",title:"Board review",description:"",source_template_id:null,revision:2,current_revision:2,published_revision:2,state:"published",published_at:"2026-11-25T00:00:00Z",definition:{steps:[{id:"details",title:"Meeting details",fields:[{id:"title",label:"Meeting title",type:"text",required:true}]}]}};
const draft:StagedCompanyDraft={draft_id:draftId,title:"Board review",template_id:id,template_revision:2,definition:template.definition,values:{title:"Budget"},created_at:"2026-11-25T00:00:00Z",updated_at:"2026-11-25T00:00:00Z",edit_revision:1,status:"Staged Draft"};
const receipt={tenant_id:tenant,draft_id:draftId,template_id:id,template_revision:2,request_id:rid,status:"Staged Draft",meeting_activation_enabled:false};
const req=vi.mocked(convayAuth.authenticatedRequest);
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
const read=(d:unknown=draft,t=tenant)=>reply({tenant_id:t,meeting_activation_enabled:false,draft:d});
const create=()=>saveStagedCompanyDraft(tenant,template,draft.title,draft.values,rid);
beforeEach(()=>req.mockReset());
describe("MT-03/11/14/27 staged draft HTTP contract and recovery",()=>{
 it("pins immutable template and saved draft identity using actual service request payloads",async()=>{
  req.mockResolvedValueOnce(reply(receipt)).mockResolvedValueOnce(read()).mockResolvedValueOnce(reply({template}));
  expect((await create()).draft).toEqual(draft);
  expect(JSON.parse(req.mock.calls[0][1]!.body as string).p_payload).toMatchObject({request_id:rid,template_revision:2});
  expect(JSON.parse(req.mock.calls[2][1]!.body as string).p_payload).toMatchObject({revision:2});
 });
 it("replays an identical create intent after a lost response",async()=>{
  req.mockRejectedValueOnce(new Error("lost ACK"));
  await expect(create()).rejects.toThrow("lost ACK");
  const original=req.mock.calls[0];
  req.mockResolvedValueOnce(reply(receipt)).mockResolvedValueOnce(read()).mockResolvedValueOnce(reply({template}));
  await expect(create()).resolves.toMatchObject({draft:{draft_id:draftId}});
  expect(req.mock.calls[1]).toEqual(original);
 });
 it("marks structured first create rejection, but not a readback denial, definitive",async()=>{
  req.mockResolvedValueOnce(reply({message:"Invalid field",code:"23514"},400));
  await expect(create()).rejects.toMatchObject({name:"StagedDraftCreateRejected"});
  req.mockResolvedValueOnce(reply(receipt)).mockResolvedValueOnce(reply({message:"Denied",code:"42501"},403));
  await expect(create()).rejects.not.toMatchObject({name:"StagedDraftCreateRejected"});
 });
 it.each([0,-1,1.5,"2",null])("rejects invalid persisted template revision %s",async(revision)=>{
  req.mockResolvedValueOnce(read({...draft,template_revision:revision}));
  await expect(readStagedCompanyDraft(tenant,draftId)).rejects.toThrow("readback invalid");
 });
 it("rejects foreign tenant readback and empty definition",async()=>{
  req.mockResolvedValueOnce(read(draft,other));
  await expect(readStagedCompanyDraft(tenant,draftId)).rejects.toThrow("scope");
  req.mockResolvedValueOnce(read({...draft,definition:{steps:[]}}));
  await expect(readStagedCompanyDraft(tenant,draftId)).rejects.toThrow("ordered steps");
 });
 it("rejects an incorrect immutable template revision after the create receipt",async()=>{
  req.mockResolvedValueOnce(reply(receipt)).mockResolvedValueOnce(read()).mockResolvedValueOnce(reply({template:{...template,revision:3}}));
  await expect(create()).rejects.toThrow("identity");
 });
 it("revises and discards the same identity with exact optimistic revisions",async()=>{
  const revised={...draft,title:"Updated review",values:{title:"Next budget"},edit_revision:2};
  const transition={...receipt,action:"update",edit_revision:2,audit_event_id:1};
  req.mockResolvedValueOnce(reply(transition)).mockResolvedValueOnce(read(revised));
  await expect(updateStagedCompanyDraft(tenant,draft,revised.title,revised.values,rid)).resolves.toMatchObject({draft:revised});
  expect(JSON.parse(req.mock.calls[0][1]!.body as string).p_payload.expected_revision).toBe(1);
  req.mockResolvedValueOnce(reply({...transition,edit_revision:3}));
  await expect(updateStagedCompanyDraft(tenant,draft,revised.title,revised.values,rid)).rejects.toThrow("not verified");
  req.mockResolvedValueOnce(reply({...transition,action:"discard",status:"Discarded"})).mockResolvedValueOnce(reply({tenant_id:tenant,meeting_activation_enabled:false,drafts:[]}));
  await expect(discardStagedCompanyDraft(tenant,revised,rid)).resolves.toMatchObject({draft_id:draftId,edit_revision:2});
  req.mockResolvedValueOnce(reply({...transition,action:"discard",status:"Discarded"})).mockResolvedValueOnce(reply({tenant_id:tenant,meeting_activation_enabled:false,drafts:[revised]}));
  await expect(discardStagedCompanyDraft(tenant,revised,rid)).rejects.toThrow("still appears");
 });
});

describe("MT-11/12 SQL-advertised partial progress",()=>{
 const progress={stepId:"details",partial:true};
 const capability={tenant_id:tenant,meeting_activation_enabled:false,draft_progress_supported:true,drafts:[]};
 const savePartial=()=>saveStagedCompanyDraft(tenant,template,draft.title,{},rid,progress);
 it("does not write to an old SQL contract without explicit progress capability",async()=>{
   req.mockResolvedValueOnce(reply({...capability,draft_progress_supported:false}));
   await expect(savePartial()).rejects.toMatchObject({name:"StagedDraftCreateRejected"});
   expect(req).toHaveBeenCalledTimes(1);
   expect(JSON.parse(req.mock.calls[0][1]!.body as string).p_action).toBe("list");
 });
 it("sends exact step and mode with the stable create intent and validates readback",async()=>{
   const partial={...draft,values:{},wizard_step_id:"details"};
   req.mockResolvedValueOnce(reply(capability)).mockResolvedValueOnce(reply({...receipt,wizard_step_id:"details"}))
      .mockResolvedValueOnce(read(partial)).mockResolvedValueOnce(reply({template}));
   await expect(savePartial()).resolves.toMatchObject({draft:partial});
   expect(JSON.parse(req.mock.calls[1][1]!.body as string).p_payload).toMatchObject({wizard_step_id:"details",partial_save:true,request_id:rid,values:{}});
 });
 it("rejects a missing or wrong saved step rather than announcing success",async()=>{
   req.mockResolvedValueOnce(reply(capability)).mockResolvedValueOnce(reply({...receipt,wizard_step_id:"details"}))
      .mockResolvedValueOnce(read({...draft,values:{}}));
   await expect(savePartial()).rejects.toThrow("content did not match");
   req.mockResolvedValueOnce(read({...draft,wizard_step_id:"foreign_step"}));
   await expect(readStagedCompanyDraft(tenant,draftId)).rejects.toThrow("Saved wizard step");
 });
 it("checks the progress receipt and optimistic revision for update",async()=>{
   const revised={...draft,edit_revision:2,wizard_step_id:"details",values:{}};
   const transition={...receipt,action:"update",edit_revision:2,audit_event_id:1,wizard_step_id:"details"};
   req.mockResolvedValueOnce(reply(capability)).mockResolvedValueOnce(reply(transition)).mockResolvedValueOnce(read(revised));
   await expect(updateStagedCompanyDraft(tenant,draft,draft.title,{},rid,progress)).resolves.toMatchObject({draft:revised});
   expect(JSON.parse(req.mock.calls[1][1]!.body as string).p_payload).toMatchObject({expected_revision:1,wizard_step_id:"details",partial_save:true});
 });
});

describe("MT-11/12 staged draft directory integrity",()=>{
 const directory=(drafts:unknown[])=>reply({tenant_id:tenant,meeting_activation_enabled:false,draft_progress_supported:true,drafts});
 it.each([
   ["duplicate draft identity",[draft,{...draft,title:"Conflicting title"}]],
   ["non-string template identity",[{...draft,template_id:[id]}]],
   ["missing creation timestamp",[{...draft,created_at:undefined}]],
   ["non-string wizard step",[{...draft,wizard_step_id:["details"]}]],
   ["invalid wizard step syntax",[{...draft,wizard_step_id:"invalid step"}]],
 ])("rejects %s before publishing directory or capability",async(_label,rows)=>{
   req.mockResolvedValueOnce(directory(rows as unknown[]));
   const onSupport=vi.fn();
   await expect(listStagedCompanyDrafts(tenant,onSupport)).rejects.toThrow("directory SQL readback invalid");
   expect(onSupport).not.toHaveBeenCalled();
 });
 it("preserves legacy null steps and valid saved step identities",async()=>{
   const rows=[{...draft,wizard_step_id:null},{...draft,draft_id:"DRAFT-ABCDEF1234567890ABCD",wizard_step_id:"details"}];
   req.mockResolvedValueOnce(directory(rows));
   const onSupport=vi.fn();
   await expect(listStagedCompanyDrafts(tenant,onSupport)).resolves.toEqual(rows);
   expect(onSupport).toHaveBeenCalledWith(true);
 });
});
