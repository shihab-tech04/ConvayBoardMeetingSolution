import { describe, expect, it } from "vitest";
import { canRestoreVersion, isLockedVersion } from "../app/components/documents/documentVersionLock";

describe("DC-13 document/version lock state", () => {
  const doc = { is_locked: true, locked_version_id: "DV-2" };
  it("marks version with the locked version ID", () => {
    expect(isLockedVersion(doc, { id: "row-2", version_id: "DV-2" })).toBe(true);
  });
  it("matches legacy record ID when version_id missing", () => {
    expect(isLockedVersion(doc, { id: "DV-2" })).toBe(true);
  });
  it("never labels a different version as locked", () => {
    expect(isLockedVersion(doc, { id: "DV-1", version_id: "DV-1" })).toBe(false);
  });
  it("unlocked documents do not render stale lock badge", () => {
    expect(isLockedVersion({ is_locked: false, locked_version_id: "DV-2" }, { id: "DV-2" })).toBe(false);
  });
  it("missing locked_version_id cannot identify a particular snapshot", () => {
    expect(isLockedVersion({ is_locked: true }, { id: "DV-1" })).toBe(false);
  });
  it("restores are disabled during document approval lock", () => {
    expect(canRestoreVersion(doc, false, true)).toBe(false);
  });
  it("restores noncurrent versions when unlocked and permitted", () => {
    expect(canRestoreVersion({ is_locked: false }, false, true)).toBe(true);
  });
  it("no restore for current version or missing permission", () => {
    expect(canRestoreVersion({ is_locked: false }, true, true)).toBe(false);
    expect(canRestoreVersion({ is_locked: false }, false, false)).toBe(false);
  });
});
