// Preserve explicit edit intent and require the current authoritative target.
export function clampRegisterPage(page: number, count: number, perPage: number): number {
  return Math.max(1, Math.min(page, Math.max(1, Math.ceil(count / perPage))));
}

export function requireRoleSaveMode(
  editingId: string | null, submittedId: string,
  roles: readonly { id: string }[], protectedRole: (id: string) => boolean,
): "create" | "update" {
  if (editingId === null) {
    if (roles.some(role => role.id === submittedId)) throw new Error("Role already exists. Refresh Role Management.");
    return "create";
  }
  if (submittedId !== editingId || !roles.some(role => role.id === editingId) || protectedRole(editingId)) {
    throw new Error("Role is no longer available for editing. Refresh Role Management.");
  }
  return "update";
}

export function requirePermissionEditKind(
  editingId: string, submittedId: string, originCustom: boolean,
  permissions: readonly { id: string; isCustom?: boolean }[],
): "base" | "custom" {
  const target = permissions.find(permission => permission.id === editingId);
  if (editingId !== submittedId || !target || Boolean(target.isCustom) !== originCustom) {
    throw new Error("Permission is no longer available in its original form. Refresh Permission List.");
  }
  return originCustom ? "custom" : "base";
}
