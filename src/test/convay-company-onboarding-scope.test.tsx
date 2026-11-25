import { beforeEach,describe,expect,it,vi } from "vitest";
import { act,fireEvent,render,screen,waitFor,within } from "@testing-library/react";

const hooks=vi.hoisted(()=>({list:vi.fn(),read:vi.fn(),invites:vi.fn(),queue:vi.fn(),cancel:vi.fn(),enroll:vi.fn(),revoke:vi.fn(),provision:vi.fn()}));
vi.mock("../app/services/saas/companyDirectory",()=>({
  listCompanies:()=>hooks.list(),readCompany:(...args:unknown[])=>hooks.read(...args),
  listPendingCompanyInvitations:(...args:unknown[])=>hooks.invites(...args),
  queuePendingCompanyInvitation:(...args:unknown[])=>hooks.queue(...args),
  cancelPendingCompanyInvitation:(...args:unknown[])=>hooks.cancel(...args),
  enrollVerifiedCompanyMember:(...args:unknown[])=>hooks.enroll(...args),
  revokeCompanyMember:(...args:unknown[])=>hooks.revoke(...args),
  createProvisioningCompany:(...args:unknown[])=>hooks.provision(...args),
}));
vi.mock("../app/services/saas/subscriptionQuotes",()=>({
  PRICE_METRICS:[],emptyQuoteForm:{},buildQuotePayload:()=>({}),estimateQuote:()=>null,
  displayMoney:()=>"",subscriptionAction:async()=>({quotes:[],invoices:[],
    payment_provider_connected:false,usage_metering_activated:false,tenant_isolation_certified:false}),
  assertSavedQuote:vi.fn(),subscriptionAuditRead:vi.fn(),assertSubscriptionAuditReadback:vi.fn(),
}));
vi.mock("../app/pages/subscribers/MeetingTemplateMarketplace",()=>({MeetingTemplateMarketplace:()=>null}));
vi.mock("sonner",()=>({toast:{success:vi.fn()}}));
vi.mock("../app/components/buttons/Button",()=>({
  Button:({children,disabled,onClick,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>)=>
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={props["aria-pressed"]}>{children}</button>,
}));
vi.mock("../app/components/forms/AppTextField",()=>({
  AppTextField:({id,label,value,onChange,disabled}:{id:string;label:string;value:string;onChange:(v:string)=>void;disabled?:boolean})=>
    <label htmlFor={id}>{label}<input id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/></label>,
}));
vi.mock("../app/components/forms/AppSelectField",()=>({
  AppSelectField:({id,label,value,onChange,disabled,options}:{id:string;label:string;value:string;onChange:(v:string)=>void;disabled?:boolean;options:{value:string;label:string}[]})=>
    <label htmlFor={id}>{label}<select id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select></label>,
}));
vi.mock("../app/components/modals/SConfirmModal",()=>({
  SConfirmModal:({title,message,onClose,onConfirm,confirmLabel}:{title:string;message:string;onClose:()=>void;onConfirm:()=>void;confirmLabel:string})=>
    <section role="dialog" aria-label={title}>{message}<button onClick={onClose}>Cancel</button><button onClick={onConfirm}>{confirmLabel}</button></section>,
}));
import { SubscribersPage } from "../app/pages/subscribers/SubscribersPage";
const a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";
const company=(id:string)=>({id,display_name:id===a?"Alpha Company":"Beta Company",lifecycle_state:"provisioning",
  active_member_count:0,published_template_count:0,created_at:"2026-11-25",updated_at:"2026-11-25"});
const flags={tenant_isolation_certified:false,workspace_activation_enabled:false};
const profile=(id:string)=>({company:company(id),members:[],templates:[],events:[],...flags,subscription_activated:false,subscription_note:"Inactive"});
const invitation=(tenantId:string,email:string)=>({tenant_id:tenantId,email,user_id:"33333333-3333-4333-8333-333333333333",membership_role:"member",status:"pending",request_id:"44444444-4444-4444-8444-444444444444",requested_at:"2026-11-25",expires_at:"2026-12-01",claimed_at:null});
const deferred=<T,>()=>{let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return{promise,resolve};};
beforeEach(()=>{
  Object.values(hooks).forEach(h=>h.mockReset());
  hooks.list.mockResolvedValue({companies:[company(a),company(b)],...flags});
  hooks.read.mockImplementation(async(id:string)=>profile(id));
  hooks.invites.mockImplementation(async(id:string)=>id===a?[invitation(a,"alpha@example.com")]:[invitation(b,"beta@example.com")]);
});
async function openAlpha(){
  render(<SubscribersPage/>);fireEvent.click(screen.getByRole("button",{name:"Companies"}));
  fireEvent.click(await screen.findByRole("button",{name:"Alpha Company"}));
  await screen.findByText("alpha@example.com");
}
describe("TEN-02 / UAM-14 company onboarding selection scope",()=>{
  it("clears company-specific draft emails and resets roles when changing company",async()=>{
    await openAlpha();
    fireEvent.change(screen.getByLabelText("Pending invitation email"),{target:{value:"draft-alpha@example.com"}});
    fireEvent.change(screen.getByLabelText("Verified user email"),{target:{value:"member-alpha@example.com"}});
    fireEvent.change(screen.getByLabelText("Role after verification"),{target:{value:"tenant_admin"}});
    fireEvent.change(screen.getByLabelText("Company membership role"),{target:{value:"tenant_admin"}});
    fireEvent.click(screen.getByRole("button",{name:"Beta Company"}));
    await screen.findByText("beta@example.com");
    expect(screen.queryByText("alpha@example.com")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pending invitation email")).toHaveValue("");
    expect(screen.getByLabelText("Verified user email")).toHaveValue("");
    expect(screen.getByLabelText("Role after verification")).toHaveValue("member");
    expect(screen.getByLabelText("Company membership role")).toHaveValue("member");
  });
  it("pins an invitation confirmation and in-flight mutation to the selected tenant",async()=>{
    await openAlpha();
    const pending=deferred<{invites:ReturnType<typeof invitation>[]} >();
    hooks.queue.mockReturnValueOnce(pending.promise);
    fireEvent.change(screen.getByLabelText("Pending invitation email"),{target:{value:"new-alpha@example.com"}});
    fireEvent.click(screen.getByRole("button",{name:"Link pending invitation"}));
    const dialog=screen.getByRole("dialog",{name:"Link pending invitation to company?"});
    expect(screen.getByRole("button",{name:"Beta Company"})).toBeDisabled();
    expect(screen.getByRole("button",{name:"Overview"})).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button",{name:"Link invitation"}));
    await waitFor(()=>expect(hooks.queue).toHaveBeenCalledWith(a,"new-alpha@example.com","member",expect.any(String)));
    expect(screen.getByRole("button",{name:"Beta Company"})).toBeDisabled();
    await act(async()=>pending.resolve({invites:[invitation(a,"new-alpha@example.com")]}));
    await screen.findByText("new-alpha@example.com");
    fireEvent.click(screen.getByRole("button",{name:"Beta Company"}));
    await screen.findByText("beta@example.com");
    expect(screen.queryByText("new-alpha@example.com")).not.toBeInTheDocument();
  });
  it("ignores a delayed invitation list after switching to another company",async()=>{
    const pending=deferred<ReturnType<typeof invitation>[]>();
    hooks.invites.mockImplementation((id:string)=>id===a?pending.promise:Promise.resolve([invitation(b,"beta@example.com")]));
    render(<SubscribersPage/>);fireEvent.click(screen.getByRole("button",{name:"Companies"}));
    fireEvent.click(await screen.findByRole("button",{name:"Alpha Company"}));
    await waitFor(()=>expect(hooks.invites).toHaveBeenCalledWith(a));
    fireEvent.click(screen.getByRole("button",{name:"Beta Company"}));
    await screen.findByText("beta@example.com");
    await act(async()=>pending.resolve([invitation(a,"alpha@example.com")]));
    expect(screen.getByText("beta@example.com")).toBeInTheDocument();
    expect(screen.queryByText("alpha@example.com")).not.toBeInTheDocument();
  });
  it("allows cancelling a membership confirmation before changing company without a write",async()=>{
    await openAlpha();
    fireEvent.change(screen.getByLabelText("Verified user email"),{target:{value:"member@example.com"}});
    fireEvent.click(screen.getByRole("button",{name:"Assign verified account"}));
    const dialog=screen.getByRole("dialog",{name:"Assign company role?"});
    expect(screen.getByRole("button",{name:"Beta Company"})).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button",{name:"Cancel"}));
    expect(hooks.enroll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Beta Company"}));
    await screen.findByText("beta@example.com");
    expect(screen.getByLabelText("Verified user email")).toHaveValue("");
  });
});
