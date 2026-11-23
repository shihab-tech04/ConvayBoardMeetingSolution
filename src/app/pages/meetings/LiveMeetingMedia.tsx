
import { useEffect, useRef, useState } from "react";
import { convayAuth } from "../../services/supabase/convayAuth";
import { confirmedLocalScreenShare } from "./regularMeetingScreenShareState";
import { focusedLiveKitIdentity } from "./liveMeetingLayout";

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
  onPresence: (connected: boolean, identity?: string) => void;
  requestAdmission?: (meetingId: string) => Promise<Response | {
    serverUrl?: string;
    participantToken?: string;
    error?: string;
  }>;
  onParticipants?: (participants: Array<{ identity: string; name: string; isLocal: boolean }>) => void;
  initialMicDeviceId?: string;
  initialCameraDeviceId?: string;
  layout?: "speaker" | "gallery";
}

function savedMeetingAdmission(meetingId: string) {
  return convayAuth.authenticatedRequest("/functions/v1/convay-livekit", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingId }),
  });
}

function MemberTile({ member, local, refresh, compact = false }: { member: any; local: boolean; refresh: number; compact?: boolean }) {
  const video = useRef<HTMLDivElement>(null);
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
    return () => {
      for (const { publication, element } of attached) {
        publication.track?.detach(element);
        element.remove();
      }
    };
  }, [member, local, refresh]);

  const name = String(member.name || member.identity || "Participant");
  const camera = member.isCameraEnabled || member.isScreenShareEnabled;
  return <article aria-label={name + " connected"} style={{ minHeight: compact ? 96 : 160, height: "100%", background: "#111827", borderRadius: 10, position: "relative", overflow: "hidden", border: "1px solid #334155" }}>
    <div ref={video} style={{ position: "absolute", inset: 0 }} />
    {!camera && <span style={{ position: "absolute", top: "45%", width: "100%", textAlign: "center", color: "#cbd5e1" }}>Camera off</span>}
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#020617dd", color: "#fff", padding: "0.35rem 0.6rem", fontSize: 12 }}>
      {name}{local ? " (You)" : ""} · {member.isMicrophoneEnabled ? "Mic on" : "Muted"}
    </div>
  </article>;
}

/** Remote sound stays mounted when the stage switches Speaker/Gallery or focus.
 * Never create a second audio element for a focused/thumbnail duplicate. */
function RemoteAudioTracks({ member, refresh }: { member: any; refresh: number }) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const attached: Array<{ track: any; element: HTMLMediaElement }> = [];
    for (const publication of member.audioTrackPublications.values() as Iterable<any>) {
      if (!publication?.track || !target.current) continue;
      const track = publication.track;
      const element = track.attach() as HTMLMediaElement;
      element.autoplay = true;
      target.current.appendChild(element);
      attached.push({ track, element });
      void element.play().catch(() => {
        // LiveKit emits AudioPlaybackStatusChanged; the user can unlock it.
      });
    }
    return () => {
      for (const { track, element } of attached) {
        track.detach(element);
        element.remove();
      }
    };
  }, [member, refresh]);
  return <div aria-hidden="true" ref={target} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} />;
}

export function LiveMeetingMedia({
  meetingId, micOn, camOn, sharing, onMicChange, onCamChange, onSharingChange,
  onPresence, requestAdmission, onParticipants, initialMicDeviceId, initialCameraDeviceId, layout = "gallery",
}: Props) {
  const [room, setRoom] = useState<any | null>(null);
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  // Browser autoplay policies may block incoming participant audio even after
  // the LiveKit room connects. This is separate from the user's microphone.
  const [audioPlaybackBlocked, setAudioPlaybackBlocked] = useState(false);
  const [audioUnlockBusy, setAudioUnlockBusy] = useState(false);
  const [activeSpeakerIdentity, setActiveSpeakerIdentity] = useState<string | null>(null);
  // Serialize provider publish/unpublish commands across rapid share toggles.
  const shareOperations = useRef<Promise<void>>(Promise.resolve());
  const callbacks = useRef({ onPresence, onMicChange, onCamChange, onSharingChange, requestAdmission, onParticipants });
  callbacks.current = { onPresence, onMicChange, onCamChange, onSharingChange, requestAdmission, onParticipants };

  useEffect(() => {
    let ended = false;
    let nextRoom: any = null;
    let connected = false;
    setStatus("Connecting");
    setError("");
    setAudioPlaybackBlocked(false);
    setActiveSpeakerIdentity(null);
    const render = () => {
      setRefresh(n => n + 1);
      const members = nextRoom ? [nextRoom.localParticipant, ...nextRoom.remoteParticipants.values()] : [];
      callbacks.current.onParticipants?.(members.map((member: any) => ({
        identity: String(member.identity ?? ""),
        name: String(member.name || member.identity || "Participant"),
        isLocal: nextRoom.localParticipant === member,
      })));
    };
    void (async () => {
      try {
        const sdk = await getSdk();
        if (ended) return;
        const admission = await (callbacks.current.requestAdmission ?? savedMeetingAdmission)(meetingId);
        let responseStatus = 200;
        let responseOk = true;
        let access: {
          serverUrl?: string;
          participantToken?: string;
          error?: unknown;
        };
        if (admission instanceof Response) {
          responseStatus = admission.status;
          responseOk = admission.ok;
          access = await admission.json().catch(() => ({})) as typeof access;
        } else {
          access = admission;
        }
        if (!responseOk || access.error) {
          const serverError = typeof access.error === "string" ? access.error.trim() : "";
          const statusMessage: Record<number, string> = {
            401: "Sign in to Convay to join this meeting.",
            403: "You do not have permission to join this meeting.",
            409: "This online meeting is unavailable or has reached its participant limit.",
            502: "Convay could not verify your meeting access. Try again or contact the organizer.",
            503: "The online meeting service is not yet configured.",
          };
          throw new Error(serverError || statusMessage[responseStatus] || "Unable to connect to the online meeting.");
        }
        if (typeof access.serverUrl !== "string" || !access.serverUrl
          || typeof access.participantToken !== "string" || !access.participantToken) {
          throw new Error("Online meeting access could not be confirmed.");
        }
        if (ended) return;
        nextRoom = new sdk.Room({ adaptiveStream: true, dynacast: true });
        if (sdk.RoomEvent.ActiveSpeakersChanged) {
          nextRoom.on(sdk.RoomEvent.ActiveSpeakersChanged, (speakers: Array<{ identity?: string }>) => {
            if (!ended) setActiveSpeakerIdentity(speakers[0]?.identity ?? null);
          });
        }
        if (sdk.RoomEvent.AudioPlaybackStatusChanged) {
          nextRoom.on(sdk.RoomEvent.AudioPlaybackStatusChanged, () => {
            if (!ended) setAudioPlaybackBlocked(nextRoom?.canPlaybackAudio === false);
          });
        }
        for (const name of ["TrackSubscribed", "TrackUnsubscribed", "TrackPublished", "TrackUnpublished", "ParticipantConnected", "ParticipantDisconnected",
          "TrackMuted", "TrackUnmuted", "LocalTrackPublished", "LocalTrackUnpublished"]) {
          const event = sdk.RoomEvent[name];
          if (event) nextRoom.on(event, render);
        }
        nextRoom.on(sdk.RoomEvent.LocalTrackUnpublished, (publication: any) => {
          if (publication.source === "screen_share") callbacks.current.onSharingChange(false);
        });
        nextRoom.on(sdk.RoomEvent.Reconnecting, () => {
          if (ended) return;
          setStatus("Reconnecting");
          callbacks.current.onSharingChange(false);
        });
        nextRoom.on(sdk.RoomEvent.Reconnected, () => {
          if (ended) return;
          if (!connected) {
            connected = true;
            callbacks.current.onPresence(true, nextRoom?.localParticipant?.identity);
          }
          setStatus("Connected");
          setAudioPlaybackBlocked(nextRoom?.canPlaybackAudio === false);
          render();
        });
        nextRoom.on(sdk.RoomEvent.Disconnected, () => {
          if (ended) return;
          setStatus("Disconnected");
          setAudioPlaybackBlocked(false);
          setActiveSpeakerIdentity(null);
          // Publishing ends when the provider disconnects, regardless of UI intent.
          callbacks.current.onSharingChange(false);
          if (connected) { connected = false; callbacks.current.onPresence(false, nextRoom?.localParticipant?.identity); }
        });
        await nextRoom.connect(access.serverUrl, access.participantToken);
        if (ended) { void nextRoom.disconnect(); return; }
        connected = true;
        setRoom(nextRoom);
        setStatus("Connected");
        setAudioPlaybackBlocked(nextRoom.canPlaybackAudio === false);
        callbacks.current.onPresence(true, nextRoom.localParticipant.identity);
        render();
      } catch (cause) {
        if (!ended) { setError(cause instanceof Error ? cause.message : "Unable to connect"); setStatus("Disconnected"); }
        if (nextRoom) void nextRoom.disconnect();
      }
    })();
    return () => {
      ended = true;
      // Stop rendering a presentation immediately on unmount/room switch.
      if (connected) callbacks.current.onSharingChange(false);
      if (nextRoom) void nextRoom.disconnect();
      if (connected) { connected = false; callbacks.current.onPresence(false, nextRoom.localParticipant?.identity); }
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
    if (!room || status !== "Connected") return;
    let active = true;
    // The last requested transition wins; old responses must not resurrect
    // the green "Sharing screen" indicator or republish after disconnect.
    const operation = shareOperations.current.catch(() => undefined).then(async () => {
      if (!active) return;
      try {
        await room.localParticipant.setScreenShareEnabled(sharing);
        if (!active) return;
        const published = confirmedLocalScreenShare(room.localParticipant);
        callbacks.current.onSharingChange(sharing && published);
        if (sharing && !published) setError("Screen sharing was not confirmed by the meeting service.");
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Screen sharing denied");
        callbacks.current.onSharingChange(false);
      }
    });
    shareOperations.current = operation;
    return () => { active = false; };
  }, [room, status, sharing]);
  useEffect(() => {
    if (!room) return;
    if (initialMicDeviceId) {
      void room.switchActiveDevice("audioinput", initialMicDeviceId).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Microphone selection failed");
      });
    }
    if (initialCameraDeviceId) {
      void room.switchActiveDevice("videoinput", initialCameraDeviceId).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Camera selection failed");
      });
    }
  }, [room, initialMicDeviceId, initialCameraDeviceId]);
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
  const focusedIdentity = focusedLiveKitIdentity(members, activeSpeakerIdentity);
  const focusedMember = members.find((member: any) => member.identity === focusedIdentity) ?? members[0];
  const otherMembers = members.filter((member: any) => member !== focusedMember);
  async function enableIncomingAudio() {
    if (!room || status !== "Connected" || audioUnlockBusy) return;
    setAudioUnlockBusy(true);
    try {
      // LiveKit must be invoked inside a real click to satisfy autoplay rules.
      await room.startAudio();
      const stillBlocked = room.canPlaybackAudio === false;
      setAudioPlaybackBlocked(stillBlocked);
      if (stillBlocked) setError("Your browser still blocks meeting sound. Allow sound for this site, then try again.");
      else setError("");
    } catch (cause) {
      setAudioPlaybackBlocked(true);
      setError(cause instanceof Error ? cause.message : "Unable to enable incoming meeting audio.");
    } finally {
      setAudioUnlockBusy(false);
    }
  }
  async function selectDevice(kind: "audioinput" | "videoinput", deviceId: string) {
    if (!room || !deviceId) return;
    try { await room.switchActiveDevice(kind, deviceId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Device selection failed"); }
  }
  return <section aria-label="Connected meeting participants" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 8, overflowY: "auto" }}>
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 12, color: "#cbd5e1" }}>
      <span role="status">{status}</span><span>{status === "Connected" ? members.length : 0} online</span>
      {room && <>
        <select aria-label="Microphone device" defaultValue={initialMicDeviceId ?? ""} onChange={e => { void selectDevice("audioinput", e.target.value); }}><option value="">Microphone</option>{devices.filter(d => d.kind === "audioinput").map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone device"}</option>)}</select>
        <select aria-label="Camera device" defaultValue={initialCameraDeviceId ?? ""} onChange={e => { void selectDevice("videoinput", e.target.value); }}><option value="">Camera</option>{devices.filter(d => d.kind === "videoinput").map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Camera device"}</option>)}</select>
      </>}
      {status === "Disconnected" && <button type="button" onClick={() => { setRoom(null); setAttempt(n => n + 1); }}>Rejoin</button>}
    </div>
    {status === "Connected" && audioPlaybackBlocked && (
      <div role="status" aria-live="polite" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid #a16207", background: "#422006", color: "#fef3c7", fontSize: 13 }}>
        <span>Incoming meeting audio is blocked by your browser.</span>
        <button type="button" aria-label="Enable incoming meeting audio" disabled={audioUnlockBusy} onClick={() => { void enableIncomingAudio(); }}
          style={{ minHeight: 38, padding: "0.4rem 0.75rem", color: "#111827", background: "#fbbf24", border: "none", borderRadius: 6, cursor: audioUnlockBusy ? "wait" : "pointer", fontWeight: 650 }}>
          {audioUnlockBusy ? "Enabling audio…" : "Enable Audio"}
        </button>
      </div>
    )}
    {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
    {room && members.filter((member: any) => member !== room.localParticipant).map((member: any) =>
      <RemoteAudioTracks key={member.identity} member={member} refresh={refresh} />)}
    {status === "Connected" && (layout === "speaker" && focusedMember
      ? <div role="region" aria-label="Live speaker layout" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 160 }}>
            <MemberTile key={focusedMember.identity} member={focusedMember} local={room.localParticipant === focusedMember} refresh={refresh} />
          </div>
          {otherMembers.length > 0 && <div style={{ display: "flex", gap: 8, flex: "none", height: 112, overflowX: "auto", paddingBottom: 4 }}>
            {otherMembers.map((member: any) => <div key={member.identity} style={{ width: 170, minWidth: 145, height: "100%" }}>
              <MemberTile member={member} local={room.localParticipant === member} refresh={refresh} compact />
            </div>)}
          </div>}
        </div>
      : <div role="region" aria-label="Live gallery layout" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", alignContent: "start" }}>
          {members.map((member: any) => <MemberTile key={member.identity} member={member} local={room.localParticipant === member} refresh={refresh} />)}
        </div>
    )}
  </section>;
}
