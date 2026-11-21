import { describe, expect, it } from "vitest";
import { userDirectoryCountLabel } from "../app/pages/administration-requests/userDirectorySubtitle";

describe("UAM-01 user-directory count label", () => {
  it("labels an unresolved read as loading", () => {
    expect(userDirectoryCountLabel(true, true, 0))
      .toBe("Loading users · Manage system users and access");
  });

  it("does not display a false zero when access or the directory read fails", () => {
    expect(userDirectoryCountLabel(true, false, 0))
      .toBe("User count unavailable · Manage system users and access");
  });

  it("shows a real zero for a successfully loaded empty directory", () => {
    expect(userDirectoryCountLabel(false, false, 0))
      .toBe("0 users · Manage system users and access");
  });

  it("shows the successful server-returned count", () => {
    expect(userDirectoryCountLabel(false, false, 5))
      .toBe("5 users · Manage system users and access");
  });
});
