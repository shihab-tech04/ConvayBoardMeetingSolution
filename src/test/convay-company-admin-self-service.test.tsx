import { beforeEach,describe,expect,it,vi } from "vitest";
import { fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tenantId="11111111-1111-4111-8111-111111111111";
const memberId="22222222-2222-4222-8222-222222222222";
const hooks=vi.hoisted(()=>({
  access:{loaded:true,is_super_admin:false,company_admin_tenant_ids:["11111111-1111-4111-8111-111111111111"]},
  directory:vi.fn(),profile:vi.fn(),enroll:vi.fn(),revoke:vi.fn(),toast:vi.fn(),
}));
vi.mock("../app/services/supabase/convayAccess",()=>({
  useAccessSnapshot:()=>hooks.access,
}));
vi.mock("../app/services/saas/companyDirectory",()=>({
  listCompanies:()=>hooks.directory(),
  readCompany:(id:string)=>hooks.profile(id),
  enrollVerifiedCompanyMember:(...args:unknown[])=>hooks.enroll(...args),
  revokeCompanyMember:(...args:unknown[])=>hooks.revoke(...args),
}));
vi.mock("sonner",()=>({toast:{success:hooks.toast}}));
vi.mock("../app/components/buttons/Button",()=>({
  Button:({children,loading:_loading,variant:_variant,size:_size,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>
    &{loading?:boolean;variant?:string;size?:string})=>
    <button type="button" {...props}>{children}</button>,
}));
vi.mock("../app/components/forms/AppTextField",()=>({
  AppTextField:({id,label,value,onChange,disabled,required}:{
    id:string;label:string;value:string;onChange:(v:string)=>void;disabled?:boolean;required?:boolean;
  })=><label htmlFor={id}>{label}<input id={id} value={value} disabled={disabled}
    required={required} onChange={e=>onChange(e.target.value)}/></label>,
}));
vi.mock("../app/components/modals/SConfirmModal",()=>({
  SConfirmModal:({title,message,onClose,onConfirm,confirmLabel}:{
    title:string;message:string;onClose:()=>void;onConfirm:()=>void;confirmLabel:string;
  })=><section role="dialog" aria-label={title}>{message}
    <button onClick={onClose}>Cancel</button><button onClick={onConfirm}>{confirmLabel}</button>
  </section>,
}));
import { CompanyAdminWorkspacePage } from "../app/pages/company/CompanyAdminWorkspacePage";
const company={
  id:tenantId,display_name:"Alpha Company",lifecycle_state:"provisioning" as const,
  created_at:"2026-11-23T00:00:00Z",updated_at:"2026-11-23T00:00:00Z",
  active_member_count:2,published_template_count:0,
};
const member={user_id:memberId,membership_role:"member",membership_state:"active",
  revision:1,changed_at:"2026-11-23T00:00:00Z",revoked_at:null,
  display_name:"Member Alpha",email:"alpha@example.com",account_status:"active"};
const profile=()=>({
 company,members:[member],templates:[],events:[],
 tenant_isolation_certified:false,workspace_activation_enabled:false,
 subscription_activated:false,subscription_note:"Not active",
});
beforeEach(()=>{
 hooks.access={loaded:true,is_super_admin:false,company_admin_tenant_ids:[tenantId]};
 hooks.directory.mockReset();hooks.profile.mockReset();
 hooks.enroll.mockReset();hooks.revoke.mockReset();hooks.toast.mockReset();
 hooks.directory.mockResolvedValue({companies:[company],
   tenant_isolation_certified:false,workspace_activation_enabled:false});
 hooks.profile.mockResolvedValue(profile());
 hooks.enroll.mockResolvedValue({member,profile:profile()});
 hooks.revoke.mockResolvedValue({member,profile:profile()});
});
describe("Company Super Admin self-service, production SQL only",()=>{
 it("shows only the actor's authorized company and does not invent paid activation",async()=>{
   render(<CompanyAdminWorkspacePage/>);
   expect(await screen.findByText("Alpha Company",{selector:"h2"})).toBeInTheDocument();
   expect(screen.getByText("Subscription: Not activated")).toBeInTheDocument();
   expect(screen.getByText(/SQL\/Storage\/LiveKit tenant isolation: Not certified/)).toBeInTheDocument();
   expect(screen.getByText("Member Alpha")).toBeInTheDocument();
   expect(hooks.directory).toHaveBeenCalled();
   expect(hooks.profile).toHaveBeenCalledWith(tenantId);
 });
 it("does not show the company workspace if no verified tenant-admin membership exists",()=>{
   hooks.access={loaded:true,is_super_admin:false,company_admin_tenant_ids:[]};
   render(<CompanyAdminWorkspacePage/>);
   expect(screen.getByText(/No authorized Company Super Admin membership/)).toBeInTheDocument();
   expect(hooks.directory).not.toHaveBeenCalled();
 });
 it("refuses a directory whose company was not in the current server-authorized access snapshot",async()=>{
   hooks.directory.mockResolvedValueOnce({companies:[{...company,id:memberId}],
     tenant_isolation_certified:false,workspace_activation_enabled:false});
   render(<CompanyAdminWorkspacePage/>);
   expect(await screen.findByRole("alert")).toHaveTextContent(/Company scope changed/);
   expect(hooks.profile).not.toHaveBeenCalled();
 });
 it("confirms existing verified user enrollment as member only, not privileged tenant admin",async()=>{
   render(<CompanyAdminWorkspacePage/>);
   await screen.findByText("Member Alpha");
   fireEvent.change(screen.getByLabelText("Verified user email"),{target:{value:"user@example.com"}});
   fireEvent.click(screen.getByRole("button",{name:"Add company member"}));
   const dialog=screen.getByRole("dialog",{name:"Add company member?"});
   expect(dialog).toHaveTextContent(/no paid workspace or meeting access/i);
   fireEvent.click(within(dialog).getByRole("button",{name:"Assign member"}));
   await waitFor(()=>expect(hooks.enroll).toHaveBeenCalledOnce());
   const [tenant,email,role,request]=hooks.enroll.mock.calls[0];
   expect([tenant,email,role]).toEqual([tenantId,"user@example.com","member"]);
   expect(request).toMatch(/^[a-f0-9-]{36}$/i);
 });
 it("requires explicit confirmation to revoke an ordinary member",async()=>{
   render(<CompanyAdminWorkspacePage/>);
   await screen.findByText("Member Alpha");
   fireEvent.click(screen.getByRole("button",{name:"Revoke membership"}));
   expect(hooks.revoke).not.toHaveBeenCalled();
   const dialog=screen.getByRole("dialog",{name:"Revoke company membership?"});
   fireEvent.click(within(dialog).getByRole("button",{name:"Revoke membership"}));
   await waitFor(()=>expect(hooks.revoke).toHaveBeenCalledWith(
     tenantId,memberId,expect.stringMatching(/^[a-f0-9-]{36}$/i)));
 });
 it("keeps Platform Super Admin separation and SQL authorization on route and navigation",()=>{
   const nav=readFileSync(resolve(process.cwd(),"src/app/data/navigation.ts"),"utf8");
   const routes=readFileSync(resolve(process.cwd(),"src/app/routes.tsx"),"utf8");
   const access=readFileSync(resolve(process.cwd(),"src/app/services/supabase/convayAccess.ts"),"utf8");
   expect(nav).toContain('id: "company-management"');
   expect(nav).toContain('!access.is_super_admin');
   expect(nav).toContain('access.company_admin_tenant_ids?.length');
   expect(access).toContain('await listCompanies()');
   expect(access).toContain('if (epoch !== sessionEpoch)');
   expect(routes).toContain('function CompanyAdminRoute()');
   expect(routes).toContain('company_admin_tenant_ids?.length');
   expect(routes).toContain('<CompanyAdminWorkspacePage/>');
 });
});
