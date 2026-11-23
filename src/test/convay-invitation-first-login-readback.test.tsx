import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const hooks = vi.hoisted(() => ({
  navigate: vi.fn(), dispatch: vi.fn(), verify: vi.fn(), complete: vi.fn(),
  signOut: vi.fn(), reload: vi.fn(), clearAccess: vi.fn(), clearEntities: vi.fn(),
}));
vi.mock("react-router", () => ({ useNavigate: () => hooks.navigate }));
vi.mock("react-redux", () => ({ useDispatch: () => hooks.dispatch }));
vi.mock("../app/services/supabase/invitationCallback", () => ({
  readSupabaseInvitationCallback: () => ({accessToken:"verified-invite-token",type:"invite",error:""}),
}));
vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: {
    verifyInvitation: (...args: unknown[]) => hooks.verify(...args),
    completeInvitation: (...args: unknown[]) => hooks.complete(...args),
    signOut: () => hooks.signOut(),
  },
  profileToCurrentUser: (profile: {user_id:string;display_name:string}) =>
    ({id:profile.user_id,name:profile.display_name}),
}));
vi.mock("../app/services/supabase/convayAccess", () => ({
  reloadAccessSnapshot: () => hooks.reload(),
  clearAccessSnapshot: () => hooks.clearAccess(),
}));
vi.mock("../app/hooks/useEntityRegistry", () => ({
  clearEntityRegistryCache: () => hooks.clearEntities(),
}));
vi.mock("../app/components/forms/AppTextField", () => ({
  AppTextField: ({id,label,value,readOnly}: {id:string;label:string;value:string;readOnly?:boolean}) =>
    <label htmlFor={id}>{label}<input id={id} value={value} readOnly={readOnly}/></label>,
}));
vi.mock("../app/components/forms/AppPasswordField", () => ({
  AppPasswordField: ({id,label,value,onChange}: {id:string;label:string;value:string;onChange:(x:string)=>void}) =>
    <label htmlFor={id}>{label}<input type="password" id={id} value={value}
      onChange={event => onChange(event.target.value)}/></label>,
}));
vi.mock("../app/components/buttons/Button", () => ({
  Button: ({children,loading:_loading,fullWidth:_fullWidth,variant:_variant,size:_size,...props}:
    React.ButtonHTMLAttributes<HTMLButtonElement> &
    {loading?:boolean;fullWidth?:boolean;variant?:string;size?:string}) =>
    <button {...props}>{children}</button>,
}));
import { InvitationAcceptancePage } from "../app/pages/auth/InvitationAcceptancePage";

const profile = {
  user_id:"11111111-1111-4111-8111-111111111111",
  display_name:"Invited Member",account_status:"active",
};
beforeEach(() => {
  vi.clearAllMocks();
  hooks.verify.mockResolvedValue({email:"member@example.com"});
  hooks.complete.mockResolvedValue(profile);
  hooks.reload.mockResolvedValue({loaded:true,is_super_admin:false,effective_permissions:["home_dashboard"]});
  hooks.signOut.mockResolvedValue(undefined);
});

async function submitInvite() {
  render(<InvitationAcceptancePage/>);
  expect(await screen.findByDisplayValue("member@example.com")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Create password"), {target:{value:"strong-password-123"}});
  fireEvent.change(screen.getByLabelText("Confirm password"), {target:{value:"strong-password-123"}});
  fireEvent.click(screen.getByRole("button",{name:"Verify and activate account"}));
}

describe("verified invitation first-login and SQL access readback", () => {
  it("clears previous account data, verifies new permissions, then enters the authenticated shell", async () => {
    await submitInvite();
    await waitFor(() => expect(hooks.navigate).toHaveBeenCalledWith("/home/overview",{replace:true}));
    expect(hooks.complete).toHaveBeenCalledWith("verified-invite-token","member@example.com","strong-password-123");
    expect(hooks.clearAccess).toHaveBeenCalled();
    expect(hooks.clearEntities).toHaveBeenCalled();
    expect(hooks.reload).toHaveBeenCalledOnce();
    const actions = hooks.dispatch.mock.calls.map(([action]) => action);
    expect(actions.map(action=>action.type)).toEqual(["currentUser/setCurrentUser","auth/login"]);
    expect(actions[1].payload).toEqual({userId:profile.user_id});
    const resultOrder = hooks.reload.mock.invocationCallOrder[0];
    expect(hooks.dispatch.mock.invocationCallOrder[0]).toBeGreaterThan(resultOrder);
    expect(hooks.signOut).not.toHaveBeenCalled();
  });

  it("does not repeat an already accepted invitation if permission readback fails", async () => {
    hooks.reload.mockRejectedValueOnce(new Error("SQL unavailable"));
    await submitInvite();
    expect(await screen.findByText("Your invited account is now active.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/workspace access could not be verified/i);
    expect(screen.queryByRole("button",{name:"Verify and activate account"})).not.toBeInTheDocument();
    expect(hooks.signOut).toHaveBeenCalledOnce();
    expect(hooks.dispatch).not.toHaveBeenCalled();
    expect(hooks.navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Sign in to continue"}));
    expect(hooks.navigate).toHaveBeenCalledWith("/",{replace:true});
    expect(hooks.complete).toHaveBeenCalledTimes(1);
  });

  it("does not activate or grant session access for an invalid invitation link", async () => {
    hooks.verify.mockRejectedValueOnce(new Error("Invalid invitation"));
    render(<InvitationAcceptancePage/>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid invitation");
    expect(screen.queryByRole("button",{name:"Verify and activate account"})).not.toBeInTheDocument();
    expect(hooks.complete).not.toHaveBeenCalled();
    expect(hooks.dispatch).not.toHaveBeenCalled();
  });
});
