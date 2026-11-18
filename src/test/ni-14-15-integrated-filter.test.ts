import { describe, expect, it } from "vitest";
import { filterVerifiedIntegrations } from "../app/pages/administration/filterVerifiedIntegrations";
const cards = [
  { id: "smtp-email", name: "SMTP Email", description: "Meeting email", category: "Communication", status: "Connected" as const },
  { id: "sms", name: "SMS Gateway", description: "Alerts", category: "Communication", status: "Error" as const },
  { id: "calendar", name: "Calendar", description: "Outlook", category: "Calendar", status: "Pending Setup" as const },
  { id: "zoom", name: "Zoom", description: "Online meetings", category: "Video Conferencing", status: "Disconnected" as const },
];
const run = (category = "All", status: "All" | typeof cards[number]["status"] = "All", search = "") =>
  filterVerifiedIntegrations(cards, { category, status, search }).map(c => c.id);

describe("NI-14/NI-15 shared connection status search and filters", () => {
  it("returns all canonical cards with no filters", () => expect(run()).toEqual(cards.map(c => c.id)));
  it("filters verified connected", () => expect(run("All", "Connected")).toEqual(["smtp-email"]));
  it("filters verified failures", () => expect(run("All", "Error")).toEqual(["sms"]));
  it("filters pending", () => expect(run("All", "Pending Setup")).toEqual(["calendar"]));
  it("filters disconnected", () => expect(run("All", "Disconnected")).toEqual(["zoom"]));
  it("category and status intersect", () => expect(run("Communication", "Error")).toEqual(["sms"]));
  it("category and status exclusions are empty", () => expect(run("Calendar", "Connected")).toEqual([]));
  it("search is case insensitive", () => expect(run("All", "All", "  onLine  ")).toEqual(["zoom"]));
  it("search works on description", () => expect(run("All", "All", "outLOOK")).toEqual(["calendar"]));
  it("search works on category", () => expect(run("All", "All", "communicaTION")).toEqual(["smtp-email", "sms"]));
  it("does not mutate caller's array", () => {
    const copy = JSON.stringify(cards);
    run("Communication", "Error", "alerts");
    expect(JSON.stringify(cards)).toBe(copy);
  });
});
