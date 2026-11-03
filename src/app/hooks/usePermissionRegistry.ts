/**
 * Permission Registry is a pure adapter over the live SQL catalog.
 * PERM_GROUPS supplies only the approved seven group labels and order.
 * No sample permissions or browser-local overrides are used as records.
 */
import { useCallback, useMemo } from "react";
import { PERM_GROUPS, type PermGroupDef, type PermissionItem } from "../data/permissions";
import { convayAuth } from "../services/supabase/convayAuth";
import { useAccessSnapshot, reloadAccessSnapshot, type AccessPermission } from "../services/supabase/convayAccess";
export const PERM_STORAGE_KEY = "nbr.permissionRegistry.customPermissions";
export const BASE_OVERRIDE_KEY = "nbr.permissionRegistry.baseOverrides";
export const PERM_EVENT = "nbr:permissions-updated";

export interface BaseOverride {
  id: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  serviceName?: string;
  accessLabel?: "PUBLIC" | "AUTH" | "AUTHORIZE";
  status?: "Active" | "Inactive";
  updatedAt: string;
}
export interface CustomPermission {
  id: string;
  label: string;
  groupId: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  serviceName: string;
  accessLabel: "PUBLIC" | "AUTH" | "AUTHORIZE";
  status: "Active" | "Inactive";
  isCustom: true;
  createdAt: string;
  updatedAt: string;
}
export type FlatPermission = PermissionItem & { groupId: string; groupLabel: string };

function toUiPermission(p: AccessPermission): PermissionItem {
  return {
    id: p.id, label: p.label, labelKey: p.label_key || undefined,
    endpoint: p.endpoint, method: p.method as PermissionItem["method"],
    serviceName: p.service_name,
    accessLabel: p.access_label, status: p.status, isCustom: p.is_custom,
    createdAt: p.created_at, updatedAt: p.updated_at,
  };
}
function toCustom(p: AccessPermission): CustomPermission {
  return {
    id: p.id, label: p.label, groupId: p.group_id,
    endpoint: p.endpoint, method: p.method as CustomPermission["method"],
    serviceName: p.service_name, accessLabel: p.access_label, status: p.status,
    isCustom: true, createdAt: p.created_at, updatedAt: p.updated_at,
  };
}
export function usePermissionRegistry() {
  const snapshot = useAccessSnapshot();
  const permissionGroups: PermGroupDef[] = useMemo(() => PERM_GROUPS.map(g => ({
    id: g.id, label: g.label, labelKey: g.labelKey,
    permissions: snapshot.permissions
      .filter(p => p.group_id === g.id).map(toUiPermission),
  })), [snapshot.permissions]);
  const flatPermissions: FlatPermission[] = useMemo(() =>
    permissionGroups.flatMap(g => g.permissions.map(p => ({
      ...p, groupId: g.id, groupLabel: g.label,
    }))), [permissionGroups]);
  const allPermissionIds = useMemo(() => snapshot.permissions.map(p => p.id), [snapshot.permissions]);
  const customPermissions = useMemo(() => snapshot.permissions.filter(p => p.is_custom).map(toCustom), [snapshot.permissions]);

  const addPermission = useCallback(async (perm: Omit<CustomPermission, "isCustom" | "createdAt" | "updatedAt">) => {
    await convayAuth.access("permission_create", {
      id: perm.id, label: perm.label, group_id: perm.groupId, endpoint: perm.endpoint,
      method: perm.method, service_name: perm.serviceName,
      access_label: perm.accessLabel, status: perm.status,
    });
    await reloadAccessSnapshot();
  }, []);
  const updatePermission = useCallback(async (id: string, patch: Partial<Omit<CustomPermission, "id" | "isCustom" | "createdAt">>) => {
    const existing = snapshot.permissions.find(p => p.id === id);
    if (!existing) throw new Error("Permission not found");
    await convayAuth.access("permission_update", {
      id, label: patch.label ?? existing.label, group_id: patch.groupId ?? existing.group_id,
      endpoint: patch.endpoint ?? existing.endpoint, method: patch.method ?? existing.method,
      service_name: patch.serviceName ?? existing.service_name,
      access_label: patch.accessLabel ?? existing.access_label,
      status: patch.status ?? existing.status,
    });
    await reloadAccessSnapshot();
  }, [snapshot.permissions]);
  const deleteCustomPermission = useCallback(async (id: string) => {
    await convayAuth.access("permission_delete", { id });
    await reloadAccessSnapshot();
  }, []);
  const updateBasePermission = useCallback(async (id: string, patch: Omit<BaseOverride, "id" | "updatedAt">) => {
    const existing = snapshot.permissions.find(p => p.id === id);
    if (!existing) throw new Error("Permission not found");
    await convayAuth.access("permission_update", {
      id, label: existing.label, group_id: existing.group_id,
      endpoint: patch.endpoint ?? existing.endpoint, method: patch.method ?? existing.method,
      service_name: patch.serviceName ?? existing.service_name,
      access_label: patch.accessLabel ?? existing.access_label,
      status: patch.status ?? existing.status,
    });
    await reloadAccessSnapshot();
  }, [snapshot.permissions]);

  return {
    flatPermissions, permissionGroups, allPermissionIds, customPermissions,
    baseOverrides: [] as BaseOverride[],
    addPermission, updatePermission, deleteCustomPermission, updateBasePermission,
    loading: !snapshot.loaded, error: snapshot.error,
    refresh: reloadAccessSnapshot,
  };
}