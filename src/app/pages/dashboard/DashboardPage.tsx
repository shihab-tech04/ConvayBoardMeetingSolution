import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { FullScreenWorkspaceShell } from "../../components/shared/FullScreenWorkspaceShell";
import { LiveMeetingWorkspace, type LiveMeetingEntryAction } from "../meetings/LiveMeetingWorkspace";
import {
  Calendar, Clock, CheckSquare, AlertTriangle,
  Video, Users, ArrowRight, Radio,
  FileText, ListChecks, CheckCircle2, Activity,
  BarChart2, BookOpen, X, ExternalLink, MapPin, Link2,
} from "lucide-react";
import { StatCard } from "../../components/cards/StatCard";
import {
  useMeetingRegistry,
  type Meeting, type AgendaSubmission,
  useDecisionRegistry,
  useActionItemRegistry,
  useAgendaRegistry,
  useBoardPackRegistry,
  useRSVPRegistry,
  useConflictRegistry,
  useMinutesRegistry,
  useResolutionRegistry,
} from "../../data/boardMeetingData";
import { useUserRegistry } from "../../hooks/useUserRegistry";
import { useResolvedActions } from "../../actions/useResolvedActions";
import type { ResolvedAction } from "../../actions/types";
import { friendlyDate, friendlyDue, friendlyTime, timeAgo } from "./dateUtils";
import { Button } from "../../components/buttons/Button";
import { useSettings } from "../../hooks/useSettings";

// ── Full-page Meeting Detail Modal ────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  "In Progress":      { bg: "var(--color-success-bg)",       fg: "var(--color-success)"   },
  "Paused":           { bg: "var(--color-warning-bg)",       fg: "var(--color-warning)"   },
  "On Break":         { bg: "var(--color-warning-bg)",       fg: "var(--color-warning)"   },
  "Pending Approval": { bg: "var(--color-primary-alpha-8)",  fg: "var(--color-primary)"   },
  "Approved":         { bg: "var(--color-success-bg)",       fg: "var(--color-success)"   },
  "Published":        { bg: "var(--color-success-bg)",       fg: "var(--color-success)"   },
  "Draft":            { bg: "var(--color-surface-secondary)",fg: "var(--color-text-secondary)" },
  "Completed":        { bg: "var(--color-success-bg)",       fg: "var(--color-success)"   },
  "Cancelled":        { bg: "var(--color-error-bg)",         fg: "var(--color-error)"     },
};

function DetailField({ label, value }: { label: string; value: string }) {
  if (!value || value === "undefined" || value === "null") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-secondary)" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.4 }}>
        {value}
      </span>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--color-primary)", marginBottom: 14,
        paddingBottom: 8, borderBottom: "1px solid var(--color-border)",
      }}>
        {title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px 24px" }}>
        {children}
      </div>
    </div>
  );
}

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  onClose: () => void;
  navigate: (path: string) => void;
}

function MeetingDetailModal({ meeting, onClose, navigate }: MeetingDetailModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { themeId } = useSettings();
  const isDark = themeId === "dark-mode";
  const heroBg = isDark
    ? "linear-gradient(135deg, #1e2130 0%, #252836 100%)"
    : "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)";

  // Body scroll lock
  useEffect(() => {
    if (!meeting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [meeting]);

  // Escape key
  useEffect(() => {
    if (!meeting) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [meeting, onClose]);

  if (!meeting) return null;

  const m = meeting;
  const status    = String(m.approval_status ?? m.status ?? "");
  const mid       = String(m.meeting_id ?? m.id ?? "");
  const isLive    = ["In Progress", "Paused", "On Break"].includes(status);
  const statusSty = STATUS_STYLES[status] ?? { bg: "var(--color-surface-secondary)", fg: "var(--color-text-secondary)" };
  const str = (v: unknown) => { const s = String(v ?? ""); return s === "undefined" || s === "null" ? "" : s; };

  return createPortal(
    <>
      <style>{`
        @keyframes mdl-fade  { from { opacity:0 } to { opacity:1 } }
        @keyframes mdl-slide { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          animation: "mdl-fade 180ms ease",
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={str(m.meeting_title) || "Meeting Details"}
        style={{
          position: "fixed", inset: 0, zIndex: 1001,
          display: "flex", flexDirection: "column",
          background: "var(--color-background)",
          animation: "mdl-slide 220ms cubic-bezier(0.16,1,0.3,1)",
          outline: "none",
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0,
          background: heroBg,
          padding: "20px 28px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {isLive && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", background: "rgba(74,222,128,0.25)", color: "#86efac", padding: "3px 10px", borderRadius: 999 }}>
                  <Radio size={9} /> LIVE
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 12px", borderRadius: 999, background: statusSty.bg, color: statusSty.fg }}>
                {status}
              </span>
              {str(m.meeting_type) && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.1)", padding: "3px 10px", borderRadius: 999 }}>
                  {str(m.meeting_type)}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0 }}>
              {str(m.meeting_title) || "Meeting Details"}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {str(m.committee) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  <Users size={12} /> {str(m.committee)}
                </span>
              )}
              {str(m.meeting_date) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  <Calendar size={12} /> {str(m.meeting_date)}{str(m.start_time) ? ` · ${str(m.start_time)}` : ""}
                </span>
              )}
              {str(m.venue) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  <MapPin size={12} /> {str(m.venue)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {isLive && (
              <button type="button" onClick={() => { onClose(); navigate(`/meetings/${mid}/live`); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--color-success)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                <Radio size={14} /> Join Live
              </button>
            )}
            <button type="button" onClick={() => { onClose(); navigate("/meetings/all-meetings"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
              <ExternalLink size={13} /> Full Record
            </button>
            <button type="button" aria-label="Close" onClick={onClose} style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", color: "#fff", flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 40px" }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>

            {(str(m.meeting_id) || str(m.priority) || str(m.confidentiality) || str(m.purpose)) && (
              <DetailSection title="Summary">
                {str(m.meeting_id)      && <DetailField label="Reference"      value={str(m.meeting_id)} />}
                {str(m.priority)        && <DetailField label="Priority"        value={str(m.priority)} />}
                {str(m.confidentiality) && <DetailField label="Confidentiality" value={str(m.confidentiality)} />}
                {str(m.purpose)         && <DetailField label="Purpose"         value={str(m.purpose)} />}
                {str(m.description)     && <DetailField label="Description"     value={str(m.description)} />}
              </DetailSection>
            )}

            <DetailSection title="Schedule & Access">
              {str(m.meeting_date)     && <DetailField label="Date"          value={str(m.meeting_date)} />}
              {str(m.start_time)       && <DetailField label="Start Time"    value={str(m.start_time)} />}
              {str(m.end_time)         && <DetailField label="End Time"      value={str(m.end_time)} />}
              {str(m.time_zone)        && <DetailField label="Time Zone"     value={str(m.time_zone)} />}
              {str(m.mode)             && <DetailField label="Mode"          value={str(m.mode)} />}
              {str(m.venue)            && <DetailField label="Venue"         value={str(m.venue)} />}
              {str(m.virtual_platform) && <DetailField label="Platform"      value={str(m.virtual_platform)} />}
              {str(m.rsvp_deadline)    && <DetailField label="RSVP Deadline" value={str(m.rsvp_deadline)} />}
            </DetailSection>

            <DetailSection title="Governance">
              {str(m.committee)   && <DetailField label="Committee"   value={str(m.committee)} />}
              {str(m.meeting_type)&& <DetailField label="Type"        value={str(m.meeting_type)} />}
              {str(m.quorum)      && <DetailField label="Quorum"      value={str(m.quorum)} />}
              {str(m.chairperson) && <DetailField label="Chairperson" value={str(m.chairperson)} />}
              {str(m.secretary)   && <DetailField label="Secretary"   value={str(m.secretary)} />}
              {str(m.organizer)   && <DetailField label="Organizer"   value={str(m.organizer)} />}
            </DetailSection>

            {str(m.virtual_link) && (
              <div style={{ marginBottom: 28, padding: "14px 18px", background: "var(--color-primary-alpha-8)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", gap: 12 }}>
                <Link2 size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 2 }}>Meeting Link</div>
                  <a href={str(m.virtual_link)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--color-primary)", textDecoration: "none", wordBreak: "break-all" }}>
                    {str(m.virtual_link)}
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Role derivation ────────────────────────────────────────────────────────────

type ViewRole = "chairperson" | "secretary" | "board_member" | "admin";

function deriveViewRole(roleStr: string): ViewRole {
  const r = roleStr.toLowerCase();
  if (r.includes("chairman") || r.includes("chairperson")) return "chairperson";
  if (r.includes("secretary"))                              return "secretary";
  if (r.includes("admin") || r.includes("administrator"))  return "admin";
  if (r.includes("director") || r.includes("member"))      return "board_member";
  return "secretary";
}

const ROLE_LABELS: Record<ViewRole, string> = {
  chairperson:  "Chairperson",
  secretary:    "Company Secretary",
  board_member: "Board Member",
  admin:        "Administrator",
};

const ONGOING_STATUSES  = ["In Progress", "Paused", "On Break"];
const EXCLUDED_STATUSES = ["Completed", "Cancelled", "Archived"];

const ROLE_SUBTITLES: Record<ViewRole, string> = {
  chairperson:  "Meeting readiness, quorum status, pending approvals, and decisions requiring attention.",
  secretary:    "Review meeting readiness, pending approvals, Board Pack progress, and overdue follow-up items.",
  board_member: "Upcoming meetings, board packs to review, and assigned action items.",
  admin:        "System-wide activity, pending approvals, and meeting operations overview.",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function countdown(dateStr: string, timeStr?: string): string {
  const target = new Date(`${dateStr}T${timeStr || "09:00"}:00`);
  const diff   = target.getTime() - Date.now();
  if (diff <= 0) return "Now";
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `In ${days}d ${hours}h`;
  return `In ${hours}h ${Math.floor((diff % 3600000) / 60000)}m`;
}

// ── Lifecycle stage resolver ───────────────────────────────────────────────────

type LifecycleStage = "Preparation Required" | "Awaiting Approval" | "Ready to Publish" | "Upcoming Meeting" | "Ready to Start" | "Meeting Live" | "Post-Meeting Follow-up";

function resolveLifecycleStage(status: string, dateStr: string): { stage: LifecycleStage } {
  const daysUntil = (new Date(dateStr + "T12:00:00").getTime() - Date.now()) / 86400000;
  if (status === "Draft")                                                               return { stage: "Preparation Required"    };
  if (status === "Pending Approval")                                                    return { stage: "Awaiting Approval"       };
  if (status === "Approved")                                                            return { stage: "Ready to Publish"        };
  if ((status === "Scheduled" || status === "Published") && daysUntil > 1)             return { stage: "Upcoming Meeting"        };
  if ((status === "Scheduled" || status === "Published") && daysUntil <= 1)            return { stage: "Ready to Start"          };
  if (status === "In Progress")                                                         return { stage: "Meeting Live"            };
  if (status === "Awaiting Minutes" || status === "Completed")                         return { stage: "Post-Meeting Follow-up"  };
  return { stage: "Upcoming Meeting" };
}

const STAGE_STYLES: Record<LifecycleStage, { color: string; bg: string }> = {
  "Preparation Required":   { color: "rgba(255,190,100,0.95)", bg: "rgba(255,180,80,0.22)"  },
  "Awaiting Approval":      { color: "rgba(255,200,100,0.95)", bg: "rgba(255,200,80,0.22)"  },
  "Ready to Publish":       { color: "rgba(134,239,172,0.95)", bg: "rgba(74,222,128,0.20)"  },
  "Upcoming Meeting":       { color: "rgba(200,215,255,0.95)", bg: "rgba(255,255,255,0.13)" },
  "Ready to Start":         { color: "rgba(134,239,172,0.95)", bg: "rgba(74,222,128,0.20)"  },
  "Meeting Live":           { color: "#86efac",                bg: "rgba(74,222,128,0.25)"  },
  "Post-Meeting Follow-up": { color: "rgba(200,215,255,0.80)", bg: "rgba(255,255,255,0.10)" },
};

// ── Status pill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  let bg = "var(--color-primary-alpha-8)";
  let fg = "var(--color-primary)";
  if (s.includes("progress") || s.includes("active")) { bg = "var(--color-warning-bg)"; fg = "var(--color-warning)"; }
  else if (s.includes("complete") || s.includes("approved") || s.includes("published")) { bg = "var(--color-success-bg)"; fg = "var(--color-success)"; }
  else if (s.includes("overdue") || s.includes("cancel") || s.includes("reject") || s.includes("block")) { bg = "var(--color-error-bg)"; fg = "var(--color-error)"; }
  else if (s.includes("pending") || s.includes("draft") || s.includes("await")) { bg = "var(--color-primary-alpha-8)"; fg = "var(--color-primary)"; }
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 600,
      padding: "2px 8px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// ── Meeting Hero Slide ─────────────────────────────────────────────────────────

interface HeroSlideProps {
  meeting: Meeting;
  navigate: (path: string) => void;
  primaryAction: { label: string; tone: "primary" | "success" | "warning" | "neutral"; icon?: React.ElementType; onClick: () => void } | null;
  userRole: string;
  isVisible: boolean;
  hasMultiple: boolean;
  onViewDetails: () => void;
}

function HeroSlide({ meeting, navigate, primaryAction, userRole, isVisible, hasMultiple, onViewDetails }: HeroSlideProps) {
  const action  = primaryAction ?? { label: "View Details", tone: "neutral" as const, onClick: onViewDetails };
  const mode    = String(meeting.mode ?? "");
  const status  = String(meeting.approval_status ?? meeting.status ?? "Scheduled");
  const dateStr = String(meeting.meeting_date ?? "");
  const cd      = countdown(dateStr, String(meeting.start_time ?? ""));
  const isOngoing = ["In Progress", "Paused", "On Break"].includes(status);
  const isLive    = status === "In Progress";

  const contextLabel =
    status === "In Progress" ? "Live Now"
    : status === "Paused"    ? "On Pause"
    : status === "On Break"  ? "On Break"
    : status === "Ready to Start" ? "Starting Soon"
    : status === "Pending Approval" ? "Needs Approval"
    : status === "Approved" || status === "Published" ? "Next Meeting"
    : "Upcoming";

  const { stage } = resolveLifecycleStage(status, dateStr);
  const stageStyle = STAGE_STYLES[stage];

  const { themeId } = useSettings();
  const isDark = themeId === "dark-mode";

  const primaryStyle: React.CSSProperties =
    action.tone === "warning" ? { background: "var(--color-warning)", color: "#fff", border: "none" }
    : action.tone === "success" ? { background: "var(--color-success)", color: "#fff", border: "none" }
    : action.tone === "primary" ? (isDark
        ? { background: "var(--color-primary)", color: "#fff", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }
        : { background: "#fff", color: "var(--color-primary-dark)", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" })
    : { background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" };

  const isVirtual = mode === "Virtual" || mode === "Hybrid";

  return (
    <div style={{
      position: "absolute", inset: 0,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "translateY(0)" : "translateY(6px)",
      transition: "opacity 350ms ease, transform 350ms ease",
      pointerEvents: isVisible ? "auto" : "none",
      display: "flex", flexDirection: "column",
      padding: "22px 24px 20px",
    }}>

      {/* Top row: label + mode + countdown */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase",
          background: isOngoing ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.18)",
          padding: "3px 10px", borderRadius: 999,
          color: isOngoing ? "#86efac" : "rgba(255,255,255,0.9)",
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          {isOngoing && <Radio size={9} />}
          {contextLabel}
        </span>
        {isVirtual && (
          <span style={{ fontSize: 11, fontWeight: 500, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", padding: "3px 9px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Video size={11} /> {mode}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.5)", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
          <Clock size={11} />
          {status === "In Progress" ? "In progress" : status === "Paused" ? "Paused" : status === "On Break" ? "On break" : cd}
        </span>
      </div>

      {/* Lifecycle stage badge */}
      <div style={{ marginBottom: 10 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: stageStyle.bg, color: stageStyle.color,
          fontSize: 11.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
          border: `1px solid ${stageStyle.color.replace("0.95", "0.25").replace("0.80", "0.2")}`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: stageStyle.color, flexShrink: 0 }} />
          {stage}
        </span>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: "clamp(15px, 1.9vw, 19px)", fontWeight: 700, lineHeight: 1.2, color: "#fff", marginBottom: 8 }}>
        {String(meeting.meeting_title ?? "Untitled Meeting")}
      </h2>

      {/* Meta — committee + date only */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginBottom: 16 }}>
        {meeting.committee && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            <Users size={11} /> {String(meeting.committee)}
          </span>
        )}
        {meeting.meeting_date && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            <Calendar size={11} /> {friendlyDate(dateStr)}
            {meeting.start_time ? ` · ${friendlyTime(String(meeting.start_time))}` : ""}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto", paddingBottom: hasMultiple ? 28 : 0 }}>
        <Button type="button" size="lg" variant="primary" onClick={action.onClick} style={primaryStyle}>
          {action.label}
        </Button>
        {!["View Details", "View details", "View Meeting Record"].includes(action.label) && (
          <Button type="button" size="lg" variant="ghost" onClick={onViewDetails} style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.18)" }}>
            View details
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Meeting Hero Carousel ──────────────────────────────────────────────────────

interface MeetingHeroCarouselProps {
  meetings: Meeting[];
  navigate: (path: string) => void;
  getPrimaryAction: (m: Meeting) => { label: string; tone: "primary" | "success" | "warning" | "neutral"; onClick: () => void } | null;
  onViewDetails: (m: Meeting) => void;
  userRole: string;
}

function MeetingHeroCarousel({ meetings, navigate, getPrimaryAction, onViewDetails, userRole }: MeetingHeroCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const { themeId } = useSettings();
  const isDark = themeId === "dark-mode";
  const carouselBg = isDark
    ? "linear-gradient(140deg, #1e2130 0%, #252836 100%)"
    : "linear-gradient(140deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)";

  const total = meetings.length;

  const next = useCallback(() => setIdx(i => (i + 1) % total), [total]);

  // Auto-advance every 4 seconds unless paused or single slide
  useEffect(() => {
    if (total <= 1 || paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [total, paused, next]);

  // Clamp index when meetings change
  useEffect(() => {
    setIdx(i => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  if (total === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)", padding: "20px 22px", color: "var(--color-text-secondary)", minHeight: 220,
      }}>
        <Calendar size={28} strokeWidth={1.5} style={{ opacity: 0.3, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>No upcoming meetings</p>
          <p style={{ fontSize: 13 }}>Your next scheduled meeting will appear here.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" trailingIcon={ArrowRight} style={{ flexShrink: 0 }} onClick={() => navigate("/meetings/all-meetings")}>
          Schedule a Meeting
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: carouselBg,
        borderRadius: "var(--radius-xl)", color: "#fff",
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(52,61,115,0.22)",
        position: "relative", overflow: "hidden",
        minHeight: 268, flex: 1,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {meetings.map((m, i) => {
        const pa = getPrimaryAction(m);
        return (
          <HeroSlide
            key={String(m.meeting_id ?? m.id ?? i)}
            meeting={m}
            navigate={navigate}
            primaryAction={pa}
            userRole={userRole}
            isVisible={i === idx}
            hasMultiple={total > 1}
            onViewDetails={() => onViewDetails(m)}
          />
        );
      })}

      {/* Dot controls — only when >1 slide */}
      {total > 1 && (
        <div style={{
          position: "absolute", bottom: 10, left: 0, right: 0,
          display: "flex", justifyContent: "center", alignItems: "center", gap: 5, zIndex: 2,
        }}>
          {meetings.map((m, i) => (
            <button
              key={i}
              type="button"
              aria-label={`View slide ${i + 1}: ${String(m.meeting_title ?? "")}`}
              onClick={() => setIdx(i)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIdx(i); } }}
              style={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3,
                background: i === idx ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                border: "none", cursor: "pointer", padding: 0,
                transition: "width 300ms ease, background 200ms",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Upcoming Meetings Section ──────────────────────────────────────────────────

interface MeetingsSectionProps {
  meetings: Meeting[];
  navigate: (path: string) => void;
  getRowAction: (m: Meeting) => { label: string; onClick: () => void; highlight: boolean } | null;
  onRowClick: (m: Meeting) => void;
}

const LIVE_STATUSES = new Set(["In Progress", "Paused", "On Break"]);

function LiveDot({ status }: { status: string }) {
  const isLive = status === "In Progress";
  const fg = isLive ? "var(--color-success)" : "var(--color-warning)";
  const label = isLive ? "Live" : status === "Paused" ? "Paused" : "On Break";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 44, flexShrink: 0 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: fg, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: fg, whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}

function MeetingsSection({ meetings, navigate, getRowAction, onRowClick }: MeetingsSectionProps) {
  return (
    <div className="dash-compact-card">
      {/* Header */}
      <div className="dash-compact-header">
        <span className="dash-compact-header__title">
          <Calendar size={14} strokeWidth={1.75} style={{ color: "var(--color-primary)" }} />
          Ongoing &amp; Upcoming Meetings
          {meetings.length > 0 && (
            <span className="dash-compact-header__count">{meetings.length}</span>
          )}
        </span>
        <button type="button" className="dash-compact-header__viewall" onClick={() => navigate("/meetings/all-meetings")}>
          View all
        </button>
      </div>

      <div className="dash-compact-list">
        {meetings.length === 0 ? (
          <div className="dash-compact-empty">
            <Calendar size={26} strokeWidth={1.5} style={{ opacity: 0.25, margin: "0 auto 8px", display: "block" }} />
            <p>No upcoming meetings</p>
          </div>
        ) : meetings.map((m, i) => {
          const status = String(m.approval_status ?? m.status ?? "");
          const isLast = i === meetings.length - 1;
          const isOngoing = LIVE_STATUSES.has(status);
          const rowAction = getRowAction(m);

          return (
            <div
              key={String(m.id ?? i)}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick(m)}
              onKeyDown={e => { if (e.key === "Enter") onRowClick(m); }}
              className={`dash-compact-row${isLast ? " dash-compact-row--last" : ""}`}
            >
              {/* Leading indicator */}
              {isOngoing ? (
                <LiveDot status={status} />
              ) : (
                <div className="dash-compact-row__date">
                  <span className="dash-compact-row__date-day">
                    {m.meeting_date ? new Date(String(m.meeting_date) + "T12:00:00").getDate() : "—"}
                  </span>
                  <span className="dash-compact-row__date-mon">
                    {m.meeting_date ? new Date(String(m.meeting_date) + "T12:00:00").toLocaleString("en-GB", { month: "short" }) : ""}
                  </span>
                </div>
              )}

              {/* Info */}
              <div className="dash-compact-row__body">
                <div className="dash-compact-row__title">{String(m.meeting_title ?? "Untitled")}</div>
                <div className="dash-compact-row__meta">
                  <span className="dash-compact-row__meta-main">{String(m.committee ?? "—")}</span>
                  {m.start_time && <span className="dash-compact-row__meta-sep">·</span>}
                  {m.start_time && <span>{friendlyTime(String(m.start_time))}</span>}
                  {isOngoing && <span className="dash-compact-row__meta-sep">·</span>}
                  {isOngoing && <span style={{ color: status === "In Progress" ? "var(--color-success)" : "var(--color-warning)" }}>{status}</span>}
                </div>
              </div>

              {/* Immediate action only */}
              {rowAction && (
                <Button
                  type="button"
                  size="sm"
                  variant={rowAction.highlight ? "primary" : "ghost"}
                  onClick={e => { e.stopPropagation(); rowAction.onClick(); }}
                >
                  {rowAction.label}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── My Tasks Overview Section ──────────────────────────────────────────────────

type UrgentTask = { id: string; title: string; context: string; dueLabel: string; type: string; action: string; isOverdue: boolean };

interface MyTasksOverviewSectionProps {
  tasks: UrgentTask[];
  navigate: (path: string) => void;
  onTaskAction: (task: UrgentTask) => void;
}

function MyTasksOverviewSection({ tasks, navigate, onTaskAction }: MyTasksOverviewSectionProps) {
  return (
    <div className="dash-compact-card">
      <div className="dash-compact-header">
        <span className="dash-compact-header__title">
          <ListChecks size={14} strokeWidth={1.75} style={{ color: "var(--color-primary)" }} />
          My Tasks
          {tasks.length > 0 && (
            <span className="dash-compact-header__count">{tasks.length}</span>
          )}
        </span>
        <button type="button" className="dash-compact-header__viewall" onClick={() => navigate("/home/my-tasks")}>
          View all
        </button>
      </div>

      <div className="dash-compact-list">
        {tasks.length === 0 ? (
          <div className="dash-compact-empty">
            <CheckCircle2 size={26} strokeWidth={1.5} style={{ opacity: 0.25, margin: "0 auto 8px", display: "block" }} />
            <p>All caught up</p>
          </div>
        ) : tasks.map((t, i) => {
          const isLast = i === tasks.length - 1;
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onTaskAction(t)}
              onKeyDown={e => { if (e.key === "Enter") onTaskAction(t); }}
              className={`dash-compact-row${isLast ? " dash-compact-row--last" : ""}`}
            >
              <div className="dash-compact-row__body">
                <div className="dash-compact-row__title">{t.title}</div>
                <div className="dash-compact-row__meta">
                  <span className="dash-compact-row__meta-main">{t.context}</span>
                </div>
              </div>
              <span className={`dash-compact-row__due${t.isOverdue ? " dash-compact-row__due--overdue" : ""}`}>
                {t.dueLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agenda Progress Panel ──────────────────────────────────────────────────────

interface AgendaProgressPanelProps {
  meetings: Meeting[];
  agendas: AgendaSubmission[];
  navigate: (path: string) => void;
}

function AgendaProgressPanel({ meetings, agendas, navigate }: AgendaProgressPanelProps) {
  const items = useMemo(() => {
    const seen = new Set<string>();
    return meetings
      .filter(m => {
        const mid = String(m.meeting_id ?? m.id ?? "");
        if (seen.has(mid)) return false;
        seen.add(mid);
        return true;
      })
      .map(m => {
        const mid    = String(m.meeting_id ?? m.id ?? "");
        const title  = String(m.meeting_title ?? "");
        const status = String(m.approval_status ?? m.status ?? "");
        const mItems = agendas.filter(a => String(a.meeting_id ?? "") === mid || String(a.meeting_title ?? "") === title);
        if (mItems.length === 0) return null;
        const total    = mItems.length;
        const approved = mItems.filter(a => ["Approved", "Adopted"].includes(String(a.approval_status ?? ""))).length;
        const pending  = mItems.filter(a => ["Pending", "Pending Approval"].includes(String(a.approval_status ?? ""))).length;
        const isLive   = ["In Progress", "Paused", "On Break"].includes(status);
        const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;
        const barColor = pct === 100 ? "var(--color-success)" : pct >= 60 ? "var(--color-primary)" : "var(--color-warning)";
        return { mid, title, total, approved, pending, pct, status, isLive, barColor };
      })
      .filter(Boolean)
      .slice(0, 8) as { mid: string; title: string; total: number; approved: number; pending: number; pct: number; status: string; isLive: boolean; barColor: string }[];
  }, [meetings, agendas]);

  return (
    <div className="dash-compact-card">
      <div className="dash-compact-header">
        <span className="dash-compact-header__title">
          <BookOpen size={14} strokeWidth={1.75} style={{ color: "var(--color-primary)" }} />
          Agenda Progress
        </span>
        <button type="button" className="dash-compact-header__viewall" onClick={() => navigate("/agenda-documents/agenda-management")}>
          View all
        </button>
      </div>

      <div className="dash-compact-list">
        {items.length === 0 ? (
          <div className="dash-compact-empty">
            <BookOpen size={26} strokeWidth={1.5} style={{ opacity: 0.25, margin: "0 auto 8px", display: "block" }} />
            <p>No agenda records</p>
          </div>
        ) : items.map((item, i) => (
          <div
            key={item.mid}
            role="button"
            tabIndex={0}
            onClick={() => navigate("/agenda-documents/agenda-management")}
            onKeyDown={e => { if (e.key === "Enter") navigate("/agenda-documents/agenda-management"); }}
            className={`dash-compact-row dash-compact-row--agenda${i === items.length - 1 ? " dash-compact-row--last" : ""}`}
          >
            <div className="dash-compact-row__body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                <div className="dash-compact-row__title">{item.title}</div>
                <span style={{
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  color: item.pct === 100 ? "var(--color-success)" : "var(--color-text-primary)",
                }}>{item.pct}%</span>
              </div>
              <div className="dash-compact-progress">
                <div className="dash-compact-progress__track">
                  <div
                    className="dash-compact-progress__bar"
                    style={{
                      width: `${item.pct}%`,
                      background: item.pct === 100 ? "var(--color-success)" : "var(--color-primary)",
                    }}
                  />
                </div>
              </div>
              <div className="dash-compact-row__meta" style={{ marginTop: 4 }}>
                <span>{item.isLive
                  ? `${item.approved} of ${item.total} items completed`
                  : `${item.approved} of ${item.total} items approved`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Updates Panel ───────────────────────────────────────────────────────

type UpdateItem = { id: string; text: string; sub: string; time: string; dot: string; icon?: React.ElementType };

interface RecentUpdatesPanelProps {
  updates: UpdateItem[];
  navigate: (path: string) => void;
}

const DOT_COLORS: Record<string, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error:   "var(--color-error)",
  primary: "var(--color-primary)",
  neutral: "var(--color-text-secondary)",
  live:    "var(--color-success)",
};

const DOT_BG: Record<string, string> = {
  success: "var(--color-success-bg)",
  warning: "var(--color-warning-bg)",
  error:   "var(--color-error-bg)",
  primary: "var(--color-primary-alpha-8)",
  neutral: "var(--color-surface-secondary)",
  live:    "var(--color-success-bg)",
};

const UPDATE_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle2,
  warning: Activity,
  primary: FileText,
  neutral: BarChart2,
  error:   AlertTriangle,
  live:    Radio,
};

function RecentUpdatesPanel({ updates, navigate }: RecentUpdatesPanelProps) {
  return (
    <div className="dash-compact-card">
      <div className="dash-compact-header">
        <span className="dash-compact-header__title">
          <Activity size={14} strokeWidth={1.75} style={{ color: "var(--color-primary)" }} />
          Recent Updates
        </span>
        <button type="button" className="dash-compact-header__viewall" onClick={() => navigate("/archive-reports/meeting-archive")}>
          View all
        </button>
      </div>

      <div className="dash-compact-list">
        {updates.length === 0 ? (
          <div className="dash-compact-empty">
            <Activity size={26} strokeWidth={1.5} style={{ opacity: 0.25, margin: "0 auto 8px", display: "block" }} />
            <p>No recent updates</p>
          </div>
        ) : updates.map((u, i) => {
          const Icon = u.icon ?? UPDATE_ICONS[u.dot] ?? Activity;
          const isLast = i === updates.length - 1;
          const isSemantic = u.dot === "warning" || u.dot === "error";
          return (
            <div
              key={u.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/archive-reports/meeting-archive")}
              onKeyDown={e => { if (e.key === "Enter") navigate("/archive-reports/meeting-archive"); }}
              className={`dash-compact-row${isLast ? " dash-compact-row--last" : ""}`}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: isSemantic ? (DOT_BG[u.dot] ?? DOT_BG.neutral) : "var(--color-surface-secondary, var(--color-primary-alpha-4))",
                border: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={13} strokeWidth={1.75} style={{ color: isSemantic ? (DOT_COLORS[u.dot] ?? DOT_COLORS.neutral) : "var(--color-text-secondary)" }} />
              </div>
              <div className="dash-compact-row__body">
                <div className="dash-compact-row__title">{u.text}</div>
                {u.sub && <div className="dash-compact-row__meta"><span className="dash-compact-row__meta-main">{u.sub}</span></div>}
              </div>
              <span className="dash-compact-row__time">{timeAgo(u.time)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live meeting routing helpers (module-level — stable references) ────────────

const LIVE_ACTION_IDS = new Set(["start", "join", "start_meeting", "join_meeting", "rejoin_meeting", "resume_meeting", "resume_after_break", "resume_adjourned_meeting", "rejoin"]);

const ACTION_TO_ENTRY: Record<string, LiveMeetingEntryAction> = {
  start: "start_meeting", start_meeting: "start_meeting",
  join: "join_meeting", join_meeting: "join_meeting",
  rejoin: "rejoin_meeting", rejoin_meeting: "rejoin_meeting",
  resume_meeting: "resume_meeting", resume_after_break: "resume_after_break",
  resume_adjourned_meeting: "continue_meeting",
};

// ── Main DashboardPage component ───────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const userId   = useSelector((s: { auth: { userId: string | null } }) => s.auth.userId);
  const { users } = useUserRegistry();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [liveMeeting, setLiveMeeting] = useState<{ meetingId: string; entryAction: LiveMeetingEntryAction } | null>(null);

  const currentUser = useMemo(() => {
    if (!userId) return null;
    const q = userId.toLowerCase();
    return (
      users.find(u => u.id === userId) ??
      users.find(u => u.email.toLowerCase() === q) ??
      users.find(u => u.name.toLowerCase() === q) ??
      null
    );
  }, [userId, users]);

  const viewRole: ViewRole = deriveViewRole(currentUser?.role ?? "");

  const { resolve: resolveMtgActions } = useResolvedActions("meeting");

  const { items: meetings }    = useMeetingRegistry();
  const { items: decisions }   = useDecisionRegistry();
  const { items: actions }     = useActionItemRegistry();
  const { items: agendas }     = useAgendaRegistry();
  const { items: boardPacks }  = useBoardPackRegistry();
  const { items: rsvps }       = useRSVPRegistry();
  const { items: conflicts }   = useConflictRegistry();
  const { items: minutes }     = useMinutesRegistry();
  const { items: resolutions } = useResolutionRegistry();

  const today   = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);


  // ── Ongoing meetings (regardless of date) ───────────────────────────────────

  const ongoingMeetings = useMemo(() =>
    meetings
      .filter(m => ONGOING_STATUSES.includes(String(m.approval_status ?? m.status ?? "")))
      .sort((a, b) => String(a.meeting_date ?? "").localeCompare(String(b.meeting_date ?? ""))),
    [meetings]
  );

  // ── Upcoming meetings (future, not ongoing) ──────────────────────────────────

  const upcomingMeetings = useMemo(() =>
    meetings
      .filter(m => {
        const date   = String(m.meeting_date ?? "");
        const status = String(m.approval_status ?? m.status ?? "");
        return date >= today && !EXCLUDED_STATUSES.includes(status) && !ONGOING_STATUSES.includes(status);
      })
      .sort((a, b) => String(a.meeting_date ?? "").localeCompare(String(b.meeting_date ?? ""))),
    [meetings, today]
  );

  // ── Combined list for the section (ongoing first) ───────────────────────────

  const displayedMeetings = useMemo(
    () => [...ongoingMeetings, ...upcomingMeetings],
    [ongoingMeetings, upcomingMeetings]
  );

  // ── Hero carousel: priority-sorted, 3–5 items ───────────────────────────────

  const heroMeetings = useMemo(() => {
    const inProgress   = ongoingMeetings.filter(m => String(m.approval_status ?? "") === "In Progress");
    const paused       = ongoingMeetings.filter(m => ["Paused", "On Break"].includes(String(m.approval_status ?? "")));
    const readyToStart = upcomingMeetings.filter(m => String(m.approval_status ?? "") === "Ready to Start");
    const pendingAppr  = upcomingMeetings.filter(m => String(m.approval_status ?? "") === "Pending Approval");
    const approved     = upcomingMeetings.filter(m => ["Approved", "Published"].includes(String(m.approval_status ?? "")));
    const other        = upcomingMeetings.filter(m =>
      !["Ready to Start", "Pending Approval", "Approved", "Published"].includes(String(m.approval_status ?? ""))
    );
    return [...inProgress, ...paused, ...readyToStart, ...pendingAppr, ...approved, ...other].slice(0, 5);
  }, [ongoingMeetings, upcomingMeetings]);

  // ── Hero carousel helpers ────────────────────────────────────────────────────

  const handleHeroActionClick = useCallback((actionId: string, meeting: Meeting) => {
    const mid = String(meeting.meeting_id ?? meeting.id ?? "");
    if (LIVE_ACTION_IDS.has(actionId)) {
      setLiveMeeting({ meetingId: mid, entryAction: ACTION_TO_ENTRY[actionId] ?? "join_meeting" });
      return;
    }
    switch (actionId) {
      case "prepare_minutes":
      case "review_minutes":
        navigate("/archive-reports/minutes");
        break;
      default:
        setSelectedMeeting(meeting);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const getMeetingRowAction = useCallback((m: Meeting) => {
    const resolved: ResolvedAction[] = resolveMtgActions(m as Parameters<typeof resolveMtgActions>[0]);
    const direct = resolved.filter(a => a.visible && a.placement === "direct").sort((a, b) => a.priority - b.priority);
    const best = direct[0];
    if (!best) return null;
    const highlight = LIVE_ACTION_IDS.has(best.id);
    const mid = String(m.meeting_id ?? m.id ?? "");
    const CONCISE_LABELS: Record<string, string> = {
      start_meeting: "Start", join_meeting: "Join", rejoin_meeting: "Rejoin",
      resume_meeting: "Resume", resume_after_break: "Resume", resume_adjourned_meeting: "Continue",
      start: "Start", join: "Join", rejoin: "Rejoin",
      view: "View Details", review_meeting: "Review", publish_meeting: "Publish",
      continue_setup: "Continue Setup", prepare_minutes: "Prepare Minutes",
    };
    return {
      label: CONCISE_LABELS[best.id] ?? best.label,
      highlight,
      onClick: () => {
        if (LIVE_ACTION_IDS.has(best.id)) {
          setLiveMeeting({ meetingId: mid, entryAction: ACTION_TO_ENTRY[best.id] ?? "join_meeting" });
        } else if (best.id === "prepare_minutes" || best.id === "review_minutes") {
          navigate("/archive-reports/minutes");
        } else {
          setSelectedMeeting(m);
        }
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveMtgActions, navigate]);

  const getPrimaryAction = useCallback((m: Meeting) => {
    const resolved: ResolvedAction[] = resolveMtgActions(m as Parameters<typeof resolveMtgActions>[0]);
    const direct = resolved.filter(a => a.visible && a.placement === "direct").sort((a, b) => a.priority - b.priority);
    const best = direct[0];
    if (!best) return null;
    const tone = (best.tone === "danger" ? "warning" : best.tone ?? "neutral") as "primary" | "success" | "warning" | "neutral";
    return { label: best.label, tone, onClick: () => handleHeroActionClick(best.id, m) };
  }, [resolveMtgActions, handleHeroActionClick]);

  // ── Task action router ───────────────────────────────────────────────────────

  const handleTaskAction = useCallback((task: UrgentTask) => {
    if (task.id.startsWith("mtg-")) {
      const meeting = meetings.find(m => String(m.id ?? "") === task.id.replace("mtg-", ""));
      if (meeting) { setSelectedMeeting(meeting); return; }
      navigate("/meetings/all-meetings");
    } else if (task.id.startsWith("agd-")) {
      navigate("/agenda-documents/agenda-management");
    } else if (task.id.startsWith("rsvp-")) {
      navigate("/meetings/all-meetings");
    } else if (task.id.startsWith("act-")) {
      navigate("/decisions-followup/action-items");
    } else {
      navigate("/home/my-tasks");
    }
  }, [meetings, navigate]);

  // ── KPI cards ────────────────────────────────────────────────────────────────

  const openTaskCount = useMemo(() => {
    let n = 0;
    n += meetings.filter(m => ["Pending Approval", "Awaiting Minutes", "Awaiting Approval"].includes(String(m.approval_status ?? ""))).length;
    n += agendas.filter(a => ["Pending Approval", "Pending"].includes(String(a.approval_status ?? a.submission_status ?? ""))).length;
    n += boardPacks.filter(p => !["Published", "Archived", "Approved"].includes(String(p.approval_status ?? ""))).length;
    n += rsvps.filter(r => !r.response || String(r.response) === "Pending").length;
    n += conflicts.filter(c => String(c.review_status ?? "") === "Pending").length;
    n += minutes.filter(m => ["Draft", "Awaiting Review"].includes(String(m.approval_status ?? ""))).length;
    n += actions.filter(a => String(a.implementation_status ?? "") !== "Completed").length;
    return n;
  }, [meetings, agendas, boardPacks, rsvps, conflicts, minutes, actions]);

  const tasksThisWeek = useMemo(() =>
    actions.filter(a => {
      const due = String(a.due_date ?? "");
      return due > today && due <= weekEnd && String(a.implementation_status ?? "") !== "Completed";
    }).length,
    [actions, today, weekEnd]
  );

  const pendingApprovals      = meetings.filter(m => ["Pending Approval", "Awaiting Minutes", "Awaiting Approval"].includes(String(m.approval_status ?? "")));
  const pendingAgendas        = agendas.filter(a => ["Pending Approval", "Pending"].includes(String(a.approval_status ?? a.submission_status ?? "")));
  const pendingApprovalCount  = pendingApprovals.length + pendingAgendas.length;
  const pendingToday          = pendingApprovals.filter(m => String(m.meeting_date ?? "") === today).length;

  const overdueActions = useMemo(() =>
    actions.filter(a => String(a.due_date ?? "") < today && String(a.due_date ?? "") !== "" && String(a.implementation_status ?? "") !== "Completed"),
    [actions, today]
  );
  const over30Days = overdueActions.filter(a => {
    const diff = (new Date(today).getTime() - new Date(String(a.due_date ?? "")).getTime()) / 86400000;
    return diff > 30;
  }).length;

  const docsToReview    = boardPacks.filter(p => !["Published", "Archived", "Approved"].includes(String(p.approval_status ?? "")));
  const docsDueThisWeek = docsToReview.filter(p => { const d = String(p.meeting_date ?? ""); return d > today && d <= weekEnd; }).length;

  // ── Recent updates ───────────────────────────────────────────────────────────

  const recentUpdates = useMemo((): UpdateItem[] => {
    const out: UpdateItem[] = [];

    for (const m of meetings) {
      const s = String(m.approval_status ?? "");
      const lastActivity = Array.isArray(m.activity_history) && m.activity_history.length > 0
        ? String(((m.activity_history as { at: string }[]).slice(-1)[0])?.at ?? m.updated_at ?? "")
        : String(m.updated_at ?? m.meeting_date ?? "");
      if (s === "In Progress")
        out.push({ id: `mtg-live-${m.id}`, text: "Meeting started", sub: String(m.meeting_title ?? ""), time: lastActivity, dot: "live", icon: Radio });
      else if (s === "Paused")
        out.push({ id: `mtg-pause-${m.id}`, text: "Meeting paused", sub: String(m.meeting_title ?? ""), time: lastActivity, dot: "warning", icon: Activity });
      else if (s === "Approved")
        out.push({ id: `mtg-apv-${m.id}`, text: "Meeting approved", sub: String(m.meeting_title ?? ""), time: lastActivity, dot: "success", icon: CheckCircle2 });
      else if (s === "Published")
        out.push({ id: `mtg-pub-${m.id}`, text: "Board Pack published", sub: String(m.meeting_title ?? ""), time: lastActivity, dot: "success", icon: BookOpen });
    }

    for (const a of agendas) {
      const s = String(a.approval_status ?? "");
      const t = String(a.created_at ?? "");
      if (s === "Approved")
        out.push({ id: `agd-apv-${a.id}`, text: "Agenda item approved", sub: String(a.meeting_title ?? ""), time: t, dot: "success", icon: CheckCircle2 });
      else if (s === "Pending" || s === "Pending Approval")
        out.push({ id: `agd-pnd-${a.id}`, text: "Agenda item submitted", sub: String(a.meeting_title ?? ""), time: t, dot: "primary", icon: FileText });
    }

    for (const a of actions) {
      if (String(a.implementation_status ?? "") === "Completed")
        out.push({ id: `act-done-${a.id}`, text: "Action item completed", sub: String(a.action_title ?? ""), time: String(a.created_at ?? ""), dot: "success", icon: CheckCircle2 });
      else if (String(a.implementation_status ?? "") === "In Progress")
        out.push({ id: `act-${a.id}`, text: "Action item updated", sub: String(a.action_title ?? ""), time: String(a.created_at ?? ""), dot: "neutral", icon: BarChart2 });
    }

    for (const d of decisions) {
      const t = String(d.created_at ?? "");
      if (t) out.push({ id: `dec-${d.id}`, text: "Decision recorded", sub: String(d.decision_title ?? ""), time: t, dot: "primary", icon: FileText });
    }

    return out.filter(u => u.time).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
  }, [meetings, agendas, actions, decisions]);

  // ── Urgent tasks ─────────────────────────────────────────────────────────────

  const urgentTasks = useMemo((): UrgentTask[] => {
    const out: UrgentTask[] = [];
    for (const m of meetings) {
      if (!["Pending Approval", "Awaiting Minutes"].includes(String(m.approval_status ?? ""))) continue;
      const due = String(m.meeting_date ?? "");
      out.push({ id: `mtg-${m.id}`, title: "Review meeting approval", context: String(m.meeting_title ?? ""), dueLabel: friendlyDue(due), type: "Approval", action: "Review", isOverdue: due < today && due !== "" });
    }
    for (const a of agendas) {
      if (!["Pending Approval", "Pending"].includes(String(a.approval_status ?? a.submission_status ?? ""))) continue;
      const due = String(a.meeting_date ?? "");
      out.push({ id: `agd-${a.id}`, title: "Approve agenda submission", context: String(a.meeting_title ?? ""), dueLabel: friendlyDue(due), type: "Approval", action: "Approve", isOverdue: due < today && due !== "" });
    }
    for (const r of rsvps) {
      if (r.response && String(r.response) !== "Pending") continue;
      const due = String(r.meeting_date ?? "");
      out.push({ id: `rsvp-${r.id}`, title: "Confirm RSVP", context: String(r.meeting_title ?? ""), dueLabel: friendlyDue(due), type: "RSVP", action: "Respond", isOverdue: due < today && due !== "" });
    }
    for (const a of actions) {
      if (String(a.implementation_status ?? "") === "Completed") continue;
      const due = String(a.due_date ?? "");
      out.push({ id: `act-${a.id}`, title: String(a.action_title ?? "Action item"), context: String(a.source_meeting ?? ""), dueLabel: friendlyDue(due), type: "Action", action: "Update", isOverdue: due < today && due !== "" });
    }
    return out.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return 0;
    });
  }, [meetings, agendas, rsvps, actions, today]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const firstName = currentUser ? currentUser.name.split(" ")[0] : null;

  return (
    <div className="dashboard-page" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--color-text-secondary)", marginBottom: 2 }}>
          {ROLE_LABELS[viewRole]}
        </p>
        <h1 style={{ fontSize: "clamp(18px, 2.5vw, 24px)", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
          {firstName ? `Welcome back, ${firstName}.` : "Overview"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, maxWidth: 540 }}>
          {ROLE_SUBTITLES[viewRole]}
        </p>
      </div>

      {/* Row 1: Hero carousel (7 cols) + KPI grid (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ alignItems: "stretch" }}>
        <div className="lg:col-span-7" style={{ display: "flex", flexDirection: "column" }}>
          <MeetingHeroCarousel
            meetings={heroMeetings}
            navigate={navigate}
            getPrimaryAction={getPrimaryAction}
            onViewDetails={setSelectedMeeting}
            userRole={ROLE_LABELS[viewRole]}
          />
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <StatCard
            icon={CheckSquare}
            value={String(openTaskCount)}
            label="My Tasks"
            subInfo={
              tasksThisWeek > 0           ? `${tasksThisWeek} due this week`
              : overdueActions.length > 0 ? `${overdueActions.length} overdue`
              : openTaskCount > 0         ? "Review open tasks"
              : "All caught up"
            }
            tone="primary"
            onClick={() => navigate("/home/my-tasks")}
          />
          <StatCard
            icon={FileText}
            value={String(pendingApprovalCount)}
            label="Pending Approvals"
            subInfo={
              pendingToday > 0           ? `${pendingToday} due today`
              : pendingApprovalCount > 0 ? "Awaiting your review"
              : "None pending"
            }
            tone={pendingApprovalCount > 0 ? "warning" : "neutral"}
            onClick={() => navigate("/meetings/meeting-overview")}
          />
          <StatCard
            icon={AlertTriangle}
            value={String(overdueActions.length)}
            label="Overdue Actions"
            subInfo={
              over30Days > 0              ? `${over30Days} over 30 days`
              : overdueActions.length > 0 ? "Needs attention"
              : "None outstanding"
            }
            tone={overdueActions.length > 0 ? "error" : "neutral"}
            onClick={() => navigate("/decisions-followup/action-items")}
          />
          <StatCard
            icon={BookOpen}
            value={String(docsToReview.length)}
            label="Documents to Review"
            subInfo={
              docsDueThisWeek > 0       ? `${docsDueThisWeek} due this week`
              : docsToReview.length > 0 ? "Pending your review"
              : "All reviewed"
            }
            tone={docsToReview.length > 0 ? "warning" : "neutral"}
            onClick={() => navigate("/agenda-documents/board-packs")}
          />
        </div>
      </div>

      {/* Row 2: Ongoing & Upcoming Meetings (50%) + My Tasks (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: "start" }}>
        <div>
          <MeetingsSection meetings={displayedMeetings} navigate={navigate} getRowAction={getMeetingRowAction} onRowClick={setSelectedMeeting} />
        </div>
        <div>
          <MyTasksOverviewSection tasks={urgentTasks} navigate={navigate} onTaskAction={handleTaskAction} />
        </div>
      </div>

      {/* Row 3: Agenda Progress (50%) + Recent Updates (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: "start" }}>
        <div>
          <AgendaProgressPanel meetings={displayedMeetings} agendas={agendas} navigate={navigate} />
        </div>
        <div>
          <RecentUpdatesPanel updates={recentUpdates} navigate={navigate} />
        </div>
      </div>

      {/* Meeting detail modal */}
      <MeetingDetailModal
        meeting={selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        navigate={navigate}
      />

      {/* Live meeting full-screen workspace */}
      {liveMeeting && (
        <FullScreenWorkspaceShell
          open={true}
          title="Live Meeting"
          onClose={() => setLiveMeeting(null)}
          confirmOnClose="Leave the live meeting session?"
        >
          <LiveMeetingWorkspace
            meetingId={liveMeeting.meetingId}
            entryAction={liveMeeting.entryAction}
            onClose={() => setLiveMeeting(null)}
          />
        </FullScreenWorkspaceShell>
      )}

    </div>
  );
}
