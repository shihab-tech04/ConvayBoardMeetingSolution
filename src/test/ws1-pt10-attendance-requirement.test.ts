import { describe, expect, it } from "vitest";
import { ATTENDANCE_REQUIREMENT_VALUES, attendanceRequirementPatch, readAttendanceRequirement, hasInvalidAttendanceRequirement, requiresAttendance, attendanceRequirementLabel } from "../app/pages/return-register/attendanceRequirement";
describe("WS1 PT-10 canonical attendance requirement", () => {
  it("round-trips all three classifications and synchronizes the required flag", () => {
    for (const value of ATTENDANCE_REQUIREMENT_VALUES) {
      const row = attendanceRequirementPatch(value);
      expect(readAttendanceRequirement(JSON.parse(JSON.stringify(row)))).toBe(value);
      expect(row.is_required).toBe(value === "Mandatory");
    }
  });
  it("preserves legacy mandatory and optional classifications", () => {
    expect(readAttendanceRequirement({is_required:true})).toBe("Mandatory");
    expect(readAttendanceRequirement({is_required:false})).toBe("Optional");
  });
  it("does not collapse By Invitation into Optional", () => {
    expect(attendanceRequirementLabel(attendanceRequirementPatch("By Invitation"))).toBe("By Invitation");
  });
  it("rejects mandatory classification with a false required flag", () => {
    expect(hasInvalidAttendanceRequirement([{is_required:false,attendance_requirement:"Mandatory"}])).toBe(true);
    expect(requiresAttendance({is_required:false,attendance_requirement:"Mandatory"})).toBe(true);
  });
  it("rejects an optional classification with a true required flag", () => {
    expect(hasInvalidAttendanceRequirement([{is_required:true,attendance_requirement:"Optional"}])).toBe(true);
  });
  it("fails closed when the required flag is absent or not boolean", () => {
    expect(readAttendanceRequirement({attendance_requirement:"Mandatory"})).toBeNull();
    expect(requiresAttendance({is_required:"false"})).toBe(true);
  });
  it("rejects unsupported explicit values without defaulting them", () => {
    expect(readAttendanceRequirement({is_required:false,attendance_requirement:"Maybe"})).toBeNull();
  });
  it("does not require optional or invitation-only attendance", () => {
    expect(requiresAttendance(attendanceRequirementPatch("Optional"))).toBe(false);
    expect(requiresAttendance(attendanceRequirementPatch("By Invitation"))).toBe(false);
    expect(requiresAttendance(attendanceRequirementPatch("Mandatory"))).toBe(true);
  });
});
