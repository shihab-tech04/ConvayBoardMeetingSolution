import { describe, expect, it } from "vitest";
import {
  PERMISSION_METHOD_FILTER_OPTIONS, matchesPermissionMethod,
} from "../app/pages/administration-requests/permissionMethodFilter";

describe("AC-05 permission catalogue method filtering", () => {
  it("lists PATCH alongside all supported HTTP methods exactly once", () => {
    expect(PERMISSION_METHOD_FILTER_OPTIONS).toEqual(["All", "GET", "POST", "PUT", "PATCH", "DELETE"]);
    expect(new Set(PERMISSION_METHOD_FILTER_OPTIONS).size).toBe(PERMISSION_METHOD_FILTER_OPTIONS.length);
  });
  it("matches PATCH metadata but excludes GET/PUT for PATCH selection", () => {
    expect(matchesPermissionMethod("PATCH", "PATCH")).toBe(true);
    expect(matchesPermissionMethod("PUT", "PATCH")).toBe(false);
    expect(matchesPermissionMethod("GET", "PATCH")).toBe(false);
  });
  it("supports existing method options without changing their matching behavior", () => {
    for (const method of ["GET", "POST", "PUT", "DELETE"])
      expect(matchesPermissionMethod(method, method)).toBe(true);
    expect(matchesPermissionMethod("POST", "GET")).toBe(false);
  });
  it("preserves All/empty filters and rejects unsupported filters", () => {
    expect(matchesPermissionMethod("PATCH", "All")).toBe(true);
    expect(matchesPermissionMethod("GET", "")).toBe(true);
    expect(matchesPermissionMethod("DELETE", undefined)).toBe(true);
    expect(matchesPermissionMethod("PATCH", "UNKNOWN")).toBe(false);
    expect(matchesPermissionMethod("PATCH", "patch")).toBe(false);
  });
});
