import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Calendar, Clock, AlertCircle, Video, MapPin, Monitor,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, addWeeks, subWeeks,
  startOfWeek, endOfWeek,
  isSameDay, isSameMonth, isToday,
} from "date-fns";
import { StatCard } from "../../components/cards/StatCard";
import { TabBar } from "../../components/tabs/TabBar";
import { Button } from "../../components/buttons/Button";
import { IconButton } from "../../components/buttons/IconButton";
import {
  useMeetingRegistry,
  useActionItemRegistry,
  useBoardPackRegistry,
  useRSVPRegistry,
  useMinutesRegistry,
  useParticipantRegistry,
} from "../../data/boardMeetingData";
import { useResolvedActions } from "../../actions/useResolvedActions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  fieldMatchesUser,
  userIsInvolvedInMeeting,
  userIsParticipant,
  userIsMinutesOwner,
} from "./homeWorkspaceUtils";
import { friendlyDate, friendlyTime } from "./dateUtils";

// ── Types ──────────────────────────────────────────────────────────────────────

type EventType = "meeting" | "deadline" | "action" | "review";

interface CalEvent {
  id: string;
  sourceId: string;
  sourceType: "meeting" | "board-pack" | "rsvp" | "action-item" | "minutes";
  meetingId?: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  status: string;
  relatedMeeting: string;
  mode?: string;
  venue?: string;
}

const TYPE_DOT: Record<EventType, string> = {
  meeting:  "var(--color-primary)",
  deadline: "var(--color-warning)",
  action:   "var(--color-text-secondary)",
  review:   "var(--color-success)",
};

const TYPE_LABEL: Record<EventType, string> = {
  meeting:  "Meeting",
  deadline: "Deadline",
  action:   "Action",
  review:   "Review",
};

const CAL_TABS = [
  { id: "month",  label: "Month"  },
  { id: "week",   label: "Week"   },
  { id: "agenda", label: "Agenda" },
];

const LEGEND_TYPES: EventType[] = ["meeting", "deadline", "action", "review"];

const IMMEDIATE_IDS = new Set([
  "start-meeting", "join-meeting", "rejoin-meeting",
  "continue-meeting", "resume-meeting", "resume-after-break",
  "start_meeting", "join_meeting", "rejoin_meeting",
  "resume_meeting", "resume_after_break", "resume_adjourned_meeting",
  "start", "join", "rejoin",
]);

// ── Featured Meeting Card ──────────────────────────────────────────────────────

interface FeaturedMeetingCardProps {
  event: CalEvent | null;
  isLive: boolean;
  immediateLabel: string | null;
  onAction: () => void;
  onCardClick: () => void;
}

function FeaturedMeetingCard({
  event,
  isLive,
  immediateLabel,
  onAction,
  onCardClick,
}: FeaturedMeetingCardProps) {
  if (!event) {
    return (
      <div className="cal-featured cal-featured--empty">
        <Calendar size={22} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 6 }} />
        <p className="cal-featured__title">No upcoming meetings</p>
      </div>
    );
  }

  const statusLabel = isLive
    ? "Live now"
    : event.date === new Date().toISOString().slice(0, 10)
    ? "Starting soon"
    : "Next meeting";

  const statusMod = isLive ? "cal-featured--live" : event.date === new Date().toISOString().slice(0, 10) ? "cal-featured--soon" : "cal-featured--next";

  const modeIcon = event.mode === "Virtual" ? Monitor : MapPin;
  const ModeIcon = modeIcon;

  return (
    <div
      className={`cal-featured cal-featured--accent ${statusMod}`}
      role={immediateLabel ? undefined : "button"}
      tabIndex={immediateLabel ? undefined : 0}
      onClick={immediateLabel ? undefined : onCardClick}
      onKeyDown={immediateLabel ? undefined : (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCardClick(); }
      }}
      style={{ cursor: immediateLabel ? "default" : "pointer" }}
    >
      <div className="cal-featured__status">
        <span className="cal-featured__status-dot" />
        {statusLabel}
      </div>
      <p className="cal-featured__title">{event.title}</p>
      <div className="cal-featured__meta">
        <span className="cal-featured__meta-item">
          <Calendar size={11} strokeWidth={2} />
          {friendlyDate(event.date)}{event.time ? ` · ${friendlyTime(event.time)}` : ""}
        </span>
        {(event.mode || event.venue) && (
          <span className="cal-featured__meta-item">
            <ModeIcon size={11} strokeWidth={2} />
            {event.mode || event.venue}
          </span>
        )}
      </div>
      {immediateLabel && (
        <div className="cal-featured__action">
          <Button type="button" variant="primary" size="sm" onClick={onAction}>
            {immediateLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CombinedDashboardPage({ title }: { title?: string } = {}) {
  const navigate = useNavigate();
  const now      = new Date();
  const today    = now.toISOString().slice(0, 10);

  const currentUser = useCurrentUser();
  const userName    = (currentUser.name ?? "").toLowerCase();

  const { items: meetings }     = useMeetingRegistry();
  const { items: actions }      = useActionItemRegistry();
  const { items: boardPacks }   = useBoardPackRegistry();
  const { items: rsvps }        = useRSVPRegistry();
  const { items: minutes }      = useMinutesRegistry();
  const { items: participants } = useParticipantRegistry();
  const { resolve: resolveMtgActions } = useResolvedActions("meeting");

  // ── Build personal events — explicit ownership only ───────────────────────

  const events = useMemo((): CalEvent[] => {
    const out: CalEvent[] = [];

    // Meetings — user is involved (chair/secretary/organizer) or is a named participant
    for (const m of meetings) {
      const date = String(m.meeting_date ?? "");
      if (!date) continue;
      const isInvolved = userIsInvolvedInMeeting(m as unknown as Record<string, unknown>, userName);
      const isParticipantOf = userIsParticipant(
        participants.map(p => ({ meeting_id: String(p.meeting_id ?? ""), name: String(p.name ?? "") })),
        String(m.id),
        userName,
      );
      if (!isInvolved && !isParticipantOf) continue;
      out.push({
        id: `mtg-${m.id}`,
        sourceId: String(m.id),
        sourceType: "meeting",
        meetingId: String(m.id),
        title: String(m.meeting_title ?? "Meeting"),
        date,
        time: String(m.start_time ?? ""),
        type: "meeting",
        status: String(m.approval_status ?? "Scheduled"),
        relatedMeeting: String(m.meeting_title ?? ""),
        mode: String(m.mode ?? ""),
        venue: String(m.venue ?? ""),
      });
    }

    // Board pack review deadlines — user created
    for (const p of boardPacks) {
      const date = String(p.meeting_date ?? "");
      if (!date) continue;
      if (!fieldMatchesUser(p.created_by, userName)) continue;
      out.push({
        id: `bp-${p.id}`,
        sourceId: String(p.id),
        sourceType: "board-pack",
        meetingId: String(p.related_meeting ?? ""),
        title: String(p.pack_title ?? p.meeting_title ?? "Board Pack"),
        date,
        type: "deadline",
        status: String(p.approval_status ?? "Pending"),
        relatedMeeting: String(p.meeting_title ?? ""),
      });
    }

    // RSVPs — user is the participant
    for (const r of rsvps) {
      const date = String(r.meeting_date ?? "");
      if (!date || (r.response && String(r.response) !== "Pending")) continue;
      if (!fieldMatchesUser(r.participant_name, userName)) continue;
      out.push({
        id: `rsvp-${r.id}`,
        sourceId: String(r.id),
        sourceType: "rsvp",
        meetingId: String(r.meeting_id ?? ""),
        title: `RSVP: ${String(r.meeting_title ?? "Meeting")}`,
        date,
        type: "deadline",
        status: "Pending",
        relatedMeeting: String(r.meeting_title ?? ""),
      });
    }

    // Action items — assigned to user
    for (const a of actions) {
      const due = String(a.due_date ?? "");
      if (!due || String(a.implementation_status ?? "") === "Completed") continue;
      if (!fieldMatchesUser(a.assigned_to, userName)) continue;
      out.push({
        id: `act-${a.id}`,
        sourceId: String(a.id),
        sourceType: "action-item",
        title: String(a.action_title ?? "Action Due"),
        date: due,
        type: "action",
        status: String(a.implementation_status ?? "Pending"),
        relatedMeeting: String(a.source_meeting ?? ""),
      });
    }

    // Minutes reviews — user is minute taker or co-author
    for (const m of minutes) {
      if (!["Draft", "Awaiting Review"].includes(String(m.approval_status ?? ""))) continue;
      const date = String(m.meeting_date ?? m.next_meeting_date ?? "");
      if (!date) continue;
      if (!userIsMinutesOwner(m as unknown as Record<string, unknown>, userName)) continue;
      out.push({
        id: `min-${m.id}`,
        sourceId: String(m.id),
        sourceType: "minutes",
        meetingId: String(m.meeting_id ?? ""),
        title: `Minutes: ${String(m.meeting_title ?? "Meeting")}`,
        date,
        type: "review",
        status: String(m.approval_status ?? "Draft"),
        relatedMeeting: String(m.meeting_title ?? ""),
      });
    }

    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [meetings, boardPacks, rsvps, actions, minutes, participants, userName]);

  // ── Calendar state ────────────────────────────────────────────────────────

  const weekStart0 = startOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const weekEnd0   = endOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const thisWeekHasEvents = events.some(e => e.date >= weekStart0 && e.date <= weekEnd0);

  const [activeTab, setActiveTab]         = useState(thisWeekHasEvents ? "week" : "agenda");
  const [viewDate, setViewDate]           = useState(now);
  const [selectedDay, setSelectedDay]     = useState<Date | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<Date>(now);

  // ── KPIs ─────────────────────────────────────────────────────────────────

  const monthStart = startOfMonth(now).toISOString().slice(0, 10);
  const monthEnd   = endOfMonth(now).toISOString().slice(0, 10);
  const cutoff7    = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const liveMtg   = events.find(e => e.type === "meeting" && e.status === "In Progress");
  const nextMtg   = events.find(e => e.type === "meeting" && e.date >= today);
  const mtgsMonth = events.filter(e => e.type === "meeting" && e.date >= monthStart && e.date <= monthEnd).length;
  const deadlines7 = events.filter(e => e.date >= today && e.date <= cutoff7 && e.type !== "meeting").length;

  // ── Resolve immediate action for featured meeting ─────────────────────────

  const featuredEvent = liveMtg ?? nextMtg ?? null;

  const featuredImmediateLabel = useMemo(() => {
    if (!featuredEvent || featuredEvent.type !== "meeting") return null;
    const mtgRecord = meetings.find(m => String(m.id) === featuredEvent.sourceId);
    if (!mtgRecord) return null;
    const resolved = resolveMtgActions(mtgRecord as Parameters<typeof resolveMtgActions>[0]);
    const primary = resolved.find(a => a.visible && a.enabled && IMMEDIATE_IDS.has(a.id));
    return primary?.label ?? null;
  }, [featuredEvent, meetings, resolveMtgActions]);

  // ── Events by date ────────────────────────────────────────────────────────

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  // ── Calendar grid helpers ─────────────────────────────────────────────────

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(viewDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: endOfWeek(viewDate, { weekStartsOn: 1 }) });
  }, [viewDate]);

  // ── Agenda groups ─────────────────────────────────────────────────────────

  const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const thisWeekE = endOfWeek(now, { weekStartsOn: 1 }).toISOString().slice(0, 10);
  const later60   = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);

  const agendaGroups = useMemo(() => {
    const upcoming = events.filter(e => e.date >= today && e.date <= later60);
    return [
      { label: "Today",     items: upcoming.filter(e => e.date === today) },
      { label: "Tomorrow",  items: upcoming.filter(e => e.date === tomorrow) },
      { label: "This Week", items: upcoming.filter(e => e.date > tomorrow && e.date <= thisWeekE) },
      { label: "Later",     items: upcoming.filter(e => e.date > thisWeekE) },
    ].filter(g => g.items.length > 0);
  }, [events, today, tomorrow, thisWeekE, later60]);

  // ── Selected day events (month tray) ──────────────────────────────────────

  const selectedDateStr  = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedDayEvts  = selectedDateStr ? (eventsByDate[selectedDateStr] ?? []) : [];

  // ── Selected week-day events ──────────────────────────────────────────────

  const selectedWeekDayStr  = format(selectedWeekDay, "yyyy-MM-dd");
  const selectedWeekDayEvts = eventsByDate[selectedWeekDayStr] ?? [];

  // ── Navigation ────────────────────────────────────────────────────────────

  const navPrev = () => {
    if (activeTab === "week") {
      setViewDate(v => subWeeks(v, 1));
      setSelectedWeekDay(d => subWeeks(d, 1));
    } else {
      setViewDate(v => subMonths(v, 1));
    }
  };
  const navNext = () => {
    if (activeTab === "week") {
      setViewDate(v => addWeeks(v, 1));
      setSelectedWeekDay(d => addWeeks(d, 1));
    } else {
      setViewDate(v => addMonths(v, 1));
    }
  };
  const navToday = () => {
    setViewDate(now);
    setSelectedDay(null);
    setSelectedWeekDay(now);
  };

  const periodLabel =
    activeTab === "week"
      ? `Week of ${format(startOfWeek(viewDate, { weekStartsOn: 1 }), "d MMM yyyy")}`
      : format(viewDate, "MMMM yyyy");

  // ── Event routing ─────────────────────────────────────────────────────────

  const openEvent = (e: CalEvent) => {
    if (e.sourceType === "meeting") {
      const mtg = meetings.find(m => String(m.id) === e.sourceId);
      const status = String(mtg?.approval_status ?? mtg?.status ?? "");
      if (["In Progress", "Paused", "On Break"].includes(status)) {
        navigate(`/meetings/${e.sourceId}/live`);
        return;
      }
      navigate("/meetings/all-meetings");
    } else if (e.sourceType === "board-pack") {
      navigate("/agenda-documents/board-packs");
    } else if (e.sourceType === "rsvp") {
      navigate("/meetings/all-meetings");
    } else if (e.sourceType === "action-item") {
      navigate("/decisions-followup/action-items");
    } else if (e.sourceType === "minutes") {
      navigate("/archive-reports/minutes");
    }
  };

  const openLiveMeeting = (e: CalEvent) => {
    navigate(`/meetings/${e.sourceId}/live`);
  };

  const getImmediateAction = (e: CalEvent): string | null => {
    if (e.type !== "meeting") return null;
    const mtgRecord = meetings.find(m => String(m.id) === e.sourceId);
    if (!mtgRecord) return null;
    const resolved = resolveMtgActions(mtgRecord as Parameters<typeof resolveMtgActions>[0]);
    const primary = resolved.find(a => a.visible && a.enabled && IMMEDIATE_IDS.has(a.id));
    return primary?.label ?? null;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-page home-workspace-page">

      {/* Page header */}
      <div className="dashboard-page__header">
        <div className="dashboard-page__header-body">
          <h1 className="dashboard-page__title">{title ?? "My Calendar"}</h1>
          <p className="dashboard-page__subtitle">
            View your meetings, review deadlines, voting windows, and assigned due dates.
          </p>
        </div>
      </div>

      {/* Bento summary: 2fr featured + 1fr + 1fr */}
      <div className="my-calendar-bento">
        <FeaturedMeetingCard
          event={featuredEvent}
          isLive={!!liveMtg}
          immediateLabel={featuredImmediateLabel}
          onAction={() => featuredEvent && openLiveMeeting(featuredEvent)}
          onCardClick={() => featuredEvent && openEvent(featuredEvent)}
        />
        <StatCard
          density="compact"
          icon={Clock}
          value={String(mtgsMonth)}
          label="Meetings This Month"
          tone="neutral"
          onClick={() => setActiveTab("month")}
        />
        <StatCard
          density="compact"
          icon={AlertCircle}
          value={String(deadlines7)}
          label="Upcoming Deadlines"
          tone={deadlines7 > 0 ? "warning" : "neutral"}
          onClick={() => setActiveTab("agenda")}
        />
      </div>

      {/* Calendar workspace — full width */}
      <div className="calendar-main">

        {/* Toolbar: tabs left, nav+today right */}
        <div className="cal-toolbar">
          <div className="cal-toolbar__left">
            <TabBar
              tabs={CAL_TABS}
              active={activeTab}
              onChange={tab => { setActiveTab(tab); setSelectedDay(null); }}
            />
          </div>
          <div className="cal-toolbar__right">
            {activeTab !== "agenda" && (
              <>
                <IconButton
                  icon={ChevronLeft}
                  label={activeTab === "week" ? "Previous week" : "Previous month"}
                  variant="default"
                  size="sm"
                  onClick={navPrev}
                />
                <span className="cal-toolbar__label">{periodLabel}</span>
                <IconButton
                  icon={ChevronRight}
                  label={activeTab === "week" ? "Next week" : "Next month"}
                  variant="default"
                  size="sm"
                  onClick={navNext}
                />
              </>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={navToday}>
              Today
            </Button>
          </div>
        </div>

        {/* Passive legend */}
        <div className="cal-toolbar__legend">
          {LEGEND_TYPES.map(t => (
            <span key={t} className="cal-legend__item">
              <span className="cal-legend__dot" style={{ background: TYPE_DOT[t] }} />
              {TYPE_LABEL[t]}
            </span>
          ))}
        </div>

        {/* ── Month View ── */}
        {activeTab === "month" && (
          <>
            <div className="cal-month__wrapper">
              <div className="cal-month__inner">
                <div className="cal-month__header">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="cal-month__dow">{d}</div>
                  ))}
                </div>
                <div className="cal-month__grid">
                  {monthDays.map(day => {
                    const dayStr     = format(day, "yyyy-MM-dd");
                    const dayEvts    = eventsByDate[dayStr] ?? [];
                    const inMonth    = isSameMonth(day, viewDate);
                    const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                    const isToday_   = isToday(day);
                    return (
                      <div
                        key={dayStr}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`${format(day, "d MMMM")}${dayEvts.length ? `, ${dayEvts.length} event${dayEvts.length !== 1 ? "s" : ""}` : ""}`}
                        className={[
                          "cal-day",
                          !inMonth       ? "cal-day--outside"    : "",
                          isToday_       ? "cal-day--today"      : "",
                          isSelected     ? "cal-day--selected"   : "",
                          dayEvts.length ? "cal-day--has-events" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedDay(isSelected ? null : day);
                          }
                        }}
                      >
                        <div className="cal-day__num">{format(day, "d")}</div>
                        <div className="cal-day__events">
                          {dayEvts.slice(0, 2).map(ev => (
                            <span
                              key={ev.id}
                              role="button"
                              tabIndex={0}
                              className="cal-event-pill"
                              title={ev.title}
                              onClick={e => { e.stopPropagation(); openEvent(ev); }}
                              onKeyDown={e => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEvent(ev);
                                }
                              }}
                            >
                              <span className="cal-event-pill__dot" style={{ background: TYPE_DOT[ev.type] }} />
                              {ev.title}
                            </span>
                          ))}
                          {dayEvts.length > 2 && (
                            <span
                              role="button"
                              tabIndex={0}
                              className="cal-event-pill cal-event-pill--more"
                              onClick={e => { e.stopPropagation(); setSelectedDay(day); }}
                              onKeyDown={e => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedDay(day);
                                }
                              }}
                            >
                              +{dayEvts.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Inline contextual tray for selected day */}
            {selectedDay && (
              <div className="cal-month-tray">
                <div className="cal-month-tray__header">
                  <span className="cal-month-tray__title">
                    {format(selectedDay, "EEEE, d MMMM")}
                  </span>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onClick={() => setSelectedDay(null)}
                  >
                    Clear
                  </Button>
                </div>
                {selectedDayEvts.length === 0 ? (
                  <div className="cal-empty" style={{ padding: "20px 0 8px" }}>
                    <p className="cal-empty__heading">No events on this date</p>
                    <p className="cal-empty__body">
                      Your meetings and deadlines for this date will appear here.
                    </p>
                  </div>
                ) : (
                  selectedDayEvts.map(ev => {
                    const imm  = getImmediateAction(ev);
                    const meta = [ev.relatedMeeting, TYPE_LABEL[ev.type]].filter(Boolean).join(" · ");
                    return (
                      <div
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        className="cal-schedule-row"
                        onClick={() => openEvent(ev)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEvent(ev); }
                        }}
                      >
                        {ev.time && (
                          <span className="cal-schedule-row__time">{friendlyTime(ev.time)}</span>
                        )}
                        <span className="cal-schedule-row__dot" style={{ background: TYPE_DOT[ev.type] }} />
                        <div className="cal-schedule-row__main">
                          <div className="cal-schedule-row__title">{ev.title}</div>
                          {meta && <div className="cal-schedule-row__meta">{meta}</div>}
                        </div>
                        {imm && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={e => { e.stopPropagation(); openLiveMeeting(ev); }}
                          >
                            {imm}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* ── Week View ── day selector + selected-day schedule */}
        {activeTab === "week" && (
          <div className="cal-week-view">
            {/* 7-button day selector */}
            <div className="cal-week-selector" role="group" aria-label="Select a day">
              {weekDays.map(day => {
                const dayStr   = format(day, "yyyy-MM-dd");
                const dayEvts  = eventsByDate[dayStr] ?? [];
                const today_   = isToday(day);
                const selected = isSameDay(day, selectedWeekDay);
                return (
                  <button
                    key={dayStr}
                    type="button"
                    className={[
                      "cal-week-day-btn",
                      today_   ? "cal-week-day-btn--today"    : "",
                      selected ? "cal-week-day-btn--selected" : "",
                    ].filter(Boolean).join(" ")}
                    aria-pressed={selected}
                    aria-label={`${format(day, "EEEE d MMMM")}${dayEvts.length ? `, ${dayEvts.length} event${dayEvts.length !== 1 ? "s" : ""}` : ""}`}
                    onClick={() => setSelectedWeekDay(day)}
                  >
                    <span className="cal-week-day-btn__dow">{format(day, "EEE")}</span>
                    <span className="cal-week-day-btn__date">{format(day, "d")}</span>
                    {dayEvts.length > 0 && (
                      <span className="cal-week-day-btn__count">{dayEvts.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected-day schedule */}
            <div className="cal-week-schedule">
              {selectedWeekDayEvts.length === 0 ? (
                <div className="cal-empty" style={{ padding: "32px 0" }}>
                  <p className="cal-empty__heading">
                    No events on {format(selectedWeekDay, "EEEE, d MMMM")}
                  </p>
                  <p className="cal-empty__body">Select another day or check the Agenda view.</p>
                </div>
              ) : (
                selectedWeekDayEvts.map(ev => {
                  const imm  = getImmediateAction(ev);
                  const meta = [
                    ev.mode === "Virtual" ? "Virtual" : ev.venue || null,
                    ev.type !== "meeting" ? ev.relatedMeeting : null,
                    TYPE_LABEL[ev.type],
                  ].filter(Boolean).join(" · ");
                  return (
                    <div
                      key={ev.id}
                      role="button"
                      tabIndex={0}
                      className="cal-schedule-row"
                      onClick={() => openEvent(ev)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEvent(ev); }
                      }}
                    >
                      {ev.time && (
                        <span className="cal-schedule-row__time">{friendlyTime(ev.time)}</span>
                      )}
                      <span className="cal-schedule-row__dot" style={{ background: TYPE_DOT[ev.type] }} />
                      <div className="cal-schedule-row__main">
                        <div className="cal-schedule-row__title">{ev.title}</div>
                        {meta && <div className="cal-schedule-row__meta">{meta}</div>}
                      </div>
                      {imm && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={e => { e.stopPropagation(); openLiveMeeting(ev); }}
                        >
                          {imm}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Agenda View ── */}
        {activeTab === "agenda" && (
          <div className="calendar-agenda">
            {agendaGroups.length === 0 ? (
              <div className="cal-empty" style={{ padding: "40px 20px" }}>
                <Calendar size={28} strokeWidth={1.5} className="cal-empty__icon" />
                <p className="cal-empty__heading">No upcoming events</p>
                <p className="cal-empty__body">
                  You have no meetings or deadlines in the next 60 days.
                </p>
              </div>
            ) : (
              agendaGroups.map(group => (
                <div key={group.label} className="calendar-agenda-group">
                  <div className="calendar-agenda-group__label">{group.label}</div>
                  {group.items.map(ev => {
                    const imm  = getImmediateAction(ev);
                    const meta = [ev.relatedMeeting, TYPE_LABEL[ev.type]].filter(Boolean).join(" · ");
                    return (
                      <div
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        className="calendar-agenda-row"
                        onClick={() => openEvent(ev)}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEvent(ev); }
                        }}
                      >
                        <span className="calendar-agenda-row__dot" style={{ background: TYPE_DOT[ev.type] }} />
                        <div className="calendar-agenda-row__body">
                          <div className="calendar-agenda-row__title">{ev.title}</div>
                          {meta && <div className="calendar-agenda-row__meta">{meta}</div>}
                        </div>
                        <div className="calendar-agenda-row__right">
                          {ev.time && (
                            <span className="calendar-agenda-row__time">{friendlyTime(ev.time)}</span>
                          )}
                          {imm && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={e => { e.stopPropagation(); openLiveMeeting(ev); }}
                            >
                              {imm}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
