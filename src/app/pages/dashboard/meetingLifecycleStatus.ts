import { calendarDateWindows } from "./calendarDateWindows";

export type LifecycleStage =
  | "Preparation Required"
  | "Awaiting Approval"
  | "Ready to Publish"
  | "Upcoming Meeting"
  | "Ready to Start"
  | "Meeting Live"
  | "Meeting Paused"
  | "Post-Meeting Follow-up";

/**
 * HM-06: classify the actual persisted status before displaying a lifecycle
 * stage. A paused meeting is not an upcoming meeting; "Awaiting Approval" and
 * "Ready to Start" are explicit transitions, not an unknown status fallback.
 */
export function resolveLifecycleStage(
  rawStatus: unknown,
  rawDate: unknown,
  now: Date = new Date(),
): { stage: LifecycleStage } {
  const status = String(rawStatus ?? "").trim().toLocaleLowerCase();

  if (status === "draft") return { stage: "Preparation Required" };
  if (status === "pending approval" || status === "awaiting approval") {
    return { stage: "Awaiting Approval" };
  }
  if (status === "approved") return { stage: "Ready to Publish" };
  if (status === "ready to start") return { stage: "Ready to Start" };
  if (status === "in progress") return { stage: "Meeting Live" };
  if (status === "paused" || status === "on break" || status === "on hold") {
    return { stage: "Meeting Paused" };
  }
  if (["awaiting minutes", "minutes draft", "awaiting review", "minutes approved",
       "completed", "adjourned"].includes(status)) {
    return { stage: "Post-Meeting Follow-up" };
  }

  if (status === "scheduled" || status === "published") {
    const date = String(rawDate ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { stage: "Preparation Required" };
    const { tomorrow } = calendarDateWindows(now);
    return { stage: date <= tomorrow ? "Ready to Start" : "Upcoming Meeting" };
  }

  // Never represent unknown/cancelled/rejected statuses as upcoming by default.
  return { stage: "Preparation Required" };
}
