import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const state=vi.hoisted(()=>({list:vi.fn(),read:vi.fn(),drafts:vi.fn(),save:vi.fn(),inspect:vi.fn(),toast:vi.fn()}));
vi.mock("sonner",()=>({toast:{success:state.toast}}));
vi.mock("../app/services/saas/meetingTemplateControl",()=>({
 listManagedTemplates:state.list,readManagedTemplate:state.read,
}));
vi.mock("../app/services/saas/companyMeetingDrafts",()=>({
 listStagedCompanyDrafts:state.drafts,
 saveStagedCompanyDraft:state.save,
 readStagedCompanyDraft:state.inspect,
}));
vi.mock("../app/components/forms/AppTextField",()=>({
 AppTextField:({id,label,value,onChange,disabled}:{
   id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;
 })=><label htmlFor={id}>{label}<input id={id} value={value} disabled={disabled}
   onChange={e=>onChange(e.target.value)}/></label>,
}));
vi.mock("../app/components/forms/AppSelectField",()=>({
 AppSelectField:({id,label,value,onChange,disabled,options}:{
   id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;
   options:{value:string;label:string}[];
 })=><label htmlFor={id}>{label}<select id={id} value={value} disabled={disabled}
   onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock("../app/components/buttons/Button",()=>({
 Button:({children,variant:_variant,size:_size,loading:_loading,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{
   variant?:string;size?:string;loading?:boolean;
 })=><button type="button" {...props}>{children}</button>,
}));
import { CompanyMeetingDraftWizard } from "../app/pages/company/CompanyMeetingDraftWizard";
const tenant="11111111-1111-4111-8111-111111111111";
const templateId="22222222-2222-4222-8222-222222222222";
const template={
 id:templateId,tenant_id:tenant,title:"Company Board",template_key:"company_board",
 description:"",revision:2,current_revision:2,published_revision:2,state:"published",
 published_at:"2026-11-24T00:00:00Z",source_template_id:null,
 definition:{steps:[{id:"step_details",title:"Meeting information",
   fields:[{id:"field_title",label:"Meeting title",type:"text",required:true}]}]},
};
const draft={draft_id:"DRAFT-1234567890ABCDEF1234",title:"Company meeting plan",
 template_id:templateId,template_revision:2,values:{field_title:"Budget review"},
 definition:template.definition,created_at:"2026-11-24T01:00:00Z",status:"Staged Draft"};
beforeEach(()=>{
 Object.values(state).forEach(mock=>mock.mockReset());
 state.list.mockResolvedValue([{id:templateId,tenant_id:tenant,title:template.title,
   template_key:"company_board",description:"",revision:2,current_revision:2,
   published_revision:2,updated_at:"2026-11-24T00:00:00Z",source_template_id:null}]);
 state.read.mockResolvedValue(template);
 state.drafts.mockResolvedValue([]);
 state.save.mockResolvedValue({draft,receipt:{draft_id:draft.draft_id,tenant_id:tenant,
   template_id:templateId,template_revision:2,status:"Staged Draft",
   meeting_activation_enabled:false,request_id:"00000000-0000-4000-8000-000000000000"}});
});
describe("Company Super Admin staged meeting draft journey",()=>{
 it("selects a published company template, validates fields and confirms staged SQL persistence",async()=>{
   render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
   const selector=await screen.findByLabelText("Published meeting type");
   fireEvent.change(selector,{target:{value:templateId}});
   await screen.findByLabelText("Draft meeting title");
   fireEvent.change(screen.getByLabelText("Draft meeting title"),{target:{value:"Company meeting plan"}});
   fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
   expect(screen.getByRole("alert")).toHaveTextContent("Meeting title is required");
   fireEvent.change(screen.getByLabelText("Meeting title"),{target:{value:"Budget review"}});
   fireEvent.click(screen.getByRole("button",{name:"Save staged draft in SQL"}));
   await waitFor(()=>expect(state.save).toHaveBeenCalledOnce());
   expect(state.save).toHaveBeenCalledWith(tenant,template,"Company meeting plan",
     {field_title:"Budget review"},expect.any(String));
   expect(await screen.findByText(/No meeting, invitation or room has been created/)).toBeInTheDocument();
   expect(screen.queryByRole("button",{name:/Join Meeting|Schedule Meeting/})).not.toBeInTheDocument();
 });
 it("refuses to invent meeting types when the company SQL catalogue is empty",async()=>{
   state.list.mockResolvedValueOnce([]);
   render(<CompanyMeetingDraftWizard tenantId={tenant}/>);
   expect(await screen.findByText(/No published meeting type is available/)).toBeInTheDocument();
   expect(state.save).not.toHaveBeenCalled();
 });
});
