
import { useEffect, useRef, useState } from "react";
import { convayAuth } from "../../services/supabase/convayAuth";

type Sdk = { Room: new (options: Record<string, unknown>) => any; RoomEvent: Record<string, string> };
declare global { interface Window { LivekitClient?: Sdk } }
let loading: Promise<Sdk> | null = null;
function getSdk(): Promise<Sdk> {
  if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
  if (!loading) loading = new Promise<Sdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://cdn.jsdelivr.net/npm/livekit-client@2.23.0/dist/livekit-client.umd.min.js";
    script.onload = () => window.LivekitClient ? resolve(window.LivekitClient) : reject(new Error("LiveKit did not initialize"));
    script.onerror = () => reject(new Error("Unable to load LiveKit media SDK"));
    document.head.appendChild(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}

interface Props {
  meetingId: string;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  onMicChange: (on: boolean) => void;
  onCamChange: (on: boolean) => void;
  onSharingChange: (on: boolean) => void;
  onPresence: (connected: boolean) => void;
}

function MemberTile({ member, local, refresh }: { member: any; local: boolean; refresh: number }) {
  const video = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const attached: Array<{ publication: any; element: HTMLMediaElement }> = [];
    const attach = (publication: any, target: HTMLDivElement | null) => {
      if (!publication?.track || !target) return;
      const element = publication.track.attach() as HTMLMediaElement;
      element.autoplay = true;
      if (element instanceof HTMLVideoElement) {
        element.playsInline = true;
        element.muted = local;
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.objectFit = "contain";
      }
      target.appendChild(element);
      attached.push({ publication, element });
      void element.play().catch(() => {});
    };
    const videoPubs = [...member.videoTrackPublications.values()] as any[];
    attach(videoPubs.find(p => p.source === "screen_share" && p.track) ??
      videoPubs.find(p => p.source === "camera" && p.track), video.current);
    if (!local) for (const p of member.audioTrackPublications.values()) attach(p, audio.current);
    return () => {
      for (const { publication, element } of attached) {
        publication.track?.detach(element);
        element.remove();
      }
    };
  }, [member, local, refresh]);

  const name = String(member.name || member.identity || "Participant");
  const camera = member.isCameraEnabled || member.isScreenShareEnabled;
  return <article aria-label={name + " connected"} style={{ minHeight: 160, background: "#111827", borderRadius: 10, position: "relative", overflow: "hidden", border: "1px solid #334155" }}>
    <div ref={video} style={{ position: "absolute", inset: 0 }} />
    {!camera && <span style={{ position: "absolute", top: "45%", width: "100%", textAlign: "center", color: "#cbd5e1" }}>Camera off</span>}
    <div ref={audio} style={{ display: "none" }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#020617dd", color: "#fff", padding: "0.35rem 0.6rem", fontSize: 12 }}>
      {name}{local ? " (You)" : ""} · {member.isMicrophoneEnabled ? "Mic on" : "Muted"}
    </div>
  </article>;
}

export function LiveMeetingMedia({ meetingId, micOn, camOn, sharing, onMicChange, onCamChange, onSharingChange, onPresence }: Props) {
  const [room, setRoom] = useState<any | null>(null);
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const callbacks = useRef({ onPresence, onMicChange, onCamChange, onSharingChange });
  callbacks.current = { onPresence, onMicChange, onCamChange, onSharingChange };

  useEffect(() => {
    let ended = false;
    let nextRoom: any = null;
    let connected = false;
    setStatus("Connecting");
    setError("");
    const render = () => setRefresh(n => n + 1);
    void (async () => {
      try {
        const sdk = await getSdk();
        if (ended) return;
        const response = await convayAuth.authenticatedRequest("/functions/v1/convay-livekit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId }),
        });
        const access = await response.json().catch(() => ({})) as {
          serverUrl?: string;
          participantToken?: string;
          error?: unknown;
        };
        if (!response.ok) {
          const serverError = typeof access.error === "string" ? access.error.trim() : "";
          const statusMessage: Record<number, string> = {
            401: "Sign in to Convay to join this meeting.",
            403: "You do not have permission to join this meeting.",
            409: "This online meeting is unavailable or has reached its participant limit.",
            502: "Convay could not verify your meeting access. Try again or contact the organizer.",
            503: "The online meeting service is not yet configured.",
          };
          throw new Error(serverError || statusMessage[response.status] || "Unable to connect to the online meeting.");
        }
        if (typeof access.serverUrl !== "string" || !access.serverUrl
          || typeof access.participantToken !== "string" || !access.participantToken) {
          throw new Error("Online meeting access could not be confirmed.");
        }
        if (ended) return;
        nextRoom = new sdk.Room({ adaptiveStream: true, dynacast: true });
        for (const name of ["TrackSubscribed", "TrackUnsubscribed", "TrackPublished", "TrackUnpublished", "ParticipantConnected", "ParticipantDisconnected",
          "TrackMuted", "TrackUnmuted", "LocalTrackPublished", "LocalTrackUnpublished"]) {
          const event = sdk.RoomEvent[name];
          if (event) nextRoom.on(event, render);
        }
        nextRoom.on(sdk.RoomEvent.LocalTrackUnpublished, (publication: any) => {
          if (publication.source === "screen_share") callbacks.current.onSharingChange(false);
        });
        nextRoom.on(sdk.RoomEvent.Reconnecting, () => setStatus("Reconnecting"));
        nextRoom.on(sdk.RoomEvent.Reconnected, () => { setStatus("Connected"); render(); });
        nextRoom.on(sdk.RoomEvent.Disconnected, () => {
          setStatus("Disconnected");
          if (connected) { connected = false; callbacks.current.onPresence(false); }
        });
        await nextRoom.connect(access.serverUrl, access.participantToken);
        if (ended) { void nextRoom.disconnect(); return; }
        connected = true;
        setRoom(nextRoom);
        setStatus("Connected");
        callbacks.current.onPresence(true);
        render();
      } catch (cause) {
        if (!ended) { setError(cause instanceof Error ? cause.message : "Unable to connect"); setStatus("Disconnected"); }
        if (nextRoom) void nextRoom.disconnect();
      }
    })();
    return () => {
      ended = true;
      if (nextRoom) void nextRoom.disconnect();
      if (connected) { connected = false; callbacks.current.onPresence(false); }
    };
  }, [meetingId, attempt]);

  useEffect(() => {
    if (!room) return;
    void room.localParticipant.setMicrophoneEnabled(micOn).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Microphone access denied");
      callbacks.current.onMicChange(false);
    });
  }, [room, micOn]);
  useEffect(() => {
    if (!room) return;
    void room.localParticipant.setCameraEnabled(camOn).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Camera access denied");
      callbacks.current.onCamChange(false);
    });
  }, [room, camOn]);
  useEffect(() => {
    if (!room) return;
    void room.localParticipant.setScreenShareEnabled(sharing).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Screen sharing denied");
      callbacks.current.onSharingChange(false);
    });
  }, [room, sharing]);
  useEffect(() => {
    if (!room || !navigator.mediaDevices?.enumerateDevices) return;
    let active = true;
    const enumerate = () => { void navigator.mediaDevices.enumerateDevices().then(list => {
      if (active) setDevices(list.filter(d => d.kind === "audioinput" || d.kind === "videoinput"));
    }).catch(() => {}); };
    enumerate();
    navigator.mediaDevices.addEventListener?.("devicechange", enumerate);
    return () => { active = false; navigator.mediaDevices.removeEventListener?.("devicechange", enumerate); };
  }, [room]);

  const members = room ? [room.localParticipant, ...room.remoteParticipants.values()] : [];
  async function selectDevice(kind: "audioinput" | "videoinput", deviceId: string) {
    if (!room || !deviceId) return;
    try { await room.switchActiveDevice(kind, deviceId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Device selection failed"); }
  }
  return <section aria-label="Connected meeting participants" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 8, overflowY: "auto" }}>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#cbd5e1" }}>
      <span role="status">{status}</span><span>{status === "Connected" ? members.length : 0} online</span>
      {room && <>
        <select aria-label="Microphone device" defaultValue="" onChange={e => { void selectDevice("audioinput", e.target.value); }}><option value="">Microphone</option>{devices.filter(d => d.kind === "audioinput").map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone device"}</option>)}</select>
        <select aria-label="Camera device" defaultValue="" onChange={e => { void selectDevice("videoinput", e.target.value); }}><option value="">Camera</option>{devices.filter(d => d.kind === "videoinput").map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera device"}</option>)}</select>
      </>}
      {status === "Disconnected" && <button type="button" onClick={() => { setRoom(null); setAttempt(n => n + 1); }}>Rejoin</button>}
    </div>
    {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
    {status === "Connected" && <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", alignContent: "start" }}>
      {members.map((member: any) => <MemberTile key={member.identity} member={member} local={room.localParticipant === member} refresh={refresh} />)}
    </div>}
  </section>;
}
