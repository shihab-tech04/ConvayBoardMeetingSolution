import { beforeEach,describe,expect,it,vi } from "vitest";
import { fireEvent,render,screen,waitFor,within } from "@testing-library/react";

const ids={
 company:"11111111-1111-4111-8111-111111111111",
 starter:"22222222-2222-4222-8222-222222222222",
 template:"33333333-3333-4333-8333-333333333333",
};
const state=vi.hoisted(()=>({
  companies: [] as Array<{id:string;display_name:string;lifecycle_state:string}>,
  list:vi.fn(),read:vi.fn(),save:vi.fn(),readCompany:vi.fn(),
  toast:vi.fn(),
}));
vi.mock("sonner",()=>({toast:{success:state.toast}}));
vi.mock("../app/services/saas/companyDirectory",()=>({
  listCompanies:async()=>({companies:state.companies,tenant_isolation_certified:false,workspace_activation_enabled:false}),
  readCompany:(id:string)=>state.readCompany(id),
}));
vi.mock("../app/services/saas/meetingTemplateControl",async()=>{
  const actual=await vi.importActual<typeof import("../app/services/saas/meetingTemplateControl")>("../app/services/saas/meetingTemplateControl");
  return {...actual,
    listManagedTemplates:(id:string|null)=>state.list(id),
    readManagedTemplate:(id:string,rev:number)=>state.read(id,rev),
    saveTemplateVersion:(action:string,data:unknown)=>state.save(action,data),
  };
});
vi.mock("../app/components/forms/AppTextField",()=>({
  AppTextField:({id,label,value,onChange,required,disabled}:{
    id:string;label:string;value:string;onChange:(value:string)=>void;required?:boolean;disabled?:boolean;
  })=><label htmlFor={id}>{label}<input id={id} value={value} required={required} disabled={disabled}
    onChange={e=>onChange(e.target.value)}/></label>,
}));
vi.mock("../app/components/forms/AppSelectField",()=>({
  AppSelectField:({id,label,value,onChange,options,disabled}:{
    id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;
    options:Array<string|{value:string;label:string}>;
  })=><label htmlFor={id}>{label}<select id={id} value={value} disabled={disabled}
    onChange={e=>onChange(e.target.value)}>
    {options.map(o=>{const v=typeof o==="string"?o:o.value;
      const title=typeof o==="string"?o:o.label;
      return <option key={v} value={v}>{title}</option>;})}
  </select></label>,
}));
vi.mock("../app/components/buttons/Button",()=>({
  Button:({children,variant:_variant,size:_size,loading:_loading,leadingIcon:_leadingIcon,trailingIcon:_trailingIcon,...props}:
    React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:string;size?:string;loading?:boolean;
      leadingIcon?:unknown;trailingIcon?:unknown})=><button type="button" {...props}>{children}</button>,
}));
vi.mock("../app/components/modals/SConfirmModal",()=>({
  SConfirmModal:({title,message,onConfirm,onClose,confirmLabel}:{
    title:string;message:string;onConfirm:()=>void;onClose:()=>void;confirmLabel:string;
  })=><section role="dialog" aria-label={title}>{message}
    <button onClick={onClose}>Cancel</button><button onClick={onConfirm}>{confirmLabel}</button></section>,
}));

import { MeetingTemplateMarketplace } from "../app/pages/subscribers/MeetingTemplateMarketplace";

const empty=()=>({id:ids.template,tenant_id:null,template_key:"board_custom",
 title:"Board Custom",description:"",source_template_id:null,revision:1,current_revision:1,
 published_revision:null,published_at:null,state:"draft" as const,
 definition:{steps:[{id:"step_base",title:"Meeting information",fields:[
   {id:"field_title",label:"Meeting title",type:"text" as const,required:true},
 ]}]},
});
beforeEach(()=>{
  state.companies=[];
  state.readCompany.mockReset();state.readCompany.mockImplementation(async(id:string)=>({company:state.companies.find(c=>c.id===id)}));
  state.list.mockReset();state.read.mockReset();state.save.mockReset();state.toast.mockReset();
  state.list.mockResolvedValue([]);state.read.mockResolvedValue(empty());
  state.save.mockResolvedValue(empty());
});

describe("SQL-backed dynamic meeting templates UI",()=>{
  it("keeps a Company Super Admin on their own tenant and never offers global draft creation",async()=>{
    state.companies=[{id:ids.company,display_name:"Client Alpha",lifecycle_state:"provisioning"}];
    state.save.mockResolvedValue({...empty(),tenant_id:ids.company,
      title:"Alpha Committee Meeting",template_key:"alpha_committee"});
    render(<MeetingTemplateMarketplace companyOnly initialCompanyId={ids.company}/>);
    await screen.findByText("No templates saved for this owner.");
    const owner=screen.getByLabelText("Template owner") as HTMLSelectElement;
    expect(owner.value).toBe(ids.company);
    expect(owner).toBeDisabled();
    expect(state.readCompany).toHaveBeenCalledWith(ids.company);
    expect(within(owner).queryByRole("option",{name:"Convay starter marketplace"})).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Meeting type name"),{target:{value:"Alpha Committee Meeting"}});
    fireEvent.change(screen.getByLabelText("Template key"),{target:{value:"alpha_committee"}});
    fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
    await waitFor(()=>expect(state.save).toHaveBeenCalledOnce());
    expect(state.save.mock.calls[0][1].tenant_id).toBe(ids.company);
    expect(state.save.mock.calls[0][0]).toBe("create");
  });
  it("shows truthful empty SQL state and keeps activation disabled",async()=>{
    render(<MeetingTemplateMarketplace/>);
    expect(await screen.findByText("No templates saved for this owner.")).toBeInTheDocument();
    expect(screen.getByText(/meeting activation awaits tenant isolation/i)).toBeInTheDocument();
  });
  it("allows administrators to add variable steps/fields and sends one SQL draft save",async()=>{
    render(<MeetingTemplateMarketplace/>);
    await screen.findByText("No templates saved for this owner.");
    fireEvent.click(screen.getByRole("button",{name:"Add step"}));
    expect(screen.getByText("Meeting creation steps (2)")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button",{name:"Add field"})[1]);
    fireEvent.change(screen.getByLabelText("Meeting type name"),{target:{value:"Committee Meeting"}});
    fireEvent.change(screen.getByLabelText("Template key"),{target:{value:"committee_meeting"}});
    fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
    await waitFor(()=>expect(state.save).toHaveBeenCalledOnce());
    const [action,payload]=state.save.mock.calls[0];
    expect(action).toBe("create");
    expect(payload.tenant_id).toBeNull();
    expect(payload.definition.steps).toHaveLength(2);
    expect(payload.definition.steps[1].fields).toHaveLength(1);
    expect(payload.request_id).toMatch(/^[0-9a-f-]{36}$/i);
  });
  it("copies only published starters into an explicitly chosen company",async()=>{
    state.companies=[{id:ids.company,display_name:"Client Alpha",lifecycle_state:"provisioning"}];
    state.list.mockImplementation(async(id:string|null)=>id===null?[{
      id:ids.starter,tenant_id:null,title:"Board Starter",template_key:"board_starter",
      description:"",revision:1,published_revision:1,source_template_id:null,updated_at:"2026-11-23T00:00:00Z",
    }]:[]);
    state.save.mockResolvedValue({...empty(),id:ids.template,tenant_id:ids.company,
      source_template_id:ids.starter,template_key:"alpha_board",title:"Alpha Board"});
    render(<MeetingTemplateMarketplace/>);
    await screen.findByText("Board Starter");
    fireEvent.change(screen.getByLabelText("Template owner"),{target:{value:ids.company}});
    await screen.findByLabelText("Copy published Convay starter");
    fireEvent.change(screen.getByLabelText("Copy published Convay starter"),{target:{value:ids.starter}});
    fireEvent.change(screen.getByLabelText("Meeting type name"),{target:{value:"Alpha Board"}});
    fireEvent.change(screen.getByLabelText("Template key"),{target:{value:"alpha_board"}});
    fireEvent.click(screen.getByRole("button",{name:"Copy starter to company"}));
    await waitFor(()=>expect(state.save).toHaveBeenCalledOnce());
    const [action,payload]=state.save.mock.calls[0];
    expect(action).toBe("copy");
    expect(payload.source_template_id).toBe(ids.starter);
    expect(payload.tenant_id).toBe(ids.company);
  });
  it("confirms the exact current draft revision before publishing",async()=>{
    state.list.mockResolvedValue([{
      id:ids.template,tenant_id:null,title:"Board Custom",template_key:"board_custom",
      description:"",revision:1,published_revision:null,source_template_id:null,updated_at:"2026-11-23T00:00:00Z",
    }]);
    state.save.mockResolvedValue({...empty(),state:"published",published_revision:1});
    render(<MeetingTemplateMarketplace/>);
    await screen.findByRole("button",{name:"Board Custom"});
    fireEvent.click(screen.getByRole("button",{name:"Board Custom"}));
    await screen.findByRole("button",{name:"Publish revision"});
    fireEvent.click(screen.getByRole("button",{name:"Publish revision"}));
    expect(screen.getByRole("dialog",{name:"Publish this meeting template version?"})).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog",{name:"Publish this meeting template version?"})).getByRole("button",{name:"Publish revision"}));
    await waitFor(()=>expect(state.save).toHaveBeenCalledWith("publish",
      expect.objectContaining({template_id:ids.template,expected_revision:1,tenant_id:null})));
  });
});

describe("AD-05/10 complete authoring and verified publication recovery",()=>{
 it("pins company-only ownership even when the actor has access to multiple companies",async()=>{
  state.companies=[{id:ids.company,display_name:"Client Alpha",lifecycle_state:"active"},
    {id:"44444444-4444-4444-8444-444444444444",display_name:"Client Beta",lifecycle_state:"active"}];
  render(<MeetingTemplateMarketplace companyOnly initialCompanyId={ids.company}/>);
  await screen.findByText("No templates saved for this owner.");
  const owner=screen.getByLabelText("Template owner");
  expect(owner).toBeDisabled();
  expect(within(owner).queryByRole("option",{name:/Client Beta/})).not.toBeInTheDocument();
  expect(state.readCompany).toHaveBeenCalledWith(ids.company);
 });
 it("never loads or writes global templates when the company-only scope is missing",async()=>{
  render(<MeetingTemplateMarketplace companyOnly/>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Verified company scope is required");
  expect(state.list).not.toHaveBeenCalled();
  expect(screen.getByRole("button",{name:"Save draft"})).toBeDisabled();
 });
 it("retries the same create intent after a lost response and preserves verified success when refresh fails",async()=>{
  state.save.mockRejectedValueOnce(new Error("Lost response"));
  render(<MeetingTemplateMarketplace/>);
  await screen.findByText("No templates saved for this owner.");
  fireEvent.change(screen.getByLabelText("Meeting type name"),{target:{value:"Board Custom"}});
  fireEvent.change(screen.getByLabelText("Template key"),{target:{value:"board_custom"}});
  fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry the same template save");
  expect(screen.getByLabelText("Template owner")).toBeDisabled();
  expect(screen.getByLabelText("Meeting type name")).toBeDisabled();
  expect(screen.getByRole("button",{name:"New draft"})).toBeDisabled();
  const first=state.save.mock.calls[0];
  state.list.mockRejectedValueOnce(new Error("Directory offline"));
  fireEvent.click(screen.getByRole("button",{name:"Retry template save"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Template saved and verified in SQL");
  expect(state.save.mock.calls[1]).toEqual(first);
  expect(screen.getByRole("button",{name:"Save new revision"})).toBeEnabled();
  expect(state.toast).toHaveBeenCalledWith("Meeting template draft verified in SQL");
 });
 it("prevents publishing an old revision after edits and preserves exact publish retry intent",async()=>{
  const item={id:ids.template,tenant_id:null,title:"Board Custom",template_key:"board_custom",description:"",revision:1,published_revision:null,source_template_id:null,updated_at:"2026-11-23T00:00:00Z"};
  state.list.mockResolvedValue([item]);
  state.save.mockResolvedValueOnce({...empty(),revision:2,current_revision:2,title:"Updated Board"});
  render(<MeetingTemplateMarketplace/>);
  fireEvent.click(await screen.findByRole("button",{name:"Board Custom"}));
  await screen.findByRole("button",{name:"Publish revision"});
  fireEvent.change(screen.getByLabelText("Meeting type name"),{target:{value:"Updated Board"}});
  expect(screen.getByRole("button",{name:"Publish revision"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Save new revision"}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"Publish revision"})).toBeEnabled());
  fireEvent.click(screen.getByRole("button",{name:"Publish revision"}));
  const modal=await screen.findByRole("dialog",{name:"Publish this meeting template version?"});
  state.save.mockRejectedValueOnce(new Error("Lost publication response"));
  fireEvent.click(within(modal).getByRole("button",{name:"Publish revision"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Retry this exact publication");
  const first=state.save.mock.calls[1];
  fireEvent.click(within(modal).getByRole("button",{name:"Cancel"}));
  expect(screen.getByRole("dialog",{name:"Publish this meeting template version?"})).toBeInTheDocument();
  state.save.mockResolvedValueOnce({...empty(),revision:2,current_revision:2,title:"Updated Board",state:"published",published_revision:2});
  fireEvent.click(within(modal).getByRole("button",{name:"Publish revision"}));
  await waitFor(()=>expect(screen.queryByRole("dialog",{name:"Publish this meeting template version?"})).not.toBeInTheDocument());
  expect(state.save.mock.calls[2]).toEqual(first);
  expect(state.save.mock.calls[2][1].expected_revision).toBe(2);
 });
});
