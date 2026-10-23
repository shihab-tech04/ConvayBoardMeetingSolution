import type { SlidePreview } from "../../pages/auth/LoginPage";

interface LoginSlideProps {
  slide: {
    headline: string;
    text: string;
    preview: SlidePreview;
  };
}

// ── Shared frame shell ────────────────────────────────────────────────────────

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="slide-frame">
      {/* Browser chrome */}
      <div className="slide-frame__chrome">
        <span className="slide-frame__dot slide-frame__dot--red" />
        <span className="slide-frame__dot slide-frame__dot--amber" />
        <span className="slide-frame__dot slide-frame__dot--green" />
        <span className="slide-frame__chrome-bar" />
      </div>
      {/* App shell */}
      <div className="slide-frame__body">
        {/* Sidebar */}
        <div className="slide-frame__sidebar">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`slide-frame__nav-item ${i === 1 ? "slide-frame__nav-item--active" : ""}`} />
          ))}
        </div>
        {/* Content */}
        <div className="slide-frame__content">{children}</div>
      </div>
    </div>
  );
}

// ── Preview helpers ───────────────────────────────────────────────────────────

function StatusPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="slide-pill"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        color,
      }}
    >
      {label}
    </span>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="slide-bar">
      <div className="slide-bar__track">
        <div className="slide-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="slide-bar__label">{pct}%</span>
    </div>
  );
}

// ── Slide 1 — Prepare ─────────────────────────────────────────────────────────

function PreparePreview() {
  const rows = [
    { title: "Audit Committee — Q3 2026",     date: "Jul 28", status: "Scheduled",   color: "var(--color-primary)" },
    { title: "Board of Directors — Regular",  date: "Jul 30", status: "In Progress", color: "var(--color-success, #22c55e)" },
    { title: "Executive Committee",           date: "Aug 4",  status: "Draft",       color: "var(--color-text-muted)" },
  ];
  return (
    <AppFrame>
      <div className="slide-section-header">
        <div className="slide-row-label">Upcoming Meetings</div>
        <div className="slide-count-badge">3</div>
      </div>

      {rows.map((r, i) => (
        <div key={i} className="slide-row">
          <div className="slide-row__icon" style={{ background: `color-mix(in srgb, ${r.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${r.color} 22%, transparent)` }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="1" y="2" width="8" height="7" rx="1.5" stroke={r.color} strokeWidth="1.2" />
              <path d="M3 1v2M7 1v2M1 4.5h8" stroke={r.color} strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <div className="slide-row__main">
            <div className="slide-row__title">{r.title}</div>
            <div className="slide-row__meta">{r.date}</div>
          </div>
          <StatusPill color={r.color} label={r.status} />
        </div>
      ))}

      <div className="slide-divider" />
      <div className="slide-row-label" style={{ marginBottom: 6 }}>Board Pack Readiness</div>
      <MiniBar pct={100} color="var(--color-success, #22c55e)" />
      <MiniBar pct={72}  color="var(--color-primary)" />
      <MiniBar pct={38}  color="var(--color-warning, #f59e0b)" />
    </AppFrame>
  );
}

// ── Slide 2 — Run ─────────────────────────────────────────────────────────────

function RunPreview() {
  const initials = ["AK", "SR", "MM", "FH", "RI", "TK", "NA", "PB"];
  const colors   = [
    "var(--color-primary)",
    "var(--color-success, #22c55e)",
    "var(--color-warning, #f59e0b)",
    "var(--color-error, #ef4444)",
    "var(--color-primary)",
    "var(--color-success, #22c55e)",
    "var(--color-warning, #f59e0b)",
    "var(--color-error, #ef4444)",
  ];
  const present  = [0, 1, 2, 3, 4, 6];

  return (
    <AppFrame>
      <div className="slide-live-header">
        <div className="slide-live-title">
          <span className="slide-live-dot" />
          Board of Directors — Regular
        </div>
        <StatusPill color="var(--color-success, #22c55e)" label="Quorum Met" />
      </div>

      {/* Participant tiles */}
      <div className="slide-tiles">
        {initials.map((ini, i) => (
          <div
            key={i}
            className={`slide-tile ${present.includes(i) ? "slide-tile--present" : "slide-tile--absent"}`}
            style={{
              background: present.includes(i) ? `color-mix(in srgb, ${colors[i]} 14%, transparent)` : "var(--color-surface-raised)",
              border: `1px solid ${present.includes(i) ? `color-mix(in srgb, ${colors[i]} 28%, transparent)` : "var(--color-border)"}`,
            }}
          >
            <span style={{ color: present.includes(i) ? colors[i] : "var(--color-text-muted)", fontSize: 9, fontWeight: 600 }}>{ini}</span>
          </div>
        ))}
      </div>

      <div className="slide-divider" />

      {/* Agenda items */}
      {[
        { no: "1", title: "Minutes of Previous Meeting", done: true },
        { no: "2", title: "CEO Report & Financial Review", active: true },
        { no: "3", title: "Resolution on Capital Allocation", pending: true },
      ].map((item, i) => (
        <div key={i} className={`slide-agenda-item ${item.active ? "slide-agenda-item--active" : ""}`}>
          <span className="slide-agenda-no">{item.no}</span>
          <span className="slide-agenda-title">{item.title}</span>
          {item.done && <StatusPill color="var(--color-success, #22c55e)" label="Done" />}
          {item.active && <StatusPill color="var(--color-primary)" label="In Progress" />}
        </div>
      ))}
    </AppFrame>
  );
}

// ── Slide 3 — Track ───────────────────────────────────────────────────────────

function TrackPreview() {
  return (
    <AppFrame>
      <div className="slide-section-header">
        <div className="slide-row-label">Resolutions &amp; Actions</div>
        <div className="slide-count-badge">6</div>
      </div>

      {[
        { ref: "RES-001", title: "Approve Annual Capital Plan",         owner: "CFO",  status: "Approved",  color: "var(--color-success, #22c55e)" },
        { ref: "RES-002", title: "Appoint External Auditor FY 2026",    owner: "CS",   status: "Pending",   color: "var(--color-warning, #f59e0b)" },
        { ref: "RES-003", title: "Amend Articles of Association",       owner: "Legal",status: "In Review", color: "var(--color-primary)" },
      ].map((r, i) => (
        <div key={i} className="slide-row">
          <div className="slide-row__ref">{r.ref}</div>
          <div className="slide-row__main">
            <div className="slide-row__title">{r.title}</div>
            <div className="slide-row__meta">{r.owner}</div>
          </div>
          <StatusPill color={r.color} label={r.status} />
        </div>
      ))}

      <div className="slide-divider" />
      <div className="slide-row-label" style={{ marginBottom: 6 }}>Action Item Progress</div>
      <MiniBar pct={83} color="var(--color-success, #22c55e)" />
      <MiniBar pct={50} color="var(--color-warning, #f59e0b)" />
    </AppFrame>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function LoginSlide({ slide }: LoginSlideProps) {
  return (
    <div className="login-slide">
      <div className="login-slide__preview">
        {slide.preview === "prepare" && <PreparePreview />}
        {slide.preview === "run"     && <RunPreview />}
        {slide.preview === "track"   && <TrackPreview />}
      </div>
    </div>
  );
}
