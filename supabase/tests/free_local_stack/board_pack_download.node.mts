/** Actual UI transport and ZIP composer against disposable GoTrue/REST/Storage.
 * Receive only disposable credentials over stdin; never print them. */
import { readFileSync } from "node:fs";
import { prepareServerBoardPackDownload } from "../../../src/app/pages/agenda-documents/boardPackDownloadTransport.ts";
const fixture = JSON.parse(readFileSync(0, "utf8"));
const base = new URL(fixture.base);
if (base.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(base.hostname) || base.port !== "54321" || base.username || base.password) {
  throw new Error("Only the isolated local Supabase stack is permitted.");
}
const result = await prepareServerBoardPackDownload(fixture.packId, fixture.frozenRevision, async (path, init) => {
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid local endpoint");
  const response = await fetch(base.origin + path, {...init, headers:{
    apikey:fixture.anon, Authorization:"Bearer " + fixture.token, ...init?.headers,
  }, cache:"no-store"});
  if (!response.ok) throw new Error(`Local authenticated pack request failed: HTTP ${response.status}`);
  return response;
}, () => {});
if (!result.receiptId || !result.fileName.endsWith(".zip")) throw new Error("Missing authorized download receipt");
process.stdout.write(Buffer.from(await result.archive.arrayBuffer()));
