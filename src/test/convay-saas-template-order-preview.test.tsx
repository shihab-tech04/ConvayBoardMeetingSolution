import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { moveTemplateItem } from "../app/services/saas/templateEditorOrdering";

const mocks=vi.hoisted(()=>({list:vi.fn(),read:vi.fn(),save:vi.fn()}));
vi.mock("sonner",()=>({toast:{success:vi.fn()}}));
vi.mock("../app/services/saas/companyDirectory",()=>({
  listCompanies: async()=>({companies:[],tenant_isolation_certified:false,workspace_activation_enabled:false}),
}));
vi.mock("../app/services/saas/meetingTemplateControl", async()=>{
  const original=await vi.importActual<typeof import("../app/services/saas/meetingTemplateControl")>("../app/services/saas/meetingTemplateControl");
  return {...original,listManagedTemplates:mocks.list,readManagedTemplate:mocks.read,saveTemplateVersion:mocks.save};
});
vi.mock("../app/components/forms/AppTextField",()=>({
  AppTextField:({id,label,value,onChange,disabled}:{id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean})=>
    <label htmlFor={id}>{label}<input id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/></label>,
}));
vi.mock("../app/components/forms/AppSelectField",()=>({
  AppSelectField:({id,label,value,onChange,options,disabled}:{
    id:string;label:string;value:string;onChange:(value:string)=>void;disabled?:boolean;
    options:Array<string|{value:string;label:string}>;
  })=><label htmlFor={id}>{label}<select id={id} value={value} disabled={disabled}
    onChange={e=>onChange(e.target.value)}>{options.map(o=>{const v=typeof o==="string"?o:o.value;
      return <option key={v} value={v}>{typeof o==="string"?o:o.label}</option>;})}</select></label>,
}));
vi.mock("../app/components/buttons/Button",()=>({
  Button:({children,variant:_variant,size:_size,loading:_loading,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{
    variant?:string;size?:string;loading?:boolean})=><button type="button" {...props}>{children}</button>,
}));
vi.mock("../app/components/modals/SConfirmModal",()=>({SConfirmModal:()=>null}));
import { MeetingTemplateMarketplace } from "../app/pages/subscribers/MeetingTemplateMarketplace";

beforeEach(()=>{
  mocks.list.mockReset();mocks.read.mockReset();mocks.save.mockReset();
  mocks.list.mockResolvedValue([]);
  mocks.save.mockResolvedValue({id:"33333333-3333-4333-8333-333333333333",tenant_id:null,
    template_key:"board_meeting",title:"Board meeting",description:"",
    revision:1,current_revision:1,published_revision:null,published_at:null,state:"draft",
    definition:{steps:[{id:"step_one",title:"Meeting details",fields:[]},{id:"step_two",title:"Participants",fields:[]}]}});
});

describe("SQL meeting template step/field ordering and preview",()=>{
  it("moves whole objects without changing their identities, options or required flags",()=>{
    const objects=[{id:"first",required:true,options:["A"]},{id:"second",required:false,options:["B"]}];
    expect(moveTemplateItem(objects,1,-1)).toEqual([objects[1],objects[0]]);
    expect(objects[0].id).toBe("first");
    expect(moveTemplateItem(objects,0,-1)).toEqual(objects);
    expect(moveTemplateItem(objects,1,1)).toEqual(objects);
    expect(moveTemplateItem(objects,-1,1)).toEqual(objects);
    // Stale reorder indices must never insert an undefined entry or extend the array.
    expect(moveTemplateItem(objects,objects.length,-1)).toEqual(objects);
    expect(moveTemplateItem(objects,objects.length+1,-1)).toEqual(objects);
    expect(moveTemplateItem([objects[0]],1,-1)).toEqual([objects[0]]);
    expect(moveTemplateItem([],0,-1)).toEqual([]);
  });
  it("sends the reordered steps and fields to the existing SQL versioned save contract",async()=>{
    render(<MeetingTemplateMarketplace/>);
    await screen.findByText("No templates saved for this owner.");
    fireEvent.click(screen.getByRole("button",{name:"Add step"}));
    fireEvent.change(screen.getByLabelText("Step 2 title"),{target:{value:"Participant approval"}});
    fireEvent.click(screen.getByRole("button",{name:"Move step 2 up"}));
    fireEvent.click(screen.getAllByRole("button",{name:"Add field"})[1]);
    fireEvent.change(screen.getAllByLabelText("Field label")[1],{target:{value:"Approver"}});
    fireEvent.click(screen.getByRole("button",{name:"Move field 2 in step 2 up"}));
    fireEvent.change(screen.getByLabelText("Meeting type name"),{target:{value:"Board meeting"}});
    fireEvent.change(screen.getByLabelText("Template key"),{target:{value:"board_meeting"}});
    fireEvent.click(screen.getByRole("button",{name:"Save draft"}));
    await waitFor(()=>expect(mocks.save).toHaveBeenCalledOnce());
    const [action,data]=mocks.save.mock.calls[0];
    expect(action).toBe("create");
    expect(data.definition.steps.map((x:{title:string})=>x.title)).toEqual(["Participant approval","Meeting information"]);
    expect(data.definition.steps[0].fields).toEqual([]);
    expect(data.definition.steps[1].fields.map((f:{label:string})=>f.label)).toEqual(["Approver","Meeting title"]);
    expect(data.tenant_id).toBeNull();
  });
  it("previews ordered steps without issuing SQL meeting creation or publishing commands",async()=>{
    render(<MeetingTemplateMarketplace/>);
    await screen.findByText("No templates saved for this owner.");
    fireEvent.click(screen.getByRole("button",{name:"Add step"}));
    fireEvent.change(screen.getByLabelText("Step 2 title"),{target:{value:"Sign-off"}});
    fireEvent.click(screen.getByRole("button",{name:"Preview wizard"}));
    expect(screen.getByRole("region",{name:"Meeting wizard configuration preview"})).toBeInTheDocument();
    expect(screen.getByText(/no meeting is created, scheduled or published here/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Next preview step"}));
    expect(screen.getByText(/Step 2 of 2: Sign-off/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Next preview step"})).toBeDisabled();
    fireEvent.click(screen.getByRole("button",{name:"Previous preview step"}));
    expect(screen.getByText(/Step 1 of 2: Meeting information/)).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
