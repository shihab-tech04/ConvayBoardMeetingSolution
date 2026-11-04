import { describe, expect, it } from "vitest";
import { Calendar } from "lucide-react";
import type { ResolvedAction } from "../app/actions/types";
import {
  mayAutoAdvanceMeetings,
  selectAvailableDirectMeetingAction,
} from "../app/pages/dashboard/meetingDirectActions";

function action(
  id: string,
  overrides: Partial<ResolvedAction> = {},
): ResolvedAction {
  return {
    id, label: id, icon: Calendar,
    tone: "primary", placement: "direct", priority: 10,
    visible: true, enabled: true, ...overrides,
  };
}

describe("HM-05 eligible meeting CTAs", () => {
  it("never chooses a disabled top-priority action as a clickable CTA", () => {
    const selected = selectAvailableDirectMeetingAction([
      action("start_meeting", { priority: 1, enabled: false }),
      action("view_details", { priority: 10 }),
    ]);
    expect(selected?.id).toBe("view_details");
  });

  it("does not render an unauthorized or hidden action in the hero or meeting row", () => {
    expect(selectAvailableDirectMeetingAction([
      action("hidden-admin-action", { visible: false }),
      action("disabled-participant-action", { enabled: false }),
    ])).toBeNull();
  });

  it("ignores actions intended for the More menu", () => {
    const selected = selectAvailableDirectMeetingAction([
      action("more_action", { placement: "more", priority: 1 }),
      action("join_meeting", { priority: 4 }),
    ]);
    expect(selected?.id).toBe("join_meeting");
  });

  it("chooses the lowest priority among enabled direct actions without mutating the source array", () => {
    const source = [action("late", { priority: 40 }), action("early", { priority: 2 })];
    expect(selectAvailableDirectMeetingAction(source)?.id).toBe("early");
    expect(source.map(a => a.id)).toEqual(["late", "early"]);
  });

  it("handles no available actions", () => {
    expect(selectAvailableDirectMeetingAction([])).toBeNull();
    expect(selectAvailableDirectMeetingAction([action("blocked", { enabled: false })])).toBeNull();
  });
});

describe("HM-05 hero carousel accessibility", () => {
  it("does not advance a single slide or empty carousel", () => {
    expect(mayAutoAdvanceMeetings(0, false, false, false)).toBe(false);
    expect(mayAutoAdvanceMeetings(1, false, false, false)).toBe(false);
  });

  it("pauses autoplay during hover, keyboard focus and reduced-motion preference", () => {
    expect(mayAutoAdvanceMeetings(3, true, false, false)).toBe(false);
    expect(mayAutoAdvanceMeetings(3, false, true, false)).toBe(false);
    expect(mayAutoAdvanceMeetings(3, false, false, true)).toBe(false);
    expect(mayAutoAdvanceMeetings(3, false, false, false)).toBe(true);
  });
});
