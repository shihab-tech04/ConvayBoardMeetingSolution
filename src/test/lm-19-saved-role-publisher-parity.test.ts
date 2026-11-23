import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  canOfferRegularMeetingPublishing, savedRegularMeetingRole,
} from "../app/pages/meetings/regularMeetingRoleProjection";
import { canPublishOnlineMeeting } from "../../supabase/functions/convay-livekit/publisherGrant";
import type { AdmissionContext } from "../../supabase/functions/convay-livekit/admission";

const context = (roles: Array<string | undefined>, isSuperAdmin = false): AdmissionContext => ({
  meeting: {
    id: "MTG-1", meeting_id: "MTG-1", mode: "Virtual",
    approval_status: "In Progress",
  },
  session: { meeting_id: "MTG-1", session_status: "active" },
  links: roles.map(participant_type => ({
    meeting_id: "MTG-1", user_id: "member-1", participant_type,
  })),
  userId: "member-1", isSuperAdmin, permissions: ["mtg_join"],
});
const clientDecision = (roles: Array<string | undefined>, canJoin = true, admin = false, leader = false) =>
  canOfferRegularMeetingPublishing(roles.map(participant_type => ({ participant_type })), canJoin, admin, leader);

describe("WS-E LM-19 saved LiveKit role UI mirrors token publisher authority", () => {
  it.each([
    ["Chairperson", "Chairperson"], ["Chair", "Chairperson"],
    ["Company Secretary", "Company Secretary"], ["Meeting Secretary", "Company Secretary"],
    ["Member", "Board Member"], ["Board Member", "Board Member"],
    ["Independent Director", "Independent Director"], ["Presenter", "Presenter"],
    ["Organizer", "Administrator"], ["Administrator", "Administrator"],
    ["Observer", "Observer"], ["Guest", "Guest"],
  ] as const)("projects saved %s role as %s without role inflation", (saved, expected) => {
    expect(savedRegularMeetingRole(saved)).toBe(expected);
  });

  it.each([
    "Chairperson", "Chair", "Company Secretary", "Meeting Secretary",
    "Member", "Board Member", "Independent Director", "Presenter",
    "Organizer", "Administrator", " observer ", "GUEST", "Invitee",
    "Secretary", "Unknown", "", "  ", "chairman", "Auditor",
  ])("matches server media publishing decision for saved role %s", saved => {
    expect(clientDecision([saved])).toBe(canPublishOnlineMeeting(context([saved])));
  });

  it("never treats an unknown role as a default Board Member or presenter", () => {
    for (const role of [undefined, "", "Invitee", "Auditor", "Guest Observer", "Chairman"]) {
      expect(savedRegularMeetingRole(role)).toBe("Observer");
      expect(clientDecision([role])).toBe(false);
    }
  });

  it("an unknown or viewer-only duplicate link overrides a publisher row", () => {
    for (const second of ["Observer", "Guest", "Invitee", undefined]) {
      const saved = ["Presenter", second];
      expect(clientDecision(saved)).toBe(false);
      expect(canPublishOnlineMeeting(context(saved))).toBe(false);
    }
    expect(clientDecision(["Presenter", "Chair"])).toBe(true);
  });

  it("requires join entitlement and verified ID-based leadership when unlinked", () => {
    expect(clientDecision(["Presenter"], false)).toBe(false);
    expect(clientDecision([])).toBe(false);
    expect(clientDecision([], true, false, true)).toBe(true);
    expect(clientDecision([], false, false, true)).toBe(false);
    expect(clientDecision(["Observer"], true, false, true)).toBe(false);
  });

  it("preserves trusted global Super Admin media rights", () => {
    expect(clientDecision(["Observer"], false, true)).toBe(true);
    expect(clientDecision([], false, true)).toBe(true);
    expect(canPublishOnlineMeeting(context(["Observer"], true))).toBe(true);
  });

  it("workspace verifies every saved role and never grants online leadership by display name", () => {
    const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");
    const projection = workspace.slice(
      workspace.indexOf("const myLinks = meetingLinks.filter"),
      workspace.indexOf("// The single Super Admin has full Maker/Checker"),
    );
    expect(projection).toContain("savedRegularMeetingRole(myLink.participant_type)");
    expect(projection).toContain("myLinks.length > 1 && !myLinks.every");
    expect(projection).toContain("(!isOnlineMeeting && meeting?.chairperson === currentUser.name)");
    expect(projection).not.toContain('return "Board Member";');
    expect(workspace).toContain("access.loaded && canOfferRegularMeetingPublishing(");
  });
});
