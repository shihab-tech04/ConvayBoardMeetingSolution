import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  activeMeetingGovernanceOptions,
  meetingGovernanceSetupState,
} from "../app/pages/return-register/meetingCreatePrerequisites";

const meetingPage = readFileSync("src/app/pages/return-register/OnlineReturnRegisterPage.tsx", "utf8");
const quorumPanel = readFileSync("src/app/components/forms/QuorumAndAccessPanel.tsx", "utf8");
const meetingFields = readFileSync("src/app/pages/boardMeetingFormFields.ts", "utf8");

describe("MT-04 Create Meeting setup, options, recovery and safe scheduling", () => {
  const bodies = [
    { id: "gb-active", body_name: "Board A", status: "Active" },
    { id: "gb-inactive", body_name: "Board B", status: "Inactive" },
    { body_id: "GB-3", body_name: "Committee C", status: "Active" },
    { id: "gb-empty", body_name: "", status: "Active" },
  ];

  it("exposes only persisted active governance bodies with canonical values", () => {
    expect(activeMeetingGovernanceOptions(bodies)).toEqual([
      { value: "gb-active", label: "Board A" },
      { value: "GB-3", label: "Committee C" },
    ]);
  });
  it("does not invent or duplicate empty, suspended, missing or repeated body entries", () => {
    expect(activeMeetingGovernanceOptions([
      { id: "1", body_name: "First", status: "Active" },
      { id: "1", body_name: "Duplicate", status: "Active" },
      { id: "2", body_name: "Suspended", status: "Suspended" },
      { id: "", body_name: "Missing id", status: "Active" },
    ])).toEqual([{ value: "1", label: "First" }]);
    expect(activeMeetingGovernanceOptions([])).toEqual([]);
  });
  it("distinguishes loading, SQL error, empty and available choices", () => {
    expect(meetingGovernanceSetupState(true, null, [])).toBe("loading");
    expect(meetingGovernanceSetupState(false, "SQL read failed", [])).toBe("error");
    expect(meetingGovernanceSetupState(false, null, [])).toBe("missing");
    expect(meetingGovernanceSetupState(false, null, [{ value: "1", label: "Board" }])).toBe("ready");
  });
  it("keeps meeting fields, five-step navigation, Draft and protected scheduling", () => {
    expect(meetingFields).toContain('key: "committee"');
    expect(meetingPage).toContain("formSteps:       MEETING_FORM_STEPS");
    expect(meetingPage).toContain("onSaveDraft: async");
    expect(meetingPage).toContain('lastStepSubmitLabel: "Schedule Meeting"');
    expect(meetingPage).not.toContain('blockers.push("No active quorum rule found for the selected Board / Committee")');
    expect(meetingPage).toContain("activeMeetingGovernanceOptions(govRegistry.items)");
    expect(meetingPage).toContain("validateCreateStep: (step, values)");
    expect(meetingPage).toContain("Mark at least one participant as required.");
    expect(meetingPage).toContain("validateOptionalMeetingAgendas(selected, agendaRegistry.items)[0]");
    expect(meetingPage).toContain("validateOptionalMeetingAgendas(agendaEntriesParsed, agendaRegistry.items)");
    expect(meetingPage).not.toContain("At least one approved agenda must be selected");
    expect(meetingPage).not.toContain("An active, verified quorum rule is required");
    expect(meetingPage).toContain('blockers.push("At least one quorum-eligible participant is required")');
  });
  it("shows actionable authenticated registry setup without discarding wizard state", () => {
    expect(meetingPage).toContain("No active Board / Committee is configured");
    expect(meetingPage).toContain("target=\"_blank\"");
    expect(meetingPage).toContain("governance-org/governance-bodies");
    expect(meetingPage).toContain("Refresh Board / Committee list");
    expect(quorumPanel).toContain("No active quorum rule is configured");
    expect(quorumPanel).toContain("You can continue and schedule this meeting without a quorum rule");
    expect(quorumPanel).toContain("administration/meeting-configuration/quorum-rules");
    expect(quorumPanel).not.toContain("Set quorum rules in the form below");
  });
});
