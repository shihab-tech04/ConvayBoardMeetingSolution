/** Configurable user identity metadata, never a role or privilege grant. */
export const USER_TYPES = ["Internal Employee", "Governance Member", "External Participant"] as const;
export type UserType = typeof USER_TYPES[number];

export function validateUserBusinessFields(input: { employeeId: string; userType: string }): string | null {
  if (!USER_TYPES.includes(input.userType as UserType)) return "Select a valid User Type";
  if (input.employeeId.trim().length > 80) return "Employee ID must be at most 80 characters";
  return null;
}

export function userBusinessFields(input: { employeeId: string; userType: string }) {
  const error = validateUserBusinessFields(input);
  if (error) throw new Error(error);
  return { employee_id: input.employeeId.trim(), user_type: input.userType as UserType };
}
