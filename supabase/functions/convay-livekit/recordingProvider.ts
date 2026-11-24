/**
 * LM-04 provider boundary. Only a trusted server, after obtaining a persisted
 * SQL reservation and authorizing the actor, may call this module. It is not
 * an HTTP endpoint and does not authorize recording on its own.
 *
 * LiveKit's returned status is authoritative for capture; private storage
 * readback is authoritative for playback availability. Neither a click nor
 * an Egress start acknowledgement alone proves that a recording is active.
 */
export type RecordingState = "starting" | "recording" | "processing" | "ready" | "failed" | "unknown";
export interface RecordingReservation {
  reservationId: string;
  tenantId: string | null;
  roomName: string;
  providerId: string | null;
}
export interface EgressEvidence {
  egressId: string;
  roomName: string;
  status: number;
  backupStorageUsed?: boolean;
}
export interface RecordingReceipt {
  providerId: string;
  state: RecordingState;
  /** Server-side object key only; never use this as a public playback URL. */
  objectKey: string;
}
export interface PrivateObjectEvidence {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  privateBucket: boolean;
}
export interface RecordingEgressTransport {
  list(roomName: string): Promise<readonly EgressEvidence[]>;
  start(roomName: string, objectKey: string): Promise<EgressEvidence>;
  stop(egressId: string): Promise<EgressEvidence>;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const room = /^cv-room-[0-9a-f]{40}$/;
const egress = /^EG_[A-Za-z0-9_-]{1,180}$/;
export function recordingObjectKey(reservation: RecordingReservation): string {
  if (!uuid.test(reservation.reservationId) || !room.test(reservation.roomName)
      || (reservation.tenantId !== null && !uuid.test(reservation.tenantId))
      || (reservation.providerId !== null && !egress.test(reservation.providerId))) {
    throw new Error("Invalid authoritative recording identity.");
  }
  const scope = reservation.tenantId === null ? "legacy" : "tenant/" + reservation.tenantId;
  return scope + "/" + reservation.roomName + "/" + reservation.reservationId + ".mp4";
}
function verifyProviderEvidence(reservation: RecordingReservation, evidence: EgressEvidence): void {
  if (!egress.test(evidence?.egressId) || evidence.roomName !== reservation.roomName
    || (reservation.providerId !== null && evidence.egressId !== reservation.providerId)) {
    throw new Error("Recording provider identity does not match the persisted reservation.");
  }
}
export function projectRecordingEvidence(
  reservation: RecordingReservation, evidence: EgressEvidence,
  storage?: PrivateObjectEvidence | null,
): RecordingReceipt {
  const objectKey = recordingObjectKey(reservation);
  verifyProviderEvidence(reservation, evidence);
  let state: RecordingState = "unknown";
  // LiveKit EgressStatus numeric protobuf enum, not a browser state.
  switch (evidence.status) {
    case 0: state = "starting"; break;
    case 1: state = "recording"; break;
    case 2: state = "processing"; break;
    case 3:
      // A completed Egress can have failed to place the recording in the
      // intended private destination. Never expose backup-storage media.
      if (evidence.backupStorageUsed === true) state = "failed";
      else if (storage?.privateBucket === true && storage.objectKey === objectKey
        && storage.contentType === "video/mp4" && Number.isSafeInteger(storage.sizeBytes)
        && storage.sizeBytes > 0) state = "ready";
      else state = "processing";
      break;
    case 4: case 5: case 6: state = "failed"; break;
  }
  return { providerId: evidence.egressId, state, objectKey };
}
export function createRecordingEgress(transport: RecordingEgressTransport) {
  async function exact(reservation: RecordingReservation): Promise<EgressEvidence> {
    recordingObjectKey(reservation);
    if (!reservation.providerId) throw new Error("A persisted provider identity is required.");
    const matching = (await transport.list(reservation.roomName)).filter(
      item => item.egressId === reservation.providerId);
    if (matching.length !== 1) throw new Error("Recording provider readback is missing or ambiguous.");
    verifyProviderEvidence(reservation, matching[0]);
    return matching[0];
  }
  return {
    /**
     * Invoked only by the holder of a NEW, durable, single-use SQL start
     * reservation. On an ambiguous network failure DO NOT retry start;
     * reconcile provider state with that reservation before another start.
     */
    async startReserved(reservation: RecordingReservation): Promise<RecordingReceipt> {
      const key = recordingObjectKey(reservation);
      if (reservation.providerId !== null) throw new Error("Recording has already been issued.");
      const existing = await transport.list(reservation.roomName);
      if (existing.some(item => item.roomName !== reservation.roomName
        || ![3,4,5,6].includes(item.status))) {
        throw new Error("A recording is in progress or requires reconciliation.");
      }
      const evidence = await transport.start(reservation.roomName, key);
      return projectRecordingEvidence(reservation, evidence);
    },
    async read(reservation: RecordingReservation, verifyPrivateObject: (objectKey: string) => Promise<PrivateObjectEvidence | null>): Promise<RecordingReceipt> {
      const evidence = await exact(reservation);
      const key = recordingObjectKey(reservation);
      const storage = evidence.status === 3 && evidence.backupStorageUsed !== true
        ? await verifyPrivateObject(key) : null;
      return projectRecordingEvidence(reservation, evidence, storage);
    },
    async stop(reservation: RecordingReservation): Promise<RecordingReceipt> {
      const evidence = await exact(reservation);
      // Only an exact persisted active job can be stopped. Already ending
      // and terminal states are readback, not a second provider command.
      if (evidence.status === 0 || evidence.status === 1) {
        return projectRecordingEvidence(reservation, await transport.stop(evidence.egressId));
      }
      return projectRecordingEvidence(reservation, evidence);
    },
  };
}
