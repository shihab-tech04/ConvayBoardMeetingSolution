import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocked = vi.hoisted(() => ({
  remove: vi.fn(), add: vi.fn(), refresh: vi.fn(), meetingRefresh: vi.fn(),
  getParticipant: vi.fn(), getMeeting: vi.fn(), error: vi.fn(), success: vi.fn(),
  meeting: {id:"record-m1",meeting_id:"m1",meeting_title:"Test",chairperson_user_id:"c1",chairperson:"Chair",secretary_user_id:"s1",secretary:"Secretary",organizer_user_id:"o1",organizer:"Organizer"},
  participants: [
    {id:"p-secretary",participant_id:"PS",meeting_id:"m1",user_id:"s1",role:"Member",name:"Secretary",attendance_requirement:"Mandatory",rsvp_status:"Pending"},
    {id:"p-member",participant_id:"PM",meeting_id:"m1",user_id:"m2",role:"Member",name:"Ordinary Member",attendance_requirement:"Optional",rsvp_status:"Pending"},
  ],
}));
vi.mock("sonner",()=>({toast:{error:mocked.error,success:mocked.success}}));
vi.mock("../app/data/boardMeetingData",async(importOriginal)=>({
  ...await importOriginal<typeof import("../app/data/boardMeetingData")>(),
  useParticipantRegistry:()=>({items:mocked.participants,add:mocked.add,remove:mocked.remove,refresh:mocked.refresh,getById:mocked.getParticipant}),
  useMeetingRegistry:()=>({items:[mocked.meeting],refresh:mocked.meetingRefresh,getById:mocked.getMeeting}),
}));
vi.mock("../app/components/modals/AppModal",()=>({AppModal:({children,footer}:{children:React.ReactNode;footer:React.ReactNode})=><section role="dialog">{children}{footer}</section>}));
vi.mock("../app/components/buttons/PrimaryButton",()=>({PrimaryButton:(props:React.ButtonHTMLAttributes<HTMLButtonElement>)=><button {...props}/>}));
vi.mock("../app/components/buttons/SecondaryButton",()=>({SecondaryButton:(props:React.ButtonHTMLAttributes<HTMLButtonElement>)=><button {...props}/>}));
vi.mock("../app/components/tables",()=>({UnifiedDataTable:({rows,onActionClick}:{rows:{id:string;name:string}[];onActionClick:(id:string,row:{id:string;name:string})=>void})=><div>{rows.map(row=><button key={row.id} onClick={()=>onActionClick("remove",row)}>Remove {row.name}</button>)}</div>}));
import { ManageParticipantsModal } from "../app/pages/meetings/MeetingContextualModals";
beforeEach(()=>{
  vi.clearAllMocks();
  mocked.refresh.mockResolvedValue(undefined); mocked.meetingRefresh.mockResolvedValue(undefined);
  mocked.getMeeting.mockReturnValue(mocked.meeting);
  mocked.getParticipant.mockImplementation((id:string)=>mocked.participants.find(p=>p.id===id));
  mocked.remove.mockResolvedValue(true); mocked.add.mockResolvedValue(true);
});
describe("WS1 contextual roster protection and acknowledgement",()=>{
  it("refreshes current SQL identity and denies removal of the assigned secretary even with a changed displayed role",async()=>{
    render(<ManageParticipantsModal meeting={mocked.meeting} onClose={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Remove Secretary"}));
    await waitFor(()=>expect(mocked.error).toHaveBeenCalledWith(expect.stringMatching(/leadership cannot be removed/i)));
    expect(mocked.meetingRefresh).toHaveBeenCalled(); expect(mocked.refresh).toHaveBeenCalled();
    expect(mocked.remove).not.toHaveBeenCalled(); expect(mocked.success).not.toHaveBeenCalled();
  });
  it("does not claim success when SQL denies removal and permits retry",async()=>{
    mocked.remove.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<ManageParticipantsModal meeting={mocked.meeting} onClose={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Remove Ordinary Member"}));
    await waitFor(()=>expect(mocked.error).toHaveBeenCalledWith(expect.stringMatching(/not removed/i)));
    expect(mocked.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Remove Ordinary Member"}));
    await waitFor(()=>expect(mocked.success).toHaveBeenCalledWith("Participant removed."));
    expect(mocked.remove).toHaveBeenCalledTimes(2);
  });
  it("waits for add acknowledgement, preserves the three-way classification and suppresses duplicate writes",async()=>{
    let accept!:(ok:boolean)=>void;
    mocked.add.mockImplementationOnce(()=>new Promise<boolean>(resolve=>{accept=resolve;}));
    render(<ManageParticipantsModal meeting={mocked.meeting} onClose={vi.fn()}/>);
    fireEvent.change(screen.getByPlaceholderText("Full name or email"),{target:{value:"Invitee"}});
    const selects=screen.getAllByRole("combobox");
    fireEvent.change(selects[1],{target:{value:"By Invitation"}});
    fireEvent.click(screen.getByRole("button",{name:"Add"}));
    expect(mocked.add).toHaveBeenCalledTimes(1);
    expect(mocked.add).toHaveBeenCalledWith(expect.objectContaining({attendance_requirement:"By Invitation"}));
    expect(mocked.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Add"}));
    expect(mocked.add).toHaveBeenCalledTimes(1);
    await act(async()=>accept(true));
    await waitFor(()=>expect(mocked.success).toHaveBeenCalledWith("Participant added."));
  });
});
