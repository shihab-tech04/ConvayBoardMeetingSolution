import { describe, expect, it } from "vitest";
import { resolveLifecycleStage } from "../app/pages/dashboard/meetingLifecycleStatus";

const now = new Date(2026, 10, 5, 9, 0);

describe("HM-06 meeting lifecycle indicators", () => {
  const stage = (status: unknown, date = "2026-11-07") =>
    resolveLifecycleStage(status, date, now).stage;

  it("recognizes every primary meeting lifecycle transition", () => {
    expect(stage("Draft")).toBe("Preparation Required");
    expect(stage("Pending Approval")).toBe("Awaiting Approval");
    expect(stage("Awaiting Approval")).toBe("Awaiting Approval");
    expect(stage("Approved")).toBe("Ready to Publish");
    expect(stage("Ready to Start")).toBe("Ready to Start");
    expect(stage("In Progress")).toBe("Meeting Live");
    expect(stage("Completed")).toBe("Post-Meeting Follow-up");
  });

  it("never mislabels paused or on-break meetings as upcoming meetings", () => {
    expect(stage("Paused")).toBe("Meeting Paused");
    expect(stage("On Break")).toBe("Meeting Paused");
    expect(stage("On Hold")).toBe("Meeting Paused");
  });

  it("maps minutes-related transitions to follow-up", () => {
    for (const s of ["Awaiting Minutes", "Minutes Draft", "Awaiting Review", "Minutes Approved", "Adjourned"]) {
      expect(stage(s)).toBe("Post-Meeting Follow-up");
    }
  });

  it("shows upcoming for future scheduled meetings but ready for today and tomorrow", () => {
    expect(stage("Scheduled", "2026-11-10")).toBe("Upcoming Meeting");
    expect(stage("Published", "2026-11-06")).toBe("Ready to Start");
    expect(stage("Scheduled", "2026-11-05")).toBe("Ready to Start");
  });

  it("never invents an upcoming meeting from cancelled, rejected or missing-date states", () => {
    expect(stage("Cancelled")).toBe("Preparation Required");
    expect(stage("Rejected")).toBe("Preparation Required");
    expect(stage("Some Unknown State")).toBe("Preparation Required");
    expect(stage("Scheduled", "")).toBe("Preparation Required");
  });
});
