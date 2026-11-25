import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { readFileSync } from "node:fs";

const state=vi.hoisted(()=>({
 list:vi.fn(),read:vi.fn(),drafts:vi.fn(),save:vi.fn(),inspect:vi.fn(),
 update:vi.fn(),discard:vi.fn(),toast:vi.fn(),
}));
vi.mock("sonner",()=>({toast:{success:state.toast}}));
vi.mock("../app/services/saas/meetingTemplateControl",()=>({
 listManagedTemplates:state.list,readManagedTemplate:state.read,
 validateMeetingTemplateDefinition:vi.fn(),
}));
vi.mock("../app/services/saas/companyMeetingDrafts",()=>({
 listStagedCompanyDrafts:state.drafts,readStagedCompanyDraft:state.inspect,
 saveStagedCompanyDraft:state.save,updateStagedCompanyDraft:state.update,
 discardStagedCompanyDraft:state.discard,
}));
vi.mock("../app/components/forms/AppTextField",()=>({
 AppTextField:({id,label,value,onChange,disabled}:{
  id:string;label:string;value:string;onChange:(v:string)=>void;disabled?:boolean;
 })=><label htmlFor={id}>{label}<input id={id} value={value} disabled={disabled}
  onChange={e=>onChange(e.target.value)}/></label>,
}));
vi.mock("../app/components/forms/AppSelectField",()=>({
 AppSelectField:({id,label,value,onChange,disabled,options}:{
  id:string;label:string;value:string;onChange:(v:string)=>void;disabled?:boolean;
  options:{value:string;label:string}[];
 })=><label htmlFor={id}>{label}<select id={id} value={value} disabled={disabled}
  onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock("../app/components/buttons/Button",()=>({
 Button:({children,variant:_variant,size:_size,loading:_loading,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{
  variant?:string;size?:string;loading?:boolean;
 })=><button type="button" {...props}>{children}</button>,
}));
vi.mock("../app/components/modals/SConfirmModal",()=>({
 SConfirmModal:({title,message,confirmLabel,onConfirm,onClose}:{
  title:string;message:string;confirmLabel:string;onConfirm:()=>void;onClose:()=>void;
 })=><div role="dialog" aria-label={title}><p>{message}</p>
  <button onClick={onConfirm}>{confirmLabel}</button>
  <button onClick={onClose}>Cancel discard</button></div>,
}));
import { CompanyMeetingDraftWizard } from "../app/pages/company/CompanyMeetingDraftWizard";

const tenant="11111111-1111-4111-8111-111111111111";
const templateId="22222222-2222-4222-8222-222222222222";
const draftId="DRAFT-1234567890ABCDEF1234";
const definition={steps:[{id:"step_details",title:"Meeting information",fields:[
  {id:"field_title",label:"Meeting title",type:"text",required:true},
]}]};
const draft={draft_id:draftId,title:"Existing board review",
 template_id:templateId,template_revision:2,edit_revision:1,
 values:{field_title:"Budget 2026"},definition,
 created_at:"2026-11-24T00:00:00Z",updated_at:"2026-11-24T00:00:00Z",status:"Staged Draft"};
const directory=[{draft_id:draftId,title:draft.title,
 template_id:templateId,template_revision:2,edit_revision:1,
 created_at:draft.created_at,updated_at:draft.updated_at,status:"Staged Draft"}];
beforeEach(()=>{
 Object.values(state).forEach(mock=>mock.mockReset());
 state.list.mockResolvedValue([{id:templateId,tenant_id:tenant,title:"Board",
   template_key:"board",description:"",revision:2,current_revision:2,
   published_revision:2,source_template_id:null}]);
 state.read.mockResolvedValue({id:templateId,tenant_id:tenant,title:"Board",template_key:"board",
   description:"",revision:2,current_revision:2,published_revision:2,state:"published",
   source_template_id:null,published_at:draft.created_at,definition});
 state.save.mockResolvedValue({draft});
 state.drafts.mockImplementation(async (_tenant:string,onProgressSupport?:(supported:boolean)=>void)=>{onProgressSupport?.(true);return directory;});
 state.inspect.mockResolvedValue(draft);
 state.update.mockResolvedValue({draft:{...draft,edit_revision:2,
   title:"Updated board review",values:{field_title:"Budget 2027"}}});
 state.discard.mockResolvedValue({action:"discard",status:"Discarded"});
});
describe("TEN-MTG-02 complete staged draft recovery",()=>{
 it("reopens its immutable saved fields, validates and saves a revision into the same SQL draft",async()=>{
  render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Resume and edit"}));
  expect(await screen.findByDisplayValue("Budget 2026")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Existing board review")).toBeInTheDocument();
  expect(screen.getByLabelText("Published meeting type")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Draft meeting title"),{target:{value:"Updated board review"}});
  fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Budget 2027"}});
  fireEvent.click(screen.getByRole("button",{name:"Save revised draft in SQL"}));
  await waitFor(()=>expect(state.update).toHaveBeenCalledOnce());
  expect(state.update).toHaveBeenCalledWith(tenant,draft,
   "Updated board review",{field_title:"Budget 2027"},expect.any(String),{stepId:"step_details",partial:false});
  expect(await screen.findByText(/Revision 2. No meeting, invitation or room has been created/))
   .toBeInTheDocument();
  expect(state.save).not.toHaveBeenCalled();
 });
 it("requires explicit discard confirmation and preserves the draft on cancel",async()=>{
  render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Discard draft"}));
  const modal=await screen.findByRole("dialog",{name:"Discard staged company draft?"});
  expect(modal).toHaveTextContent("immutable SQL audit");
  fireEvent.click(screen.getByRole("button",{name:"Cancel discard"}));
  expect(state.discard).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Discard draft"}));
  await screen.findByRole("dialog",{name:"Discard staged company draft?"});
  fireEvent.click(within(screen.getByRole("dialog",{name:"Discard staged company draft?"}))
    .getByRole("button",{name:"Discard draft"}));
  await waitFor(()=>expect(state.discard).toHaveBeenCalledOnce());
  expect(state.discard).toHaveBeenCalledWith(tenant,draft,expect.any(String));
 });
 it("keeps failed optimistic revisions visible without a false saved success",async()=>{
  state.update.mockRejectedValueOnce(new Error("Draft changed since you opened it"));
  render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Resume and edit"}));
  await screen.findByDisplayValue("Budget 2026");
  fireEvent.click(screen.getByRole("button",{name:"Save revised draft in SQL"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Draft changed since you opened it");
  expect(state.toast).not.toHaveBeenCalled();
  expect(screen.getByRole("button",{name:"Start new draft"})).toBeInTheDocument();
 });
});
describe("MT-03/11/14/27 staged company draft creation and recovery",()=>{
 async function enterNewDraft(){
  render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
  const selector=await screen.findByLabelText("Published meeting type");
  await waitFor(()=>expect(selector).not.toBeDisabled());
  fireEvent.change(selector,{target:{value:templateId}});
  fireEvent.change(await screen.findByLabelText("Draft meeting title"),{target:{value:draft.title}});
  fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Budget 2026"}});
 }
 it("creates once, revises the same saved identity, then discards it with confirmation",async()=>{
  await enterNewDraft();
  fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
  const revise=await screen.findByRole("button",{name:"Save revised draft in SQL"});
  expect(state.save).toHaveBeenCalledOnce();
  expect(screen.getByLabelText("Published meeting type")).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Draft meeting title"),{target:{value:"Updated board review"}});
  fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Budget 2027"}});
  fireEvent.click(revise);
  await waitFor(()=>expect(state.update).toHaveBeenCalledWith(tenant,draft,"Updated board review",{field_title:"Budget 2027"},expect.any(String),{stepId:"step_details",partial:false}));
  expect(await screen.findByText(/Revision 2. No meeting, invitation or room has been created/)).toBeInTheDocument();
  expect(state.save).toHaveBeenCalledOnce();
  state.inspect.mockResolvedValueOnce({...draft,edit_revision:2,title:"Updated board review",values:{field_title:"Budget 2027"}});
  state.drafts.mockResolvedValue([]);
  fireEvent.click(screen.getByRole("button",{name:"Discard draft"}));
  fireEvent.click(within(await screen.findByRole("dialog",{name:"Discard staged company draft?"})).getByRole("button",{name:"Discard draft"}));
  await waitFor(()=>expect(state.discard).toHaveBeenCalledWith(tenant,expect.objectContaining({draft_id:draftId,edit_revision:2}),expect.any(String)));
  expect(await screen.findByText(/No staged company meeting drafts/)).toBeInTheDocument();
 });
 it("freezes original create intent and replays its identical request after an ambiguous ACK",async()=>{
  state.save.mockRejectedValueOnce(new Error("Network interrupted"));
  await enterNewDraft();
  fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry the same save");
  expect(screen.getByLabelText("Draft meeting title")).toBeDisabled();
  expect(screen.getByLabelText("Published meeting type")).toBeDisabled();
  expect(screen.getByRole("button",{name:"Resume and edit"})).toBeDisabled();
  const first=state.save.mock.calls[0];
  fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
  await screen.findByRole("button",{name:"Save revised draft in SQL"});
  expect(state.save.mock.calls[1]).toEqual(first);
  expect(screen.getByLabelText("Draft meeting title")).not.toBeDisabled();
 });
 it("allows correction after a definitive first-attempt SQL rejection",async()=>{
  const error=new Error("SQL rejected a field");error.name="StagedDraftCreateRejected";
  state.save.mockRejectedValueOnce(error);
  await enterNewDraft();
  fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("SQL rejected a field");
  expect(screen.getByLabelText("Draft meeting title")).not.toBeDisabled();
  fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Corrected"}});
  fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
  await screen.findByRole("button",{name:"Save revised draft in SQL"});
  expect(state.save.mock.calls[1][4]).not.toEqual(state.save.mock.calls[0][4]);
 });
 it("keeps verified saved identity when directory refresh fails",async()=>{
  await enterNewDraft();
  state.drafts.mockRejectedValueOnce(new Error("Directory offline"));
  fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Draft saved and verified in SQL");
  expect(screen.getByRole("button",{name:"Save revised draft in SQL"})).toBeInTheDocument();
  expect(state.save).toHaveBeenCalledOnce();
 });
});
describe("TEN-MTG-02 SQL safeguards",()=>{
 const sql=readFileSync("supabase/migrations/20261124124000_convay_company_draft_revision_recovery.sql","utf8");
 it("requires exact tenant Super Admin, SQL row locks, and optimistic revision",()=>{
  expect(sql).toContain("m.tenant_id=p_tenant_id");
  expect(sql).toContain("m.user_id=v_actor");
  expect(sql).toContain("m.membership_role='tenant_admin'");
  expect(sql).toContain("m.membership_state='active'");
  expect(sql).toContain("d.draft_id=v_id FOR UPDATE");
  expect(sql).toContain("v_draft.edit_revision<>v_expected");
  expect(sql).toContain("edit_revision=d.edit_revision+1");
  expect(sql).toContain("Draft changed since you opened it");
 });
 it("pins original published template version, validates fields and rejects request mutation",()=>{
  expect(sql).toContain("v_draft.definition->'steps'");
  expect(sql).toContain("Unknown meeting template field");
  expect(sql).toContain("v_prior.intent IS DISTINCT FROM v_intent");
  expect(sql).toContain("tenant_meeting_draft_receipts");
  expect(sql).toContain("company_meeting_draft_updated");
  expect(sql).toContain("company_meeting_draft_discarded");
 });
 it("never activates a company, meeting, LiveKit or other paid access",()=>{
  expect(sql).toContain("'meeting_activation_enabled',false");
  expect(sql).not.toMatch(/INSERT INTO public\.convay_entity_records|UPDATE public\.convay_entity_records/);
  expect(sql).not.toMatch(/UPDATE convay_private\.tenants SET lifecycle_state/);
  expect(sql).not.toContain("'meeting_activation_enabled',true");
  expect(sql).toContain("FROM PUBLIC,anon,authenticated");
  expect(sql).toContain("TO authenticated");
 });
});
describe("MT-04/11/12 paired staged draft progress journey",()=>{
 it("saves an incomplete second step, reopens the pinned snapshot, and recovers its exact step",async()=>{
  const multi={steps:[...definition.steps,{id:"mode_quorum",title:"Meeting mode",fields:[
    {id:"venue",label:"Venue",type:"text",required:true}
  ]}]};
  const saved={...draft,definition:multi,wizard_step_id:"mode_quorum",values:{field_title:"Budget 2026"}};
  state.read.mockResolvedValue({id:templateId,tenant_id:tenant,title:"Board",template_key:"board",
   description:"",revision:2,current_revision:2,published_revision:2,state:"published",
   source_template_id:null,published_at:draft.created_at,definition:multi});
  state.save.mockResolvedValue({draft:saved});
  state.inspect.mockResolvedValue(saved);
  const view=render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
  const selector=await screen.findByLabelText("Published meeting type");
  await waitFor(()=>expect(selector).not.toBeDisabled());
  fireEvent.change(selector,{target:{value:templateId}});
  fireEvent.change(await screen.findByLabelText("Draft meeting title"),{target:{value:draft.title}});
  fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Budget 2026"}});
  fireEvent.click(screen.getByRole("button",{name:"Next step"}));
  expect(await screen.findByLabelText("Venue")).toHaveValue("");
  fireEvent.click(screen.getByRole("button",{name:"Save draft and continue later"}));
  await waitFor(()=>expect(state.save).toHaveBeenCalledWith(tenant,expect.objectContaining({id:templateId}),
    draft.title,{field_title:"Budget 2026"},expect.any(String),{stepId:"mode_quorum",partial:true}));
  expect(await screen.findByText(/Saved and verified:/)).toBeInTheDocument();
  view.unmount();
  render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Resume and edit"}));
  expect(await screen.findByLabelText("Venue")).toHaveValue("");
  expect(screen.getByRole("button",{name:"2. Meeting mode"})).toHaveAttribute("aria-current","step");
  fireEvent.click(screen.getByRole("button",{name:"Previous step"}));
  expect(await screen.findByDisplayValue("Budget 2026")).toBeInTheDocument();
 });
});

it("keeps the existing complete save available when paired SQL progress is not advertised",async()=>{
 state.drafts.mockImplementation(async (_tenant:string,onProgressSupport?:(supported:boolean)=>void)=>{onProgressSupport?.(false);return directory;});
 render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
 const selector=await screen.findByLabelText("Published meeting type");
 await waitFor(()=>expect(selector).not.toBeDisabled());
 fireEvent.change(selector,{target:{value:templateId}});
 fireEvent.change(await screen.findByLabelText("Draft meeting title"),{target:{value:draft.title}});
 fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Budget 2026"}});
 expect(screen.queryByRole("button",{name:"Save draft and continue later"})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
 await waitFor(()=>expect(state.save).toHaveBeenCalledWith(tenant,expect.objectContaining({id:templateId}),draft.title,{field_title:"Budget 2026"},expect.any(String)));
});
