import type { OrgUnit } from "../../data/boardMeetingData";
import type { BmsUser } from "../../data/bmsUsers";
import { PHASE1_UNIT_TYPES, VALID_PARENT_TYPES, detectCycle, validateParentType, findChildren } from "../../utils/orgHierarchy";

/** Validate every step again before a final save; never trust stale step state. */
export interface UnitFormValues {
  unit_type: string;
  unit_name: string;
  code: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  parent_unit_id: string;
  effective_start_at: string;
  head_user_id: string;
  deputy_user_id: string;
  status: "Draft" | "Active";
}

export function validateOrgUnitFormStep(
  step: number, values: UnitFormValues, units: OrgUnit[], users: BmsUser[],
  editUnit?: OrgUnit, targetStatus?: "Draft" | "Active",
): Record<string, string> {
  const errors: Record<string, string> = {};
  const type = values.unit_type;
  const name = values.unit_name.trim();
  const code = values.code.trim().toUpperCase();
  if (step === 0) {
    if (!(PHASE1_UNIT_TYPES as readonly string[]).includes(type))
      errors.unit_type = "Choose a supported unit type";
    if (editUnit && type !== editUnit.unit_type &&
      findChildren(editUnit.id, units).some(child => !validateParentType(child.unit_type, type)))
      errors.unit_type = "This type conflicts with an existing child unit";
  }
  if (step === 1) {
    if (!name) errors.unit_name = "Unit name is required";
    else if (name.length > 120) errors.unit_name = "Unit name must be 120 characters or fewer";
    if (code && !/^[A-Z0-9][A-Z0-9_-]{0,19}$/.test(code))
      errors.code = "Use 1–20 letters, numbers, underscores or hyphens";
    else if (code && units.some(u => u.id !== editUnit?.id && (u.code ?? "").trim().toUpperCase() === code))
      errors.code = "This code is already in use";
    const email = values.email.trim();
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254))
      errors.email = "Enter a valid email address";
    const phone = values.phone.trim();
    if (phone && !/^\+?[0-9() .-]{7,24}$/.test(phone))
      errors.phone = "Enter a valid phone number";
  }
  if (step === 2) {
    const allowed = VALID_PARENT_TYPES[type] ?? [];
    const parent = units.find(u => u.id === values.parent_unit_id);
    if (allowed.length && !values.parent_unit_id)
      errors.parent_unit_id = "Select a parent unit";
    else if (!allowed.length && values.parent_unit_id)
      errors.parent_unit_id = "Root organizations cannot have a parent";
    else if (values.parent_unit_id && !parent)
      errors.parent_unit_id = "The selected parent no longer exists";
    else if (parent && !validateParentType(type, parent.unit_type))
      errors.parent_unit_id = "The parent type is not valid for this unit";
    else if (parent && parent.status !== "Active" && parent.status !== "Draft")
      errors.parent_unit_id = "Inactive or archived units cannot be parents";
    else if (parent && targetStatus === "Active" && parent.status !== "Active")
      errors.parent_unit_id = "Activate the parent before activating this unit";
    else if (parent && detectCycle(editUnit?.id ?? "", parent.id, units))
      errors.parent_unit_id = "This parent would create a circular hierarchy";
    if (editUnit && (editUnit.parent_unit_id ?? "") !== values.parent_unit_id)
      errors.parent_unit_id = "Use Move Unit to change the hierarchy safely";
    const date = values.effective_start_at;
    if (date) {
      const parsed = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) ||
          parsed.toISOString().slice(0, 10) !== date)
        errors.effective_start_at = "Enter a valid effective date";
    }
  }
  if (step === 3) {
    const active = new Set(users.filter(u => u.account_status === "active").map(u => u.id));
    if (values.head_user_id && !active.has(values.head_user_id))
      errors.head_user_id = "Choose an active account for unit head";
    if (values.deputy_user_id && !active.has(values.deputy_user_id))
      errors.deputy_user_id = "Choose an active account for deputy head";
    if (values.head_user_id && values.head_user_id === values.deputy_user_id)
      errors.deputy_user_id = "The deputy must be a different person";
  }
  return errors;
}

export function firstInvalidOrgUnitStep(
  values: UnitFormValues, units: OrgUnit[], users: BmsUser[],
  editUnit?: OrgUnit, targetStatus?: "Draft" | "Active",
): { step: number; errors: Record<string, string> } | null {
  for (let step = 0; step < 4; step++) {
    const errors = validateOrgUnitFormStep(step, values, units, users, editUnit, targetStatus);
    if (Object.keys(errors).length) return { step, errors };
  }
  return null;
}
