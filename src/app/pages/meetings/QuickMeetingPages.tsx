import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { Copy, DoorOpen, Link2, Lock, Mic, MicOff, Monitor, MonitorOff, PhoneOff, RotateCcw, ShieldOff, Unlock, Users, Video, VideoOff } from "lucide-react";
import { FullScreenWorkspaceShell } from "../../components/shared/FullScreenWorkspaceShell";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SecondaryButton } from "../../components/buttons/SecondaryButton";
import { LiveMeetingMedia } from "./LiveMeetingMedia";
import { quickGuestShareUrl, quickMeetingApi, type QuickMeetingState } from "../../services/quickMeetingApi";

const cardStyle: CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-sm)",
};

function displayError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function QuickMeetingLaunchPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createQuickMeeting(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await quickMeetingApi.create(title.trim() || undefined);
      navigate(`/meetings/quick-meeting/${created.meetingId}`, {
        state: { shareUrl: quickGuestShareUrl(created.shareToken) },
      });
    } catch (cause) {
      setError(displayError(cause, "Unable to create a quick meeting. Try again."));
    } finally { setBusy(false); }
  }

  return <section className="table-page qm-launch" aria-labelledby="qm-launch-title">
    <div className="qm-launch__card" style={cardStyle}>
      <div className="qm-launch__icon" aria-hidden="true"><Video size={22} /></div>
      <h1 id="qm-launch-title">Quick Meeting</h1>
      <p>Start an instant online meeting and share a secure guest link. Quick Meetings are separate from Convay board governance records.</p>
      <form onSubmit={createQuickMeeting} className="qm-form">
        <label htmlFor="qm-title">Meeting name <span>(optional)</span></label>
        <input id="qm-title" className="qm-input" value={title} maxLength={80} onChange={event => setTitle(event.target.value)} placeholder="Quick Meeting" />
        {error && <p className="qm-error" role="alert">{error}</p>}
        <PrimaryButton type="submit" leadingIcon={Video} loading={busy} loadingText="Creating meeting…">Start Quick Meeting</PrimaryButton>
      </form>
    </div>
  </section>;
}

export function QuickMeetingHostPage() {
  const { quickMeetingId = "" } = useParams<{ quickMeetingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { shareUrl?: string } | null;
  const [meeting, setMeeting] = useState<QuickMeetingState | null>(null);
  const [shareUrl, setShareUrl] = useState(routeState?.shareUrl ?? "");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [mediaVisible, setMediaVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [participants, setParticipants] = useState<Array<{ identity: string; name: string; isLocal: boolean }>>([]);
  const stateRequest = useRef(0);

  const refreshState = useCallback(async () => {
    if (!quickMeetingId) return;
    const current = ++stateRequest.current;
    try {
      const state = await quickMeetingApi.state(quickMeetingId);
      if (stateRequest.current === current) {
        setMeeting(state);
        if (state.status === "ended" || !state.shareLink?.available) setShareUrl("");
      }
    } catch (cause) {
      if (stateRequest.current === current) setError(displayError(cause, "Meeting status could not be refreshed."));
    }
  }, [quickMeetingId]);

  useEffect(() => {
    void refreshState();
    const timer = window.setInterval(() => { void refreshState(); }, 5000);
    return () => { window.clearInterval(timer); stateRequest.current++; };
  }, [refreshState]);

  const requestAdmission = useCallback((id: string) => quickMeetingApi.hostJoin(id), []);
  const onPresence = useCallback((connected: boolean, identity?: string) => {
    if (!identity) return;
    const request = connected ? quickMeetingApi.confirmHostJoin(quickMeetingId) : quickMeetingApi.hostLeave(quickMeetingId);
    void request.then(() => refreshState()).catch(cause => setError(displayError(cause, "Meeting attendance could not be saved.")));
  }, [quickMeetingId, refreshState]);
  const onParticipants = useCallback((next: Array<{ identity: string; name: string; isLocal: boolean }>) => setParticipants(next), []);

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyLabel("Copied");
      setNotice("Secure guest link copied.");
      window.setTimeout(() => setCopyLabel("Copy link"), 1800);
    } catch { setError("Your browser blocked clipboard access. Select and copy the link from the field."); }
  }

  async function shareLink() {
    if (!shareUrl) return;
    if (navigator.share) {
      try { await navigator.share({ title: meeting?.title || "Convay Quick Meeting", url: shareUrl }); }
      catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("The link could not be shared from this browser."); }
    } else await copyLink();
  }

  async function rotateLink() {
    if (!quickMeetingId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await quickMeetingApi.rotateLink(quickMeetingId);
      setShareUrl(quickGuestShareUrl(result.shareToken));
      setNotice(result.guestCleanupConfirmed
        ? "A new link is ready. The previous link was revoked and its guests were disconnected."
        : "A new link is ready and the previous link is revoked. Check the participant list; one or more existing guests could not be confirmed disconnected.");
      await refreshState();
    } catch (cause) { setError(displayError(cause, "A new share link could not be created.")); }
    finally { setBusy(false); }
  }

  async function revokeLink() {
    if (!quickMeetingId || !window.confirm("Revoke the current guest link and disconnect guests who joined through it?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await quickMeetingApi.revokeLink(quickMeetingId);
      setShareUrl("");
      setNotice(result.guestCleanupConfirmed
        ? "The guest link was revoked and guests were disconnected."
        : "The guest link was revoked. Check the participant list; one or more guest disconnections could not be confirmed.");
      await refreshState();
    } catch (cause) { setError(displayError(cause, "The guest link could not be revoked.")); }
    finally { setBusy(false); }
  }

  async function setLocked(locked: boolean) {
    if (!quickMeetingId) return;
    setBusy(true); setError("");
    try {
      await quickMeetingApi.setAdmissionLocked(quickMeetingId, locked);
      await refreshState();
      setNotice(locked ? "New guest admissions are paused. Existing guests can reconnect." : "Guests can join through the active link again.");
    } catch (cause) { setError(displayError(cause, "Guest admission could not be changed.")); }
    finally { setBusy(false); }
  }

  async function removeGuest(identity: string, name: string) {
    if (!window.confirm(`Remove ${name} from this Quick Meeting?`)) return;
    try { await quickMeetingApi.removeGuest(quickMeetingId, identity); await refreshState(); }
    catch (cause) { setError(displayError(cause, "The guest could not be removed.")); }
  }

  async function endMeeting() {
    if (!window.confirm("End this Quick Meeting for everyone? Guest links will stop working.")) return;
    setBusy(true); setError("");
    try {
      const result = await quickMeetingApi.end(quickMeetingId);
      setMeeting(current => current ? { ...current, status: "ended" } : current);
      setShareUrl("");
      setNotice(result.cleanupConfirmed
        ? "Quick Meeting ended and LiveKit confirmed the room is empty."
        : "Quick Meeting ended, but LiveKit could not confirm that every participant disconnected.");
      await refreshState();
    } catch (cause) { setError(displayError(cause, "The meeting could not be ended.")); }
    finally { setBusy(false); }
  }

  const onClose = useCallback(() => {
    setMediaVisible(false);
    navigate("/meetings/quick-meeting");
  }, [navigate]);

  if (!quickMeetingId) return <section className="table-page" role="alert"><h1>Quick Meeting unavailable</h1></section>;

  return <FullScreenWorkspaceShell open title="Quick Meeting" onClose={onClose} confirmOnClose="Leave this Quick Meeting? It will remain open for other participants.">
    <div className="qm-workspace">
      <header className="qm-workspace__header">
        <div className="qm-workspace__title">
          <span className="qm-workspace__mark" aria-hidden="true"><Video size={18} /></span>
          <div><h1>{meeting?.title || "Quick Meeting"}</h1><p>{meeting?.status === "ended" ? "Meeting ended" : meeting ? "Quick Meeting · Guest link" : "Verifying meeting…"}</p></div>
        </div>
        <div className="qm-workspace__header-actions">
          {meeting?.status !== "ended" && <SecondaryButton leadingIcon={DoorOpen} onClick={() => { setMediaVisible(false); }}>Leave</SecondaryButton>}
          <button className="qm-icon-button" type="button" onClick={onClose} aria-label="Close quick meeting">×</button>
        </div>
      </header>

      <div className="qm-workspace__body">
        <main className="qm-media-panel">
          {meeting?.status === "ended" ? <div className="qm-state-card" style={cardStyle}><h2>This Quick Meeting has ended</h2><p>Guest links are no longer valid.</p><PrimaryButton onClick={() => navigate("/meetings/quick-meeting")}>Start another meeting</PrimaryButton></div>
          : meeting && mediaVisible ? <>
            <LiveMeetingMedia
              meetingId={quickMeetingId} micOn={micOn} camOn={camOn} sharing={sharing}
              onMicChange={setMicOn} onCamChange={setCamOn} onSharingChange={setSharing}
              requestAdmission={requestAdmission} onPresence={onPresence} onParticipants={onParticipants}
            />
            <div className="qm-media-controls" aria-label="Quick meeting media controls">
              <button type="button" className={`qm-control ${micOn ? "" : "is-off"}`} onClick={() => setMicOn(value => !value)} aria-pressed={micOn} aria-label={micOn ? "Mute microphone" : "Unmute microphone"}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}<span>{micOn ? "Mute" : "Unmute"}</span></button>
              <button type="button" className={`qm-control ${camOn ? "" : "is-off"}`} onClick={() => setCamOn(value => !value)} aria-pressed={camOn} aria-label={camOn ? "Turn camera off" : "Turn camera on"}>{camOn ? <Video size={18} /> : <VideoOff size={18} />}<span>{camOn ? "Camera" : "Camera off"}</span></button>
              <button type="button" className={`qm-control ${sharing ? "is-on" : ""}`} onClick={() => setSharing(value => !value)} aria-pressed={sharing} aria-label={sharing ? "Stop screen sharing" : "Share screen"}>{sharing ? <MonitorOff size={18} /> : <Monitor size={18} />}<span>{sharing ? "Stop sharing" : "Share screen"}</span></button>
              {!mediaVisible && <PrimaryButton onClick={() => setMediaVisible(true)}>Rejoin</PrimaryButton>}
            </div>
          </> : meeting ? <div className="qm-state-card" style={cardStyle}><h2>You left the meeting</h2><p>The meeting remains open for other participants.</p><PrimaryButton onClick={() => setMediaVisible(true)}>Rejoin</PrimaryButton></div>
          : <div className="qm-state-card" style={cardStyle} role="status"><p>Loading meeting status…</p></div>}
        </main>

        <aside className="qm-host-panel" aria-label="Quick meeting sharing and participants">
          <section className="qm-panel-card" style={cardStyle}>
            <div className="qm-panel-heading"><h2><Link2 size={17} /> Guest link</h2><span>{meeting?.shareLink?.available || shareUrl ? "Active" : "Unavailable"}</span></div>
            <p>Anyone with this link can join as a guest. Convay sign-in is not required.</p>
            {shareUrl ? <>
              <label className="qm-sr-only" htmlFor="qm-share-link">Quick Meeting guest link</label>
              <input id="qm-share-link" className="qm-input qm-input--link" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} />
              <div className="qm-link-actions">
                <SecondaryButton leadingIcon={Copy} onClick={() => void copyLink()}>{copyLabel}</SecondaryButton>
                <SecondaryButton leadingIcon={Link2} onClick={() => void shareLink()}>Share</SecondaryButton>
              </div>
            </> : <p className="qm-muted">The original link is never stored in readable form. Create a new link to share it again.</p>}
            <div className="qm-link-actions qm-link-actions--manage">
              <SecondaryButton leadingIcon={RotateCcw} disabled={busy || meeting?.status !== "active"} onClick={() => void rotateLink()}>{shareUrl || meeting?.shareLink?.available ? "Replace link" : "Create link"}</SecondaryButton>
              <SecondaryButton leadingIcon={ShieldOff} disabled={busy || meeting?.status !== "active" || (!shareUrl && !meeting?.shareLink?.available)} onClick={() => void revokeLink()}>Revoke</SecondaryButton>
            </div>
            {meeting?.shareLink && <p className="qm-expiry">Link expires {new Date(meeting.shareLink.expiresAt).toLocaleString()}</p>}
          </section>

          <section className="qm-panel-card" style={cardStyle}>
            <div className="qm-panel-heading"><h2><Users size={17} /> Participants</h2><span>{meeting?.onlineCount ?? participants.length}/{meeting?.capacity ?? 4}</span></div>
            {meeting?.participants.length ? <ul className="qm-participant-list">
              {meeting.participants.map(person => <li key={person.identity}>
                <span className={`qm-presence ${person.online ? "is-online" : ""}`} aria-label={person.online ? "Online" : "Offline"} />
                <span className="qm-participant-name">{person.name}{person.participantKind === "host" ? " · Host" : " · Guest"}</span>
                {person.participantKind === "guest" && person.online && <button type="button" className="qm-remove" onClick={() => void removeGuest(person.identity, person.name)} aria-label={`Remove ${person.name}`}>Remove</button>}
              </li>)}
            </ul> : <p className="qm-muted">No participant attendance has been recorded yet.</p>}
            {participants.length > 0 && <p className="qm-muted">LiveKit presence updates while this page is open.</p>}
          </section>

          <section className="qm-panel-card" style={cardStyle}>
            <div className="qm-panel-heading"><h2><Lock size={17} /> Guest admission</h2><span>{meeting?.admissionLocked ? "Paused" : "Open"}</span></div>
            <p>Pause new joins while allowing current guests to reconnect.</p>
            <SecondaryButton leadingIcon={meeting?.admissionLocked ? Unlock : Lock} disabled={busy || meeting?.status !== "active"} onClick={() => void setLocked(!meeting?.admissionLocked)}>{meeting?.admissionLocked ? "Allow new guests" : "Pause new guests"}</SecondaryButton>
          </section>

          <section className="qm-end-panel">
            <PrimaryButton className="qm-end-button" leadingIcon={PhoneOff} disabled={busy || meeting?.status !== "active"} onClick={() => void endMeeting()}>{busy ? "Saving…" : "End meeting for everyone"}</PrimaryButton>
          </section>
        </aside>
      </div>
      {(error || notice) && <div className={`qm-toast ${error ? "qm-toast--error" : ""}`} role={error ? "alert" : "status"}>
        <span>{error || notice}</span>
        <button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button>
      </div>}
    </div>
  </FullScreenWorkspaceShell>;
}

type GuestMeetingInfo = { title: string; expiresAt: string; capacity: number; onlineCount: number };

function sessionStorageValue(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function saveSessionStorageValue(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value); } catch { /* Browser private mode can disable storage. */ }
}

function useGuestSession(routeToken: string | undefined) {
  const [shareToken] = useState(() => {
    if (routeToken) {
      saveSessionStorageValue("convay.quick.guest.token", routeToken);
      return routeToken;
    }
    return sessionStorageValue("convay.quick.guest.token") ?? "";
  });
  const sessionKey = `convay.quick.guest.session.${shareToken.slice(0, 12)}`;
  const [clientSessionId] = useState(() => {
    const existing = sessionStorageValue(sessionKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    saveSessionStorageValue(sessionKey, created);
    return created;
  });
  return { shareToken, clientSessionId };
}

function GuestPrejoin({
  onJoin, busy, error,
}: { onJoin: (name: string, mic: boolean, camera: boolean, micDevice: string, cameraDevice: string) => void; busy: boolean; error: string }) {
  const [name, setName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micDevice, setMicDevice] = useState("");
  const [cameraDevice, setCameraDevice] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permissionError, setPermissionError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (joined) return;
    let cancelled = false;
    let next: MediaStream | null = null;
    setPermissionError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError("This browser does not support camera and microphone access. You can still join with both turned off.");
      return;
    }
    if (!micOn && !cameraOn) {
      setStream(null); streamRef.current = null;
      return;
    }
    const constraints: MediaStreamConstraints = {
      audio: micOn ? { deviceId: micDevice ? { exact: micDevice } : undefined } : false,
      video: cameraOn ? { deviceId: cameraDevice ? { exact: cameraDevice } : undefined } : false,
    };
    void navigator.mediaDevices.getUserMedia(constraints).then(async captured => {
      next = captured;
      if (cancelled) { captured.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = captured;
      setStream(captured);
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(list.filter(device => device.kind === "audioinput" || device.kind === "videoinput"));
      } catch { /* Preview remains available without device labels. */ }
    }).catch(cause => {
      if (!cancelled) setPermissionError(displayError(cause, "Camera or microphone permission was denied. Turn off a device or retry."));
    });
    return () => {
      cancelled = true;
      next?.getTracks().forEach(track => track.stop());
      if (streamRef.current === next) streamRef.current = null;
    };
  }, [micOn, cameraOn, micDevice, cameraDevice, joined]);

  useEffect(() => { if (preview.current) preview.current.srcObject = stream; }, [stream]);

  function join() {
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 80) { setPermissionError("Enter a display name between 2 and 80 characters."); return; }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
    setJoined(true);
    onJoin(clean, micOn, cameraOn, micDevice, cameraDevice);
  }

  return <div className="qm-guest-card" style={cardStyle}>
    <div className="qm-guest-card__heading"><span className="qm-workspace__mark"><Video size={18} /></span><div><h1>Join Quick Meeting</h1><p>Guest access · No Convay account needed</p></div></div>
    <div className="qm-guest-preview">
      {stream?.getVideoTracks().length ? <video ref={preview} autoPlay muted playsInline aria-label="Camera preview" /> : <div className="qm-guest-preview__empty">{cameraOn ? "Camera preview will appear here" : "Camera is off"}</div>}
    </div>
    <label htmlFor="qm-guest-name">Your name</label>
    <input id="qm-guest-name" className="qm-input" value={name} maxLength={80} autoComplete="name" onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") join(); }} />
    <div className="qm-prejoin-devices">
      <label htmlFor="qm-guest-mic">Microphone</label>
      <select id="qm-guest-mic" className="qm-input" value={micDevice} onChange={event => setMicDevice(event.target.value)} disabled={!micOn}>
        <option value="">Default microphone</option>{devices.filter(device => device.kind === "audioinput").map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || "Microphone"}</option>)}
      </select>
      <label htmlFor="qm-guest-camera">Camera</label>
      <select id="qm-guest-camera" className="qm-input" value={cameraDevice} onChange={event => setCameraDevice(event.target.value)} disabled={!cameraOn}>
        <option value="">Default camera</option>{devices.filter(device => device.kind === "videoinput").map(device => <option key={device.deviceId} value={device.deviceId}>{device.label || "Camera"}</option>)}
      </select>
    </div>
    <div className="qm-prejoin-toggles">
      <button type="button" className={`qm-control ${micOn ? "" : "is-off"}`} onClick={() => setMicOn(value => !value)} aria-pressed={micOn}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}{micOn ? "Microphone on" : "Microphone off"}</button>
      <button type="button" className={`qm-control ${cameraOn ? "" : "is-off"}`} onClick={() => setCameraOn(value => !value)} aria-pressed={cameraOn}>{cameraOn ? <Video size={18} /> : <VideoOff size={18} />}{cameraOn ? "Camera on" : "Camera off"}</button>
    </div>
    {(error || permissionError) && <p className="qm-error" role="alert">{error || permissionError}</p>}
    <PrimaryButton fullWidth loading={busy} loadingText="Joining…" onClick={join}>Join meeting</PrimaryButton>
  </div>;
}

export function QuickMeetingGuestPage() {
  const { shareToken: routeToken } = useParams<{ shareToken?: string }>();
  const { shareToken, clientSessionId } = useGuestSession(routeToken);
  const [meeting, setMeeting] = useState<GuestMeetingInfo | null>(null);
  const [phase, setPhase] = useState<"checking" | "prejoin" | "live" | "left" | "unavailable">("checking");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [micDevice, setMicDevice] = useState("");
  const [cameraDevice, setCameraDevice] = useState("");
  const [participants, setParticipants] = useState<Array<{ identity: string; name: string; isLocal: boolean }>>([]);

  const checkLink = useCallback(async () => {
    if (!shareToken) {
      setPhase("unavailable"); setError("This quick meeting link is unavailable. Ask the host for a new link."); return;
    }
    setError(""); setPhase("checking");
    try {
      const data = await quickMeetingApi.inspectGuest(shareToken, clientSessionId);
      setMeeting(data);
      setPhase("prejoin");
    } catch (cause) {
      setPhase("unavailable"); setError(displayError(cause, "This quick meeting link is unavailable."));
    }
  }, [shareToken, clientSessionId]);

  useEffect(() => {
    document.documentElement.setAttribute("data-quick-guest", "true");
    if (routeToken) {
      const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
      window.history.replaceState(window.history.state, "", `${base}quick-meeting`);
    }
    void checkLink();
    return () => { document.documentElement.removeAttribute("data-quick-guest"); };
  }, [checkLink, routeToken]);

  const requestAdmission = useCallback((id: string) => {
    void id;
    return quickMeetingApi.guestJoin(shareToken, clientSessionId, displayName);
  }, [shareToken, clientSessionId, displayName]);
  const onPresence = useCallback((connected: boolean, identity?: string) => {
    if (!identity) return;
    const request = connected
      ? quickMeetingApi.confirmGuestJoin(shareToken, clientSessionId, displayName)
      : quickMeetingApi.guestLeave(shareToken, clientSessionId, displayName);
    void request.catch(cause => setError(displayError(cause, "Meeting attendance could not be confirmed.")));
  }, [shareToken, clientSessionId, displayName]);
  const onParticipants = useCallback((next: Array<{ identity: string; name: string; isLocal: boolean }>) => setParticipants(next), []);

  function enter(name: string, microphone: boolean, camera: boolean, mic: string, webcam: string) {
    setDisplayName(name); setMicOn(microphone); setCamOn(camera); setMicDevice(mic); setCameraDevice(webcam); setPhase("live"); setError("");
  }

  function leave() {
    setPhase("left");
  }

  const retry = () => { void checkLink(); };

  return <main className="qm-guest-page">
    <div className="qm-guest-brand"><span className="qm-workspace__mark" aria-hidden="true"><Video size={18} /></span><span>Convay · Quick Meeting</span></div>
    {phase === "checking" && <div className="qm-state-card" style={cardStyle} role="status"><p>Checking guest link…</p></div>}
    {phase === "unavailable" && <div className="qm-state-card" style={cardStyle}>
      <h1>Unable to join</h1><p role="alert">{error}</p><SecondaryButton leadingIcon={RotateCcw} onClick={retry}>Check link again</SecondaryButton>
    </div>}
    {phase === "prejoin" && <GuestPrejoin onJoin={enter} busy={busy} error={error} />}
    {phase === "left" && <div className="qm-state-card" style={cardStyle}>
      <h1>You left the meeting</h1><p>{meeting?.title || "Quick Meeting"} is still open for other participants.</p>{error && <p role="alert" className="qm-error">{error}</p>}<PrimaryButton onClick={retry}>Rejoin</PrimaryButton>
    </div>}
    {phase === "live" && <section className="qm-guest-live">
      <header className="qm-guest-live__header"><div><h1>{meeting?.title || "Quick Meeting"}</h1><p>Guest · {displayName}</p></div><SecondaryButton leadingIcon={DoorOpen} onClick={leave}>Leave meeting</SecondaryButton></header>
      {error && <p role="alert" className="qm-error qm-guest-live__error">{error}</p>}
      <LiveMeetingMedia
        meetingId="quick-guest"
        micOn={micOn} camOn={camOn} sharing={sharing}
        onMicChange={setMicOn} onCamChange={setCamOn} onSharingChange={setSharing}
        requestAdmission={requestAdmission} onPresence={onPresence} onParticipants={onParticipants}
        initialMicDeviceId={micDevice} initialCameraDeviceId={cameraDevice}
      />
      <div className="qm-media-controls" aria-label="Guest meeting media controls">
        <button type="button" className={`qm-control ${micOn ? "" : "is-off"}`} onClick={() => setMicOn(value => !value)} aria-pressed={micOn}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}<span>{micOn ? "Mute" : "Unmute"}</span></button>
        <button type="button" className={`qm-control ${camOn ? "" : "is-off"}`} onClick={() => setCamOn(value => !value)} aria-pressed={camOn}>{camOn ? <Video size={18} /> : <VideoOff size={18} />}<span>{camOn ? "Camera" : "Camera off"}</span></button>
        <button type="button" className={`qm-control ${sharing ? "is-on" : ""}`} onClick={() => setSharing(value => !value)} aria-pressed={sharing}>{sharing ? <MonitorOff size={18} /> : <Monitor size={18} />}<span>{sharing ? "Stop sharing" : "Share screen"}</span></button>
        <span className="qm-online-count"><Users size={16} /> {participants.length} online</span>
      </div>
    </section>}
  </main>;
}
