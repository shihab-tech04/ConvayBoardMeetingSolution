import { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Video, VideoOff,
  Calendar, Clock, MapPin, Users,
  AlertCircle, Wifi, UserCircle2,
  Building2, MonitorSmartphone,
} from "lucide-react";
import { PrimaryButton } from "../buttons/PrimaryButton";
import { SecondaryButton } from "../buttons/SecondaryButton";

export type PreJoinRole =
  | "Chairperson" | "Company Secretary" | "Board Member" | "Independent Director"
  | "Presenter" | "Observer" | "Guest" | "Administrator";

export interface MeetingPreJoinPanelProps {
  meeting?: {
    id?: string;
    meeting_title?: string;
    committee?: string;
    meeting_date?: string;
    start_time?: string;
    mode?: string;
    venue?: string;
  };
  initialRole: PreJoinRole;
  allowedRoles?: PreJoinRole[];
  onJoin: (options: { micOn: boolean; camOn: boolean; role: PreJoinRole }) => void;
  onBack: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MODE_WORDS = new Set([
  "virtual", "online", "hybrid", "in person", "in-person", "physical", "face to face",
]);

function normalizeMode(raw?: string): string {
  if (!raw) return "Virtual";
  const key = raw.trim().toLowerCase();
  if (key === "virtual" || key === "online")                                 return "Virtual";
  if (key === "hybrid")                                                      return "Hybrid";
  if (key === "in person" || key === "in-person" || key === "physical" ||
      key === "face to face")                                                return "In Person";
  return raw;
}

function isRealVenue(text?: string): boolean {
  return !!text && !MODE_WORDS.has(text.trim().toLowerCase());
}

/** Convert "14:00" or "14:00:00" → "2:00 PM" */
function formatTime12h(raw?: string): string {
  if (!raw) return "";
  const parts = raw.split(":");
  let h = parseInt(parts[0], 10);
  const m = parts[1] ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MeetingPreJoinPanel({
  meeting, initialRole, onJoin, onBack,
}: MeetingPreJoinPanelProps) {
  const [micOn,   setMicOn]   = useState(true);
  const [camOn,   setCamOn]   = useState(true);
  const [permErr, setPermErr] = useState("");
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!camOn) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      return;
    }
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPermErr("");
      })
      .catch(() => { setPermErr("Camera unavailable"); setCamOn(false); });
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  }, [camOn]);

  const dateStr = meeting?.meeting_date
    ? new Date(meeting.meeting_date + "T12:00:00").toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const timeStr = formatTime12h(meeting?.start_time);
  const mode    = normalizeMode(meeting?.mode);
  const venue   = isRealVenue(meeting?.venue) ? meeting!.venue! : undefined;

  const venueDisplay = venue
    ?? (mode === "Virtual" ? "Secure virtual meeting" : "Venue not specified");

  const ModeIcon = mode === "Virtual" ? Video
                 : mode === "Hybrid"  ? MonitorSmartphone
                 :                      Building2;

  const devicesAlreadyOff = !micOn && !camOn;

  return (
    <div className="meeting-prejoin">

      {/* ── Header ── */}
      <header className="meeting-prejoin__header">
        <div className="meeting-prejoin__header-inner">
          <button className="meeting-prejoin__back" onClick={onBack} aria-label="Back to Meetings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Meetings
          </button>
          <span className="meeting-prejoin__header-label">Pre-join check</span>
        </div>
      </header>

      {/* ── Workspace ── */}
      <div className="meeting-prejoin__layout">
        <div className="meeting-prejoin__grid">

          {/* ══ Left column ══ */}
          <div className="meeting-prejoin__preview">

            {/* Camera well */}
            <div className="meeting-prejoin__camera-well" role="region" aria-label="Camera preview">

              {camOn ? (
                <video ref={videoRef} autoPlay playsInline muted className="meeting-prejoin__video" />
              ) : (
                <div className="meeting-prejoin__avatar-state">
                  <div className="meeting-prejoin__avatar" aria-hidden="true">
                    <UserCircle2 size={52} strokeWidth={1.3} />
                  </div>
                  <span className="meeting-prejoin__camera-off-label">Camera is off</span>
                </div>
              )}

              {/* Permission warning */}
              {permErr && (
                <div className="meeting-prejoin__alert" role="alert" aria-live="assertive">
                  <AlertCircle size={15} className="meeting-prejoin__alert-icon" aria-hidden="true" />
                  <div className="meeting-prejoin__alert-body">
                    <span className="meeting-prejoin__alert-title">Camera unavailable</span>
                    <span className="meeting-prejoin__alert-text">You can still join with your camera turned off.</span>
                  </div>
                </div>
              )}

              {/* Device controls */}
              <div className="meeting-prejoin__device-controls" role="group" aria-label="Device controls">
                <button
                  className={`meeting-prejoin__dev-btn meeting-prejoin__dev-btn--${micOn ? "on" : "off"}`}
                  onClick={() => setMicOn(v => !v)}
                  aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                  aria-pressed={micOn}
                >
                  {micOn ? <Mic size={19} aria-hidden="true" /> : <MicOff size={19} aria-hidden="true" />}
                </button>
                <button
                  className={`meeting-prejoin__dev-btn meeting-prejoin__dev-btn--${camOn ? "on" : "off"}`}
                  onClick={() => setCamOn(v => !v)}
                  aria-label={camOn ? "Turn off camera" : "Turn on camera"}
                  aria-pressed={camOn}
                >
                  {camOn ? <Video size={19} aria-hidden="true" /> : <VideoOff size={19} aria-hidden="true" />}
                </button>
              </div>

            </div>

            {/* Device readiness tray */}
            <div className="meeting-prejoin__readiness-tray" role="region" aria-label="Device readiness">
              <div className="meeting-prejoin__tray-item">
                <div className="meeting-prejoin__tray-icon">
                  {micOn ? <Mic size={15} className="pj-icon-ok" aria-hidden="true" /> : <MicOff size={15} className="pj-icon-off" aria-hidden="true" />}
                </div>
                <div className="meeting-prejoin__tray-info">
                  <span className="meeting-prejoin__tray-label">Microphone</span>
                  <span className={`meeting-prejoin__tray-state ${micOn ? "pj-ok" : "pj-off"}`}>{micOn ? "On" : "Muted"}</span>
                </div>
              </div>

              <div className="meeting-prejoin__tray-sep" aria-hidden="true" />

              <div className="meeting-prejoin__tray-item">
                <div className="meeting-prejoin__tray-icon">
                  {camOn ? <Video size={15} className="pj-icon-ok" aria-hidden="true" /> : <VideoOff size={15} className="pj-icon-off" aria-hidden="true" />}
                </div>
                <div className="meeting-prejoin__tray-info">
                  <span className="meeting-prejoin__tray-label">Camera</span>
                  <span className={`meeting-prejoin__tray-state ${camOn ? "pj-ok" : "pj-off"}`}>{camOn ? "On" : "Off"}</span>
                </div>
              </div>

              <div className="meeting-prejoin__tray-sep" aria-hidden="true" />

              <div className="meeting-prejoin__tray-item">
                <div className="meeting-prejoin__tray-icon">
                  <Wifi size={15} className="pj-icon-ok" aria-hidden="true" />
                </div>
                <div className="meeting-prejoin__tray-info">
                  <span className="meeting-prejoin__tray-label">Connection</span>
                  <span className="meeting-prejoin__tray-state pj-ok">Ready</span>
                </div>
              </div>
            </div>

          </div>

          {/* ══ Right column — meeting entry card ══ */}
          <div className="meeting-prejoin__card">
            <div className="meeting-prejoin__card-content">

              {/* Ready indicator */}
              <div className="meeting-prejoin__context">
                <span className="meeting-prejoin__ready-dot" aria-hidden="true" />
                Ready to join
              </div>

              {/* Title + governance body */}
              <div className="meeting-prejoin__heading-group">
                <h2 className="meeting-prejoin__title">
                  {meeting?.meeting_title ?? "Board Meeting"}
                </h2>
                {meeting?.committee && (
                  <div className="meeting-prejoin__committee">
                    <Users size={13} aria-hidden="true" />
                    {meeting.committee}
                  </div>
                )}
              </div>

              {/* Structured details grid */}
              <div className="meeting-prejoin__details">
                <span className="meeting-prejoin__details-label">Meeting details</span>
                <div className="meeting-prejoin__details-grid">
                  {dateStr && (
                    <div className="meeting-prejoin__detail-item">
                      <div className="meeting-prejoin__detail-icon">
                        <Calendar size={14} aria-hidden="true" />
                      </div>
                      <div className="meeting-prejoin__detail-content">
                        <span className="meeting-prejoin__detail-key">Date</span>
                        <span className="meeting-prejoin__detail-value">{dateStr}</span>
                      </div>
                    </div>
                  )}
                  {timeStr && (
                    <div className="meeting-prejoin__detail-item">
                      <div className="meeting-prejoin__detail-icon">
                        <Clock size={14} aria-hidden="true" />
                      </div>
                      <div className="meeting-prejoin__detail-content">
                        <span className="meeting-prejoin__detail-key">Time</span>
                        <span className="meeting-prejoin__detail-value">{timeStr}</span>
                      </div>
                    </div>
                  )}
                  <div className="meeting-prejoin__detail-item">
                    <div className="meeting-prejoin__detail-icon">
                      <ModeIcon size={14} aria-hidden="true" />
                    </div>
                    <div className="meeting-prejoin__detail-content">
                      <span className="meeting-prejoin__detail-key">Mode</span>
                      <span className="meeting-prejoin__detail-value">{mode}</span>
                    </div>
                  </div>
                  <div className="meeting-prejoin__detail-item">
                    <div className="meeting-prejoin__detail-icon">
                      <MapPin size={14} aria-hidden="true" />
                    </div>
                    <div className="meeting-prejoin__detail-content">
                      <span className="meeting-prejoin__detail-key">Venue</span>
                      <span className="meeting-prejoin__detail-value">{venueDisplay}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Actions — pushed to bottom */}
            <div className="meeting-prejoin__actions">
              <PrimaryButton fullWidth size="lg" onClick={() => onJoin({ micOn, camOn, role: initialRole })}>
                Join Meeting
              </PrimaryButton>
              {!devicesAlreadyOff && (
                <SecondaryButton fullWidth size="lg" onClick={() => onJoin({ micOn: false, camOn: false, role: initialRole })}>
                  Join with devices off
                </SecondaryButton>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
