import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "npm:livekit-server-sdk@2.19.2";
import { createRecordingEgress, type EgressEvidence } from "./recordingProvider.ts";

export interface RecordingProviderConfig {
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  storageEndpoint: string;
  storageRegion: string;
  storageAccessKey: string;
  storageSecretKey: string;
  supabaseProjectRef: string;
}
/** The approved storage location is server configuration, not request JSON.
 * Use a private recording bucket; bucket privacy is verified separately by
 * the SQL/storage release gate. Do not configure this with public keys or
 * put S3 credentials in client configuration. */
export function createLiveKitRecordingProvider(config: RecordingProviderConfig) {
  if (!/^wss:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(config.livekitUrl)
    || !/^[a-z0-9]{20}$/.test(config.supabaseProjectRef)
    || config.storageEndpoint !== "https://" + config.supabaseProjectRef + ".storage.supabase.co/storage/v1/s3"
    || !/^[a-z0-9-]{2,40}$/.test(config.storageRegion)
    || !config.livekitApiKey || !config.livekitApiSecret
    || !config.storageAccessKey || !config.storageSecretKey) {
    throw new Error("Authorized private recording provider is not configured.");
  }
  const client = new EgressClient(config.livekitUrl.replace(/^wss:/i, "https:"), config.livekitApiKey, config.livekitApiSecret);
  // Do not return raw provider responses: they may include storage request
  // configuration and must never be serialized to a browser or logs.
  const project = (value: EgressEvidence): EgressEvidence => ({
    egressId: value.egressId, roomName: value.roomName,
    status: value.status, backupStorageUsed: value.backupStorageUsed === true,
  });
  return createRecordingEgress({
    async list(roomName) {
      return (await client.listEgress({ roomName })).map(project);
    },
    async start(roomName, objectKey) {
      const output = new EncodedFileOutput({
        fileType: EncodedFileType.MP4, filepath: objectKey,
        output: { case: "s3", value: new S3Upload({
          accessKey: config.storageAccessKey, secret: config.storageSecretKey,
          region: config.storageRegion, endpoint: config.storageEndpoint,
          bucket: "convay-recordings", forcePathStyle: true,
        }) },
      });
      return project(await client.startRoomCompositeEgress(roomName, { file: output }, { layout: "grid" }));
    },
    async stop(egressId) {
      return project(await client.stopEgress(egressId));
    },
  });
}
