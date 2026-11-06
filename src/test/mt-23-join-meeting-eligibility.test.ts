import { describe, expect, it } from "vitest";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";
import { filterActionsByAccess } from "../app/services/supabase/actionPermissions";

const joinWindowNow = new Date("2026-11-06T03:45:00.000Z");

function context(options: {
  status?: string;
  userId?: string;
  userName?: string;
  designation?: string;
  now?: Date;
  permissions?: string[];
  participants?: NonNullable<ActionContext["relationships"]>["participants"];
} = {}): ActionContext {
  const userId = options.userId ?? "invitee-1";
  return {
    entity: "meeting",
    record: {
      id: "MTG-MT23",
      meeting_id: "MTG-MT23",
      approval_status: options.status ?? "Published",
      chairperson_user_id: "chair-1",
      organizer_user_id: "organizer-1",
      secretary_user_id: "secretary-1",
      secretary: "Assigned Secretary",
      meeting_date: "2026-11-06",
      start_time: "10:00",
      time_zone: "Asia/Dhaka (GMT+6)",
    },
    currentUser: {
      id: userId,
      name: options.userName ?? "Alex Lee",
      designation: options.designation,
    },
    userRole: "Board Member",
    permissions: options.permissions ?? ["mtg_view", "mtg_join"],
    now: options.now ?? joinWindowNow,
    relationships: { participants: options.participants ?? [] },
  };
}

function action(ctx: ActionContext, id: string) {
  return resolveMeetingActions(ctx).find(item => item.id === id && item.visible);
}

function invite(userId = "invitee-1", name = "Alex Lee") {
  return [{ meeting_id: "MTG-MT23", person_name: name, user_id: userId, role: "Member" }];
}

describe("MT-23 invited participant meeting access", () => {
  it("offers Join only to an explicitly linked participant inside the published meeting window", () => {
    const ctx = context({ participants: invite() });
    const join = action(ctx, "join");

    expect(join?.enabled).toBe(true);
    expect(filterActionsByAccess("meeting", join ? [join] : [], ctx.permissions, false)).toEqual([join]);
  });

  it("does not admit an uninvited user or a same-name user conflicting with a canonical invitation", () => {
    expect(action(context(), "join")).toBeUndefined();

    const lookalike = context({
      userId: "lookalike-2",
      participants: [
        ...invite("invitee-1", "Alex Lee"),
        { meeting_id: "MTG-MT23", person_name: "Alex Lee", role: "Member" },
      ],
    });
    expect(action(lookalike, "join")).toBeUndefined();
  });

  it("keeps legacy name-only invitations usable when no conflicting user link exists", () => {
    const legacyInvite = context({
      participants: [{ meeting_id: "MTG-MT23", person_name: "Alex Lee", role: "Member" }],
    });
    expect(action(legacyInvite, "join")?.enabled).toBe(true);
  });

  it("does not let a job title override a different secretary assigned to this meeting", () => {
    const otherSecretary = context({
      userId: "secretary-2",
      userName: "Another Secretary",
      designation: "Board Secretary",
    });
    expect(action(otherSecretary, "join")).toBeUndefined();
    expect(action(context({
      status: "In Progress",
      userId: "secretary-2",
      userName: "Another Secretary",
      designation: "Board Secretary",
    }), "rejoin")).toBeUndefined();
  });

  it("allows the explicitly assigned secretary to join or rejoin", () => {
    const secretary = context({ userId: "secretary-1", userName: "Assigned Secretary" });
    expect(action(secretary, "join")?.enabled).toBe(true);
    expect(action(context({
      status: "In Progress",
      userId: "secretary-1",
      userName: "Assigned Secretary",
    }), "rejoin")?.enabled).toBe(true);
  });

  it("requires the SQL-backed mtg_join grant for the action to survive access filtering", () => {
    const ctx = context({ permissions: ["mtg_view"], participants: invite() });
    const join = action(ctx, "join");
    expect(join).toBeDefined();
    expect(filterActionsByAccess("meeting", join ? [join] : [], ctx.permissions, false)).toEqual([]);
  });

  it("keeps the saved 15-minute early and 2-hour late join boundaries clear", () => {
    const invitee = invite();
    const tooEarly = action(context({
      participants: invitee,
      now: new Date("2026-11-06T03:44:00.000Z"),
    }), "join");
    expect(tooEarly?.enabled).toBe(false);
    expect(tooEarly?.disabledReason).toContain("available 15 minutes before");

    const closed = action(context({
      participants: invitee,
      now: new Date("2026-11-06T06:00:00.001Z"),
    }), "join");
    expect(closed?.enabled).toBe(false);
    expect(closed?.disabledReason).toContain("ended 2 hours after");
  });

  it("requires publication before joining and preserves rejoin for active meetings", () => {
    const invited = invite();
    expect(action(context({ status: "Scheduled", participants: invited }), "join")).toBeUndefined();
    expect(action(context({ status: "Approved", participants: invited }), "join")).toBeUndefined();
    expect(action(context({ status: "In Progress", participants: invited }), "rejoin")?.enabled).toBe(true);
  });
});
