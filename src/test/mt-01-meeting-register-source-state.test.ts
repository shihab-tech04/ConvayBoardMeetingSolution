import { describe, expect, it } from "vitest";
import { buildMeetingRegisterFilters, meetingRegisterSourceState } from "../app/pages/return-register/meetingRegisterReadiness";

describe("MT-01 All Meetings register: source of truth", () => {
  const sample = [
    { id: "1", meeting_title: "Board", meeting_type: "Regular", committee: "Board of Directors", meeting_year: "2026", meeting_date: "2026-11-05" },
    { id: "2", meeting_title: "Audit", meeting_type: "Special", committee: "Audit Committee", meeting_year: "2027", meeting_date: "2027-01-12" },
    { id: "3", meeting_title: "Another", meeting_type: "Regular", committee: "Board of Directors", meeting_year: "2026", meeting_date: "2026-11-12" },
  ];

  it("builds the meeting type and governance body filters from loaded meeting records", () => {
    const defs = buildMeetingRegisterFilters(sample);
    expect(defs.find(def => def.key === "meeting_type")?.options).toEqual(["All", "Regular", "Special"]);
    expect(defs.find(def => def.key === "committee")?.options).toEqual(["All", "Audit Committee", "Board of Directors"]);
    expect(defs.find(def => def.key === "meeting_year")?.options).toEqual(["All", "2027", "2026"]);
  });

  it("preserves date filters and does not render irrelevant tax/jurisdiction choices", () => {
    const defs = buildMeetingRegisterFilters(sample);
    expect(defs.filter(def => def.type === "date").map(def => def.key)).toEqual(["from", "to"]);
    expect(JSON.stringify(defs)).not.toContain("Tax Circle");
  });

  it("does not show an empty register while SQL is loading", () => {
    expect(meetingRegisterSourceState([{ loading: false }, { loading: true }])).toEqual({ dataLoading: true, dataError: null });
  });

  it("prioritizes a failed SQL read over pending or empty registry results", () => {
    expect(meetingRegisterSourceState([{ loading: true }, { error: "No network" }])).toEqual({ dataLoading: false, dataError: "No network" });
  });

  it("allows an actual empty register only after all reads finish successfully", () => {
    expect(meetingRegisterSourceState([{ loading: false, error: null }, {}])).toEqual({ dataLoading: false, dataError: null });
  });
});
