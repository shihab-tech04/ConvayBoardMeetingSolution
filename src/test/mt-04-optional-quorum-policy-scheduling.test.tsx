import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MeetingReviewPanel } from "../app/components/forms/MeetingReviewPanel";

const wizard = readFileSync("src/app/pages/return-register/OnlineReturnRegisterPage.tsx", "utf8");
const review = readFileSync("src/app/components/forms/MeetingReviewPanel.tsx", "utf8");
const projection = readFileSync("src/app/components/forms/QuorumAndAccessPanel.tsx", "utf8");
const start = readFileSync("src/app/components/meetings/PreMeetingReadinessPanel.tsx", "utf8");

describe("MT-04 schedule a meeting when no quorum policy is configured", () => {
  it("allows Step 4 and server-backed scheduling without a locally invented quorum rule", () => {
    expect(wizard).not.toContain("An active, verified quorum rule is required for this Board / Committee");
    expect(wizard).not.toContain('blockers.push("No active quorum rule found for the selected Board / Committee")');
    expect(wizard).toContain("const accessError = meetingAccessBlockers(values)[0]");
    expect(wizard).toContain("blockers.push(...meetingAccessBlockers(values))");
    expect(wizard).toContain("blockers.push(...validateMeetingIdentity(identity))");
    expect(wizard).toContain("blockers.push(...validateMeetingSchedule(schedule))");
    expect(wizard).toContain("At least one quorum-eligible participant is required");
    expect(wizard).toContain("At least one required participant must be assigned");
    expect(wizard).toContain('quorum_forecast: "Pending"');
  });

  it("shows a truthful missing-policy projection, not a scheduling error", () => {
    render(<MeetingReviewPanel
      values={{ meeting_title: "Board meeting without configured policy", committee: "GB-1",
        meeting_date: "2026-12-15", start_time: "10:00", end_time: "11:00",
        chairperson: "user-chair", secretary: "user-secretary", organizer: "user-chair",
        participant_links_json: "[]", selected_agenda_ids_json: "[]" }}
      onGoToStep={() => {}}
      governanceBodies={[]}
      quorumRules={[]}
    />);
    expect(screen.getByText("Quorum not configured — scheduling is allowed")).toBeTruthy();
    expect(screen.queryByText("Quorum rules must be configured")).toBeNull();
    expect(review).not.toContain("Projected quorum not met (");
    expect(projection).toContain("You can continue and schedule this meeting without a quorum rule");
    expect(projection).toContain("no threshold will be assumed");
    expect(projection).toContain('role="status"');
  });

  it("leaves the authoritative quorum/attendance start verification intact", () => {
    expect(start).toContain("calculateMeetingQuorum({");
    expect(start).toContain('warnings.push(quorumResult.status === "not_configured"');
    expect(start).toContain("Required leadership not present");
    expect(start).toContain("attendanceEditVersion.current !== editVersion");
  });
});
