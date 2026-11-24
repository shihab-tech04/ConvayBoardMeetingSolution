import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createRecordingEgress, projectRecordingEvidence, recordingObjectKey, type RecordingReservation, type EgressEvidence } from "../../supabase/functions/convay-livekit/recordingProvider";
const base: RecordingReservation = {
  reservationId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  roomName: "cv-room-" + "a".repeat(40),
  providerId: "EG_recording1",
};
const receipt = (status: number): EgressEvidence => ({ egressId: "EG_recording1", roomName: base.roomName, status });
const storage = () => ({ objectKey: recordingObjectKey(base), contentType: "video/mp4", sizeBytes: 128, privateBucket: true });
describe("LM-04 server-owned recording provider boundary", () => {
  it("uses an immutable room/reservation/company namespace and preserves legacy scope", () => {
    expect(recordingObjectKey(base)).toBe("tenant/" + base.tenantId + "/" + base.roomName + "/" + base.reservationId + ".mp4");
    expect(recordingObjectKey({...base,tenantId:null})).toMatch(/^legacy\/cv-room-/);
    expect(recordingObjectKey({...base,tenantId:"33333333-3333-4333-8333-333333333333"})).not.toBe(recordingObjectKey(base));
    expect(() => recordingObjectKey({...base,reservationId:"../../private"})).toThrow();
    expect(() => recordingObjectKey({...base,roomName:"another-room"})).toThrow();
  });
  it("never treats starting or ending acknowledgement as active or available", () => {
    expect([0,1,2,3,4,5,6,99].map(n => projectRecordingEvidence(base,receipt(n)).state)).toEqual(
      ["starting","recording","processing","processing","failed","failed","failed","unknown"]);
  });
  it("requires an exact nonempty verified private MP4 to expose ready state", () => {
    expect(projectRecordingEvidence(base,receipt(3),storage()).state).toBe("ready");
    for (const item of [{...storage(),privateBucket:false},{...storage(),sizeBytes:0},{...storage(),contentType:"text/html"},{...storage(),objectKey:"other.mp4"}]) {
      expect(projectRecordingEvidence(base,receipt(3),item).state).toBe("processing");
    }
    expect(projectRecordingEvidence(base,{...receipt(3),backupStorageUsed:true},storage()).state).toBe("failed");
  });
  it("rejects evidence from any other room or provider job", () => {
    expect(() => projectRecordingEvidence(base,{...receipt(1),roomName:"cv-room-"+"b".repeat(40)})).toThrow();
    expect(() => projectRecordingEvidence(base,{...receipt(1),egressId:"EG_other"})).toThrow();
  });
  it("starts only a new reservation and refuses an unresolved existing provider job", async () => {
    const list=vi.fn(async ():Promise<EgressEvidence[]> => []);
    const start=vi.fn(async () => receipt(0));
    const stop=vi.fn(async () => receipt(2));
    const provider=createRecordingEgress({list,start,stop});
    await expect(provider.startReserved(base)).rejects.toThrow();
    expect(start).not.toHaveBeenCalled();
    const pending={...base,providerId:null};
    expect((await provider.startReserved(pending)).state).toBe("starting");
    expect(start).toHaveBeenCalledWith(base.roomName,recordingObjectKey(base));
    list.mockResolvedValue([receipt(1)]);
    await expect(provider.startReserved(pending)).rejects.toThrow();
    expect(start).toHaveBeenCalledTimes(1);
  });
  it("stops only an exact persisted active job and never repeats a stop for ending jobs", async () => {
    const list=vi.fn(async () => [receipt(1)]);
    const stop=vi.fn(async () => receipt(2));
    const provider=createRecordingEgress({list,stop,start:vi.fn()});
    expect((await provider.stop(base)).state).toBe("processing");
    expect(stop).toHaveBeenCalledWith(base.providerId);
    list.mockResolvedValue([receipt(2)]);
    await provider.stop(base);
    expect(stop).toHaveBeenCalledTimes(1);
    list.mockResolvedValue([]);
    await expect(provider.stop(base)).rejects.toThrow();
  });
  it("queries real private storage evidence only for completed provider readback", async () => {
    const list=vi.fn(async () => [receipt(1)]);
    const verify=vi.fn(async () => storage());
    const provider=createRecordingEgress({list,start:vi.fn(),stop:vi.fn()});
    expect((await provider.read(base,verify)).state).toBe("recording");
    expect(verify).not.toHaveBeenCalled();
    list.mockResolvedValue([receipt(3)]);
    expect((await provider.read(base,verify)).state).toBe("ready");
    expect(verify).toHaveBeenCalledWith(recordingObjectKey(base));
  });
  it("keeps the concrete pinned LiveKit Egress adapter server-only and strips provider secrets", () => {
    const edge=readFileSync("supabase/functions/convay-livekit/livekitRecordingEgress.ts","utf8");
    expect(edge).toContain("npm:livekit-server-sdk@2.19.2");
    expect(edge).toContain("client.startRoomCompositeEgress(roomName");
    expect(edge).toContain("client.stopEgress(egressId)");
    expect(edge).toContain('bucket: "convay-recordings"');
    expect(edge).toContain("forcePathStyle: true");
    expect(edge).toContain("status: value.status");
    expect(readFileSync("supabase/functions/convay-livekit/index.ts","utf8")).not.toContain("livekitRecordingEgress");
  });
});
