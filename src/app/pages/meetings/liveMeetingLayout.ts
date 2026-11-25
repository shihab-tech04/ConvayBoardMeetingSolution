/** LiveKit visual layout uses provider identities; it never decides attendee rights. */
export interface LayoutParticipant {
  identity?: string | null;
  isLocal?: boolean;
  isCameraEnabled?: boolean;
  isScreenShareEnabled?: boolean;
}

/** Prefer an active screen presentation; otherwise follow the active speaker. */
export function focusedLiveKitIdentity(
  participants: readonly LayoutParticipant[],
  activeSpeakerIdentity?: string | null,
): string | null {
  if (!participants.length) return null;
  const sharing = participants.find(p => p.identity && p.isScreenShareEnabled);
  if (sharing?.identity) return sharing.identity;
  const speaking = participants.find(p => p.identity && p.identity === activeSpeakerIdentity);
  if (speaking?.identity) return speaking.identity;
  const camera = participants.find(p => p.identity && !p.isLocal && p.isCameraEnabled);
  if (camera?.identity) return camera.identity;
  return participants.find(p => p.identity)?.identity ?? null;
}
