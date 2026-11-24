/** Canonical PT-10 classification. A legacy boolean is supported only when no explicit value exists. */
export const ATTENDANCE_REQUIREMENT_VALUES = ["Mandatory", "Optional", "By Invitation"] as const;
export type AttendanceRequirement = typeof ATTENDANCE_REQUIREMENT_VALUES[number];
export interface AttendanceRequirementInput { is_required?: unknown; attendance_requirement?: unknown }
export function readAttendanceRequirement(row: AttendanceRequirementInput): AttendanceRequirement | null {
  if (typeof row.is_required !== "boolean") return null;
  const value = row.attendance_requirement;
  if (value === undefined || value === null || value === "") return row.is_required ? "Mandatory" : "Optional";
  if (!ATTENDANCE_REQUIREMENT_VALUES.some(option => option === value)) return null;
  if ((value === "Mandatory") !== row.is_required) return null;
  return value as AttendanceRequirement;
}
export function attendanceRequirementPatch(value: AttendanceRequirement): { attendance_requirement: AttendanceRequirement; is_required: boolean } {
  return { attendance_requirement: value, is_required: value === "Mandatory" };
}
/** Inconsistent records are never treated as optional or allowed to advance readiness. */
export function hasInvalidAttendanceRequirement(rows: readonly AttendanceRequirementInput[]): boolean {
  return rows.some(row => readAttendanceRequirement(row) === null);
}
export function requiresAttendance(row: AttendanceRequirementInput): boolean {
  const value = readAttendanceRequirement(row);
  return value === null || value === "Mandatory";
}
export function attendanceRequirementLabel(row: AttendanceRequirementInput): string {
  return readAttendanceRequirement(row) ?? "Invalid attendance requirement";
}
