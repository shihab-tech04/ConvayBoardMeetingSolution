import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, userId: "actor-one" },
  access: { loaded: true, is_super_admin: true, roles: [], user_assignments: [] },
  users: vi.fn(), accessCall: vi.fn(), reload: vi.fn(), success: vi.fn(),
}));
vi.mock("../app/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("../app/services/supabase/convayAccess", () => ({
  useAccessSnapshot: () => mocks.access, readAccessSnapshot: () => mocks.access,
  reloadAccessSnapshot: () => mocks.reload(),
}));
vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { users: (...args: unknown[]) => mocks.users(...args), access: (...args: unknown[]) => mocks.accessCall(...args) },
}));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success } }));
vi.mock("../app/components/buttons/Button", () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) =>
    <button onClick={onClick} disabled={disabled}>{children}</button>,
}));
vi.mock("../app/components/cards/StatCard", () => ({ StatCard: () => null }));
vi.mock("../app/components/modals/AppModal", () => ({
  AppModal: ({open,children,footer,title}: {open:boolean;children:React.ReactNode;footer:React.ReactNode;title:string}) =>
    open ? <section role="dialog" aria-label={title}>{children}{footer}</section> : null,
}));
vi.mock("../app/components/shared/ResponsiveOverlay", () => ({
  ResponsiveOverlay: ({children,footer}: {children:React.ReactNode;footer:React.ReactNode}) => <section>{children}{footer}</section>,
}));
vi.mock("../app/components/modals/SConfirmModal", () => ({
  SConfirmModal: ({title,onConfirm}: {title:string;onConfirm:()=>void}) => <section role="dialog" aria-label={title}><button onClick={onConfirm}>Confirm</button></section>,
}));
vi.mock("../app/components/forms/AppTextField", () => ({ AppTextField: () => null }));
vi.mock("../app/components/forms/AppSelectField", () => ({ AppSelectField: () => null }));
vi.mock("../app/components/forms/AppPasswordField", () => ({ AppPasswordField: () => null }));
vi.mock("../app/components/forms/AppCheckbox", () => ({ AppCheckbox: () => null }));
vi.mock("../app/components/tables", () => ({
  UnifiedDataTable: ({rows,onViewRow,page,onPageChange,onRetry}: {
    rows:Array<{id:string;name:string}>;onViewRow:(row:{id:string;name:string})=>void;
    page:number;onPageChange:(page:number)=>void;onRetry:()=>void;
  }) => <div><span data-testid="page">{page}</span>
    <button onClick={()=>onPageChange(2)}>Page two</button>
    <button onClick={onRetry}>Retry directory</button>
    {rows.map(row => <button key={row.id} onClick={() => onViewRow(row)}>{row.name}</button>)}</div>,
}));
import { SupabaseUserManagementPage } from "../app/pages/administration-requests/SupabaseUserManagementPage";
const member = {user_id:"33333333-3333-4333-8333-333333333333",display_name:"Previous Member",username:"member",email:"member@example.invalid",account_role:"user",account_status:"active",invitation_status:"accepted"};
beforeEach(() => {
  mocks.auth = { isAuthenticated: true, userId: "actor-one" };
  mocks.access = { loaded:true,is_super_admin:true,roles:[],user_assignments:[] };
  mocks.users.mockReset(); mocks.reload.mockReset(); mocks.success.mockReset();
  mocks.users.mockResolvedValue({users:[member]});
  mocks.reload.mockResolvedValue(mocks.access);
});
describe("UAM-01/AC-07 user register authorization lifetime", () => {
  it("discards a confirmation and previous directory immediately when authorization is lost", async () => {
    const view=render(<SupabaseUserManagementPage/>);
    fireEvent.click(await screen.findByRole("button",{name:"Previous Member"}));
    fireEvent.click(screen.getByRole("button",{name:"Suspend User"}));
    expect(screen.getByRole("dialog",{name:"Change User Status"})).toBeInTheDocument();
    mocks.access={...mocks.access,is_super_admin:false};
    view.rerender(<SupabaseUserManagementPage/>);
    expect(screen.queryByRole("dialog",{name:"Change User Status"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Previous Member"})).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Invite User"})).toBeDisabled();
    expect(mocks.users).toHaveBeenCalledTimes(1);
  });
  it("does not publish an old mutation acknowledgement or refresh under the next actor", async () => {
    let finish!: (value: unknown) => void;
    const pending=new Promise(resolve=>{finish=resolve;});
    mocks.users.mockImplementation((action:string) => action==="list" ? Promise.resolve({users:[member]}) : pending);
    const view=render(<SupabaseUserManagementPage/>);
    fireEvent.click(await screen.findByRole("button",{name:"Previous Member"}));
    fireEvent.click(screen.getByRole("button",{name:"Suspend User"}));
    fireEvent.click(screen.getByRole("button",{name:"Confirm"}));
    expect(mocks.users).toHaveBeenCalledWith("set_status",{user_id:member.user_id,status:"suspended"});
    mocks.auth={isAuthenticated:true,userId:"actor-two"};
    mocks.users.mockResolvedValue({users:[]});
    view.rerender(<SupabaseUserManagementPage/>);
    await act(async()=>{finish({ok:true,user:{...member,account_status:"suspended"}});await pending;});
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.users.mock.calls.filter(call=>call[0]==="list")).toHaveLength(2);
    expect(screen.queryByRole("button",{name:"Previous Member"})).not.toBeInTheDocument();
  });
  it("preserves the page during refresh and clamps only after authoritative directory shrink", async () => {
    const users=Array.from({length:11},(_,i)=>({...member,user_id:"member-"+i,display_name:"Member "+i}));
    mocks.users.mockResolvedValue({users});
    render(<SupabaseUserManagementPage/>);
    await screen.findByRole("button",{name:"Member 0"});
    fireEvent.click(screen.getByRole("button",{name:"Page two"}));
    expect(await screen.findByRole("button",{name:"Member 10"})).toBeInTheDocument();
    let finish!: (value: unknown)=>void;
    const pending=new Promise(resolve=>{finish=resolve;});
    mocks.users.mockReturnValueOnce(pending);
    fireEvent.click(screen.getByRole("button",{name:"Retry directory"}));
    expect(screen.getByTestId("page")).toHaveTextContent("2");
    await act(async()=>{finish({users});await pending;});
    expect(screen.getByRole("button",{name:"Member 10"})).toBeInTheDocument();
    mocks.users.mockResolvedValueOnce({users:[users[0]]});
    fireEvent.click(screen.getByRole("button",{name:"Retry directory"}));
    expect(await screen.findByRole("button",{name:"Member 0"})).toBeInTheDocument();
    expect(screen.getByTestId("page")).toHaveTextContent("1");
  });
});
