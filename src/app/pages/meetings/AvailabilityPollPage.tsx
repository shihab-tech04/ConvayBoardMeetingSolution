import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, KpiDef, TableRow } from "../modulePageUtils";
import { fc, BADGE, BASE_FILTERS } from "../modulePageUtils";
import { ROW_VIEW, EDIT } from "../../data/modulePageConfigs";
import { POLL_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { useAvailabilityPollRegistry, useMeetingRegistry } from "../../data/boardMeetingData";
import { patchFormOptions } from "../../utils/patchFormOptions";
import { AVAILABILITY_POLL_FORM_FIELDS } from "../boardMeetingFormFields";

export function AvailabilityPollPage() {
  const { items: polls, add: addPoll, update: updatePoll } = useAvailabilityPollRegistry();
  const meetingReg = useMeetingRegistry();
  const meetingOptions = meetingReg.items.map(m => ({
    value: m.meeting_id ?? m.id,
    label: [m.meeting_title, m.meeting_date ? m.meeting_date.slice(0, 10) : ""].filter(Boolean).join(" — "),
  }));
  const dynamicFields = patchFormOptions(AVAILABILITY_POLL_FORM_FIELDS, {
    related_meeting_id: meetingOptions,
  });

  const rows: TableRow[] = polls.map(p => ({
    ...p,
    id:                    p.id,
    meeting_title:         p.related_meeting_title || "—",
    meeting_id:            p.related_meeting_id || "—",
    poll_status:           p.approval_status,
    committee:             "—",
    description:           p.best_option || "—",
    open_date:             p.created_at,
    close_date:            p.response_deadline,
  }));

  const kpis: KpiDef[] = [
    { label: "Total Polls",      value: String(polls.length),                                                  tone: "primary" },
    { label: "Open",             value: String(polls.filter(p => p.approval_status === "Open").length),        tone: "warning" },
    { label: "Closed",           value: String(polls.filter(p => p.approval_status === "Closed").length),      tone: "success" },
    { label: "Draft",            value: String(polls.filter(p => p.approval_status === "Draft").length),       tone: "neutral" },
  ];

  const cfg: PageCfg = {
    title: "Availability Polls",
    desc: "Schedule polls to find the best meeting time across participants before finalising the meeting date.",
    cols: [
      fc("poll_title",          "Poll Title",          { headerKey: "headers.meetingTitle" }),
      fc("related_meeting_title","Related Meeting",    { headerKey: "headers.committee" }),
      fc("response_deadline",   "Response Deadline",   { headerKey: "headers.date" }),
      fc("participants",        "Participants",        { headerKey: "headers.totalEntry" }),
      fc("best_option",         "Best Date Option",    { headerKey: "headers.type" }),
      BADGE("approval_status",  "Status"),
    ],
    mobileCardMapping: {
      primary:    "poll_title",
      identifier: "poll_id",
      meta:       ["related_meeting_title", "response_deadline"],
      status:     "approval_status",
      date:       "created_at",
    },
    filters:       BASE_FILTERS,
    actions:       ROW_VIEW,
    drawerTitle: "Poll Details",
    drawerCols: POLL_DRAWER_COLS,
    drawerActions: EDIT,
    rows,
    kpis,
    entryBtn:      "Create Availability Poll",
    formFields:    dynamicFields,
    onRowUpdate: (id, values) => {
      updatePoll(id, {
        poll_title:            values.poll_title            != null ? String(values.poll_title)            : undefined,
        related_meeting_id:    values.related_meeting_id    != null ? String(values.related_meeting_id)    : undefined,
        related_meeting_title: values.related_meeting_title != null ? String(values.related_meeting_title) : undefined,
        response_deadline:     values.response_deadline     != null ? String(values.response_deadline)     : undefined,
        allow_multiple:        values.allow_multiple        != null ? String(values.allow_multiple)        : undefined,
        allow_comments:        values.allow_comments        != null ? String(values.allow_comments)        : undefined,
        proposed_dates:        values.proposed_dates        != null ? String(values.proposed_dates)        : undefined,
        participants:          values.participants          != null ? String(values.participants)          : undefined,
        best_option:           values.best_option           != null ? String(values.best_option)           : undefined,
        approval_status:       values.approval_status       != null ? String(values.approval_status)       : undefined,
      } as never);
    },
    onRowCreate: (values) => {
      const pollId = `POL-${Date.now()}`;
      addPoll({
        id: pollId, poll_id: pollId,
        poll_title:            String(values.poll_title            ?? "New Poll"),
        related_meeting_id:    String(values.related_meeting_id    ?? ""),
        related_meeting_title: String(values.related_meeting_title ?? ""),
        time_zone:             String(values.time_zone             ?? "Asia/Dhaka (GMT+6)"),
        response_deadline:     String(values.response_deadline     ?? ""),
        allow_multiple:        String(values.allow_multiple        ?? "Yes"),
        allow_comments:        String(values.allow_comments        ?? "Yes"),
        proposed_dates:        String(values.proposed_dates        ?? ""),
        participants:          String(values.participants          ?? ""),
        best_option:           "Pending responses",
        total_responses:       "0",
        approval_status:       "Open",
        created_by:            "Current User",
        created_at:            new Date().toISOString(),
      });
    },
  };

  return <GenPage cfg={cfg} />;
}
