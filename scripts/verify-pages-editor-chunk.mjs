// Inspect the actual Vite output graph, not just source import syntax.
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const entryKey = Object.keys(manifest).find(key => manifest[key].isEntry && key === "index.html");
assert.ok(entryKey, "Missing production application entry");
const editorKey = "src/app/pages/agenda-documents/DocumentEditorPage.tsx";
assert.equal(manifest[editorKey]?.isDynamicEntry, true, "Editor must be a real dynamic chunk");

const eager = new Set();
function visit(key) {
  if (eager.has(key)) return;
  assert.ok(manifest[key], "Missing manifest entry: " + key);
  eager.add(key);
  for (const dependency of manifest[key].imports ?? []) visit(dependency);
}
visit(entryKey);
assert.ok(!eager.has(editorKey), "Editor is still eagerly included in the application");
assert.ok([...eager].some(key => (manifest[key].dynamicImports ?? []).includes(editorKey)),
  "No reachable dynamic editor import from the application");
const files = new Set([...eager].map(key => manifest[key].file).filter(file => file.endsWith(".js")));
const startupBytes = [...files].reduce((sum, file) => sum + statSync(join("dist", file)).size, 0);
// Exact measured prior production entry from release 992b71f3.
const previousStartupEntryBytes = 6738161;
assert.ok(startupBytes < previousStartupEntryBytes, "Startup JavaScript did not decrease");
console.log("EDITOR_CHUNK_PASS", JSON.stringify({startupBytes, previousStartupEntryBytes,
  editorChunk: manifest[editorKey].file, editorBytes: statSync(join("dist", manifest[editorKey].file)).size}));
