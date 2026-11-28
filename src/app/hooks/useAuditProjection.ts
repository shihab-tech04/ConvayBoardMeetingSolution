import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { convayAuth } from "../services/supabase/convayAuth";
import { hasAccess, reloadAccessSnapshot, useAccessSnapshot } from "../services/supabase/convayAccess";
import { parseAuditProjection, type AuditProjection } from "../services/reports/auditProjection";

type State = { userId: string | null; workflowOnly: boolean; evidence: AuditProjection | null; loading: boolean; error: string | null };
const empty = (userId: string | null, workflowOnly: boolean): State => ({ userId, workflowOnly, evidence: null, loading: true, error: null });
export function useAuditProjection(workflowOnly: boolean) {
  const { userId, isAuthenticated } = useAuth();
  const access = useAccessSnapshot();
  const [state, setState] = useState(() => empty(userId, workflowOnly));
  const epoch = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++epoch.current;
    setState(empty(userId, workflowOnly));
    if (!isAuthenticated || !userId) return;
    const permission = workflowOnly ? "admin_workflows" : "admin_audit_log";
    const current = () => request === epoch.current;
    try {
      const before = await reloadAccessSnapshot();
      if (!current()) return;
      if (!hasAccess(permission, before) || (workflowOnly && !before.is_super_admin)) throw new Error("Audit access denied.");
      const response = await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_report_audit_events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p_workflow_only: workflowOnly }),
      });
      const evidence = parseAuditProjection(await response.json(), workflowOnly);
      if (!current()) return;
      const after = await reloadAccessSnapshot();
      if (!current()) return;
      if (!hasAccess(permission, after) || (evidence.scope === "platform" && !after.is_super_admin) ||
          (evidence.scope === "tenant" && evidence.rows.some(row => !after.company_admin_tenant_ids?.includes(row.tenant_id)))) throw new Error("Audit access changed.");
      setState({ userId, workflowOnly, evidence, loading: false, error: null });
    } catch {
      if (current()) setState({ userId, workflowOnly, evidence: null, loading: false, error: "Authorized audit event read could not be verified. Retry loading." });
    }
  }, [userId, isAuthenticated, workflowOnly]);
  useEffect(() => {
    const invalidate = () => { epoch.current++; setState(empty(userId, workflowOnly)); };
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("convay:entity-cache-cleared", invalidate);
    document.addEventListener("visibilitychange", visible);
    void refresh();
    return () => { epoch.current++; window.removeEventListener("convay:entity-cache-cleared", invalidate); document.removeEventListener("visibilitychange", visible); };
  }, [refresh, userId, workflowOnly]);
  const matches = isAuthenticated && state.userId === userId && state.workflowOnly === workflowOnly;
  const evidence = matches ? state.evidence : null;
  const authorized = hasAccess(workflowOnly ? "admin_workflows" : "admin_audit_log", access) &&
    (!workflowOnly || access.is_super_admin) && (!evidence || (evidence.scope === "platform" ? access.is_super_admin :
      evidence.rows.every(row => access.company_admin_tenant_ids?.includes(row.tenant_id))));
  return { ...(matches ? (evidence && !authorized ? { ...empty(userId, workflowOnly), loading: false, error: "Audit access changed. Retry loading." } : state) : empty(userId, workflowOnly)), refresh };

}
